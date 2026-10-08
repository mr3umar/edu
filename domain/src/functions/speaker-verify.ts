import * as ort from 'onnxruntime-node';
import FFT from 'fft.js';

export type SpeakerId = string;

/**
 * Defaults match the Qwen3-TTS speaker encoder (HiFi-GAN mel frontend):
 * 24 kHz, n_fft 1024, hop 256, periodic Hann, reflect pad (n_fft - hop) / 2,
 * magnitude spectrum, Slaney mel 128 bins 0-12000 Hz, log(clamp(x, 1e-5)),
 * input [1, T, 128].
 */
export interface SpeakerVerifierOptions {
  /** Cosine-similarity decision threshold. Calibrate on your own data. */
  threshold?: number;

  // --- Feature extraction: must match the model's training preprocessing ---
  sampleRate?: number;
  fftSize?: number;
  hopSize?: number;
  melBins?: number;
  fMin?: number;
  /** Defaults to sampleRate / 2. */
  fMax?: number;
  melScale?: 'slaney' | 'htk';
  /** 'slaney' = area-normalized filters (librosa default), null = peak 1. */
  melNorm?: 'slaney' | null;
  /** Reflect padding in samples on each side. Defaults to (fftSize - hopSize) / 2. */
  pad?: number;
  /** true = magnitude spectrum (HiFi-GAN), false = power spectrum. */
  magnitude?: boolean;
  /** Features are log(max(value, logFloor)). */
  logFloor?: number;

  // --- Model input ---
  /**
   * Frames per model input window. Set to 0 to pass the whole utterance in
   * one run (only if the ONNX export has a dynamic time dimension).
   */
  windowFrames?: number;
  /** Hop between consecutive windows, in frames. */
  windowStep?: number;
  /** 'time-mel' -> [1, frames, mels], 'mel-time' -> [1, mels, frames]. */
  inputLayout?: 'time-mel' | 'mel-time';
  /** Defaults to 'mel_spectrogram' if present, otherwise the first input. */
  inputName?: string;
  /** Defaults to 'speaker_embedding' if present, otherwise the first output. */
  outputName?: string;

  // --- Audio requirements (PCM16 mono at sampleRate) ---
  minReferenceMs?: number;
  minInputMs?: number;
  /** Oldest reference audio is dropped beyond this. */
  maxReferenceMs?: number;
  /** Windows with mean frame RMS below this are skipped. 0 disables. */
  silenceRms?: number;
}

export type SpeakerScore = {
  speaker: SpeakerId;
  score: number;
};

export type VerifyResult = {
  /** True when the best match reaches the threshold. */
  verified: boolean;
  /** The verified speaker, or null if nobody reached the threshold. */
  speaker: SpeakerId | null;
  /** Best-scoring candidate, verified or not. */
  bestMatch: SpeakerId | null;
  /** Score of the best candidate (0 if there were none). */
  score: number;
  /** All candidate scores, best first. */
  scores: SpeakerScore[];
  reason?: 'input-too-short' | 'input-silent' | 'no-references';
};

type ResolvedOptions = Required<
  Omit<SpeakerVerifierOptions, 'inputName' | 'outputName'>
> & {
  inputName?: string;
  outputName?: string;
};

type MelFilter = {
  start: number;
  weights: Float64Array;
};

type SpeakerRef = {
  /** PCM16 chunks, each with an even byte length. */
  chunks: Buffer[];
  totalBytes: number;
  /** Odd trailing byte carried over to the next chunk. */
  carry: Buffer | null;
  version: number;
  embedding?: Promise<Float32Array | null>;
  embeddingVersion?: number;
};

type Spectrogram = {
  /** Time-major log-mel features: mel[t * melBins + m]. */
  mel: Float32Array;
  frames: number;
  /** RMS of the raw samples in each frame, for silence gating. */
  frameRms: Float32Array;
};

const DEFAULTS = {
  threshold: 0.65,
  sampleRate: 24_000,
  fftSize: 1024,
  hopSize: 256,
  melBins: 128,
  fMin: 0,
  melScale: 'slaney',
  melNorm: 'slaney',
  magnitude: true,
  logFloor: 1e-5,
  windowFrames: 128,
  windowStep: 64,
  inputLayout: 'time-mel',
  minReferenceMs: 1500 * 3,
  minInputMs: 1000,
  maxReferenceMs: 60_000,
  silenceRms: 0.005,
} as const;

const BYTES_PER_SAMPLE = 2; // PCM16 mono

export class SpeakerVerifier {
  private session: ort.InferenceSession | null = null;
  private inputName = '';
  private outputName = '';

  private readonly o: ResolvedOptions;
  private readonly fft: FFT;
  private readonly window: Float64Array;
  private readonly filters: MelFilter[];

  private readonly refs = new Map<SpeakerId, SpeakerRef>();

  constructor(
    private readonly modelPath: string,
    options: SpeakerVerifierOptions = {},
  ) {
    const sampleRate = options.sampleRate ?? DEFAULTS.sampleRate;
    const fftSize = options.fftSize ?? DEFAULTS.fftSize;
    const hopSize = options.hopSize ?? DEFAULTS.hopSize;

    this.o = {
      ...DEFAULTS,
      fMax: sampleRate / 2,
      pad: Math.floor((fftSize - hopSize) / 2),
      ...options,
    } as ResolvedOptions;

    const { windowFrames, windowStep, pad } = this.o;

    if (fftSize < 2 || (fftSize & (fftSize - 1)) !== 0) {
      throw new Error(`fftSize must be a power of two, got ${fftSize}`);
    }
    if (hopSize <= 0) {
      throw new Error('hopSize must be positive');
    }
    if (windowFrames < 0 || (windowFrames > 0 && windowStep <= 0)) {
      throw new Error('windowFrames must be >= 0 and windowStep must be positive');
    }
    if (pad < 0) {
      throw new Error('pad must be >= 0');
    }

    this.fft = new FFT(fftSize);
    this.window = this.buildHannWindow(fftSize);
    this.filters = this.buildMelFilters();
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async init(): Promise<void> {
    const session = await ort.InferenceSession.create(this.modelPath, {
      executionProviders: ['cpu'],
    });

    this.inputName = this.resolveName(
      session.inputNames,
      this.o.inputName,
      'mel_spectrogram',
      'input',
    );
    this.outputName = this.resolveName(
      session.outputNames,
      this.o.outputName,
      'speaker_embedding',
      'output',
    );

    this.session = session;
  }

  async dispose(): Promise<void> {
    await this.session?.release();
    this.session = null;
  }

  // ---------------------------------------------------------------------------
  // References
  // ---------------------------------------------------------------------------

  /**
   * Append PCM16 mono audio to a speaker's reference. Safe to call with
   * small streaming chunks, including odd byte lengths.
   */
  addRefBuffer(speaker: SpeakerId, pcm: Buffer): void {
    if (!pcm.length) return;

    let ref = this.refs.get(speaker);
    if (!ref) {
      ref = { chunks: [], totalBytes: 0, carry: null, version: 0 };
      this.refs.set(speaker, ref);
    }

    let data = ref.carry ? Buffer.concat([ref.carry, pcm]) : pcm;
    ref.carry = null;

    if (data.length % 2 !== 0) {
      ref.carry = Buffer.from(data.subarray(data.length - 1));
      data = data.subarray(0, data.length - 1);
    }
    if (!data.length) return;

    ref.chunks.push(data);
    ref.totalBytes += data.length;
    this.trimReference(ref);

    ref.version++;
    ref.embedding = undefined;
  }

  removeRef(speaker: SpeakerId): boolean {
    return this.refs.delete(speaker);
  }

  clearRefs(): void {
    this.refs.clear();
  }

  getRefIds(): SpeakerId[] {
    return [...this.refs.keys()];
  }

  /** Stored reference audio in milliseconds (0 if the speaker is unknown). */
  getReferenceDurationMs(speaker: SpeakerId): number {
    const ref = this.refs.get(speaker);
    return ref ? this.bytesToMs(ref.totalBytes) : 0;
  }

  /** True once the speaker has at least minReferenceMs of audio. */
  isRefReady(speaker: SpeakerId): boolean {
    return this.getReferenceDurationMs(speaker) >= this.o.minReferenceMs;
  }

  // ---------------------------------------------------------------------------
  // Verification
  // ---------------------------------------------------------------------------

  async verify(pcm: Buffer): Promise<VerifyResult> {
    this.ensureInitialized();

    const samples = this.pcm16ToFloat32(pcm);

    if (samples.length < this.msToSamples(this.o.minInputMs)) {
      return this.emptyResult('input-too-short');
    }

    const raw = await this.embed(samples);
    if (!raw) {
      return this.emptyResult('input-silent');
    }
    const input = this.center(raw);

    const scores: SpeakerScore[] = [];

    for (const [speaker, ref] of this.refs) {
      const refEmbedding = await this.getRefEmbedding(ref);
      if (!refEmbedding) continue;

      scores.push({ speaker, score: this.dot(input, refEmbedding) });
    }

    if (!scores.length) {
      return this.emptyResult('no-references');
    }

    scores.sort((a, b) => b.score - a.score);

    const best = scores[0];
    const verified = best.score >= this.o.threshold;

    return {
      verified,
      speaker: verified ? best.speaker : null,
      bestMatch: best.speaker,
      score: best.score,
      scores,
    };
  }

  // ---------------------------------------------------------------------------
  // Embeddings
  // ---------------------------------------------------------------------------

  /**
   * Cached per reference version. Caching the promise (not the value) means
   * concurrent verify() calls share one computation.
   */
  private getRefEmbedding(ref: SpeakerRef): Promise<Float32Array | null> {
    const minBytes =
      this.msToSamples(this.o.minReferenceMs) * BYTES_PER_SAMPLE;

    if (ref.totalBytes < minBytes) {
      return Promise.resolve(null);
    }

    if (ref.embedding && ref.embeddingVersion === ref.version) {
      return ref.embedding;
    }

    const audio = Buffer.concat(ref.chunks, ref.totalBytes);
    const promise = this.embed(this.pcm16ToFloat32(audio));

    ref.embedding = promise;
    ref.embeddingVersion = ref.version;

    promise.catch(() => {
      if (ref.embedding === promise) ref.embedding = undefined;
    });

    return promise;
  }

  /**
   * Returns an L2-normalized embedding, or null if the audio is silent.
   *
   * windowFrames > 0: slides a fixed-size window over the spectrogram, embeds
   * each non-silent window, and averages the normalized embeddings.
   * windowFrames = 0: runs the whole utterance through the model once.
   */
  private async embed(samples: Float32Array): Promise<Float32Array | null> {
    const { mel, frames, frameRms } = this.melSpectrogram(samples);
    const { windowFrames, silenceRms } = this.o;

    if (windowFrames === 0) {
      if (silenceRms > 0 && this.meanRange(frameRms, 0, frames) < silenceRms) {
        return null;
      }
      const features = this.toLayout(mel, frames);
      return this.normalize(await this.runModel(features, frames));
    }

    let sum: Float32Array | null = null;
    let count = 0;

    for (const start of this.planWindows(frames)) {
      const end = Math.min(start + windowFrames, frames);

      if (silenceRms > 0 && this.meanRange(frameRms, start, end) < silenceRms) {
        continue;
      }

      const features = this.sliceWindow(mel, frames, start);
      const embedding = this.normalize(
        await this.runModel(features, windowFrames),
      );

      sum ??= new Float32Array(embedding.length);
      for (let i = 0; i < embedding.length; i++) sum[i] += embedding[i];
      count++;
    }

    return sum && count ? this.normalize(sum) : null;
  }

  private async runModel(
    features: Float32Array,
    frames: number,
  ): Promise<Float32Array> {
    const session = this.ensureInitialized();
    const { melBins, inputLayout } = this.o;

    const dims =
      inputLayout === 'time-mel' ? [1, frames, melBins] : [1, melBins, frames];

    const results = await session.run({
      [this.inputName]: new ort.Tensor('float32', features, dims),
    });

    const output = results[this.outputName];
    if (!output || output.type !== 'float32') {
      throw new Error(
        `Model output "${this.outputName}" is missing or not float32`,
      );
    }

    // Copy so we don't hold on to onnxruntime's output buffer.
    return Float32Array.from(output.data as Float32Array);
  }

  /** Window start frames, always including one aligned to the end. */
  private planWindows(frames: number): number[] {
    const { windowFrames, windowStep } = this.o;

    if (frames <= windowFrames) return [0];

    const starts: number[] = [];
    for (let s = 0; s + windowFrames <= frames; s += windowStep) {
      starts.push(s);
    }

    const last = frames - windowFrames;
    if (starts[starts.length - 1] !== last) starts.push(last);

    return starts;
  }

  /** Extracts one model input window, padding short audio with log-silence. */
  private sliceWindow(
    mel: Float32Array,
    frames: number,
    start: number,
  ): Float32Array {
    const { melBins, windowFrames, logFloor } = this.o;

    const window = new Float32Array(windowFrames * melBins).fill(
      Math.log(logFloor),
    );
    const n = Math.min(windowFrames, frames - start);
    window.set(mel.subarray(start * melBins, (start + n) * melBins));

    return this.toLayout(window, windowFrames);
  }

  /** Converts time-major features to the model's input layout. */
  private toLayout(timeMajor: Float32Array, frames: number): Float32Array {
    const { melBins, inputLayout } = this.o;

    if (inputLayout === 'time-mel') return timeMajor;

    const melMajor = new Float32Array(frames * melBins);
    for (let t = 0; t < frames; t++) {
      for (let m = 0; m < melBins; m++) {
        melMajor[m * frames + t] = timeMajor[t * melBins + m];
      }
    }
    return melMajor;
  }

  // ---------------------------------------------------------------------------
  // Feature extraction (HiFi-GAN style log-mel)
  // ---------------------------------------------------------------------------

  private melSpectrogram(samples: Float32Array): Spectrogram {
    const { fftSize, hopSize, melBins, pad, magnitude, logFloor } = this.o;

    const padded = samples.length + 2 * pad;
    const frames =
      padded < fftSize ? 1 : 1 + Math.floor((padded - fftSize) / hopSize);

    const mel = new Float32Array(frames * melBins);
    const frameRms = new Float32Array(frames);

    const input = new Float64Array(fftSize);
    const spectrum = this.fft.createComplexArray() as number[];
    const spec = new Float64Array(fftSize / 2 + 1);

    for (let t = 0; t < frames; t++) {
      const offset = t * hopSize - pad;
      let sumSq = 0;

      for (let i = 0; i < fftSize; i++) {
        const s = this.sampleAt(samples, offset + i, pad > 0);
        sumSq += s * s;
        input[i] = s * this.window[i];
      }
      frameRms[t] = Math.sqrt(sumSq / fftSize);

      this.fft.realTransform(spectrum, input);
      this.fft.completeSpectrum(spectrum);

      for (let k = 0; k < spec.length; k++) {
        const re = spectrum[2 * k];
        const im = spectrum[2 * k + 1];
        const p = re * re + im * im;
        spec[k] = magnitude ? Math.sqrt(p + 1e-9) : p;
      }

      const row = t * melBins;
      for (let m = 0; m < melBins; m++) {
        const { start, weights } = this.filters[m];
        let energy = 0;
        for (let j = 0; j < weights.length; j++) {
          energy += spec[start + j] * weights[j];
        }
        mel[row + m] = Math.log(Math.max(energy, logFloor));
      }
    }

    return { mel, frames, frameRms };
  }

  /** Reflect padding outside the signal, or zero when reflect is false. */
  private sampleAt(samples: Float32Array, i: number, reflect: boolean): number {
    const n = samples.length;
    if (i >= 0 && i < n) return samples[i];
    if (!reflect || n === 0) return 0;
    if (n === 1) return samples[0];

    const period = 2 * (n - 1);
    let j = ((i % period) + period) % period;
    if (j >= n) j = period - j;
    return samples[j];
  }

  /** Periodic Hann window, matching torch.hann_window / librosa. */
  private buildHannWindow(size: number): Float64Array {
    const w = new Float64Array(size);
    for (let i = 0; i < size; i++) {
      w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
    }
    return w;
  }

  /** Triangular mel filters on continuous frequencies, as in librosa. */
  private buildMelFilters(): MelFilter[] {
    const { melBins, fftSize, sampleRate, fMin, fMax, melScale, melNorm } =
      this.o;

    if (fMax > sampleRate / 2 || fMin < 0 || fMin >= fMax) {
      throw new Error(`Invalid frequency range ${fMin}-${fMax} Hz`);
    }

    const minMel = hzToMel(fMin, melScale);
    const maxMel = hzToMel(fMax, melScale);
    const edges = Array.from({ length: melBins + 2 }, (_, i) =>
      melToHz(minMel + ((maxMel - minMel) * i) / (melBins + 1), melScale),
    );

    const nBins = fftSize / 2 + 1;
    const filters: MelFilter[] = [];

    for (let m = 0; m < melBins; m++) {
      const lo = edges[m];
      const mid = edges[m + 1];
      const hi = edges[m + 2];
      const scale = melNorm === 'slaney' ? 2 / (hi - lo) : 1;

      let start = -1;
      let end = -1;
      const full = new Float64Array(nBins);

      for (let k = 0; k < nBins; k++) {
        const f = (k * sampleRate) / fftSize;
        const w = Math.max(
          0,
          Math.min((f - lo) / (mid - lo), (hi - f) / (hi - mid)),
        );
        if (w > 0) {
          full[k] = w * scale;
          if (start < 0) start = k;
          end = k;
        }
      }

      filters.push(
        start < 0
          ? { start: 0, weights: new Float64Array(0) }
          : { start, weights: full.slice(start, end + 1) },
      );
    }

    return filters;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private pcm16ToFloat32(buffer: Buffer): Float32Array {
    const count = Math.floor(buffer.length / BYTES_PER_SAMPLE);
    const samples = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      samples[i] = buffer.readInt16LE(i * BYTES_PER_SAMPLE) / 32768;
    }
    return samples;
  }

  /** Drops the oldest audio once the reference exceeds maxReferenceMs. */
  private trimReference(ref: SpeakerRef): void {
    const maxBytes =
      this.msToSamples(this.o.maxReferenceMs) * BYTES_PER_SAMPLE;

    while (ref.totalBytes > maxBytes && ref.chunks.length > 0) {
      const excess = ref.totalBytes - maxBytes;
      const first = ref.chunks[0];

      if (first.length <= excess) {
        ref.chunks.shift();
        ref.totalBytes -= first.length;
      } else {
        const cut = excess + (excess % 2); // stay sample-aligned
        ref.chunks[0] = first.subarray(cut);
        ref.totalBytes -= cut;
      }
    }
  }

  private normalize(v: Float32Array): Float32Array {
    let sum = 0;
    for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
    const norm = Math.sqrt(sum);

    const out = new Float32Array(v.length);
    if (norm === 0) return out;
    for (let i = 0; i < v.length; i++) out[i] = v[i] / norm;
    return out;
  }

  /** Cosine similarity for vectors that are already L2-normalized. */
  private dot(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error(`Embedding size mismatch: ${a.length} vs ${b.length}`);
    }
    let d = 0;
    for (let i = 0; i < a.length; i++) d += a[i] * b[i];
    return d;
  }

  private meanRange(values: Float32Array, start: number, end: number): number {
    let sum = 0;
    for (let i = start; i < end; i++) sum += values[i];
    return end > start ? sum / (end - start) : 0;
  }

  private msToSamples(ms: number): number {
    return Math.round((this.o.sampleRate * ms) / 1000);
  }

  private bytesToMs(bytes: number): number {
    return (bytes / BYTES_PER_SAMPLE / this.o.sampleRate) * 1000;
  }

  private emptyResult(reason: VerifyResult['reason']): VerifyResult {
    return {
      verified: false,
      speaker: null,
      bestMatch: null,
      score: 0,
      scores: [],
      reason,
    };
  }

  private resolveName(
    available: readonly string[],
    requested: string | undefined,
    preferred: string,
    kind: string,
  ): string {
    if (requested) {
      if (!available.includes(requested)) {
        throw new Error(
          `Model has no ${kind} "${requested}". Available: ${available.join(', ')}`,
        );
      }
      return requested;
    }
    if (available.includes(preferred)) return preferred;
    if (!available.length) throw new Error(`Model has no ${kind}s`);
    return available[0];
  }

  private ensureInitialized(): ort.InferenceSession {
    if (!this.session) {
      throw new Error('Call await verifier.init() first');
    }
    return this.session;
  }
  private bgSum: Float32Array | null = null;
private bgCount = 0;

/**
 * Add a clip of someone who is NOT an enrolled speaker. Use many different
 * voices. Returns false if the clip was too short or silent.
 */
async addBackgroundBuffer(pcm: Buffer): Promise<boolean> {
  this.ensureInitialized();

  const samples = this.pcm16ToFloat32(pcm);
  if (samples.length < this.msToSamples(this.o.minInputMs)) return false;

  const embedding = await this.embed(samples);
  if (!embedding) return false;

  this.bgSum ??= new Float32Array(embedding.length);
  for (let i = 0; i < embedding.length; i++) this.bgSum[i] += embedding[i];
  this.bgCount++;
  return true;
}

clearBackground(): void {
  this.bgSum = null;
  this.bgCount = 0;
}

getBackgroundCount(): number {
  return this.bgCount;
}

/** Subtracts the background mean and re-normalizes. No-op without background. */
private center(v: Float32Array): Float32Array {
  if (!this.bgSum || this.bgCount === 0) return v;

  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) {
    out[i] = v[i] - this.bgSum[i] / this.bgCount;
  }
  return this.normalize(out);
}
}

// -----------------------------------------------------------------------------
// Mel scale conversions
// -----------------------------------------------------------------------------

const SLANEY_F_SP = 200 / 3;
const SLANEY_MIN_LOG_HZ = 1000;
const SLANEY_MIN_LOG_MEL = SLANEY_MIN_LOG_HZ / SLANEY_F_SP;
const SLANEY_LOG_STEP = Math.log(6.4) / 27;

function hzToMel(hz: number, scale: 'slaney' | 'htk'): number {
  if (scale === 'htk') return 2595 * Math.log10(1 + hz / 700);
  return hz < SLANEY_MIN_LOG_HZ
    ? hz / SLANEY_F_SP
    : SLANEY_MIN_LOG_MEL + Math.log(hz / SLANEY_MIN_LOG_HZ) / SLANEY_LOG_STEP;
}

function melToHz(mel: number, scale: 'slaney' | 'htk'): number {
  if (scale === 'htk') return 700 * (10 ** (mel / 2595) - 1);
  return mel < SLANEY_MIN_LOG_MEL
    ? SLANEY_F_SP * mel
    : SLANEY_MIN_LOG_HZ * Math.exp(SLANEY_LOG_STEP * (mel - SLANEY_MIN_LOG_MEL));
}
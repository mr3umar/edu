/**
 * Speaker verification using sherpa-onnx and a dedicated verification model
 * (e.g. wespeaker_en_voxceleb_resnet34_LM.onnx).
 *
 *   npm install sherpa-onnx-node
 *
 * sherpa-onnx does all feature extraction internally and resamples the
 * input to the model's rate, so you only pass PCM16 mono audio.
 *
 * If TypeScript complains that 'sherpa-onnx-node' has no types, add a file
 * `sherpa-onnx-node.d.ts` containing:  declare module 'sherpa-onnx-node';
 */
import * as sherpaModule from 'sherpa-onnx-node';

// sherpa-onnx-node is CommonJS: under ESM its exports land on `.default`.
const sherpa: typeof sherpaModule =
  (sherpaModule as unknown as { default?: typeof sherpaModule }).default ??
  sherpaModule;
  
export type SpeakerId = string;

export interface SpeakerVerifierOptions {
  /** Cosine-similarity decision threshold. Calibrate on your own data. */
  threshold?: number;
  /** Sample rate of the PCM16 mono audio you pass in. */
  sampleRate?: number;
  numThreads?: number;
  minReferenceMs?: number;
  minInputMs?: number;
  /** Oldest reference audio is dropped beyond this. */
  maxReferenceMs?: number;
  /** Clips with overall RMS below this are treated as silence. 0 disables. */
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

type SpeakerRef = {
  /** PCM16 chunks, each with an even byte length. */
  chunks: Buffer[];
  totalBytes: number;
  /** Odd trailing byte carried over to the next chunk. */
  carry: Buffer | null;
  version: number;
  embedding?: Float32Array | null;
  embeddingVersion?: number;
};

const DEFAULTS: Required<SpeakerVerifierOptions> = {
  threshold: 0.5,
  sampleRate: 24_000,
  numThreads: 1,
  minReferenceMs: 3000,
  minInputMs: 400, // lowered from 1000 to 400 to allow words like "hello"
  maxReferenceMs: 60_000,
  silenceRms: 0.003,
};

const BYTES_PER_SAMPLE = 2; // PCM16 mono

export class SpeakerVerifier {
  // sherpa-onnx-node ships without TypeScript types.
  private extractor: any = null;

  private readonly o: Required<SpeakerVerifierOptions>;
  private readonly refs = new Map<SpeakerId, SpeakerRef>();

  constructor(
    private readonly modelPath: string,
    options: SpeakerVerifierOptions = {},
  ) {
    this.o = { ...DEFAULTS, ...options };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async init(): Promise<void> {
    this.extractor = new sherpa.SpeakerEmbeddingExtractor({
      model: this.modelPath,
      numThreads: this.o.numThreads,
      debug: false,
    });
  }

  async dispose(): Promise<void> {
    this.extractor = null;
    this.refs.clear();
  }

  /** Embedding size of the loaded model. */
  get dim(): number {
    return this.ensureInitialized().dim;
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

    const input = this.embed(samples);
    if (!input) {
      return this.emptyResult('input-silent');
    }

    const scores: SpeakerScore[] = [];

    for (const [speaker, ref] of this.refs) {
      const refEmbedding = this.getRefEmbedding(ref);
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

  /** Cached until new reference audio is added. */
  private getRefEmbedding(ref: SpeakerRef): Float32Array | null {
    const minBytes =
      this.msToSamples(this.o.minReferenceMs) * BYTES_PER_SAMPLE;

    if (ref.totalBytes < minBytes) return null;

    if (ref.embedding !== undefined && ref.embeddingVersion === ref.version) {
      return ref.embedding;
    }

    const audio = Buffer.concat(ref.chunks, ref.totalBytes);
    ref.embedding = this.embed(this.pcm16ToFloat32(audio));
    ref.embeddingVersion = ref.version;

    return ref.embedding;
  }

  /** L2-normalized embedding, or null if the audio is silent or too short. */
  private embed(raw: Float32Array): Float32Array | null {
    const extractor = this.ensureInitialized();

    const samples = this.keepSpeech(raw);

    if (this.o.silenceRms > 0 && this.rms(samples) < this.o.silenceRms) {
      return null;
    }

    const stream = extractor.createStream();
    stream.acceptWaveform({ sampleRate: this.o.sampleRate, samples });
    stream.inputFinished();

    if (!extractor.isReady(stream)) return null;

    // Copy so we don't keep a view into native memory.
    const embedding = Float32Array.from(extractor.compute(stream) as Float32Array);
    return this.normalize(embedding);
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

  private rms(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    return samples.length ? Math.sqrt(sum / samples.length) : 0;
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

  private ensureInitialized(): any {
    if (!this.extractor) {
      throw new Error('Call await verifier.init() first');
    }
    return this.extractor;
  }

  /** Keeps only frames clearly louder than the noise floor. */
private keepSpeech(samples: Float32Array): Float32Array {
        const frame = Math.round(this.o.sampleRate * 0.03); // 30 ms
        const rms: number[] = [];
      
        for (let i = 0; i + frame <= samples.length; i += frame) {
          let sum = 0;
          for (let j = i; j < i + frame; j++) sum += samples[j] * samples[j];
          rms.push(Math.sqrt(sum / frame));
        }
        if (!rms.length) return samples;
      
        const sorted = [...rms].sort((a, b) => a - b);
        const noiseFloor = sorted[Math.floor(sorted.length * 0.2)];
        const threshold = Math.max(this.o.silenceRms, noiseFloor * 3);
      
        const kept: Float32Array[] = [];
        rms.forEach((r, k) => {
          if (r >= threshold) kept.push(samples.subarray(k * frame, (k + 1) * frame));
        });
      
        const out = new Float32Array(kept.length * frame);
        kept.forEach((chunk, k) => out.set(chunk, k * frame));
        return out;
      }
}

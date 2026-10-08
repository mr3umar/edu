import * as ort from 'onnxruntime-node';
import FFT from 'fft.js';

type SpeakerId = string;

export type VerifyResult = {
  speaker: SpeakerId | null;
  score: number;
};

type RefSpeaker = {
  embedding: Float32Array;
};
type SpeakerRef = {
  audio: Buffer[];
  totalBytes: number;
  embedding?: Float32Array;
};

export class SpeakerVerifier {
  private session: ort.InferenceSession | null = null;
  // private readonly refs = new Map<SpeakerId, RefSpeaker>();

  private readonly sampleRate = 24_000;
  private readonly fftSize = 1024;
  private readonly hopSize = 256;
  private readonly melBins = 128;

  private refs = new Map<string, SpeakerRef>();

  private readonly bytesPerSample = 2;
  private readonly channels = 1;

  // For example, 1.5 seconds of reference audio
  private readonly minReferenceMs = 1500;

  constructor(
    private readonly modelPath: string,
    private readonly threshold = 0.65,
  ) {}

  async init(): Promise<void> {
    this.session = await ort.InferenceSession.create(this.modelPath, {
      executionProviders: ['cpu'],
    });
  }

  // async addRefBuffer(
  //   speaker: SpeakerId,
  //   pcmBuffer: Buffer,
  // ): Promise<void> {
  //   this.ensureInitialized();

  //   const samples = this.pcm16ToFloat32(pcmBuffer);

  //   if (samples.length < this.sampleRate) {
  //     throw new Error(
  //       `Reference audio should be at least 1 second`
  //     );
  //   }

  //   const embedding = await this.getEmbedding(samples);

  //   this.refs.set(speaker, {
  //     embedding: this.normalize(embedding),
  //   });
  // }
  addRefBuffer(personId: string, buffer: Buffer): void {
    if (!buffer.length) return;
  
    let ref = this.refs.get(personId);
  
    if (!ref) {
      ref = {
        audio: [],
        totalBytes: 0,
      };
  
      this.refs.set(personId, ref);
    }
  
    ref.audio.push(buffer);
    ref.totalBytes += buffer.length;
  
    // Invalidate previously calculated embedding
    ref.embedding = undefined;
  }

  // async verify(pcmBuffer: Buffer): Promise<VerifyResult> {
  //   this.ensureInitialized();

  //   const samples = this.pcm16ToFloat32(pcmBuffer);

  //   if (samples.length < this.sampleRate) {
  //     return {
  //       speaker: null,
  //       score: 0,
  //     };
  //   }

  //   const embedding = this.normalize(
  //     await this.getEmbedding(samples)
  //   );

  //   let bestSpeaker: SpeakerId | null = null;
  //   let bestScore = -1;

  //   for (const [speaker, ref] of this.refs) {
  //     const score = this.cosine(
  //       embedding,
  //       ref.embedding,
  //     );

  //     if (score > bestScore) {
  //       bestScore = score;
  //       bestSpeaker = speaker;
  //     }
  //   }

  //   if (
  //     bestSpeaker === null ||
  //     bestScore < this.threshold
  //   ) {
  //     return {
  //       speaker: null,
  //       score: bestScore,
  //     };
  //   }

  //   return {
  //     speaker: bestSpeaker,
  //     score: bestScore,
  //   };
  // }

  async verify(buffer: Buffer) {
    // Convert incoming audio to an embedding ONCE.
    const inputEmbedding = await this.getEmbedding(buffer);

    const results: {
      personId: string;
      similarity: number;
    }[] = [];

    for (const [personId, ref] of this.refs) {
      // Generate reference embedding if necessary.
      if (!ref.embedding) {
        const referenceAudio = Buffer.concat(
          ref.audio,
          ref.totalBytes,
        );

        ref.embedding = await this.getEmbedding(referenceAudio);
      }

      // Both arguments MUST be Float32Array.
      const similarity = this.cosineSimilarity(
        ref.embedding,
        inputEmbedding,
      );

      results.push({
        personId,
        similarity,
      });
    }

    results.sort((a, b) => b.similarity - a.similarity);

    const best = results[0];

    return {
      verified: !!best && best.similarity >= this.threshold,
      personId: best?.personId,
      similarity: best?.similarity ?? 0,
    };
  }

  // private async getEmbedding(
  //   samples: Float32Array,
  // ): Promise<Float32Array> {
  //   if (!this.session) {
  //     throw new Error('SpeakerVerifier is not initialized');
  //   }

  //   const mel = this.createMelSpectrogram(samples);

  //   const fixedMel = this.fixMelFrames(
  //     mel,
  //     128,
  //     128,
  //   );

  //   // const input = new ort.Tensor(
  //   //   'float32',
  //   //   mel,
  //   //   [1, this.melBins, this.getFrameCount(samples)],
  //   // );
  //   const input = new ort.Tensor(
  //     'float32',
  //     fixedMel,
  //     [1, 128, 128],
  //   );

  //   const result = await this.session.run({
  //     mel_spectrogram: input,
  //   });

  //   const output =
  //     result.speaker_embedding ??
  //     Object.values(result)[0];

  //   return new Float32Array(output.data as Float32Array);
  // }
  private async getEmbedding(audio: Buffer): Promise<Float32Array> {
    // convert PCM Buffer -> Float32Array
    const samples = new Float32Array(audio.length / 2);
  
    for (let i = 0; i < samples.length; i++) {
      samples[i] = audio.readInt16LE(i * 2) / 32768;
    }
  
    // your mel spectrogram generation
    const mel = this.createMelSpectrogram(samples);
  
    // model expects [1, 128, 128]
    const fixedMel = this.fixMelFrames(mel, 128, 128);
  
    const inputTensor = new ort.Tensor(
      'float32',
      fixedMel,
      [1, 128, 128],
    );
  if (!this.session) {
  throw new Error('Speaker model is not initialized');
}

    const output = await this.session.run({
      mel_spectrogram: inputTensor,
    });
  
// console.log('Model outputs:', Object.keys(output));

// for (const [name, tensor] of Object.entries(output)) {
//   console.log(
//     name,
//     'dims:', tensor.dims,
//     'type:', tensor.type,
//     'length:', tensor.data.length,
//   );
// }
    return output.speaker_embedding.data as Float32Array;
  }

  private pcm16ToFloat32(
    buffer: Buffer,
  ): Float32Array {
    const sampleCount = Math.floor(buffer.length / 2);
    const samples = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
      samples[i] =
        buffer.readInt16LE(i * 2) / 32768;
    }

    return samples;
  }

  private getFrameCount(samples: Float32Array): number {
    if (samples.length < this.fftSize) {
      return 1;
    }

    return (
      Math.floor(
        (samples.length - this.fftSize) /
          this.hopSize,
      ) + 1
    );
  }

  private createMelSpectrogram(
    samples: Float32Array,
  ): Float32Array {
    const frameCount =
      this.getFrameCount(samples);

    const output = new Float32Array(
      this.melBins * frameCount,
    );

    const fft = new FFT(this.fftSize);

    const input = new Float64Array(this.fftSize);
    const spectrum = new Float64Array(
      this.fftSize * 2,
    );

    const filters = this.createMelFilters();

    for (let frame = 0; frame < frameCount; frame++) {
      const offset = frame * this.hopSize;

      input.fill(0);

      for (let i = 0; i < this.fftSize; i++) {
        const index = offset + i;

        if (index < samples.length) {
          // Hann window
          const window =
            0.5 -
            0.5 *
              Math.cos(
                (2 * Math.PI * i) /
                  (this.fftSize - 1),
              );

          input[i] = samples[index] * window;
        }
      }

      fft.realTransform(spectrum, input);
      fft.completeSpectrum(spectrum);

      const power = new Float64Array(
        this.fftSize / 2 + 1,
      );

      for (
        let k = 0;
        k <= this.fftSize / 2;
        k++
      ) {
        const re = spectrum[k * 2];
        const im = spectrum[k * 2 + 1];

        power[k] =
          (re * re + im * im) /
          this.fftSize;
      }

      for (let m = 0; m < this.melBins; m++) {
        let energy = 0;

        const filter = filters[m];

        for (
          let k = filter.start;
          k <= filter.end;
          k++
        ) {
          energy +=
            power[k] * filter.weights[k - filter.start];
        }

        // Model expects log(clamp(x, 1e-5))
        output[
          m * frameCount + frame
        ] = Math.log(
          Math.max(energy, 1e-5),
        );
      }
    }

    /*
     * The model documentation describes input as:
     * [batch, time, 128]
     *
     * Our data above is [128, time],
     * so transpose it.
     */
    const transposed = new Float32Array(
      frameCount * this.melBins,
    );

    for (let t = 0; t < frameCount; t++) {
      for (let m = 0; m < this.melBins; m++) {
        transposed[
          t * this.melBins + m
        ] = output[
          m * frameCount + t
        ];
      }
    }

    return transposed;
  }

  private createMelFilters() {
    const filters: {
      start: number;
      end: number;
      weights: Float64Array;
    }[] = [];

    const lowMel = this.hzToMel(0);
    const highMel =
      this.hzToMel(this.sampleRate / 2);

    const melPoints = new Float64Array(
      this.melBins + 2,
    );

    for (
      let i = 0;
      i < melPoints.length;
      i++
    ) {
      melPoints[i] =
        lowMel +
        ((highMel - lowMel) * i) /
          (this.melBins + 1);
    }

    const hzPoints = Array.from(
      melPoints,
      (m) => this.melToHz(m),
    );

    const binWidth =
      this.sampleRate / this.fftSize;

    const bins = hzPoints.map((hz) =>
      Math.floor(hz / binWidth),
    );

    for (let m = 0; m < this.melBins; m++) {
      const left = bins[m];
      const center = bins[m + 1];
      const right = bins[m + 2];

      const start = left;
      const end = Math.min(
        right,
        this.fftSize / 2,
      );

      const weights = new Float64Array(
        Math.max(0, end - start + 1),
      );

      for (
        let k = start;
        k <= end;
        k++
      ) {
        let weight = 0;

        if (k >= left && k < center) {
          weight =
            (k - left) /
            Math.max(1, center - left);
        } else if (
          k >= center &&
          k <= right
        ) {
          weight =
            (right - k) /
            Math.max(1, right - center);
        }

        weights[k - start] = weight;
      }

      filters.push({
        start,
        end,
        weights,
      });
    }

    return filters;
  }

  /*
   * Slaney-style mel scale.
   *
   * The model specifies Slaney mel preprocessing.
   */
  private hzToMel(hz: number): number {
    return (
      1127 *
      Math.log(
        1 + hz / 700,
      )
    );
  }

  private melToHz(mel: number): number {
    return (
      700 *
      (Math.exp(mel / 1127) - 1)
    );
  }

  private normalize(
    vector: Float32Array,
  ): Float32Array {
    let sum = 0;

    for (const value of vector) {
      sum += value * value;
    }

    const norm = Math.sqrt(sum) || 1;

    const result = new Float32Array(
      vector.length,
    );

    for (let i = 0; i < vector.length; i++) {
      result[i] = vector[i] / norm;
    }

    return result;
  }

  private cosine(
    a: Float32Array,
    b: Float32Array,
  ): number {
    let dot = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }

    return dot;
  }

  private ensureInitialized(): void {
    if (!this.session) {
      throw new Error(
        'Call await verifier.init() first',
      );
    }
  }
  private fixMelFrames(
    mel: Float32Array,
    melBins: number,
    targetFrames: number,
  ): Float32Array {
    const frames = mel.length / melBins;
  
    if (!Number.isInteger(frames)) {
      throw new Error(
        `Invalid mel shape: ${mel.length} values for ${melBins} bins`,
      );
    }
  
    const output = new Float32Array(melBins * targetFrames);
  
    const copyFrames = Math.min(frames, targetFrames);
  
    for (let frame = 0; frame < copyFrames; frame++) {
      for (let melBin = 0; melBin < melBins; melBin++) {
        output[melBin * targetFrames + frame] =
          mel[melBin * frames + frame];
      }
    }
  
    return output;
  }

  public getRefs() {
    return this.refs
  }
  private getReferenceAudio(personId: string): Buffer | null {
    const ref = this.refs.get(personId);
  
    if (!ref) {
      return null;
    }
  
    const minBytes =
      this.sampleRate *
      this.bytesPerSample *
      this.channels *
      (this.minReferenceMs / 1000);
  
    if (ref.totalBytes < minBytes) {
      return null;
    }
  
    return Buffer.concat(ref.audio);
  }
  private cosineSimilarity(
    a: Float32Array,
    b: Float32Array,
  ): number {
    if (a.length !== b.length) {
      throw new Error(
        `Embedding dimensions don't match: ${a.length} vs ${b.length}`,
      );
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
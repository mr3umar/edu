declare module 'sherpa-onnx-node' {
        export interface Waveform {
          sampleRate: number;
          samples: Float32Array;
        }
      
        export class OnlineStream {
          acceptWaveform(wave: Waveform): void;
          inputFinished(): void;
        }
      
        export interface SpeakerEmbeddingExtractorConfig {
          model: string;
          numThreads?: number;
          debug?: boolean;
          provider?: 'cpu' | 'cuda' | 'coreml' | string;
        }
      
        export class SpeakerEmbeddingExtractor {
          constructor(config: SpeakerEmbeddingExtractorConfig);
          readonly dim: number;
          createStream(): OnlineStream;
          isReady(stream: OnlineStream): boolean;
          compute(stream: OnlineStream, enableExternalBuffer?: boolean): Float32Array;
        }
      
        export class SpeakerEmbeddingManager {
          constructor(dim: number);
          add(speaker: { name: string; v: Float32Array }): boolean;
          addMulti(speaker: { name: string; v: Float32Array[] }): boolean;
          remove(name: string): boolean;
          search(query: { v: Float32Array; threshold: number }): string;
          verify(query: { name: string; v: Float32Array; threshold: number }): boolean;
          contains(name: string): boolean;
          getNumSpeakers(): number;
          getAllSpeakerNames(): string[];
        }
      }
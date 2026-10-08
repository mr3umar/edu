export class AudioStreamAccumulator {
        private readonly bytesPerMs: number;
        private readonly accumulationBytes: number;
      
        private chunks: Buffer[] = [];
        private accumulatedBytes = 0;
        private dataHandler?: (buffer: Buffer) => void;
        private endHandler?: () => void;
      
        constructor(
          private readonly sampleRate: number,
          private readonly bytesPerSample: number,
          private readonly channels: number,
          accumulationMs: number,
        ) {
          this.bytesPerMs =
            (sampleRate * bytesPerSample * channels) / 1000;
      
          this.accumulationBytes = Math.floor(
            this.bytesPerMs * accumulationMs,
          );
      
          if (this.accumulationBytes <= 0) {
            throw new Error('accumulationMs must be greater than 0');
          }
        }
      
        onData(handler: (buffer: Buffer) => void): void {
          this.dataHandler = handler;
        }
        onEnd(handler: () => void): void {
          this.endHandler = handler;
        }
      
        write(chunk: Buffer): void {
          if (chunk.length === 0) return;
      
          this.chunks.push(chunk);
          this.accumulatedBytes += chunk.length;
      
          while (this.accumulatedBytes >= this.accumulationBytes) {
            const buffer = this.takeBytes(this.accumulationBytes);
            this.dataHandler?.(buffer);
          }
        }
      
        end(): void {
          if (this.accumulatedBytes > 0) {
            const buffer = this.takeBytes(this.accumulatedBytes);
            this.dataHandler?.(buffer);
          }

          this.endHandler?.()
      
          this.chunks = [];
          this.accumulatedBytes = 0;
        }
      
        private takeBytes(bytes: number): Buffer {
          const result = Buffer.allocUnsafe(bytes);
      
          let offset = 0;
      
          while (offset < bytes && this.chunks.length > 0) {
            const chunk = this.chunks[0];
            const remaining = bytes - offset;
      
            if (chunk.length <= remaining) {
              chunk.copy(result, offset);
              offset += chunk.length;
      
              this.chunks.shift();
            } else {
              chunk.copy(result, offset, 0, remaining);
      
              this.chunks[0] = chunk.subarray(remaining);
              offset += remaining;
            }
          }
      
          this.accumulatedBytes -= bytes;
      
          return result;
        }
      }
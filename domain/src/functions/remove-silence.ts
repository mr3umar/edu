export interface RemoveSilenceOptions {
        /** Sample rate of the PCM16 mono input. */
        sampleRate?: number;
        /** Analysis frame length. */
        frameMs?: number;
        /** Absolute minimum loudness counted as speech (0.01 ≈ -40 dBFS). */
        minRms?: number;
        /** Speech must be this many times louder than the noise floor. */
        noiseMultiplier?: number;
        /** Audio kept before and after each speech region. */
        paddingMs?: number;
        /** Louder bursts shorter than this (clicks, bumps) are dropped. */
        minSpeechMs?: number;
      }
      
      /**
       * Removes silence and background noise from PCM16 mono audio.
       *
       * Returns a new Buffer containing only the speech regions, or undefined
       * when the input is empty or contains no speech.
       */
      export function removeSilence(
        pcm: Buffer,
        options: RemoveSilenceOptions = {},
      ): Buffer | undefined {
        const {
          sampleRate = 24_000,
          frameMs = 20,
          minRms = 0.01,
          noiseMultiplier = 3,
          paddingMs = 100,
          minSpeechMs = 60,
        } = options;
      
        const samplesPerFrame = Math.round((sampleRate * frameMs) / 1000);
        const bytesPerFrame = samplesPerFrame * 2;
        const frameCount = Math.floor(pcm.length / bytesPerFrame);
        if (frameCount === 0) return undefined;
      
        // 1. Loudness (RMS) of each frame
        const rms = new Float64Array(frameCount);
        let peak = 0;
      
        for (let f = 0; f < frameCount; f++) {
          let sum = 0;
          const start = f * bytesPerFrame;
          for (let i = 0; i < samplesPerFrame; i++) {
            const s = pcm.readInt16LE(start + i * 2) / 32768;
            sum += s * s;
          }
          rms[f] = Math.sqrt(sum / samplesPerFrame);
          if (rms[f] > peak) peak = rms[f];
        }
      
        // 2. Adaptive threshold from the noise floor (quietest 20% of frames).
        //    Capped relative to the peak so clips with little silence aren't wiped
        //    out, and never below minRms so pure silence is never kept.
        const sorted = Float64Array.from(rms).sort();
        const noiseFloor = sorted[Math.floor(frameCount * 0.2)];
        const threshold = Math.max(
          minRms,
          Math.min(noiseFloor * noiseMultiplier, peak * 0.25),
        );
      
        // 3. Mark frames above the threshold
        const speech = new Uint8Array(frameCount);
        for (let f = 0; f < frameCount; f++) {
          speech[f] = rms[f] >= threshold ? 1 : 0;
        }
      
        // 4. Drop bursts that are too short to be speech
        const minFrames = Math.ceil(minSpeechMs / frameMs);
        for (let f = 0; f < frameCount; ) {
          if (!speech[f]) {
            f++;
            continue;
          }
          let end = f;
          while (end < frameCount && speech[end]) end++;
          if (end - f < minFrames) speech.fill(0, f, end);
          f = end;
        }
      
        // Nothing left: the whole input is silence
        if (!speech.includes(1)) return undefined;
      
        // 5. Pad around speech so word beginnings and endings survive
        const pad = Math.round(paddingMs / frameMs);
        const keep = new Uint8Array(frameCount);
        for (let f = 0; f < frameCount; f++) {
          if (speech[f]) {
            keep.fill(1, Math.max(0, f - pad), Math.min(frameCount, f + pad + 1));
          }
        }
      
        // 6. Join the kept regions
        const parts: Buffer[] = [];
        let total = 0;
        for (let f = 0; f < frameCount; ) {
          if (!keep[f]) {
            f++;
            continue;
          }
          let end = f;
          while (end < frameCount && keep[end]) end++;
          const part = pcm.subarray(f * bytesPerFrame, end * bytesPerFrame);
          parts.push(part);
          total += part.length;
          f = end;
        }
      
        return Buffer.concat(parts, total);
      }
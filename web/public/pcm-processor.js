class PCMProcessor extends AudioWorkletProcessor {
        process(inputs, outputs, parameters) {
          const input = inputs[0];
          if (input && input[0]) {
            const inputChannel = input[0]; // Get Float32 array from mic
            
            // Convert Float32 samples down to Int16 values
            const pcmBuffer = new Int16Array(inputChannel.length);
            for (let i = 0; i < inputChannel.length; i++) {
              pcmBuffer[i] = Math.min(1, Math.max(-1, inputChannel[i])) * 0x7FFF;
            }
      
            // Ship the raw buffer bytes straight out to the main React thread
            this.port.postMessage(pcmBuffer.buffer, [pcmBuffer.buffer]);
          }
          return true;
        }
      }
      
      registerProcessor('pcm-processor', PCMProcessor);
      
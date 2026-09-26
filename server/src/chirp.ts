import { v2 } from '@google-cloud/speech';
//@ts-ignore
import { google } from '@google-cloud/speech/build/protos/protos';

const projectId = 'tribal-flux-500202-n6'; 
const location = 'asia-southeast1'; 

// Initialize client with correct structural properties matching the TS interfaces
const client = new v2.SpeechClient({
  apiEndpoint: `${location}-speech.googleapis.com`,
  projectId: projectId,
  libName: 'gccl',
  libVersion: '7.3.1',
});

const customRecognizer = `projects/${projectId}/locations/${location}/recognizers/r1`;

export async function streamAudioToChirp() {
  
  const recognitionConfig: google.cloud.speech.v2.IRecognitionConfig = {
    explicitDecodingConfig: {
      encoding: 'LINEAR16', 
      sampleRateHertz: 16000, 
      audioChannelCount: 1
    },
    languageCodes: ['ar-SA'],
    model: 'short' 
  };

  const streamingRecognitionConfig: google.cloud.speech.v2.IStreamingRecognitionConfig = {
    config: recognitionConfig,
    streamingFeatures: {
      interimResults: true,
    }
  };

  const streamingRecognizeRequest: google.cloud.speech.v2.IStreamingRecognizeRequest = {
    recognizer: customRecognizer,
    streamingConfig: streamingRecognitionConfig,
  };

  // THE FIX: Use the explicit underscore-prefixed gRPC method variation.
  // We pass the routing context inside the options parameters as the second argument here.
  const recognizeStream = (client as any)
    ._streamingRecognize(
      {}, // Empty configuration block placeholder
      {
        otherArgs: {
          headers: {
        //     'x-goog-request-params': `project=projects/${projectId}/locations/${location}`,
        //     'google-cloud-resource-prefix': `projects/${projectId}/locations/${location}`
          }
        }
      }
    )
    .on('error', (err: any) => {
        console.error('API Error:', err);
    })
    .on('data', async (data: any) => { 
        const result = data.results?.[0];

        console.log(JSON.stringify(result))
        if (result?.alternatives?.[0]) {
          const transcript = result.alternatives[0].transcript;
          if (result.isFinal) {
            console.log(`\n[FINAL TRANSCRIPT]: ${transcript}\n`);
          } else {
            process.stdout.write(`[Interim]: ${transcript}\r`);
          }
        }
    });

  // Now when we call write, the underlying stream context has been securely locked to asia-southeast1
  recognizeStream.write(streamingRecognizeRequest);

  console.log('Chirp Stream Opened. Ready to pipe real-time payload frames...');

  let ended = false
  return {
    write: async (chunk: Buffer) => {
        console.log(`voice recived`, recognizeStream.destroyed)
        if(ended){
                return
        }
      if (!recognizeStream.destroyed) {
                recognizeStream.write({ audio: chunk });
      }
    },
    end: () => {
      console.log('Closing backend streaming link...');
      if (!recognizeStream.destroyed) {
        // recognizeStream.end();
      }
    }
  };
}
import WebSocket from 'ws';

const apiKey = process.env.XAI_API_KEY;

export async function streamAudioToGrok(delegate: {
  onMessage: (msg: {
    data: {
      content: string;
      lastChunk: boolean;
    };
  }) => void;
}) {
  // Your audio is 24kHz PCM16 mono
  const url =
    'wss://api.x.ai/v1/stt' +
    '?sample_rate=24000' +
    '&encoding=pcm' +
    '&interim_results=true' +
    '&endpointing=400' + 
    '&language=ar-SA';

  const ws = new WebSocket(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  let ended = false;
  let serverReady = false;
  let lastChunk = false;

  // Context is only used by your application.
  // Grok STT does not have an OpenAI-style session.update prompt.
  let contextPrompt: string | undefined;

  ws.on('error', (err) => {
    console.error('Grok STT Error:', err);
  });

  ws.on('open', () => {
    console.log('Grok STT WebSocket connected...');
  });

  ws.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());

      switch (response.type) {
        case 'transcript.created':
          serverReady = true;
          console.log('Grok STT ready — streaming audio...');
          break;

        case 'transcript.partial': {
          const text = response.text || '';

          if (response.is_final) {
            console.log(
              `[FINAL${response.speech_final ? ' / UTTERANCE' : ''}]: ${text}`
            );

            // Only send the completed utterance to your application
            if (response.speech_final) {
              delegate.onMessage({
                data: {
                  content: text,
                  lastChunk,
                },
              });

              lastChunk = false;
            }
          } else {
            process.stdout.write(`[Interim]: ${text}\r`);
          }

          break;
        }

        case 'transcript.done':
          console.log(
            `\n[Grok STT DONE]: ${response.text || ''}\n`
          );

          // In case the final transcript arrives only here
          if (response.text) {
            delegate.onMessage({
              data: {
                content: response.text,
                lastChunk,
              },
            });
          }

          break;

        case 'error':
          console.error('Grok STT error:', response);
          break;
      }
    } catch (err) {
      console.error('Failed to parse Grok STT message:', err);
    }
  });

  return {
    updateContext: (lastAiMessage: string) => {
      contextPrompt = lastAiMessage;

      console.log(
        `[Session Context Updated]: Expecting answer to "${lastAiMessage}"`
      );

      // IMPORTANT:
      // Grok STT streaming does not support a session.update
      // prompt like OpenAI transcription sessions.
      //
      // Keep the context in your application and use it when
      // processing the resulting transcript.
    },

    write: async (chunk: string) => {
      lastChunk = false;

      if (
        ended ||
        ws.readyState !== WebSocket.OPEN ||
        !serverReady
      ) {
        return;
      }

      // Your `chunk` is base64 PCM.
      // Grok expects RAW binary PCM.
      const audioBuffer = Buffer.from(chunk, 'base64');

      // Send raw PCM directly.
      ws.send(audioBuffer);
    },

    end: () => {
//       if (ended) {
//         return;
//       }

//       console.log('[stt ended]');

      lastChunk = true;

//       if (ws.readyState === WebSocket.OPEN) {
//         // Tell Grok that no more audio will be sent.
//         ws.send(
//           JSON.stringify({
//             type: 'audio.done',
//           })
//         );
//       }

//       ended = true;
    },
  };
}
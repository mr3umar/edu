import { MicVAD } from "@ricky0123/vad-web";
import { getCurrentBookUid, getCurrentLanguage, getCurrentPageIndex, setAiAgentStatus, setInterruptedStepId, setPlayingStepIdSource } from "./api/books";
import { createAudioStreamPlayer } from "./audioStreamPlayer";
import type { Socket } from "./socket";
import type { MicDelegate } from "./types/book";

let _mic: any;



export const startLiveConversationVad = async (socket: Socket) => {

        let delegate: MicDelegate | undefined = undefined
        let micStatus = false
        let stopMuteOnly = false

        if (_mic) {
                return _mic;
        }

        _mic = {};
        
        let vadInstance: MicVAD | undefined;

        // A function, not a cached reference: socket.ts replaces the underlying
        // WebSocket on reconnect, so caching it here would keep sending to a dead
        // connection forever after any drop.
        const websocket = () => socket.getSocket();

        const player = createAudioStreamPlayer(() => delegate);
        socket.onIncomingAudio(player.receive);
        socket.onDisconnected(player.connectionLost);
        socket.onRequestSent(player.acceptNewAnswer);
        setPlayingStepIdSource(player.getPlayingStepId);


        // Persistent state variables scoped outside the functions
        let userIsSpeakingSegment = false;
        let frameAccumulator: Float32Array[] = [];
        let accumulatedSamplesCount = 0;
        let maxIsSpeechThisSegment = 0;
        let segmentStartedAt: number | null = null;
        let lastStuckWarningAt = 0;
        let preSpeechFrames: Float32Array[] = [];
        let resampleFrame: any;

        async function start() {
        try {
                // 🎙️ Keep track of whether the user is in an active "speech block"
                userIsSpeakingSegment = false;
                frameAccumulator = [];
                accumulatedSamplesCount = 0;

                // DIAGNOSTIC: highest isSpeech probability seen during the current segment.
                // Logged on misfire/end to tell apart a threshold-tuning issue (close to 0.3)
                // from a signal issue (stayed low throughout — check AGC/NS/mic gain).
                maxIsSpeechThisSegment = 0;

                // DIAGNOSTIC: when the current segment started, and the last time we logged
                // a "still speaking" watchdog warning. If onSpeechEnd never fires, this tells
                // us directly whether the model is continuously above negativeSpeechThreshold
                // (real signal feeding it) or something else is wrong.
                segmentStartedAt = null;
                lastStuckWarningAt = 0;

                // const PRE_SPEECH_MS = 5000; // 5s is long time which cause duplicate phrases in stt model
                const PRE_SPEECH_MS = 100;

                // VAD frame = 512 samples @16kHz = 32ms
                const FRAME_DURATION_MS = 32;

                Math.ceil(PRE_SPEECH_MS / FRAME_DURATION_MS);


                const PRE_SPEECH_FRAMES = Math.ceil(PRE_SPEECH_MS / FRAME_DURATION_MS);

                preSpeechFrames = [];
                // Adjust threshold logic to account for 24kHz chunks (150ms * 24 = 3600 samples)
                // const CHUNK_THRESHOLD_SAMPLES = 3600;
                const CHUNK_THRESHOLD_SAMPLES = 3600 * 2; // 300ms

                // One streaming resampler for the whole session — preserves interpolation
                // continuity across every onFrameProcessed call (see createStreamingResampler).
                resampleFrame = createStreamingResampler();


                // Initialize the official Web VAD client using verified remote mirrors
                vadInstance = await MicVAD.new({
                        // IMPORTANT: legacy model (the default) uses 1536-sample frames = 96ms @16kHz,
                        // not 32ms. All PRE_SPEECH_FRAMES / FRAME_DURATION_MS math below assumes 32ms
                        // frames, which is only true for the v5 model. Without this, the pre-roll buffer
                        // silently holds ~3x the intended duration AND the millisecond log is wrong.
                        // model: "v5",
                        audio: {
                                channelCount: 1,
                                echoCancellation: true,
                                noiseSuppression: true,
                                autoGainControl: true
                        },
                        onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
                        baseAssetPath: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.27/dist/",
                        
                        onSpeechStart: () => {
                                if(stopMuteOnly) {
                                        return
                                }

                                const historyDurationMs = preSpeechFrames.length * 32; // Each frame is 32ms
                                console.log(`🎙️ VAD Triggered! History buffer contains ${historyDurationMs}ms of audio.`);
                                console.log("🎙️ VAD: Speech Started");
                                userIsSpeakingSegment = true;
                                maxIsSpeechThisSegment = 0;
                                segmentStartedAt = performance.now();

                                // Send the pre-roll as its OWN tagged message right away, instead of merging
                                // it into frameAccumulator. If merged, the very next onFrameProcessed call
                                // sees accumulatedSamplesCount already far past CHUNK_THRESHOLD_SAMPLES
                                // (150ms) and immediately flushes it as an ordinary mid-stream 'audio' chunk
                                // — indistinguishable from any other chunk, and never reaching onSpeechEnd's
                                // `ended: true` path. That's why the server saw no distinguishable pre-roll.
                                if (preSpeechFrames.length > 0 && websocket()?.readyState === WebSocket.OPEN) {
                                        // If this interrupts a stream that's playing, its step goes with
                                        // every message of this utterance, even after playback pauses below.
                                        setInterruptedStepId(player.getPlayingStepId());

                                        const preRollSamples = preSpeechFrames.reduce((n, f) => n + f.length, 0);
                                        const preRollBuffer = mergeAndConvertFrames(preSpeechFrames, preRollSamples);
                                        const preRollBase64 = arrayBufferToBase64(preRollBuffer);
                                        socket.send({
                                                event: 'audio',
                                                data: preRollBase64,
                                                preroll: true, // tag so the server can identify this as pre-speech history
                                                currentBookUid: getCurrentBookUid(),
                                                currentPageIndex: getCurrentPageIndex(),
                                                language: getCurrentLanguage()
                                        });

                                        // The user started talking: pause the answer that's
                                        // playing (resumable from the AI icon or playback controls).
                                        // Only if it's actually playing, so nothing sits paused with
                                        // nothing to resume. No 'pause' message: the backend pauses
                                        // its own processing when it receives the preroll.
                                        const playback = player.getState();
                                        if (playback.active && !playback.paused) void player.pause();

                                        // Show the AI as listening now, rather than waiting for
                                        // the backend's "listening" status (same effect).
                                        void setAiAgentStatus('listening');
                                }

                                // Start the live accumulator fresh; normal 150ms chunking takes over from here.
                                frameAccumulator = [];
                                accumulatedSamplesCount = 0;

                                preSpeechFrames = [];
                
                                // if (activeSourcesQueue.length > 0) {
                                //         clearActiveAudioPlayback();
                                //         if (websocket()?.readyState === WebSocket.OPEN) {
                                //                 websocket().send(JSON.stringify({ event: 'user_interrupted' }));
                                //         }
                                // }
                        },
                        
                        onSpeechEnd: (audio) => {
                                console.log(`🎙️ VAD: Speech Ended (segment lasted ${segmentStartedAt !== null ? ((performance.now() - segmentStartedAt) / 1000).toFixed(1) : '?'}s)`);
                                userIsSpeakingSegment = false;
                                segmentStartedAt = null;
                
                                if (frameAccumulator.length > 0 && websocket()?.readyState === WebSocket.OPEN) {
                                        const finalBuffer = mergeAndConvertFrames(frameAccumulator, accumulatedSamplesCount);
                                        const base64String = arrayBufferToBase64(finalBuffer);
                                        socket.send({
                                                event: 'audio',
                                                data: base64String,
                                                ended: true,
                                                currentBookUid: getCurrentBookUid(),
                                                currentPageIndex: getCurrentPageIndex(),
                                                language: getCurrentLanguage()
                                        });

                                        frameAccumulator = [];
                                        accumulatedSamplesCount = 0;
                                }
                                else {
                                        console.warn("⚠️ [VAD] onSpeechEnd fired with an empty frameAccumulator — no audio captured for this segment. " +
                                                "This means onSpeechStart never populated frameAccumulator (check preSpeechFrames.length at that moment) " +
                                                "or onFrameProcessed's userIsSpeakingSegment branch never ran.");
                                        socket.send({
                                                event: 'audio-ended',
                                                currentBookUid: getCurrentBookUid(),
                                                currentPageIndex: getCurrentPageIndex(),
                                                language: getCurrentLanguage()
                                        });
                                }

                                // The utterance is done; later messages don't belong to it.
                                setInterruptedStepId(undefined);
                        },

                        // CRITICAL: fires INSTEAD of onSpeechEnd when the segment was too short
                        // (under minSpeechMs, default 400ms) and is judged a false positive.
                        // Without this handler, userIsSpeakingSegment is never reset to false and
                        // the server never receives any end-of-segment signal for this utterance —
                        // the preroll already sent via onSpeechStart is left orphaned, with no
                        // 'ended: true' or finalize event ever following it.
                        onVADMisfire: () => {
                                console.log(`🎙️ VAD: Misfire (segment too short, discarding). Peak isSpeech probability this segment: ${maxIsSpeechThisSegment.toFixed(3)} (threshold: 0.3)`);
                                userIsSpeakingSegment = false;
                                segmentStartedAt = null;

                                // Tell the server this segment is abandoned so it can close out
                                // whatever file/buffer it opened in response to the preroll message,
                                // instead of leaving it open indefinitely.
                                if (websocket()?.readyState === WebSocket.OPEN) {
                                        socket.send({
                                                event: 'audio-misfire',
                                                currentBookUid: getCurrentBookUid(),
                                                currentPageIndex: getCurrentPageIndex(),
                                                language: getCurrentLanguage()
                                        });
                                }

                                frameAccumulator = [];
                                accumulatedSamplesCount = 0;
                                setInterruptedStepId(undefined);
                        },
                        
                        onFrameProcessed: (probabilities, frame) => {
                                // DIAGNOSTIC: track how close the model got to triggering, so a misfire's
                                // log tells us whether this is a threshold-tuning issue (probability got
                                // close to 0.3 but not quite) or a signal issue (probability stayed low
                                // the whole time, suggesting AGC/NS is suppressing speech characteristics
                                // before Silero ever sees them).
                                if (probabilities?.isSpeech > maxIsSpeechThisSegment) {
                                        maxIsSpeechThisSegment = probabilities.isSpeech;
                                }

                                // WATCHDOG: if we've been "speaking" for unusually long (>3s past the
                                // default 1400ms redemption window) without onSpeechEnd/onVADMisfire firing,
                                // log the live probability every ~2s so we can see directly whether the
                                // model is continuously reporting isSpeech above negativeSpeechThreshold
                                // (real sustained signal) rather than guessing blind.
                                if (userIsSpeakingSegment && segmentStartedAt !== null) {
                                        const elapsed = performance.now() - segmentStartedAt;
                                        if (elapsed > 5000 && performance.now() - lastStuckWarningAt > 2000) {
                                                lastStuckWarningAt = performance.now();
                                                console.warn(`⚠️ [VAD Watchdog] Segment has been active for ${(elapsed / 1000).toFixed(1)}s with no onSpeechEnd/onVADMisfire. ` +
                                                        `Current isSpeech: ${probabilities?.isSpeech?.toFixed(3)} (negativeSpeechThreshold: 0.25). ` +
                                                        `If this stays above 0.25 continuously, something is keeping the mic input classified as speech ` +
                                                        `(background noise, room echo, hum, or a stuck/looping audio source feeding the input).`);
                                        }
                                }

                                // Resample using the session-scoped streaming resampler so interpolation
                                // carries continuously across frame boundaries (no per-frame seam/crackle).
                                const frame24k = resampleFrame(frame);
                
                                preSpeechFrames.push(frame24k);
                
                                if (preSpeechFrames.length > PRE_SPEECH_FRAMES) {
                                        preSpeechFrames.shift();
                                }
                
                                if (userIsSpeakingSegment) {
                                        frameAccumulator.push(frame24k);
                                        accumulatedSamplesCount += frame24k.length;
                
                                        if (accumulatedSamplesCount >= CHUNK_THRESHOLD_SAMPLES && websocket()?.readyState === WebSocket.OPEN) {
                                                if (websocket().bufferedAmount < 1024 * 1024) {
                                                        const int16Buffer = mergeAndConvertFrames(frameAccumulator, accumulatedSamplesCount);
                                                        const base64String = arrayBufferToBase64(int16Buffer);
                
                                                        socket.send({
                                                                event: 'audio',
                                                                data: base64String,
                                                                currentBookUid: getCurrentBookUid(),
                                                                currentPageIndex: getCurrentPageIndex(),
                                                                language: getCurrentLanguage()
                                                        });
                                                }
                                                
                                                frameAccumulator = [];
                                                accumulatedSamplesCount = 0;
                                        }
                                }
                        }
                } as any); // Bypasses version-specific option mismatches in the TS checker

                await vadInstance.start();
                micStatus = true
                delegate?.onMicStatusChanged(micStatus)

        } catch (err) {
                console.error("Failed to start VAD live session", err);
        }
        }

        async function stop(muteOnly: boolean) {
                stopMuteOnly = muteOnly
                if(stopMuteOnly) {
                        return
                }
                try {
                        if (vadInstance) {
                                // Stop processing audio and release underlying hardware stream
                                await vadInstance.destroy();
                                vadInstance = null;
                        }
                        
                        // Reset functional states cleanly
                        userIsSpeakingSegment = false;
                        setInterruptedStepId(undefined);
                        frameAccumulator = [];
                        accumulatedSamplesCount = 0;
                        preSpeechFrames = [];
                        segmentStartedAt = null;
                        
                        micStatus = false
                        delegate?.onMicStatusChanged(micStatus)
                } catch (err) {
                        console.error("Failed to safely stop VAD session", err);
                }
        }

        _mic.stop = stop
        _mic.start = start
        _mic.endPlayback = player.stop
        _mic.cancelPlayback = player.cancel
        _mic.stopPlaying = player.pause
        _mic.resumePlaying = player.resume
        _mic.playNextStream = player.playNextStream
        _mic.rewindStream = player.rewindStream
        _mic.setPlaybackRate = player.setPlaybackRate
        _mic.getPlaybackRate = player.getPlaybackRate
        _mic.isPlaybackPaused = player.isPaused
        _mic.getPlaybackState = player.getState
        _mic.answerComplete = player.answerComplete
        _mic.getSpeechProgress = player.getSpeechProgress
        _mic.setDelegate = (del: MicDelegate) => {
                delegate = del
        }

        return _mic;
};

function float32ToInt16Buffer(float32Array: Float32Array): ArrayBuffer {
        const buffer = new ArrayBuffer(float32Array.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < float32Array.length; i++) {
                let s = Math.max(-1, Math.min(1, float32Array[i]));
                view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
        return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
}

// Merges an array of Float32Array frames into a single Int16 ArrayBuffer
function mergeAndConvertFrames(frames: Float32Array[], totalSamples: number): ArrayBuffer {
        const buffer = new ArrayBuffer(totalSamples * 2);
        const view = new DataView(buffer);
        
        let offset = 0;
        for (const frame of frames) {
                for (let i = 0; i < frame.length; i++) {
                        let s = Math.max(-1, Math.min(1, frame[i]));
                        view.setInt16(offset * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
                        offset++;
                }
        }
        return buffer;
}


// Stateful 16kHz -> 24kHz resampler. Carries the trailing sample from the previous
// call as interpolation context, so consecutive frames produced by onFrameProcessed
// (called once per 32ms frame) resample as one continuous stream instead of each
// frame being resampled in isolation. Resampling frames independently clamps the
// interpolation at each frame's last sample (since the "next" sample doesn't exist
// within that frame), injecting a small discontinuity at every frame boundary —
// audible as periodic crackle at ~31 times/second during continuous speech.
//
// Call createStreamingResampler() once per recording session (e.g. when VAD starts)
// and reuse the returned function for every frame in that session.
export function createStreamingResampler() {
        const ratio = 24000 / 16000; // 1.5
        let carry: number | null = null; // last input sample from the previous call

        return function resampleChunk(input: Float32Array): Float32Array {
                // Prepend the carried-over sample so interpolation has real context
                // at the start of this chunk instead of starting cold.
                const extended = carry === null
                        ? input
                        : (() => {
                                const buf = new Float32Array(input.length + 1);
                                buf[0] = carry as number;
                                buf.set(input, 1);
                                return buf;
                        })();

                const offset = carry === null ? 0 : 1; // index in `extended` where `input` actually starts
                const outputLength = Math.round(input.length * ratio);
                const output = new Float32Array(outputLength);

                for (let i = 0; i < outputLength; i++) {
                        const srcIndex = offset + i / ratio;
                        const i0 = Math.floor(srcIndex);
                        const i1 = Math.min(i0 + 1, extended.length - 1);
                        const frac = srcIndex - i0;
                        output[i] = extended[i0] * (1 - frac) + extended[i1] * frac;
                }

                carry = input[input.length - 1];
                return output;
        };
}

// Stateless version kept for one-off / non-streaming use (e.g. resampling a
// complete, already-finished audio buffer). Do NOT use this in a per-frame loop —
// use createStreamingResampler() instead, or you'll reintroduce the frame-boundary
// crackle described above.
export function resample16kTo24k(input: Float32Array): Float32Array {
        const ratio = 24000 / 16000; // 1.5
        const outputLength = Math.round(input.length * ratio);
        const output = new Float32Array(outputLength);
    
        for (let i = 0; i < outputLength; i++) {
            const srcIndex = i / ratio;
    
            const i0 = Math.floor(srcIndex);
            const i1 = Math.min(i0 + 1, input.length - 1);
    
            const frac = srcIndex - i0;
    
            output[i] =
                input[i0] * (1 - frac) +
                input[i1] * frac;
        }
    
        return output;
    }
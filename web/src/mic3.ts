import { MicVAD } from "@ricky0123/vad-web";
import { getCurrentBookUid, getCurrentLanguage, getCurrentPageIndex, setAiAgentStatus, setInterruptedStepId, setPlayingStepIdSource } from "./api/books";
import { createAudioStreamPlayer } from "./audioStreamPlayer";
import type { Socket } from "./socket";
import type { MicDelegate } from "./types/book";
import { markVadEvent, vadEventsSince } from "./lib/vadDiagnostics";
import { startNewRequest } from "./lib/requestId";
import { dbfsToLevel, setMicLevel } from "./lib/voiceLevel";

let _mic: any;

// When the user starts talking, pause the answer that's playing (old behavior).
// Off: the answer keeps playing while the user speaks. Set to true to revert.
const PAUSE_PLAYBACK_ON_SPEECH = false;



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
        // DIAGNOSTIC: the wrappers note the tutor's audio arriving (see logRecordingTimeline).
        const streamsWithAudio = new Set<string>();
        socket.onIncomingAudio((base64, wordsIds, seq, streamId, ...rest) => {
                if (!streamsWithAudio.has(streamId)) {
                        streamsWithAudio.add(streamId);
                        markVadEvent(`tutor audio: first chunk of stream ${streamId}`);
                }
                player.receive(base64, wordsIds, seq, streamId, ...rest);
        });
        socket.onStreamAnnounced((streamId, info) => {
                markVadEvent(`tutor audio: stream ${streamId} announced`);
                player.announce(streamId, info);
        });
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
        // isSpeech probability of each frame, kept in step with preSpeechFrames /
        // frameAccumulator so every message can report its chunk's average.
        let preSpeechIsSpeech: number[] = [];
        let accumulatorIsSpeech: number[] = [];
        // DIAGNOSTIC: recent frames (speech probability and loudness), logged with
        // what happened around the mic when a recording ends (see logRecordingTimeline).
        let recentFrames: { at: number; isSpeech: number; loudnessDbfs: number }[] = [];
        let resampleFrame: any;
        // Identifies one utterance: set when speech starts (with the preroll) and sent
        // with every audio message of it, through the closing `ended: true` (or the
        // audio-ended / audio-misfire message that closes it instead).
        let recordingId: string | undefined;

        async function start() {
        try {
                // 🎙️ Keep track of whether the user is in an active "speech block"
                userIsSpeakingSegment = false;
                frameAccumulator = [];
                accumulatedSamplesCount = 0;
                accumulatorIsSpeech = [];

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
                preSpeechIsSpeech = [];
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
                                // Off so loudnessDbfs reflects how far the speaker is from the mic:
                                // AGC boosts quiet input, making a distant TV look as loud as the user.
                                autoGainControl: false
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
                                // A spoken question is a new request: from here on, what's still
                                // arriving for earlier ones is skipped (see socket.ts).
                                recordingId = startNewRequest();
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
                                                recordingId,
                                                requestId: recordingId,
                                                ...chunkMetrics(preSpeechFrames, preSpeechIsSpeech),
                                                currentBookUid: getCurrentBookUid(),
                                                currentPageIndex: getCurrentPageIndex(),
                                                language: getCurrentLanguage()
                                        });

                                        // The user started talking: pause the answer that's
                                        // playing (resumable from the AI icon or playback controls).
                                        // Only if it's actually playing, so nothing sits paused with
                                        // nothing to resume. No 'pause' message: the backend pauses
                                        // its own processing when it receives the preroll.
                                        if (PAUSE_PLAYBACK_ON_SPEECH) {
                                                const playback = player.getState();
                                                if (playback.active && !playback.paused) void player.pause();
                                        }

                                        // Show the AI as listening now, rather than waiting for
                                        // the backend's "listening" status (same effect).
                                        void setAiAgentStatus('listening');
                                }

                                // Start the live accumulator fresh; normal 150ms chunking takes over from here.
                                frameAccumulator = [];
                                accumulatedSamplesCount = 0;
                                accumulatorIsSpeech = [];

                                preSpeechFrames = [];
                                preSpeechIsSpeech = [];
                
                                // if (activeSourcesQueue.length > 0) {
                                //         clearActiveAudioPlayback();
                                //         if (websocket()?.readyState === WebSocket.OPEN) {
                                //                 websocket().send(JSON.stringify({ event: 'user_interrupted' }));
                                //         }
                                // }
                        },
                        
                        onSpeechEnd: (audio) => {
                                console.log(`🎙️ VAD: Speech Ended (segment lasted ${segmentStartedAt !== null ? ((performance.now() - segmentStartedAt) / 1000).toFixed(1) : '?'}s)`);
                                logRecordingTimeline(recordingId, recentFrames, segmentStartedAt);
                                userIsSpeakingSegment = false;
                                segmentStartedAt = null;
                
                                if (frameAccumulator.length > 0 && websocket()?.readyState === WebSocket.OPEN) {
                                        const finalBuffer = mergeAndConvertFrames(frameAccumulator, accumulatedSamplesCount);
                                        const base64String = arrayBufferToBase64(finalBuffer);
                                        socket.send({
                                                event: 'audio',
                                                data: base64String,
                                                ended: true,
                                                recordingId,
                                                requestId: recordingId,
                                                ...chunkMetrics(frameAccumulator, accumulatorIsSpeech),
                                                currentBookUid: getCurrentBookUid(),
                                                currentPageIndex: getCurrentPageIndex(),
                                                language: getCurrentLanguage()
                                        });

                                        frameAccumulator = [];
                                        accumulatedSamplesCount = 0;
                                        accumulatorIsSpeech = [];
                                }
                                else {
                                        console.warn("⚠️ [VAD] onSpeechEnd fired with an empty frameAccumulator — no audio captured for this segment. " +
                                                "This means onSpeechStart never populated frameAccumulator (check preSpeechFrames.length at that moment) " +
                                                "or onFrameProcessed's userIsSpeakingSegment branch never ran.");
                                        socket.send({
                                                event: 'audio-ended',
                                                recordingId,
                                                requestId: recordingId,
                                                currentBookUid: getCurrentBookUid(),
                                                currentPageIndex: getCurrentPageIndex(),
                                                language: getCurrentLanguage()
                                        });
                                }

                                // The utterance is done; later messages don't belong to it.
                                setInterruptedStepId(undefined);
                                recordingId = undefined;
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
                                                recordingId,
                                                requestId: recordingId,
                                                currentBookUid: getCurrentBookUid(),
                                                currentPageIndex: getCurrentPageIndex(),
                                                language: getCurrentLanguage()
                                        });
                                }

                                frameAccumulator = [];
                                accumulatedSamplesCount = 0;
                                accumulatorIsSpeech = [];
                                setInterruptedStepId(undefined);
                                recordingId = undefined;
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
                
                                const isSpeech = probabilities?.isSpeech ?? 0;

                                const now = performance.now();
                                const loudnessDbfs = chunkMetrics([frame], []).loudnessDbfs;
                                recentFrames.push({ at: now, isSpeech, loudnessDbfs });
                                // For the AI icon's level meter.
                                setMicLevel(dbfsToLevel(loudnessDbfs));
                                while (recentFrames.length > 0 && now - recentFrames[0].at > RECENT_FRAMES_MS) recentFrames.shift();

                                preSpeechFrames.push(frame24k);
                                preSpeechIsSpeech.push(isSpeech);
                
                                if (preSpeechFrames.length > PRE_SPEECH_FRAMES) {
                                        preSpeechFrames.shift();
                                        preSpeechIsSpeech.shift();
                                }
                
                                if (userIsSpeakingSegment) {
                                        frameAccumulator.push(frame24k);
                                        accumulatorIsSpeech.push(isSpeech);
                                        accumulatedSamplesCount += frame24k.length;
                
                                        if (accumulatedSamplesCount >= CHUNK_THRESHOLD_SAMPLES && websocket()?.readyState === WebSocket.OPEN) {
                                                if (websocket().bufferedAmount < 1024 * 1024) {
                                                        const int16Buffer = mergeAndConvertFrames(frameAccumulator, accumulatedSamplesCount);
                                                        const base64String = arrayBufferToBase64(int16Buffer);
                
                                                        socket.send({
                                                                event: 'audio',
                                                                data: base64String,
                                                                recordingId,
                                                                requestId: recordingId,
                                                                ...chunkMetrics(frameAccumulator, accumulatorIsSpeech),
                                                                currentBookUid: getCurrentBookUid(),
                                                                currentPageIndex: getCurrentPageIndex(),
                                                                language: getCurrentLanguage()
                                                        });
                                                }
                                                
                                                frameAccumulator = [];
                                                accumulatedSamplesCount = 0;
                                                accumulatorIsSpeech = [];
                                        }
                                }
                        }
                } as any); // Bypasses version-specific option mismatches in the TS checker

                await vadInstance.start();

                // DIAGNOSTIC: what the browser actually applied to the mic, and when it
                // goes silent on its own (muted by the OS or another app).
                const track: MediaStreamTrack | undefined = (vadInstance as any)._stream?.getAudioTracks?.()[0];
                if (track) {
                        console.log("🎙️ [VAD Diagnostic] mic settings:", track.getSettings());
                        track.onmute = () => markVadEvent('mic track muted');
                        track.onunmute = () => markVadEvent('mic track unmuted');
                        track.onended = () => markVadEvent('mic track ended');
                }
                micStatus = true
                delegate?.onMicStatusChanged(micStatus)

        } catch (err) {
                console.error("Failed to start VAD live session", err);
                // The caller tells the user (e.g. the microphone is blocked).
                throw err;
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
                        preSpeechIsSpeech = [];
                        accumulatorIsSpeech = [];
                        recentFrames = [];
                        segmentStartedAt = null;
                        recordingId = undefined;
                        
                        micStatus = false
                        delegate?.onMicStatusChanged(micStatus)
                } catch (err) {
                        console.error("Failed to safely stop VAD session", err);
                }
        }

        _mic.stop = stop
        _mic.start = start
        _mic.endPlayback = () => { markVadEvent('playback stopped (new answer)'); return player.stop(); }
        _mic.cancelPlayback = player.cancel
        _mic.stopPlaying = () => { markVadEvent('playback paused'); return player.pause(); }
        _mic.resumePlaying = () => { markVadEvent('playback resumed'); return player.resume(); }
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

// DIAGNOSTIC: how long a stretch of frames is kept for logRecordingTimeline,
// so it covers the whole of most recordings.
const RECENT_FRAMES_MS = 60_000;
// Logged from this long before speech started, to show the level just before it.
const TIMELINE_LEAD_MS = 500;
const NEGATIVE_SPEECH_THRESHOLD = 0.25;
const POSITIVE_SPEECH_THRESHOLD = 0.3;

// DIAGNOSTIC: logs a recording from just before it started to its end: every
// VAD frame (speech probability and loudness), with what happened around the
// mic at the same time (backend statuses, the tutor's audio, the mic track)
// in between. Low probability with low loudness (around -50 dBFS or less) is
// silence at the mic; if that starts while the user is still talking, the
// event just before it is the likely cause.
function logRecordingTimeline(recordingId: string | undefined, frames: { at: number; isSpeech: number; loudnessDbfs: number }[], startedAt: number | null) {
        if (frames.length === 0) return;
        const start = startedAt ?? frames[0].at;
        const from = start - TIMELINE_LEAD_MS;
        const shown = frames.filter(f => f.at >= from);
        const events = vadEventsSince(from);
        const tail = shown.filter(f => f.at >= shown[shown.length - 1].at - 1500);
        const below = tail.filter(f => f.isSpeech < NEGATIVE_SPEECH_THRESHOLD);
        const avgDbBelow = below.length > 0 ? below.reduce((n, f) => n + f.loudnessDbfs, 0) / below.length : undefined;

        const rows = [
                ...shown.map(f => ({
                        at: f.at,
                        row: {
                                msFromStart: Math.round(f.at - start),
                                isSpeech: Number(f.isSpeech.toFixed(3)),
                                loudnessDbfs: f.loudnessDbfs,
                                state: f.isSpeech >= POSITIVE_SPEECH_THRESHOLD ? 'speech' : f.isSpeech < NEGATIVE_SPEECH_THRESHOLD ? 'silence' : 'between',
                                event: '',
                        },
                })),
                ...events.map(e => ({
                        at: e.at,
                        row: { msFromStart: Math.round(e.at - start), isSpeech: '', loudnessDbfs: '', state: '', event: `⚡ ${e.what}` },
                })),
        ].sort((a, b) => a.at - b.at).map(r => r.row);

        console.groupCollapsed(`🎙️ [VAD Diagnostic] recording ${recordingId ?? '?'} ended after ${((shown[shown.length - 1].at - start) / 1000).toFixed(1)}s, ${events.length} event(s): ` +
                `${below.length}/${tail.length} frames in the last 1500ms below ${NEGATIVE_SPEECH_THRESHOLD}` +
                (avgDbBelow !== undefined ? `, their average loudness ${avgDbBelow.toFixed(1)} dBFS` : ''));
        console.table(rows);
        console.groupEnd();
}

// Quietest level reported, instead of -Infinity for pure digital silence
// (which JSON can't carry).
const MIN_LOUDNESS_DBFS = -100;

// Per-message signal metrics so the backend can tell a close speaker from
// background voices (e.g. a TV across the room):
// - avgIsSpeech: mean VAD speech probability of the chunk's frames, 0–1.
// - loudnessDbfs: RMS level of the chunk's samples in dBFS, -100 (silence) to 0 (full scale).
function chunkMetrics(frames: Float32Array[], isSpeech: number[]) {
        let sumSquares = 0;
        let samples = 0;
        for (const frame of frames) {
                for (let i = 0; i < frame.length; i++) sumSquares += frame[i] * frame[i];
                samples += frame.length;
        }
        const rms = samples > 0 ? Math.sqrt(sumSquares / samples) : 0;
        const dbfs = rms > 0 ? 20 * Math.log10(rms) : MIN_LOUDNESS_DBFS;
        const avgIsSpeech = isSpeech.length > 0 ? isSpeech.reduce((a, b) => a + b, 0) / isSpeech.length : 0;
        return {
                avgIsSpeech: Math.round(avgIsSpeech * 1000) / 1000,
                loudnessDbfs: Math.round(Math.max(MIN_LOUDNESS_DBFS, dbfs) * 10) / 10
        };
}

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
import SignalsmithStretch, { type StretchNode } from "signalsmith-stretch";
import { showCaption, showLaser, showOptions, writeOnBoard } from "./api/books";
import type { BoardData, MicDelegate, QuestionOption, StepId } from "./types/book";
import { markVadEvent } from "./lib/vadDiagnostics";
import { analyserDbfs, dbfsToLevel, setTutorLevelSource } from "./lib/voiceLevel";
import type { SpeechProgress } from "./lib/captionTiming";

const SAMPLE_RATE = 24000;

// How long to wait for a missing packet before skipping past the gap.
const PACKET_TIMEOUT_MS = 250;

// A stream that gets no packets for this long, while a newer stream has
// already started arriving, is treated as complete. Covers a dropped
// `streamCompleted` packet, which would otherwise hold up every stream behind it.
const STREAM_STALL_MS = 3000;

// Silence left between the end of one stream and the start of the next.
const STREAM_GAP_S = 1.08;

// Lead time so a chunk is never scheduled in the past.
const SCHEDULE_PAD_S = 0.02;

// Audio a stream should have before it starts playing. The backend sends a
// stream's first chunk as soon as it can and the rest can lag behind it;
// started straight away, the first chunk could run out before the second
// arrived and cut the voice off mid-word.
const PREBUFFER_S = 0.3;
// Longest wait for that, from the stream's first audio; then it plays with
// what it has.
const PREBUFFER_MAX_WAIT_MS = 400;

// Only the most recent streams keep their audio for rewinding, so memory
// doesn't grow for the whole session (~96KB per second of audio).
const MAX_STREAMS_WITH_AUDIO = 10;

// Fade used when cutting audio off, so it doesn't click.
const CUT_FADE_S = 0.01;

const MIN_RATE = 0.5;
const MAX_RATE = 2;

type Chunk = { buffer: AudioBuffer; wordsIds: string[] | undefined };

type Packet = { base64Data: string | undefined; wordsIds: string[] | undefined; completed: boolean };

type Stream = {
        id: string;
        board: BoardData | undefined;
        // The lesson step the stream (and its board) belongs to.
        stepId: StepId | undefined;
        // What the stream says, shown as a closed caption while it's heard.
        caption: string | undefined;
        options: QuestionOption[] | undefined;
        // Decoded audio, in sequence order with gaps already skipped.
        chunks: Chunk[];
        // Packets that arrived ahead of a missing one.
        pending: Map<number, Packet>;
        nextSeq: number;
        gapTimer: ReturnType<typeof setTimeout> | null;
        stallTimer: ReturnType<typeof setTimeout> | null;
        lastPacketAt: number;
        // When its first audio arrived (see readyToStart).
        firstAudioAt: number | null;
        completed: boolean;
        evicted: boolean;
        optionsShown: boolean;
        // Announced without any audio (e.g. just options). It plays as a
        // single silent moment, right after the stream before it, so what it
        // carries shows then.
        silent: boolean;
};

// What a stream carries besides its audio (from 'new-audio-stream').
export type StreamInfo = {
        board: BoardData | undefined;
        options: QuestionOption[] | undefined;
        stepId: StepId | undefined;
        caption: string | undefined;
};

type Scheduled = {
        source: AudioBufferSourceNode;
        // Silent nodes whose `ended` events mark when the chunk starts and
        // finishes being heard (source times plus the pitch corrector's delay).
        trigger: ConstantSourceNode;
        endMarker: ConstantSourceNode;
        streamIdx: number;
        chunkIdx: number;
        // Context time the chunk starts and ends at.
        startAt: number;
        endAt: number;
        // Seconds into the chunk's buffer that playback starts from.
        offset: number;
        rate: number;
        // Delay between the chunk's scheduled time and it being heard: the pitch
        // corrector's latency when routed through it, otherwise 0.
        latency: number;
        // Set when unscheduled. The trigger checks it, because an `ended` event the
        // browser queued before the cancel (e.g. held back while paused) can still
        // be delivered after it, and would show a stream we've jumped away from.
        cancelled: boolean;
};

type Position = { streamIdx: number; chunkIdx: number; offset: number };

export type PlaybackState = {
        // Something is playing or paused mid-stream.
        active: boolean;
        paused: boolean;
        rate: number;
        // rewindStream() has somewhere to go: an earlier stream than the one
        // playing (or, once idle, the one that just finished).
        hasPrevious: boolean;
        // A stream after the current one has already arrived.
        hasNext: boolean;
        // Received audio is still to be played: something is queued, or a
        // stream it's waiting on hasn't finished arriving. Cancelled or
        // interrupted answers don't count.
        pending: boolean;
};

// Plays the tutor's audio streams back to back, in the order they arrive, and
// keeps recent ones so they can be rewound. Laser, board and options are
// fired from the audio clock, so they follow pauses, rewinds and speed
// changes instead of running on their own timers.
export function createAudioStreamPlayer(getDelegate: () => MicDelegate | undefined) {
        let ctx: AudioContext | undefined;

        const streams: Stream[] = [];
        const streamIndexById = new Map<string, number>();

        // Everything handed to the audio context that hasn't finished yet, in play order.
        let scheduled: Scheduled[] = [];

        // Next chunk to hand to the audio context.
        let cursorStream = 0;
        let cursorChunk = 0;

        // Context time the last scheduled chunk ends at, plus any silence owed
        // before the next one (between streams).
        let nextStartTime = 0;
        let pendingGap = 0;

        let rate = 1;
        let paused = false;
        let playing = false;

        // Stream whose board content is on screen, so it's written once per play-through.
        let boardStreamIdx = -1;
        // Stream of the last chunk that became audible, for rewinding once playback has gone idle.
        let lastStartedStreamIdx = -1;

        // Speed changes resample the audio (source.playbackRate), which also
        // shifts its pitch. Away from 1x, audio is routed through this pitch
        // shifter, which shifts it back by the same amount: faster or slower
        // speech at the normal pitch. At 1x audio goes straight to the speakers.
        let stretch: StretchNode | undefined;
        // After the shifter, so audio still inside it can be muted on a jump.
        let stretchOutput: GainNode | undefined;
        let stretchLatency = 0;

        // Trigger nodes feed this muted output. Browsers only reliably process
        // (and fire `ended` on time for) nodes connected to the graph.
        let silentSink: GainNode | undefined;
        const triggerSink = (context: AudioContext) => {
                if (!silentSink) {
                        silentSink = context.createGain();
                        silentSink.gain.value = 0;
                        silentSink.connect(context.destination);
                }
                return silentSink;
        };

        // Everything heard also feeds this analyser (muted, through the sink),
        // so the AI icon can show how loud the tutor is.
        let levelTap: AnalyserNode | undefined;
        let levelSamples: Uint8Array<ArrayBuffer> | undefined;
        const levelTapFor = (context: AudioContext) => {
                if (!levelTap) {
                        levelTap = context.createAnalyser();
                        levelTap.fftSize = 512;
                        levelSamples = new Uint8Array(levelTap.fftSize);
                        levelTap.connect(triggerSink(context));
                }
                return levelTap;
        };
        setTutorLevelSource(() => {
                if (!levelTap || !levelSamples) return 0;
                levelTap.getByteTimeDomainData(levelSamples);
                return dbfsToLevel(analyserDbfs(levelSamples));
        });

        const audioContext = () => {
                if (!ctx) {
                        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                        // DIAGNOSTIC: see logRecordingTimeline in mic3.ts.
                        const created = ctx;
                        created.onstatechange = () => markVadEvent(`tutor AudioContext: ${created.state}`);
                        void setUpStretch(ctx);
                }
                return ctx;
        };

        // Undoes the pitch change that resampling at `value` causes.
        const semitonesFor = (value: number) => -12 * Math.log2(value);

        const setUpStretch = async (context: AudioContext) => {
                try {
                        const node = await SignalsmithStretch(context, {
                                numberOfInputs: 1,
                                numberOfOutputs: 1,
                                outputChannelCount: [1],
                        });
                        const gain = context.createGain();
                        node.connect(gain);
                        gain.connect(context.destination);
                        gain.connect(levelTapFor(context));

                        await node.schedule({ active: rate !== 1, semitones: semitonesFor(rate) });
                        stretchLatency = await node.latency();
                        stretch = node;
                        stretchOutput = gain;

                        // Anything queued while it loaded went out uncorrected; move it over.
                        const position = currentPosition();
                        if (rate !== 1 && position) playFrom(position);
                } catch (err) {
                        console.warn("Pitch correction unavailable; speed changes will shift pitch.", err);
                }
        };

        const usingStretch = () => stretch !== undefined && rate !== 1;

        const setPlaying = (value: boolean) => {
                if (playing === value) return;
                playing = value;
                getDelegate()?.onPlayingStatusChanged(value);
        };

        const updatePlaying = () => {
                setPlaying(!paused && scheduled.length > 0);
                emitState();
        };

        let lastState = "";
        const emitState = () => {
                const state = playbackState();
                const key = JSON.stringify(state);
                if (key === lastState) return;
                lastState = key;
                getDelegate()?.onPlaybackStateChanged?.(state);
        };

        const setPaused = (value: boolean) => {
                if (paused === value) return;
                paused = value;
                updatePlaying();
        };

        const decode = (base64Data: string): AudioBuffer | undefined => {
                // Little-endian 16-bit PCM, mono, 24kHz.
                const binaryString = atob(base64Data);
                const sampleCount = Math.floor(binaryString.length / 2);
                if (sampleCount === 0) return undefined;

                const buffer = audioContext().createBuffer(1, sampleCount, SAMPLE_RATE);
                const channelData = buffer.getChannelData(0);
                for (let i = 0; i < sampleCount; i++) {
                        let val = binaryString.charCodeAt(i * 2) | (binaryString.charCodeAt(i * 2 + 1) << 8);
                        if (val & 0x8000) val |= ~0xffff;
                        channelData[i] = val / 32768.0;
                }
                return buffer;
        };

        // ---- Arrival: reorder packets into each stream's chunk list ----

        // The stream with this id, created (in arrival order) the first time
        // it's announced or its audio arrives. Undefined for a cancelled
        // answer's streams, which are dropped.
        const ensureStream = (streamId: string, info: StreamInfo): Stream | undefined => {
                // A cancelled answer: the server may still be sending it.
                if (discardedStreams.has(streamId)) return undefined;

                let streamIdx = streamIndexById.get(streamId);
                if (streamIdx === undefined) {
                        if (discarding) {
                                discardedStreams.add(streamId);
                                return undefined;
                        }
                        streamIdx = streams.push({
                                id: streamId,
                                ...info,
                                chunks: [],
                                pending: new Map(),
                                nextSeq: 0,
                                gapTimer: null,
                                stallTimer: null,
                                lastPacketAt: performance.now(),
                                firstAudioAt: null,
                                completed: false,
                                evicted: false,
                                optionsShown: false,
                                silent: false,
                        }) - 1;
                        streamIndexById.set(streamId, streamIdx);
                        // A new stream: the backend is sending again.
                        noMoreStreams = false;
                        // The ones before it that never got any audio won't get any.
                        for (let i = 0; i < streamIdx; i++) {
                                if (!hasAudioArrived(streams[i])) markSilent(streams[i]);
                        }
                        evictOldAudio();
                        finishStalledStreams();
                }

                const stream = streams[streamIdx];
                // The stream's metadata can land after its first packet.
                stream.board ??= info.board;
                stream.stepId ??= info.stepId;
                stream.caption ??= info.caption;
                stream.options ??= info.options;
                return stream;
        };

        // A stream was announced ('new-audio-stream'). Its audio usually
        // follows; if none has come by the time the next stream is announced
        // or the answer is complete, it has none (see markSilent).
        const announce = (streamId: string, info: StreamInfo) => {
                ensureStream(streamId, info);
                pump();
        };

        const hasAudioArrived = (stream: Stream) =>
                stream.nextSeq > 0 || stream.pending.size > 0 || stream.chunks.length > 0;

        // A single silent sample, standing in for a stream that has no audio.
        let silentBuffer: AudioBuffer | undefined;
        const silence = () => (silentBuffer ??= new AudioBuffer({ length: 1, sampleRate: SAMPLE_RATE }));

        // The stream has no audio: it plays as a silent moment instead, so its
        // options (and board) show when playback reaches it.
        const markSilent = (stream: Stream) => {
                if (stream.completed || stream.evicted) return;
                stream.silent = true;
                stream.chunks = [{ buffer: silence(), wordsIds: undefined }];
                stream.completed = true;
                clearTimers(stream);
        };

        const receive = (
                base64Data: string | undefined,
                wordsIds: string[] | undefined,
                seq: number,
                streamId: string,
                board: BoardData | undefined,
                options: QuestionOption[] | undefined,
                streamCompleted: boolean,
                stepId?: StepId,
                caption?: string,
        ) => {
                const stream = ensureStream(streamId, { board, options, stepId, caption });
                if (!stream || stream.completed || stream.evicted) return;

                // A completion marker without a seq goes after everything seen so far.
                const at = seq ?? Math.max(stream.nextSeq - 1, ...stream.pending.keys()) + 1;
                // Already played or skipped past: a late duplicate.
                if (at < stream.nextSeq) return;

                stream.pending.set(at, { base64Data, wordsIds, completed: !!streamCompleted });
                stream.lastPacketAt = performance.now();
                drain(stream);
                if (!stream.completed) armStallTimer(stream);
                pump();
        };

        const hasNewerStream = (stream: Stream) =>
                streams[streams.length - 1] !== stream;

        // Marks the stream complete with whatever it has, skipping any gaps.
        const forceComplete = (stream: Stream, reason = "stalled without completing") => {
                console.warn(`🚨 Stream [${stream.id}] ${reason}. Moving on.`);
                if (stream.pending.size > 0) {
                        stream.nextSeq = Math.min(...stream.pending.keys());
                        // Everything left goes in, in order, as if the gaps had timed out.
                        const packets = [...stream.pending.entries()].sort(([a], [b]) => a - b);
                        stream.pending.clear();
                        for (const [, packet] of packets) {
                                const buffer = packet.base64Data ? decode(packet.base64Data) : undefined;
                                if (buffer) stream.chunks.push({ buffer, wordsIds: packet.wordsIds });
                        }
                }
                stream.completed = true;
                clearTimers(stream);
                pump();
        };

        // Restarted on every packet. While this is the newest stream, going
        // quiet may just be the server thinking, so it only gives up once a
        // newer stream exists.
        const armStallTimer = (stream: Stream) => {
                if (stream.stallTimer) clearTimeout(stream.stallTimer);
                stream.stallTimer = setTimeout(() => {
                        stream.stallTimer = null;
                        if (!stream.completed && !stream.evicted && (hasNewerStream(stream) || noMoreStreams)) {
                                forceComplete(stream);
                        }
                }, STREAM_STALL_MS);
        };

        // Set by answerComplete() until a new stream arrives: the backend has
        // said no more streams are coming, so a stream that goes quiet can be
        // finished even though no newer one follows it.
        let noMoreStreams = false;

        // The backend won't send more streams for the current answer (its
        // "ready"). The last stream may still be arriving; it plays out as
        // usual, and if it goes quiet without its completion packet, it's
        // finished after the stall timeout instead of waiting forever.
        const answerComplete = () => {
                noMoreStreams = true;
                for (const stream of streams) {
                        if (stream.completed || stream.evicted) continue;
                        // Announced, but no audio came: it has none.
                        if (!hasAudioArrived(stream)) markSilent(stream);
                        else armStallTimer(stream);
                }
                pump();
        };

        // A new stream has started: older ones that already went quiet are done.
        const finishStalledStreams = () => {
                const now = performance.now();
                for (let i = 0; i < streams.length - 1; i++) {
                        const stream = streams[i];
                        if (stream.completed || stream.evicted) continue;
                        if (now - stream.lastPacketAt >= STREAM_STALL_MS) forceComplete(stream);
                }
        };

        // The connection these streams arrived on is gone, so none of them will
        // get more packets. Finish them now with whatever they have, rather than
        // leaving playback waiting on the stall timeout.
        const connectionLost = () => {
                for (const stream of streams) {
                        if (stream.completed || stream.evicted) continue;
                        if (!hasAudioArrived(stream)) markSilent(stream);
                        else forceComplete(stream, "cut off by a lost connection");
                }
                pump();
        };

        const clearTimers = (stream: Stream) => {
                if (stream.gapTimer) clearTimeout(stream.gapTimer);
                if (stream.stallTimer) clearTimeout(stream.stallTimer);
                stream.gapTimer = null;
                stream.stallTimer = null;
        };

        const drain = (stream: Stream) => {
                const before = stream.nextSeq;

                let packet: Packet | undefined;
                while ((packet = stream.pending.get(stream.nextSeq))) {
                        stream.pending.delete(stream.nextSeq);
                        stream.nextSeq++;

                        const buffer = packet.base64Data ? decode(packet.base64Data) : undefined;
                        if (buffer) {
                                stream.chunks.push({ buffer, wordsIds: packet.wordsIds });
                                stream.firstAudioAt ??= performance.now();
                        }

                        if (packet.completed) {
                                stream.completed = true;
                                stream.pending.clear();
                                clearTimers(stream);
                                break;
                        }
                }

                // The gap we were waiting on is filled (or the stream is done).
                if (stream.gapTimer && (stream.nextSeq !== before || stream.pending.size === 0)) {
                        clearTimeout(stream.gapTimer);
                        stream.gapTimer = null;
                }

                // Packets are waiting behind a missing one: give it a moment, then
                // skip the whole gap at once.
                if (stream.pending.size > 0 && !stream.gapTimer) {
                        stream.gapTimer = setTimeout(() => {
                                stream.gapTimer = null;
                                if (stream.pending.size === 0) return;
                                const nextAvailable = Math.min(...stream.pending.keys());
                                console.warn(`🚨 Stream [${stream.id}] packet stall! Skipping seq ${stream.nextSeq}–${nextAvailable - 1}`);
                                stream.nextSeq = nextAvailable;
                                drain(stream);
                                pump();
                        }, PACKET_TIMEOUT_MS);
                }
        };

        const evictOldAudio = () => {
                const keepFrom = streams.length - MAX_STREAMS_WITH_AUDIO;
                for (let i = 0; i < keepFrom; i++) {
                        const stream = streams[i];
                        if (stream.evicted) continue;
                        stream.evicted = true;
                        stream.chunks = [];
                        stream.pending.clear();
                        clearTimers(stream);
                }
        };

        // ---- Playback: schedule chunks on the audio clock ----

        // Hands every chunk that's ready to the audio context, moving on to the
        // next stream once the current one is complete. While paused the
        // context clock is stopped, so this still queues audio up in order.
        const pump = () => {
                const context = audioContext();
                if (!paused && context.state === "suspended") void context.resume();

                while (cursorStream < streams.length) {
                        const stream = streams[cursorStream];

                        if (!stream.evicted && cursorChunk < stream.chunks.length) {
                                // A stream's start waits for a little audio to build up.
                                if (cursorChunk === 0 && !readyToStart(stream)) break;
                                schedule(cursorStream, cursorChunk, 0);
                                cursorChunk++;
                                continue;
                        }
                        // Waiting for more of this stream to arrive.
                        if (!stream.evicted && !stream.completed) break;

                        cursorStream++;
                        cursorChunk = 0;
                        pendingGap = STREAM_GAP_S;
                }

                updatePlaying();
        };

        // Whether a stream can start playing: it has PREBUFFER_S of audio, or it's
        // complete, or it has waited PREBUFFER_MAX_WAIT_MS since its first audio.
        // Not needed when it's lined up behind audio still playing (with the gap
        // between streams), which gives its audio the same time to build up.
        // Otherwise pump() is called again when the wait runs out.
        let prebufferTimer: ReturnType<typeof setTimeout> | undefined;
        const readyToStart = (stream: Stream): boolean => {
                if (stream.completed || stream.silent) return true;

                const lead = nextStartTime + pendingGap - audioContext().currentTime;
                if (lead >= PREBUFFER_S) return true;

                const buffered = stream.chunks.reduce((total, chunk) => total + chunk.buffer.duration, 0);
                if (buffered >= PREBUFFER_S) return true;

                const waited = performance.now() - (stream.firstAudioAt ?? performance.now());
                if (waited >= PREBUFFER_MAX_WAIT_MS) return true;

                clearTimeout(prebufferTimer);
                prebufferTimer = setTimeout(pump, PREBUFFER_MAX_WAIT_MS - waited);
                return false;
        };

        const schedule = (streamIdx: number, chunkIdx: number, offset: number) => {
                const context = audioContext();
                const stream = streams[streamIdx];
                const chunk = stream.chunks[chunkIdx];

                // After an idle spell the gap has already passed in real time.
                // A silent stream comes straight after the one before it; the
                // gap is kept for the next one that's heard.
                const gap = stream.silent ? 0 : pendingGap;
                const startAt = Math.max(nextStartTime + gap, context.currentTime + SCHEDULE_PAD_S);
                const endAt = startAt + (chunk.buffer.duration - offset) / rate;
                if (!stream.silent) pendingGap = 0;
                nextStartTime = endAt;

                const latency = usingStretch() ? stretchLatency : 0;

                const source = context.createBufferSource();
                source.buffer = chunk.buffer;
                source.playbackRate.value = rate;
                source.connect(usingStretch() ? stretch! : context.destination);
                if (!usingStretch()) source.connect(levelTapFor(context));

                // A silent node that ends the moment the chunk becomes audible,
                // used as a sample-accurate "chunk started" callback.
                const trigger = context.createConstantSource();
                trigger.connect(triggerSink(context));

                // Keeps the chunk in `scheduled` until it has been heard, not just
                // until its source finishes. Through the pitch corrector those
                // differ by its delay, and a short chunk would otherwise leave
                // `scheduled` with its trigger still pending, out of reach of
                // unscheduleAll(): it would then fire after a jump and show the
                // stream we jumped away from.
                const endMarker = context.createConstantSource();
                endMarker.connect(triggerSink(context));

                const entry: Scheduled = { source, trigger, endMarker, streamIdx, chunkIdx, startAt, endAt, offset, rate, latency, cancelled: false };

                trigger.onended = () => {
                        if (!entry.cancelled) onChunkStarted(streamIdx, chunk);
                };
                endMarker.onended = () => {
                        if (entry.cancelled) return;
                        scheduled = scheduled.filter(item => item !== entry);
                        updatePlaying();
                };

                source.start(startAt, offset);
                // Heard only after the pitch corrector's delay, so the laser and board wait for it too.
                trigger.start(startAt + latency);
                trigger.stop(startAt + latency + 0.001);
                endMarker.start(endAt + latency);
                endMarker.stop(endAt + latency + 0.001);

                scheduled.push(entry);
        };

        // Called whenever playback reaches a stream: when its audio starts, or
        // when it's jumped to while paused. Shows its board, and its options the
        // first time; options become chat messages, so a replay doesn't repeat them.
        const enterStream = (streamIdx: number) => {
                const stream = streams[streamIdx];
                if (!stream) return;

                if (boardStreamIdx !== streamIdx) {
                        boardStreamIdx = streamIdx;
                        if (stream.board !== undefined) {
                                writeOnBoard(stream.board, stream.stepId);
                        }
                        // Its caption replaces the last one (cleared if it has none).
                        // A silent stream (e.g. just options) leaves the caption of
                        // what was heard before it, unless it has its own.
                        if (!stream.silent || stream.caption !== undefined) showCaption(stream.caption);
                }

                if (stream.options?.length && !stream.optionsShown) {
                        stream.optionsShown = true;
                        showOptions(stream.options);
                }
        };

        const onChunkStarted = (streamIdx: number, chunk: Chunk) => {
                lastStartedStreamIdx = streamIdx;

                enterStream(streamIdx);

                if (chunk.wordsIds?.length) {
                        showLaser(undefined, { wordsIds: chunk.wordsIds });
                }

                // Also moves hasPrevious/hasNext along as playback crosses streams.
                emitState();
        };

        // Stops everything handed to the audio context without firing any of
        // its callbacks.
        const unscheduleAll = () => {
                for (const entry of scheduled) {
                        entry.cancelled = true;
                        entry.trigger.onended = null;
                        entry.endMarker.onended = null;
                        try { entry.source.stop(); } catch { /* already ended */ }
                        try { entry.trigger.stop(); } catch { /* already ended */ }
                        try { entry.endMarker.stop(); } catch { /* already ended */ }
                }
                scheduled = [];
                nextStartTime = 0;
                pendingGap = 0;
                muteStretchTail();
        };

        // The pitch corrector has no reset, so audio already inside it would
        // still play out after a stop. Mute its output until that has passed.
        // Anything scheduled from now on starts at least SCHEDULE_PAD_S later, so
        // it comes out after the gain is back up.
        const muteStretchTail = () => {
                if (!ctx || !stretchOutput) return;
                const now = ctx.currentTime;
                const gain = stretchOutput.gain;
                gain.cancelScheduledValues(now);
                gain.setValueAtTime(gain.value, now);
                gain.linearRampToValueAtTime(0, now + CUT_FADE_S);
                gain.setValueAtTime(1, now + CUT_FADE_S + stretchLatency);
        };

        const clearLaser = () => showLaser(undefined, { wordsIds: [] });

        // Where the listener is right now: the chunk that's audible, or the one
        // about to start if we're in a gap.
        const currentPosition = (): Position | undefined => {
                if (!ctx) return undefined;
                const now = ctx.currentTime;
                // What's heard now was scheduled `latency` ago.
                const entry = scheduled.find(item => now - item.latency < item.endAt);
                if (!entry) return undefined;
                const played = Math.max(0, now - entry.latency - entry.startAt) * entry.rate;
                return { streamIdx: entry.streamIdx, chunkIdx: entry.chunkIdx, offset: entry.offset + played };
        };

        // How far into the stream being heard the audio is (seconds of its own
        // audio, so speed changes don't matter), for highlighting the caption.
        // Undefined when nothing is being heard.
        const getSpeechProgress = (): SpeechProgress | undefined => {
                const position = currentPosition();
                if (!position) return undefined;
                const stream = streams[position.streamIdx];
                if (!stream || stream.evicted) return undefined;
                const before = stream.chunks.slice(0, position.chunkIdx).reduce((sum, chunk) => sum + chunk.buffer.duration, 0);
                const total = stream.chunks.reduce((sum, chunk) => sum + chunk.buffer.duration, 0);
                return { caption: stream.caption, elapsed: before + position.offset, total, complete: stream.completed };
        };

        // The lesson step of the stream being heard now; undefined while paused
        // or when nothing plays.
        const getPlayingStepId = (): StepId | undefined => {
                if (paused) return undefined;
                const position = currentPosition();
                return position ? streams[position.streamIdx]?.stepId : undefined;
        };

        // The nearest earlier stream that still has its audio, if any.
        const previousStreamIdx = (streamIdx: number): number | undefined => {
                for (let i = streamIdx - 1; i >= 0; i--) {
                        if (!streams[i].evicted && !streams[i].silent && streams[i].chunks.length > 0) return i;
                }
                return undefined;
        };

        // The stream Previous is relative to: the one being heard, or once
        // idle, the one that last played.
        const currentStreamIdx = (): number | undefined => {
                const position = currentPosition();
                if (position) return position.streamIdx;
                return lastStartedStreamIdx >= 0 ? lastStartedStreamIdx : undefined;
        };

        const playbackState = (): PlaybackState => {
                const position = currentPosition();
                const active = scheduled.length > 0 || paused;

                const current = currentStreamIdx();
                const hasPrevious = current !== undefined && previousStreamIdx(current) !== undefined;
                // Next works as soon as something is playing, if there's a later
                // stream or one may still come (the answer isn't complete yet):
                // skipping to a stream that hasn't arrived waits for it (see
                // playNextStream), rather than leaving Next disabled until it does.
                const hasNext = position !== undefined && (position.streamIdx + 1 < streams.length || !noMoreStreams);

                // pump() only stops short of the end at a stream still arriving,
                // so the cursor being before the end means audio is on its way.
                // Once the backend has said the answer is complete ("ready"), that
                // stream is only waiting for its completion marker (or the stall
                // timeout), so it's not shown as still thinking once what has
                // arrived has played; any late audio still plays when it comes.
                const pending = scheduled.length > 0 || (cursorStream < streams.length && !noMoreStreams);

                return { active, paused, rate, hasPrevious, hasNext, pending };
        };

        const playFrom = ({ streamIdx, chunkIdx, offset }: Position) => {
                unscheduleAll();

                const chunk = streams[streamIdx]?.chunks[chunkIdx];
                if (chunk && offset > 0 && offset < chunk.buffer.duration) {
                        schedule(streamIdx, chunkIdx, offset);
                        chunkIdx++;
                } else if (offset > 0) {
                        chunkIdx++;
                }

                cursorStream = streamIdx;
                cursorChunk = chunkIdx;
                pump();
        };

        // Jumps to the start of a stream. By default it waits there paused, so
        // the user lands on it and presses play when ready; with `keepPlaying`
        // (and playback not already paused) it carries straight on.
        const jumpToStream = async (streamIdx: number, { keepPlaying = false } = {}) => {
                const playOn = keepPlaying && !paused;

                // Silence the old stream first. When pausing, wait for the clock to
                // stop so none of the new stream leaks out before the pause takes hold.
                unscheduleAll();
                clearLaser();
                if (!playOn) await pause();

                boardStreamIdx = -1;
                playFrom({ streamIdx, chunkIdx: 0, offset: 0 });
                // Paused, its audio events can't fire on the frozen clock, so show
                // its board, options and the laser's first words now to make the
                // jump visible. Playing on, they come with its chunks as usual.
                if (!playOn) {
                        enterStream(streamIdx);
                        const pointing = streams[streamIdx]?.chunks.find(chunk => chunk.wordsIds?.length);
                        if (pointing) showLaser(undefined, { wordsIds: pointing.wordsIds! });
                }
        };

        // ---- Controls ----

        // Pauses right where it is; audio, laser and board all hold.
        const pause = async () => {
                setPaused(true);
                await ctx?.suspend();
        };

        const resume = async () => {
                setPaused(false);
                await ctx?.resume();
        };

        // Skips the rest of the current stream. While playing, the next one
        // plays on straight away; while paused, it waits paused at its start.
        // If it hasn't arrived yet, it's queued for when it does.
        const playNextStream = () => {
                const position = currentPosition();
                if (!position) return;
                return jumpToStream(position.streamIdx + 1, { keepPlaying: true });
        };

        // Goes to the start of the previous stream (step) and pauses there,
        // straight away rather than first restarting the current one.
        const rewindStream = () => {
                const current = currentStreamIdx();
                const target = current !== undefined ? previousStreamIdx(current) : undefined;
                if (target === undefined) return;
                return jumpToStream(target);
        };

        // Keeps the voice's pitch, via the pitch corrector. Until that has loaded
        // (or if the browser can't run it), pitch follows the rate instead.
        const setPlaybackRate = (value: number) => {
                const next = Math.min(MAX_RATE, Math.max(MIN_RATE, value));
                if (next === rate) return;

                const position = currentPosition();
                rate = next;
                void stretch?.schedule({ active: rate !== 1, semitones: semitonesFor(rate) });
                // Re-schedule what's queued so the new rate applies from right here.
                if (position) playFrom(position);
                emitState();
        };

        // Set by cancel(). Streams that start arriving while it's set belong to the
        // cancelled answer, which the server may keep sending for a while, so
        // they're dropped (ids remembered, so their late packets are too) until
        // the user asks something new.
        let discarding = false;
        const discardedStreams = new Set<string>();

        // Barge-in: drop everything received so far and wait for the next stream.
        const stop = () => {
                console.log("⚡ [Barge-In] Interrupting AI speech. Clearing playback queue.");
                unscheduleAll();
                clearLaser();
                showCaption(undefined);
                cursorStream = streams.length;
                cursorChunk = 0;
                // A new answer is on its way; it shouldn't start out paused.
                void resume();
                updatePlaying();
        };

        // The user cancelled the answer: stop it, and drop the rest of it as it
        // keeps arriving. Unlike stop(), which makes way for a new answer.
        const cancel = () => {
                stop();
                discarding = true;
        };

        // The user asked something new, so what arrives next is its answer.
        const acceptNewAnswer = () => {
                discarding = false;
        };

        return {
                receive,
                announce,
                pause,
                resume,
                playNextStream,
                rewindStream,
                setPlaybackRate,
                getPlaybackRate: () => rate,
                isPaused: () => paused,
                getState: playbackState,
                stop,
                cancel,
                acceptNewAnswer,
                connectionLost,
                answerComplete,
                getPlayingStepId,
                getSpeechProgress,
        };
}

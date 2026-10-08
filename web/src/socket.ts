import { getCurrentRequestId, isStaleRequest, startNewRequest } from "./lib/requestId";
import { markVadEvent } from "./lib/vadDiagnostics";
import { changeTutorialStep, getCurrentStepId, goToPage, handleAiTask, openTutorial, setAiAgentStatus, showLaser, showOptions, writeOnBoard, writeOnTextbook } from "./api/books";
import type { BoardData, QuestionOption, StepId } from "./types/book";
import { getAuthToken } from "./api/rest/token";
import { ensureFreshToken } from "./api/rest/http";
import { ensureConversation, getConversationUid } from "./api/conversation";
import { errorMessage } from "./api/rest/apiError";
import { currentDocumentLang } from "./lib/useDocumentLang";
import { showMessage } from "./components/ui/message-dialog";
import type { StreamInfo } from "./audioStreamPlayer";


const WS_HOST = import.meta.env.VITE_WS_HOST;

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 15000;

export type Socket = {
        isConnected: () => boolean;
        getSocket: () => WebSocket;
        // Sends a message with the user's access token and conversationUid
        // attached. Before the conversation exists, it's created first and
        // messages wait (in order) for it. Returns false (and sends nothing)
        // while the connection isn't open.
        send: (message: Record<string, unknown>) => boolean;
        onIncomingAudio: (handler: (base64: string, wordsIds: string[] | undefined, seq: number, streamId: string, board: BoardData | undefined, options: QuestionOption[] | undefined, streamCompleted: boolean, stepId: StepId | undefined, caption: string | undefined) => void) => void
        // A stream was announced ('new-audio-stream'), with what it carries.
        // It may have no audio at all (e.g. just options).
        onStreamAnnounced: (handler: (streamId: string, info: StreamInfo) => void) => void
        // Called when the connection drops (before reconnecting).
        onDisconnected: (handler: () => void) => void
        // Called after sending a new request to the tutor (see isNewRequest).
        onRequestSent: (handler: () => void) => void
}

// Whether a message asks the tutor something new: typed text or "clarify"
// ('json'), or the end of a spoken question. Speech starting or mid-way
// doesn't count, so noise can't end a cancel before a question is complete.
const isNewRequest = (message: Record<string, unknown>) =>
        message.event === 'json'
        || message.event === 'audio-ended'
        || (message.event === 'audio' && message.ended === true)

// A stream's boardData, if it's a kind the board can show. Anything else
// (a new type, or content missing what it needs) is reported and skipped.
const parseBoardData = (boardData: any): BoardData | undefined => {
        if (!boardData) return undefined
        const content = boardData.content
        // 'general' boards are plain HTML too (the server's name for them).
        if ((boardData.type === 'html' || boardData.type === 'general') && typeof content?.html === 'string') {
                return { type: 'html', content: { html: content.html } }
        }
        // The math boards' parts may come inside `content` or directly on
        // boardData ({ type, parts }); accept either.
        const parts = Array.isArray(content?.parts) ? content.parts : Array.isArray(boardData.parts) ? boardData.parts : undefined
        if (boardData.type === 'longDivision' && parts) {
                return { type: 'longDivision', content: { parts } }
        }
        if (boardData.type === 'longMultiplication' && parts) {
                return { type: 'longMultiplication', content: { type: 'longMultiplication', parts } }
        }
        console.warn(`[socket] can't show board type '${boardData.type}'; skipping it`, boardData)
        return undefined
}

// A stream's options, as { content } each. They may come as plain strings
// (["opt 1", "opt 2"]) or already as { content }; anything else is skipped.
const parseOptions = (options: unknown): QuestionOption[] | undefined => {
        if (!Array.isArray(options)) return undefined
        const parsed = options.flatMap(option =>
                typeof option === 'string' ? [{ content: option }]
                : typeof option?.content === 'string' ? [{ content: option.content }]
                : [])
        return parsed.length ? parsed : undefined
}

// Whether the tutor's connection is open, for the UI (see useSocketConnected).
let _connected = false
const connectionListeners = new Set<() => void>()
const setConnected = (connected: boolean) => {
        if (_connected === connected) return
        _connected = connected
        connectionListeners.forEach(listener => listener())
}
export const isSocketConnected = () => _connected
export const subscribeConnection = (listener: () => void) => {
        connectionListeners.add(listener)
        return () => { connectionListeners.delete(listener) }
}

export let _socket: Socket
export const startSocket = () => {

        if (_socket) {
                return _socket
        }

        let isConnected = false
        let status = ""
        let socket: WebSocket
        let reconnectAttempts = 0
        let reconnectTimeoutId: ReturnType<typeof setTimeout> | undefined
        // Counts connections, to keep stream ids from different ones apart.
        let connectionNumber = 0
        let _onDisconnected: (() => void) | undefined
        let _onStreamAnnounced: ((streamId: string, info: StreamInfo) => void) | undefined
        let _onRequestSent: (() => void) | undefined

        let _onIncomingAudio: (base64: string, wordsIds: string[], seq: number, streamId: string, board: BoardData | undefined, options: QuestionOption[] | undefined, streamCompleted: boolean, stepId: StepId | undefined, caption: string | undefined) => void;

        // DIAGNOSTIC: streams already noted as skipped (see onmessage).
        const staleStreams = new Set<string>()

        _socket = {
                isConnected: () => isConnected,
                getSocket: () => socket,
                send: (message) => {
                        if (socket?.readyState !== WebSocket.OPEN) {
                                console.warn(`[socket] not connected; dropped '${message.event}' message`)
                                return false
                        }
                        // While a board with a lesson step shows, every message says which
                        // step — the one showing now, even if the message has to wait below.
                        const stepId = getCurrentStepId()
                        // Typed text and clarify actions ('json') are new requests. Spoken
                        // ones get theirs from mic3.ts when speech starts. Anything else
                        // (cancel, pause, resume...) is about the latest request.
                        const requestId = message.requestId
                                ?? (message.event === 'json' ? startNewRequest() : getCurrentRequestId())
                        const outgoing = {
                                ...message,
                                ...(stepId !== undefined ? { stepId } : {}),
                                ...(requestId !== undefined ? { requestId } : {}),
                        }

                        // Every message belongs to a conversation. Until there is one, it's
                        // created (once) and messages queue behind it, so audio chunks keep
                        // their order.
                        const conversationUid = getConversationUid()
                        if (conversationUid && !waitingForConversation.length) {
                                transmit(outgoing, conversationUid)
                        } else {
                                waitingForConversation.push(outgoing)
                                if (waitingForConversation.length === 1) void startConversation()
                        }
                        return true
                },
                onIncomingAudio: (handler => {
                        _onIncomingAudio = handler
                }),
                onStreamAnnounced: (handler => {
                        _onStreamAnnounced = handler
                }),
                onDisconnected: (handler => {
                        _onDisconnected = handler
                }),
                onRequestSent: (handler => {
                        _onRequestSent = handler
                }),
        }

        // Messages sent before the conversation was created, in order.
        let waitingForConversation: Record<string, unknown>[] = []

        // Sending stays synchronous so audio chunks keep their order: this
        // message carries the current token, and a refresh (if it's close to
        // expiring, with a margin) runs in the background for the next ones.
        const transmit = (message: Record<string, unknown>, conversationUid: string) => {
                if (socket?.readyState !== WebSocket.OPEN) {
                        console.warn(`[socket] not connected; dropped '${message.event}' message`)
                        return
                }
                void ensureFreshToken()
                socket.send(JSON.stringify({
                        ...message,
                        conversationUid,
                        accessToken: getAuthToken(),
                }))
                if (isNewRequest(message)) _onRequestSent?.()
        }

        const startConversation = async () => {
                const lang = currentDocumentLang()
                try {
                        const conversationUid = await ensureConversation(lang)
                        const waiting = waitingForConversation
                        waitingForConversation = []
                        waiting.forEach(message => transmit(message, conversationUid))
                } catch (err) {
                        // Nothing can be sent without a conversation: drop what waited,
                        // and let the next message try again.
                        console.error('[socket] could not create a conversation; dropped', waitingForConversation.length, 'message(s)', err)
                        waitingForConversation = []
                        void showMessage({
                                tone: 'danger',
                                title: lang === 'en' ? "Couldn't reach the tutor" : 'تعذّر الوصول إلى المعلّم',
                                description: errorMessage(err, lang),
                        })
                }
        }

        const audioStreams: {[key: string]: {
                board?: BoardData,
                stepId?: StepId,
                // What the stream says, for closed captions.
                caption?: string,
                // Page words the stream points at (the laser), if sent per stream.
                wordsIds?: string[],
                options?: QuestionOption[],
        }} = {}

        // Reconnects with exponential backoff (1s, 2s, 4s, ... capped at 15s) any
        // time the connection drops — the server restarting, a network blip, or
        // the tab waking from sleep all end up here via socket.onclose.
        const scheduleReconnect = () => {
                if (reconnectTimeoutId !== undefined) return

                const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempts, RECONNECT_MAX_DELAY_MS)
                reconnectAttempts += 1

                reconnectTimeoutId = setTimeout(() => {
                        reconnectTimeoutId = undefined
                        connect()
                }, delay)
        }

        function connect() {
                socket = new WebSocket(WS_HOST);

                // The server may number streams per connection (or restart), so a new
                // connection can reuse ids from before. Prefixing them with the
                // connection keeps a reused id from landing on an old stream, which the
                // player would treat as finished or as duplicate packets and drop.
                const connection = ++connectionNumber
                const streamKey = (streamId: string) => `${connection}:${streamId}`

                socket.onopen = () => {
                        isConnected = true
                        reconnectAttempts = 0
                        setConnected(true)
                        status = 'Connected & Instant. Click "Go Live"!'
                };

                socket.onmessage = (event) => {
                        const packet = JSON.parse(event.data);

                        // The tutor's audio for an older request than the latest one sent
                        // is skipped: a newer request superseded that answer. The backend
                        // tags 'new-audio-stream' and 'audio' with the request's id;
                        // everything else (statuses, tasks, board...) is global and
                        // always goes through.
                        if ((packet.event === 'new-audio-stream' || packet.event === 'audio') && isStaleRequest(packet.requestId)) {
                                // DIAGNOSTIC: once per stream, not for every audio packet.
                                const key = streamKey(packet.streamId)
                                if (!staleStreams.has(key)) {
                                        staleStreams.add(key)
                                        markVadEvent(`skipped tutor audio of old request ${packet.requestId} (stream ${key})`)
                                }
                                return
                        }

                        if (packet.event === 'audio') {
                                if(_onIncomingAudio) {
                                        const stream = audioStreams[streamKey(packet.streamId)]
                                        // Words to point at while this audio plays: its own, or the
                                        // stream's (sent with 'new-audio-stream').
                                        const wordsIds = packet.wordsIds ?? stream?.wordsIds
                                        _onIncomingAudio(packet.data, wordsIds, packet.seq, streamKey(packet.streamId), stream?.board, stream?.options, packet?.completed, stream?.stepId, stream?.caption)
                                }
                        } else if (packet.event === 'new-audio-stream') {
                                const stream = {
                                        board: parseBoardData(packet.boardData),
                                        options: parseOptions(packet.options),
                                        stepId: packet.stepId,
                                        caption: typeof packet.text === 'string' ? packet.text : undefined,
                                        wordsIds: Array.isArray(packet.wordsIds) ? packet.wordsIds : undefined,
                                }
                                audioStreams[streamKey(packet.streamId)] = stream
                                // Its audio (if it has any) follows as 'audio' packets.
                                _onStreamAnnounced?.(streamKey(packet.streamId), stream)
                        } else if (packet.event === 'status') {
                                status = packet.data
                        } else if (packet.event === 'writeOnBook') {
                                console.log('📥 Visual SVG Payload layer received from vector engine.');
                                let svgString = packet.data;
                                svgString = svgString.replace(`bidi-override`, 'plaintext') // to fix the ordering of arabic digits

                                // Ensure the incoming layer matches absolute width scaling boundaries safely
                                // if (svgString.includes('<svg') && !svgString.includes('width=')) {
                                //         svgString = svgString.replace('<svg', '<svg width="100%" height="100%"');
                                // }
                                // svgString = svgString
                                //         .replace(/^<svg[^>]*>/i, '')
                                //         .replace(/<\/svg>$/i, '');

                                const parser = new DOMParser();
                                const doc = parser.parseFromString(svgString, 'image/svg+xml');
                                const svgEl = doc.querySelector('svg');

                                // if (!svgEl) {
                                // return { innerHTML: svgString, x: 0, y: 0, width: null, height: null };
                                // }

                                const width = svgEl.getAttribute('width')
                                const height = svgEl.getAttribute('height')

                                writeOnTextbook(undefined, {
                                        innerHtml: svgEl.innerHTML,
                                        x: Number(svgEl.getAttribute('x') || '0'),
                                        y: Number(svgEl.getAttribute('y') || '0'),
                                        width: width ? Number(width) : undefined,
                                        height: height ? Number(height) : undefined,
                                        viewBox: svgEl.getAttribute('viewBox'),
                                });
                        } else if (packet.event === 'writeOnBoard') {
                                let html = packet.data;

                                writeOnBoard({ type: 'html', content: { html } });
                        } /*else if (packet.event === 'reference_tag') {
                        // 🛠️ PARSE THE JSON ARRAY FROM GEMINI'S TEXT CHUNK
                        // Example string input: '[REF_ID: ["XYZ-123", "ABC-456"]]'
                        const textChunk = packet.data;

                        console.log(textChunk)
                        const ids = JSON.parse(textChunk)
                        setActiveReferences(ids)
                        // if (textChunk.includes('[REF_ID:')) {
                        //   try {
                        //     // Extract the raw JSON array string between the brackets
                        //     const startIdx = textChunk.indexOf('[REF_ID:') + 8;
                        //     const endIdx = textChunk.lastIndexOf(']');
                        //     const jsonArrayString = textChunk.substring(startIdx, endIdx).trim();

                        //     const parsedIDs = JSON.parse(jsonArrayString);
                        //     if (Array.isArray(parsedIDs)) {
                        //       console.log('🎯 Active Reference IDs changed to:', parsedIDs);
                        //       setActiveReferences(parsedIDs);
                        //     }
                        //   } catch (e) {
                        //     // Handle cases where the text chunk is split across network packets
                        //     console.warn('Reference tag parsing skipped for incomplete chunk segment.');
                        //   }
                        // }
                        }


                        // 🛠️ CATCH THE DRAW ON BOARD EVENT ACTION
                        // else if (packet.event === 'drawOnBoard') {
                        //   console.log('📥 Received new board vector graphics chunk.');

                        //   // 1. Pop up the sliding board view automatically from the bottom
                        //   setIsBoardOpen(true);

                        //   // 2. Append the new chunk to the state list array (PRESERVES EXISTING CONTENT)
                        //   setBoardDrawingsList((prevList) => [...prevList.filter(d => d.id != packet.drawingId), {id: packet.drawingId, code: packet.data}]);
                        // }
                        else if (packet.event === 'startTutorial') {

                        // 1. Pop up the sliding board view automatically from the bottom
                        setIsBoardOpen(true);

                        // 2. Append the new chunk to the state list array (PRESERVES EXISTING CONTENT)
                        console.log(packet)
                        setBoardDrawingsList((prevList) => [...prevList.filter(d => d.id != packet.tutorialId), {id: packet.tutorialId, ...packet.data, currentIndex: 0}]);
                        }
                        else if (packet.event === 'showTutorialStep') {

                        // 1. Pop up the sliding board view automatically from the bottom
                        setIsBoardOpen(true);

                        // 2. Append the new chunk to the state list array (PRESERVES EXISTING CONTENT)
                        console.log(packet)

                        setBoardDrawingsList(prevList =>prevList.map(item =>
                        item.id === packet.tutorialId || true
                                ? { ...item, currentIndex: packet.stepNumber - 1 }
                                : item
                        ))


                        console.log(boardDrawingsList.values)
                        }

                        */
                  else if (packet.event === 'showLaser') {

                        showLaser(undefined, {wordsIds: packet.wordsIds})

                      }
                      else if (packet.event === 'goToPage') {

                        console.log(packet)
                        goToPage(packet.pageNumber)

                      }
                      else if (packet.event === 'openTutorial') {

                        openTutorial(packet.tutorialId)
                      }
                      else if (packet.event === 'changeTutorialStep') {

                        changeTutorialStep(packet.tutorialId, packet.stepNumber)
                      }
                      else if (packet.event === 'showOptions') {

                        showOptions(packet.options)
                      }
                      else if (packet.event === 'ai-agent-status') {

                        setAiAgentStatus(packet.status)
                      }
                      else if (packet.event === 'ai-task') {
                        handleAiTask({ task: packet.task, pageIndex: packet.pageIndex, status: packet.status })
                      }

                }

                socket.onclose = () => {
                        isConnected = false
                        status = 'Disconnected from backend.'
                        setConnected(false)
                        _onDisconnected?.()
                        scheduleReconnect()
                };

                socket.onerror = () => {
                        // The browser always follows a WebSocket error with a close event,
                        // which is where reconnection is actually scheduled — this is just
                        // for visibility.
                        console.error('[socket] connection error')
                };
        }

        connect()

        return _socket
}

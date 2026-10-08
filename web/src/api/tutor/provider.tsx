import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../App';
import type { AiAgentStatus, BoardData, Message, MessageOptionsData, StepId } from '../../types/book';
import { cancelAnswer, onBoardContentUpdated, stopAiTask, pauseAnswer, resumeAnswer, setCurrentStepId, setTutorDelegate } from '../books';
import { TutorContext, type AiTaskItem, type TutorContextType } from './context';
import { useWakeLock } from '../../lib/useWakeLock';
import { micErrorMessage } from '../../lib/micError';
import { showMessage } from '../../components/ui/message-dialog';
import { useDocumentLang } from '../../lib/useDocumentLang';

// The AI tutor's state: conversation, mic/speaking status and whiteboard.
// Mounted once for the whole app, so the tutor can be asked from any page;
// in the book reader, BookProvider adds the book/page it's about.
// How long "thinking" can last with no audio before it's assumed the backend
// won't send "ready".
const THINKING_TIMEOUT_MS = 30_000

// How long a completed task stays in the panel before it clears itself.
const COMPLETED_TASK_MS = 3_000

// After the backend's "ready", how long to keep thinking for an answer's first
// audio, when none has arrived yet (e.g. "ready" sent before the speech is).
const AUDIO_GRACE_MS = 3_000

export function TutorProvider({ children }: { children: React.ReactNode }) {
  const { mic, micStatus, playingStatus, playback } = useApp()

  const [isBoardOpen, setIsBoardOpen] = useState<boolean>(false);
  const [boardContent, setBoardContent] = useState<BoardData>();
  const [captionText, setCaptionText] = useState<string>();
  const [aiTasks, setAiTasks] = useState<AiTaskItem[]>([]);
  const dismissAiTask = (key: string) => setAiTasks(current => current.filter(task => task.key !== key));

  // Completed tasks clear themselves after a moment (failed or stopped ones
  // wait for the user). Keyed by task, so a task that starts again cancels it.
  const autoDismissTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => () => autoDismissTimers.current.forEach(clearTimeout), []);
  // The lesson step of the board on screen, if it came with one.
  const [boardStepId, setBoardStepId] = useState<StepId>();

  // The panel is minimized, so the open board isn't actually visible.
  const [isBoardHidden, setIsBoardHidden] = useState(false)

  // Messages to the backend carry the step only while its board is showing:
  // open and not minimized away.
  useEffect(() => {
    setCurrentStepId(isBoardOpen && !isBoardHidden ? boardStepId : undefined)
  }, [isBoardOpen, isBoardHidden, boardStepId])
  const [messages, setMessages] = useState<Message<any>[]>([]);
  const [micStarting, setMicStarting] = useState(false)

  // The backend is working on an answer: from its "thinking" status until its
  // "ready". Audio can pause between streams while it's still generating, so
  // this, not the audio, decides when the AI goes back to idle.
  const [serverBusy, setServerBusy] = useState(false)

  // Listening has been confirmed: by the backend's "listening" status, or by
  // the mic sending the start of the user's speech (see mic3.ts). Turning the
  // mic on doesn't show listening by itself. Cleared when the backend says
  // "ready", or when the mic goes off.
  const [serverListening, setServerListening] = useState(false)

  useEffect(() => {
    if (!micStatus) setServerListening(false)
  }, [micStatus])

  // What the AI icon shows: speaking while audio plays; otherwise thinking
  // while the backend is busy; otherwise listening once the backend says so
  // (with the mic on), else ready.
  //
  // The backend's "ready" only means no more streams are coming; audio already
  // received (or still arriving for the last stream) can still be waiting to
  // play, so the gaps before it keep showing thinking. A paused answer isn't
  // counted, so it doesn't look busy.
  const audioPending = playback.pending && !playback.paused
  const aiStatus: AiAgentStatus = playingStatus
    ? "speaking"
    : playback.paused && playback.active
      ? "paused"
      : serverBusy || audioPending
      ? "thinking"
      : micStatus && serverListening ? "listening" : "ready"

  // The device stays awake while the tutor is talking.
  useWakeLock(aiStatus === "speaking")

  // For the server's status updates, registered once below.
  const micRef = useRef(mic)
  micRef.current = mic
  const busyRef = useRef(serverBusy)
  busyRef.current = serverBusy

  // Whether any audio has arrived for the current request (since its
  // "thinking"), and whether its "ready" came before that audio did.
  const sawAudioRef = useRef(false)
  const readyBeforeAudioRef = useRef(false)
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const endBusy = () => {
    readyBeforeAudioRef.current = false
    clearTimeout(graceTimerRef.current)
    setServerBusy(false)
  }

  // Audio for the request has arrived. If "ready" already came, the audio now
  // carries the status (speaking, or thinking while more is pending).
  useEffect(() => {
    if (!playingStatus && !playback.pending) return
    sawAudioRef.current = true
    if (readyBeforeAudioRef.current) endBusy()
  }, [playingStatus, playback.pending])

  // The mic button only switches the mic; an answer that's playing keeps
  // playing, and the AI shows listening once the backend confirms it.
  // When it can't be turned on (blocked, missing, busy...), the user is
  // told why, and can try again from there.
  const lang = useDocumentLang() === 'en' ? 'en' : 'ar'
  const startMic: TutorContextType["startMic"] = async () => {
    setMicStarting(true)
    let failure: unknown
    try {
      await mic.start();
    } catch (err) {
      failure = err
    } finally {
      setMicStarting(false)
    }
    if (failure === undefined) return

    const message = micErrorMessage(failure, lang)
    const close = { id: 'close', label: lang === 'en' ? 'Close' : 'إغلاق', variant: 'secondary' as const }
    const choice = await showMessage({
      tone: 'warning',
      title: message.title,
      description: message.description,
      actions: message.canRetry
        ? [close, { id: 'retry', label: lang === 'en' ? 'Try again' : 'حاول مرة أخرى' }]
        : [close],
    })
    if (choice === 'retry') await startMic()
  }
  const stopMic: TutorContextType["stopMic"] = async () => {
    await mic.stop(false);
  }

  // The user tapped the AI while it was thinking or speaking: stop the
  // answer here (including what the server is still sending) and there.
  const cancelRequest: TutorContextType["cancelRequest"] = async () => {
    mic.cancelPlayback();
    void cancelAnswer();
    endBusy()
  }

  // Pause and resume the answer that's playing, and tell the backend. The
  // message goes out while the stream is playing (before pausing, after
  // resuming), so it carries that stream's stepId.
  const pauseRequest: TutorContextType["pauseRequest"] = async () => {
    void pauseAnswer();
    await mic.stopPlaying();
  }
  const resumeRequest: TutorContextType["resumeRequest"] = async () => {
    await mic.resumePlaying();
    void resumeAnswer();
  }

  // Safety net: if the backend never says "ready" (it failed, or the
  // connection dropped), don't spin forever. Resets whenever audio plays.
  useEffect(() => {
    if (!serverBusy || playingStatus) return
    const timer = setTimeout(() => setServerBusy(false), THINKING_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [serverBusy, playingStatus])

  // Everything below only uses functional state updates, so it can be
  // registered once instead of on every render.
  useEffect(() => {
    onBoardContentUpdated((content, stepId) => {
      setBoardContent(content)
      setBoardStepId(stepId)
      setIsBoardOpen(true)
    })

    setTutorDelegate({
      showOptions: (opts) => {
        const message: Message<MessageOptionsData> = {
          type: 'options',
          data: {
            options: opts.map(opt => ({
              text: opt.content,
              isCorrect: false
            }))
          }
        }
        setMessages(current => [...current, message])
      },
      showCaption: (text) => {
        setCaptionText(text)
      },
      // Latest state per task. Once the user has stopped one, the backend's
      // own late "completed"/"failed" for it is ignored; a new "started" is a
      // new run. A dismissed task comes back only when it starts again.
      onAiTask: (task) => {
        const key = `${task.task}:${task.pageIndex ?? ''}`

        clearTimeout(autoDismissTimers.current.get(key))
        autoDismissTimers.current.delete(key)
        if (task.status === 'completed') {
          autoDismissTimers.current.set(key, setTimeout(() => {
            autoDismissTimers.current.delete(key)
            setAiTasks(current => current.filter(item => !(item.key === key && item.status === 'completed')))
          }, COMPLETED_TASK_MS))
        }

        setAiTasks(current => {
          const existing = current.find(item => item.key === key)
          if (existing?.status === 'stopped' && task.status !== 'started') return current
          const item = { ...task, key }
          return existing ? current.map(other => (other.key === key ? item : other)) : [...current, item]
        })
      },
      setAiAgentStatus: (status) => {
        if (status === "thinking") {
          // A new request has started: stop whatever older answer is still
          // playing. Only on the change to busy, so a repeated "thinking"
          // can't cut off the answer it's producing.
          if (!busyRef.current) {
            micRef.current?.endPlayback()
            sawAudioRef.current = false
            readyBeforeAudioRef.current = false
            clearTimeout(graceTimerRef.current)
          }
          setServerBusy(true)
        } else if (status === "listening") {
          endBusy()
          setServerListening(true)
        } else if (status === "ready") {
          // No more streams for this answer (the audio may still be playing).
          micRef.current?.answerComplete()
          setServerListening(false)
          if (!busyRef.current || sawAudioRef.current) {
            endBusy()
          } else {
            // "ready" came before any of the answer's audio: keep thinking
            // until it arrives (the effect above), or give up after a grace
            // period if the answer has no speech.
            readyBeforeAudioRef.current = true
            clearTimeout(graceTimerRef.current)
            graceTimerRef.current = setTimeout(endBusy, AUDIO_GRACE_MS)
          }
        } else if (status === "paused") {
          // The backend paused the answer: pause its playback (resumable from
          // the AI icon). No 'pause' message back, since the backend asked for it.
          // Only if it's actually playing, so nothing sits paused with nothing
          // to resume.
          const playback = micRef.current?.getPlaybackState()
          if (playback?.active && !playback.paused) void micRef.current?.stopPlaying()
        }
        // "speaking" comes from the audio itself, so the server's is ignored.
      },
      addMessage: (msg) => {
        setMessages(current => [...current, msg])
      },
    })

    return () => {
      onBoardContentUpdated(undefined)
      setCurrentStepId(undefined)
      setTutorDelegate(undefined)
    }
  }, [])


  return (
    <TutorContext.Provider
      value={{
        isBoardOpen,
        setIsBoardOpen,
        setIsBoardHidden,
        boardContent,
        captionText,
        aiTasks,
        stopAiTask,
        dismissAiTask,
        messages,
        aiStatus,
        micStarting,
        startMic,
        stopMic,
        cancelRequest,
        pauseRequest,
        resumeRequest,
      }}
    >
      {children}
    </TutorContext.Provider>
  );
}

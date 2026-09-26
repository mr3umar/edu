import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './Panel.css';
import { useTutor } from '../api/tutor/hook';
import { useDocumentLang } from '../lib/useDocumentLang';
import { textDirection } from '../lib/textDirection';
import { useAutoHeightTransition } from '../lib/useAutoHeightTransition';
import { usePanelLayout } from '../lib/usePanelLayout';
import BoardView from './board/BoardView';
import CaptionText from './CaptionText';
import { useApp } from '../App';
import type { Message, MessageOptionsData } from '../types/book';
import { sendText } from '../api/books';
import { fitFrameToBox, fitToBox } from '../lib/fitToBox';
import { Mic, Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import { SpeedometerIcon } from './icons/SpeedIcons';

// A wave filling the bottom of the AI icon, two wave-lengths wide (80 units,
// one wave per 40) so sliding it left by one loops seamlessly.
const wavePath = (baseline: number, amplitude: number) =>
  `M0 ${baseline} Q10 ${baseline - amplitude} 20 ${baseline} T40 ${baseline} T60 ${baseline} T80 ${baseline} V40 H0 Z`;

// Layered grey waves, lightest at the bottom, drifting inside the AI icon while it's idle
// (ready, listening).
function AiWaves() {
  return (
    <span className="ai-waves" aria-hidden="true">
      <svg className="ai-wave ai-wave-back" viewBox="0 0 80 40" preserveAspectRatio="none">
        <path d={wavePath(16, 4)} />
      </svg>
      <svg className="ai-wave ai-wave-mid" viewBox="0 0 80 40" preserveAspectRatio="none">
        <path d={wavePath(20, 3)} />
      </svg>
      <svg className="ai-wave ai-wave-front" viewBox="0 0 80 40" preserveAspectRatio="none">
        <path d={wavePath(24, 3.5)} />
      </svg>
    </span>
  );
}

// How often, and how many times, to re-check a board frame's fonts and images
// while they load (about 6 seconds in all).
const FRAME_CHECK_MS = 150;
const FRAME_CHECKS = 40;

// Whether closed captions are on, remembered between visits.
const CC_STORAGE_KEY = 'panel-cc';
const readCcPreference = (): boolean => {
  try {
    return localStorage.getItem(CC_STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
};
const saveCcPreference = (on: boolean) => {
  try {
    localStorage.setItem(CC_STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Not remembered; still applies for this visit.
  }
};

// Tapping the speed button steps through these, starting again after the last.
const PLAYBACK_SPEEDS = [
  { rate: 1, en: 'Normal', ar: 'عادي' },
  { rate: 1.15, en: 'Fast', ar: 'سريع' },
  { rate: 0.85, en: 'Slow', ar: 'بطيء' },
];


type Props = {
  // messages: Message<any>[];
};

const Panel = forwardRef<
  HTMLDivElement,
  Props
>(
  (
    {
      // messages
    },
    ref
  ) => {


    const { isBoardOpen, setIsBoardHidden, boardContent, captionText, messages, aiStatus, micStarting, startMic, stopMic, cancelRequest, pauseRequest, resumeRequest } = useTutor()
    const { mic, playback, micStatus } = useApp()

    // Follows the page: the book's language in the reader, the UI language elsewhere.
    const isEnglish = useDocumentLang() === "en"

    // The board's Previous/Next row: shown while there's another step to go to.
    const showPlayback = isBoardOpen && (playback.hasPrevious || playback.hasNext)

    const speedIndex = Math.max(0, PLAYBACK_SPEEDS.findIndex(speed => speed.rate === playback.rate))
    const speed = PLAYBACK_SPEEDS[speedIndex]
    const speedLabel = isEnglish ? `Playback speed: ${speed.en}` : `سرعة التشغيل: ${speed.ar}`

    const cycleRate = () => {
      mic?.setPlaybackRate(PLAYBACK_SPEEDS[(speedIndex + 1) % PLAYBACK_SPEEDS.length].rate)
    }

    const [draft, setDraft] = useState('');

    // The AI icon acts only while there's an answer: cancel it while it's
    // coming, pause it while it plays, resume it while paused.
    const aiAction =
      aiStatus === "thinking" ? cancelRequest
      : aiStatus === "speaking" ? pauseRequest
      : aiStatus === "paused" ? resumeRequest
      : undefined
    const aiLabel = isEnglish
      ? { ready: 'AI tutor', listening: 'AI tutor, listening', thinking: 'Stop answer', speaking: 'Pause', paused: 'Resume' }[aiStatus]
      : { ready: 'المعلم الذكي', listening: 'المعلم الذكي يستمع', thinking: 'إيقاف الإجابة', speaking: 'إيقاف مؤقت', paused: 'استئناف' }[aiStatus]
    const micLabel = micStatus
      ? (isEnglish ? 'Turn mic off' : 'إيقاف الميكروفون')
      : (isEnglish ? 'Turn mic on' : 'تشغيل الميكروفون')




    // const [showMain, setShowMain] = useState(messages.length > 0);
    const lastMsg: Message<MessageOptionsData> | undefined = messages.length > 0 ? messages[messages.length - 1] : undefined

    // Closed captions: the text of the stream being heard, shown in the main
    // area while the user has CC on (remembered between visits).
    const [ccEnabled, setCcEnabled] = useState(readCcPreference);
    const showCaption = ccEnabled && !!captionText;

    const showOptionsMessage = messages.length > 0 && lastMsg?.type == "options";
    const showMain = showOptionsMessage || showCaption;

    const visibleCount =
      Number(isBoardOpen) + Number(showMain);


    const [isMinimized, setIsMinimized] = useState(visibleCount == 0);

    // A minimized board isn't active: its step stops going out with messages.
    useEffect(() => {
      setIsBoardHidden(isMinimized)
    }, [isMinimized])

    useEffect(() => {
      if (visibleCount > 0) {
        setIsMinimized(false);
      }
    }, [visibleCount]);

    // Restore the panel whenever new board content arrives
    useEffect(() => {
      if (isBoardOpen) {
        setIsMinimized(false);
      }
    }, [boardContent, isBoardOpen]);

    // Turning CC on opens the panel up, so the captions can be seen.
    const toggleCc = () => {
      const next = !ccEnabled
      setCcEnabled(next)
      saveCcPreference(next)
      if (next) setIsMinimized(false)
    }

    // Restore the panel whenever a new options message arrives for the main area
    useEffect(() => {
      if (showMain) {
        setIsMinimized(false);
      }
    }, [lastMsg, showMain]);


    const containerRef = useRef<HTMLDivElement>(null);

    // The panel's parts, for the layout animation (see usePanelLayout).
    const panelRef = useRef<HTMLDivElement>(null);
    const contentAreaRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLDivElement>(null);
    const boardColumnRef = useRef<HTMLDivElement>(null);
    const controlsRef = useRef<HTMLDivElement>(null);

    // What should show; `shown` is what's rendered, which follows it through
    // the animation (what leaves fades out, the panel resizes, what arrives
    // fades in).
    const { shown, animating } = usePanelLayout(
      {
        main: showMain,
        board: isBoardOpen,
        controls: showPlayback,
        open: !isMinimized && (showMain || isBoardOpen),
      },
      { panel: panelRef, content: contentAreaRef, main: mainRef, board: boardColumnRef, controls: controlsRef },
    );
    const shownCount = shown.open ? Number(shown.main) + Number(shown.board) : 0

    // The main area keeps its last caption/options while it fades out,
    // including the options' key: if that changed (the messages were cleared),
    // the options bubble would be re-created and replay its entrance, blinking
    // back in while the main area fades away.
    const currentMain = { showCaption, captionText, showOptionsMessage, lastMsg, optionsKey: messages.length }
    const lastMain = useRef(currentMain)
    if (showMain) lastMain.current = currentMain
    const main = showMain ? currentMain : lastMain.current

    // With no board, the content area sizes to the caption/options; animate
    // it when they change (e.g. options appearing under a caption).
    useAutoHeightTransition(
      contentAreaRef,
      !animating && shown.open && shown.main && !shown.board,
      [captionText, showOptionsMessage, messages.length],
    );
    const contentRef = useRef<HTMLDivElement>(null);

    // Fits the board content to the whiteboard. Re-fits when the board
    // resizes (it opens with a width animation from 0, and can be minimized),
    // and when images or web fonts inside the content finish loading.
    useLayoutEffect(() => {
      const container = containerRef.current;
      const content = contentRef.current;

      if (!container || !content) return;

      let cancelled = false;

      const fit = () => {
        // HTML boards sit in an isolated frame, which is fitted from inside;
        // the wrapper then just takes the frame's size.
        const frame = content.querySelector<HTMLIFrameElement>('iframe[data-board-frame]');
        if (!frame) return fitToBox(container, content);
        content.style.width = '';
        content.style.setProperty('zoom', '1');
        return fitFrameToBox(container, frame);
      };
      fit();

      const observer = new ResizeObserver(fit);
      observer.observe(container);

      // A board frame's images and web fonts load in its own document. It's
      // sandboxed without scripts, so no listener may be attached in there:
      // the browser refuses to run it, even one added from here (and logs
      // "Blocked script execution"). So check from out here instead, re-fitting
      // until its fonts and images have all loaded, for a few seconds at most.
      let frameCheck: ReturnType<typeof setTimeout> | undefined;
      const watchFrame = (frame: HTMLIFrameElement, checksLeft = FRAME_CHECKS) => {
        if (cancelled) return;
        fit();
        const frameDoc = frame.contentDocument;
        if (!frameDoc) return;
        const fontsLoading = frameDoc.fonts?.status === 'loading';
        const imagesLoading = Array.from(frameDoc.images).some(image => !image.complete);
        if ((fontsLoading || imagesLoading) && checksLeft > 0) {
          frameCheck = setTimeout(() => watchFrame(frame, checksLeft - 1), FRAME_CHECK_MS);
        }
      };

      // `load` doesn't bubble, so listen in the capture phase for <img>/<svg>
      // loads, and for the board frame's own load.
      const onLoad = (event: Event) => {
        if (event.target instanceof HTMLIFrameElement) {
          clearTimeout(frameCheck);
          watchFrame(event.target);
        } else {
          fit();
        }
      };
      content.addEventListener('load', onLoad, true);

      void document.fonts?.ready.then(() => { if (!cancelled) fit(); });

      return () => {
        cancelled = true;
        clearTimeout(frameCheck);
        observer.disconnect();
        content.removeEventListener('load', onLoad, true);
      };
    }, [boardContent]);


    const [toolLocation, setToolLocation] = useState("down");


    return (
      <div ref={panelRef} className={`panel panel-content-${shownCount} ${toolLocation} ${shown.open ? '' : 'minimized'} ${shown.open && shown.controls ? 'has-playback' : ''} ${shown.open && shown.main && !shown.board ? 'main-only' : ''}`}>
        <div ref={contentAreaRef} className={`panel-content`}>

          <div
            ref={mainRef}
            className={`panel-content-main ${shown.main ? "visible" : ""
              }`}
          >
            {main.showCaption && <CaptionText text={main.captionText!} />}

            {main.showOptionsMessage && main.lastMsg && (

              // Keyed by the message, so each new set of options animates in.
              <div className='panel-message' key={main.optionsKey}>
                {isEnglish ? 'Choose' : 'اختر'}:
                {main.lastMsg.data.options.map(opt => (
                  <div className='pannel-message-option' onClick={() => sendText(opt.text)}>{opt.text}</div>
                ))}
              </div>
            )}
          </div>

          <div ref={boardColumnRef} className='panel-board-column'>
            <div ref={containerRef}
              className={`panel-content-whiteboard ${shown.board ? "visible" : ""
                }`}

            >

                <div ref={contentRef} className='panel-content-whiteboard-content'>
                  <BoardView board={boardContent} dir={isEnglish ? 'ltr' : 'rtl'} />
                </div>
            </div>

            {/* Media controls keep the same order and direction in RTL, as in
                every major player; they follow time, not reading order. */}
            {shown.controls && (
              <div ref={controlsRef} className='playback-controls' dir='ltr'>
                <button
                  className='playback-btn'
                  disabled={!playback.hasPrevious}
                  onClick={() => mic?.rewindStream()}
                  aria-label={isEnglish ? 'Previous' : 'السابق'}
                  title={isEnglish ? 'Previous' : 'السابق'}
                >
                  <RotateCcw strokeWidth={2.25} />
                </button>

                {/* Pause/resume live on the AI icon, which also tells the backend. */}

                <button
                  className='playback-btn'
                  disabled={!playback.hasNext}
                  onClick={() => mic?.playNextStream()}
                  aria-label={isEnglish ? 'Next' : 'التالي'}
                  title={isEnglish ? 'Next' : 'التالي'}
                >
                  <RotateCw strokeWidth={2.25} />
                </button>
              </div>
            )}
          </div>

        </div>
        <div className='tools-bar'>


          <div className='controls-right'>


            <button
              className={"ai-control " + aiStatus}
              onClick={aiAction}
              aria-disabled={!aiAction}
              aria-label={aiLabel}
              title={aiLabel}
            >
              <span className="ai-ring"></span>

              {aiStatus == "thinking" && (
                <span className="ai-core">
                  <span className="stop-square"></span>
                </span>
              )}
              {aiStatus == "speaking" && (
                <span className="ai-core">
                  <Pause className="ai-core-icon" fill="currentColor" strokeWidth={0} />
                </span>
              )}
              {aiStatus == "paused" && (
                <span className="ai-core">
                  <Play className="ai-core-icon ai-play-icon" fill="currentColor" strokeWidth={0} />
                </span>
              )}
              {(aiStatus == "ready" || aiStatus == "listening") && (
                <span className="ai-core">
                  <AiWaves />
                </span>
              )}
            </button>

            {/* The mic, always here: black when off, green when on. */}
            <button
              className={`control-btn mic-btn ${micStatus ? 'on' : ''}`}
              onClick={micStatus ? stopMic : startMic}
              disabled={micStarting}
              aria-pressed={micStatus}
              aria-label={micLabel}
              title={micLabel}
            >
              <Mic strokeWidth={2.25} />
            </button>

            <button
              className={`control-btn rate-btn ${speed.rate !== 1 ? 'changed' : ''}`}
              onClick={cycleRate}
              aria-label={speedLabel}
              title={speedLabel}
            >
              {/* The speedometer marks the control at normal speed; once
                  changed, it says which way. */}
              {speed.rate === 1
                ? <SpeedometerIcon />
                : <span>{isEnglish ? speed.en : speed.ar}</span>}
            </button>

          </div>


          <div>
            {/* A label, so a click or tap anywhere on the pill focuses the input. */}
            <label className="input-wrapper">
              <input
                  type="text"
                  dir={textDirection(draft)}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={isEnglish ? 'Write..' : 'اكتب..'}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const value = draft.trim();

                      if (value) {
                        sendText(value)
                        setDraft("")
                      }
                    }
                  }}
                />
                </label>
          </div>


          <div className='control-group'>

            <button
              className={`control-btn cc-btn ${ccEnabled ? 'on' : ''}`}
              onClick={toggleCc}
              aria-pressed={ccEnabled}
              aria-label={isEnglish ? 'Captions' : 'الترجمة النصية'}
              title={isEnglish ? 'Captions' : 'الترجمة النصية'}
            >
              CC
            </button>

<button
  className="control-btn toggle"
  style={{padding: "0px"}}
  title={toolLocation === "down" ? "Move up" : "Move down"}
  aria-pressed="false"
  onClick={() =>
    setToolLocation(toolLocation === "down" ? "up" : "down")
  }
>
<svg viewBox="0 0 26 26" width={26} height={26}>
  {toolLocation === "down" && (
    <rect
      x="0"
      y="2"
      width="26"
      height="10"
      rx="4"
      fill="currentColor"
      strokeWidth={0}
    />
  )}

  {toolLocation === "up" && (
    <rect
      x="0"
      y="15"
      width="26"
      height="10"
      rx="4"
      fill="currentColor"
      strokeWidth={0}
    />
  )}
</svg>
</button>

            {visibleCount > 0 && (
            <button
                className="control-btn toggle"
                title={isMinimized ? "Restore" : "Minimize"}
                aria-label={isMinimized ? "Restore" : "Minimize"}
                aria-pressed={!isMinimized}

                onClick={() => setIsMinimized(!isMinimized)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {isMinimized ? (
                    <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />

                  ) : (
                    <path d="M5 12h14" />
                  )}
                </svg>
              </button>
              )}
          </div>
        </div>
      </div>
    );
  });

export default Panel;

import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import './Panel.css';
import { useTutor } from '../api/tutor/hook';
import { useDocumentLang } from '../lib/useDocumentLang';
import { textDirection } from '../lib/textDirection';
import { htmlText, inlineHtml } from '../lib/inlineHtml';
import { useAutoHeightTransition } from '../lib/useAutoHeightTransition';
import { useKeyboardInset } from '../lib/useKeyboardInset';
import { usePanelLayout } from '../lib/usePanelLayout';
import BoardView from './board/BoardView';
import CaptionText from './CaptionText';
import AiTasks from './AiTasks';
import { useApp } from '../App';
import type { Message, MessageOptionsData } from '../types/book';
import { onLaserShown, sendText } from '../api/books';
import { fitFrameToBox, fitToBox } from '../lib/fitToBox';
import { ArrowLeft, ArrowRight, History, Mic, RotateCcw, RotateCw, WifiOff } from 'lucide-react';
import { requireConnection, useSocketConnected } from '../lib/connection';
import { SpeedometerIcon } from './icons/SpeedIcons';
import AiDotMatrix from './AiDotMatrix';
import AiCharacter from './AiCharacter';
import { AI_ICON_STYLE } from '../config/aiIcon';
import ConversationHistory, { type HistoryStep } from './ConversationHistory';

// Sliding between the top and bottom of the screen.
const PANEL_SLIDE_MS = 350;
// The panel moves out of the way when at least this share of the laser's
// points are behind it.
const LASER_COVERED_RATIO = 0.8;
// How long to wait for the laser's zones to show (they need the page analysis).
const LASER_CHECK_MS = 150;
const LASER_CHECKS = 10;
// A resize finishing this soon after the user opened or minimized the panel is
// theirs (it fades out, resizes and fades in, well within this).
const USER_RESIZE_MS = 1500;

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


    const { isBoardOpen, setIsBoardHidden, boardContent, captionText, aiTasks, stopAiTask, dismissAiTask, messages, aiStatus, micStarting, startMic, stopMic, cancelRequest, pauseRequest, resumeRequest } = useTutor()
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

    // Offline, nothing can be asked: the input is disabled and the AI icon
    // says so (tapping it explains why).
    const connected = useSocketConnected()
    const iconStatus = connected ? aiStatus : "offline"

    // The AI icon acts only while there's an answer: cancel it while it's
    // coming, pause it while it plays, resume it while paused.
    const aiAction =
      !connected ? () => { requireConnection() }
      : aiStatus === "thinking" ? cancelRequest
      : aiStatus === "speaking" ? pauseRequest
      : aiStatus === "paused" ? resumeRequest
      : undefined
    const aiLabel = isEnglish
      ? { ready: 'AI tutor', listening: 'AI tutor, listening', thinking: 'Stop answer', speaking: 'Pause', paused: 'Resume', offline: 'AI tutor offline, reconnecting' }[iconStatus]
      : { ready: 'المعلم الذكي', listening: 'المعلم الذكي يستمع', thinking: 'إيقاف الإجابة', speaking: 'إيقاف مؤقت', paused: 'استئناف', offline: 'المعلم الذكي غير متصل، جارٍ إعادة الاتصال' }[iconStatus]
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
    const showTasks = aiTasks.length > 0;
    const showMain = showOptionsMessage || showCaption || showTasks;

    const visibleCount =
      Number(isBoardOpen) + Number(showMain);


    const [isMinimized, setIsMinimized] = useState(visibleCount == 0);
    // When the user last opened or minimized the panel themselves (see the
    // laser check after a resize, below).
    const userResizedAt = useRef(-Infinity);

    // What the panel shows: the live tutor (caption, options and board), the
    // conversation's history in their place, or a step picked from it.
    const [view, setView] = useState<'live' | 'history' | 'step'>('live');
    const [historyStep, setHistoryStep] = useState<HistoryStep>();
    // Bumped each time the history opens, so it loads the latest messages.
    const [historyLoadKey, setHistoryLoadKey] = useState(0);

    const toggleHistory = () => {
      userResizedAt.current = performance.now()
      if (view === 'live') {
        setHistoryLoadKey(key => key + 1)
        setView('history')
      } else {
        setView('live')
      }
    }
    const openHistoryStep = (step: HistoryStep) => {
      userResizedAt.current = performance.now()
      setHistoryStep(step)
      setView('step')
    }
    const backToHistory = () => {
      userResizedAt.current = performance.now()
      setView('history')
    }

    // A minimized board isn't active, nor is one the history is showing in
    // place of: its step stops going out with messages.
    useEffect(() => {
      setIsBoardHidden(isMinimized || view !== 'live')
    }, [isMinimized, view])

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
      if (next) {
        userResizedAt.current = performance.now()
        setIsMinimized(false)
      }
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
    const historyRef = useRef<HTMLDivElement>(null);
    const showingStep = view === 'step' && !!historyStep;
    const { shown, animating } = usePanelLayout(
      view === 'history'
        ? { main: false, board: false, controls: false, history: true, open: true }
        : showingStep
          ? { main: !!historyStep.text, board: !!historyStep.board, controls: false, history: false, open: true }
          : {
            main: showMain,
            board: isBoardOpen,
            controls: showPlayback,
            history: false,
            open: !isMinimized && (showMain || isBoardOpen),
          },
      { panel: panelRef, content: contentAreaRef, main: mainRef, board: boardColumnRef, controls: controlsRef, history: historyRef },
    );

    // Whose content the main area and board hold: the step picked from the
    // history while it shows, and still while they fade out on the way back
    // to the history (the step stays until the live tutor's comes back).
    const stepSource = useRef(false);
    if (showingStep) stepSource.current = true;
    else if (view === 'live') stepSource.current = false;
    const shownStep = stepSource.current ? historyStep : undefined;
    const board = shownStep ? shownStep.board : boardContent;
    const boardDir = shownStep ? (shownStep.lang === 'en' ? 'ltr' : 'rtl') : (isEnglish ? 'ltr' : 'rtl');
    const shownCount = shown.open ? Number(shown.main) + Number(shown.board) : 0

    // The main area keeps its last caption/options while it fades out,
    // including the options' key: if that changed (the messages were cleared),
    // the options bubble would be re-created and replay its entrance, blinking
    // back in while the main area fades away.
    const currentMain = { showCaption, captionText, showOptionsMessage, lastMsg, optionsKey: messages.length, aiTasks }
    const lastMain = useRef(currentMain)
    if (showMain) lastMain.current = currentMain
    const main = showMain ? currentMain : lastMain.current

    // With no board, the content area sizes to the caption/options; animate
    // it when they change (e.g. options appearing under a caption).
    useAutoHeightTransition(
      contentAreaRef,
      !animating && shown.open && shown.main && !shown.board,
      [captionText, showOptionsMessage, messages.length, aiTasks, shownStep],
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
    }, [board]);


    const [toolLocation, setToolLocation] = useState<'up' | 'down'>('down');
    // On a tablet, the panel rises above the on-screen keyboard while it's
    // open (at the bottom of the screen; at the top it isn't in the way).
    const keyboardInset = useKeyboardInset();
    const toolLocationRef = useRef(toolLocation);
    const slide = useRef<Animation | undefined>(undefined);

    // Moves the panel to the top or bottom of the screen, sliding from where it
    // is now (even mid-slide) to its new place.
    const moveTo = (location: 'up' | 'down') => {
      const panel = panelRef.current;
      if (!panel || location === toolLocationRef.current) return;
      const before = panel.getBoundingClientRect().top;
      slide.current?.cancel();
      flushSync(() => {
        toolLocationRef.current = location;
        setToolLocation(location);
      });
      const dy = before - panel.getBoundingClientRect().top;
      if (Math.abs(dy) < 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      slide.current = panel.animate(
        [{ transform: `translate(-50%, ${dy}px)` }, { transform: 'translate(-50%, 0)' }],
        { duration: PANEL_SLIDE_MS, easing: 'cubic-bezier(0.2, 0, 0, 1)', composite: 'replace' },
      );
    };

    // When the laser points at the page, keep the panel off what it points at:
    // if most of the points are behind it, move it to the other end of the
    // screen, as long as it covers fewer of them there. The user can still move
    // it back; it's only looked at again when the laser points somewhere new,
    // or when the panel changes size by itself (see below).
    const checkLaser = useRef<(retries: number) => void>(() => {});
    useEffect(() => {
      let frame = 0;
      let retry: ReturnType<typeof setTimeout> | undefined;
      const check = (attempt: number, retries: number) => {
        const panel = panelRef.current;
        if (!panel) return;
        const points = [...document.querySelectorAll('.page-laser-overlay [data-laser-point]')]
          .map(el => el.getBoundingClientRect())
          .filter(r => r.width > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth)
          .map(r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 }));
        // The zones show once the page's analysis has them; wait a little.
        if (points.length === 0) {
          if (attempt < retries) retry = setTimeout(() => check(attempt + 1, retries), LASER_CHECK_MS);
          return;
        }
        const rect = panel.getBoundingClientRect();
        const covered = (top: number) => points.filter(p =>
          p.x >= rect.left && p.x <= rect.right && p.y >= top && p.y <= top + rect.height).length;
        // Where it's meant to be, not where it is mid-slide.
        const edge = 8;
        const current = toolLocationRef.current;
        const here = covered(current === 'up' ? edge : window.innerHeight - edge - rect.height);
        if (here / points.length < LASER_COVERED_RATIO) return;
        const other = current === 'up' ? 'down' : 'up';
        const there = covered(other === 'up' ? edge : window.innerHeight - edge - rect.height);
        if (there < here) moveTo(other);
      };
      checkLaser.current = retries => {
        cancelAnimationFrame(frame);
        clearTimeout(retry);
        // After the zones have rendered.
        frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => check(0, retries)); });
      };
      const unsubscribe = onLaserShown(() => checkLaser.current(LASER_CHECKS));
      return () => {
        unsubscribe();
        cancelAnimationFrame(frame);
        clearTimeout(retry);
      };
    }, []);

    // The panel grew or shrank by itself (e.g. opened for a board or a
    // caption) and may now be over the laser: check again once it has its new
    // size. Not when the user opened or minimized it; it stays where they had it.
    const wasAnimating = useRef(false);
    useEffect(() => {
      const finished = wasAnimating.current && !animating;
      wasAnimating.current = animating;
      if (!finished) return;
      if (performance.now() - userResizedAt.current < USER_RESIZE_MS) return;
      // The laser is already showing, if it is: no need to wait for it.
      checkLaser.current(0);
    }, [animating]);


    return (
      <div ref={panelRef} style={{ '--keyboard-inset': `${keyboardInset}px` } as React.CSSProperties} className={`panel panel-content-${shownCount} ${toolLocation} ${shown.open ? '' : 'minimized'} ${shown.open && shown.controls ? 'has-playback' : ''} ${shown.open && shown.main && !shown.board ? 'main-only' : ''} ${shown.open && shown.history ? 'history-open' : ''} ${shownStep && shown.open && !shown.history ? 'history-step' : ''}`}>
        <div ref={contentAreaRef} className={`panel-content`}>

          <div
            ref={mainRef}
            className={`panel-content-main ${shown.main ? "visible" : ""
              }`}
          >
            {/* A step picked from the history: what the tutor said then. */}
            {shownStep && (
              <div className='panel-caption' dir={shownStep.lang === 'en' ? 'ltr' : 'rtl'}>
                {shownStep.text}
              </div>
            )}

            {!shownStep && main.showCaption && <CaptionText text={main.captionText!} />}

            {!shownStep && main.showOptionsMessage && main.lastMsg && (

              // Keyed by the message, so each new set of options animates in.
              <div className='panel-message' key={main.optionsKey}>
                {isEnglish ? 'Choose' : 'اختر'}:
                {/* Options can be simple HTML (MathML, simple SVG); each shows on
                    one line, cut with an ellipsis if too long (in full on hover). */}
                {main.lastMsg.data.options.map((opt, i) => (
                  <button
                    key={i}
                    type='button'
                    dir='auto'
                    className='pannel-message-option'
                    onClick={() => { if (requireConnection()) sendText(opt.text) }}
                    title={htmlText(opt.text)}
                    dangerouslySetInnerHTML={{ __html: inlineHtml(opt.text) }}
                  />
                ))}
              </div>
            )}

            {/* What the AI is working on in the background, under the options. */}
            <AiTasks
              tasks={shownStep ? [] : main.aiTasks}
              lang={isEnglish ? 'en' : 'ar'}
              onStop={stopAiTask}
              onDismiss={dismissAiTask}
            />
          </div>

          <div ref={boardColumnRef} className='panel-board-column'>
            <div ref={containerRef}
              className={`panel-content-whiteboard ${shown.board ? "visible" : ""
                }`}

            >

                <div ref={contentRef} className='panel-content-whiteboard-content'>
                  <BoardView board={board} dir={boardDir} />
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

          {/* The conversation so far, in place of the main area and board. */}
          <div ref={historyRef} className={`panel-history ${shown.history ? 'visible' : ''}`} aria-hidden={!shown.history}>
            <ConversationHistory
              loadKey={historyLoadKey}
              lang={isEnglish ? 'en' : 'ar'}
              selectedKey={historyStep?.key}
              onSelect={openHistoryStep}
            />
          </div>

        </div>

        {/* Over the step picked from the history (no extra row, so the panel
            keeps its height): back to the history. */}
        {showingStep && shown.open && !shown.history && (
          <button
            type='button'
            className='panel-history-back'
            onClick={backToHistory}
            aria-label={isEnglish ? 'Back to conversation' : 'العودة إلى المحادثة'}
            title={isEnglish ? 'Back to conversation' : 'العودة إلى المحادثة'}
          >
            {isEnglish ? <ArrowLeft strokeWidth={2.25} /> : <ArrowRight strokeWidth={2.25} />}
          </button>
        )}

        <div className='tools-bar'>


          <div className='controls-right'>


            <button
              className={"ai-control " + iconStatus}
              onClick={aiAction}
              aria-disabled={!aiAction}
              aria-label={aiLabel}
              title={aiLabel}
            >
              <span className="ai-ring"></span>

              {iconStatus == "offline" && (
                <span className="ai-core">
                  <WifiOff className="ai-core-icon" strokeWidth={2.25} />
                </span>
              )}
              {iconStatus != "offline" && (
                <span className={`ai-core ${AI_ICON_STYLE}`}>
                  {AI_ICON_STYLE === 'dot-matrix' && <AiDotMatrix status={iconStatus} />}
                  {AI_ICON_STYLE === 'character' && <AiCharacter status={iconStatus} rtl={!isEnglish} />}
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


          {/* On its own row under the buttons, across the whole panel. */}
          <div className='tools-input'>
            {/* A label, so a click or tap anywhere on the pill focuses the input. */}
            <label className={`input-wrapper ${connected ? '' : 'disabled'}`}>
              <input
                  type="text"
                  dir={textDirection(draft)}
                  value={draft}
                  disabled={!connected}
                  onChange={(e) => setDraft(e.target.value)}
                  // iOS scrolls the page up to show an input as it's tapped;
                  // focus it without that (the panel rises above the
                  // keyboard instead).
                  onTouchEnd={(e) => {
                    const input = e.currentTarget
                    if (document.activeElement === input) return
                    e.preventDefault()
                    input.focus({ preventScroll: true })
                  }}
                  placeholder={connected
                    ? (isEnglish ? 'Write..' : 'اكتب..')
                    : (isEnglish ? 'Offline — reconnecting..' : 'غير متصل — جارٍ إعادة الاتصال..')}
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
    moveTo(toolLocation === "down" ? "up" : "down")
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

            {(visibleCount > 0 || view !== 'live') && (
            <button
                className="control-btn toggle"
                title={isMinimized && view === 'live' ? "Restore" : "Minimize"}
                aria-label={isMinimized && view === 'live' ? "Restore" : "Minimize"}
                aria-pressed={!isMinimized || view !== 'live'}

                onClick={() => {
                  userResizedAt.current = performance.now()
                  // Minimizing from the history goes back to the live tutor.
                  if (view !== 'live') {
                    setView('live')
                    setIsMinimized(true)
                  } else {
                    setIsMinimized(!isMinimized)
                  }
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {isMinimized && view === 'live' ? (
                    <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />

                  ) : (
                    <path d="M5 12h14" />
                  )}
                </svg>
              </button>
              )}

            {/* At the panel's edge: the conversation's history in place of
                the live tutor, and back. */}
            <button
              className={`control-btn history-btn ${view !== 'live' ? 'on' : ''}`}
              onClick={toggleHistory}
              aria-pressed={view !== 'live'}
              aria-label={isEnglish ? 'Conversation history' : 'سجل المحادثة'}
              title={isEnglish ? 'Conversation history' : 'سجل المحادثة'}
            >
              <History strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    );
  });

export default Panel;

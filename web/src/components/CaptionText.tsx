import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../App';
import { activeWordIndex, layoutCaption, learnPace } from '../lib/captionTiming';

// Audio going back by more than this (a replay, not jitter) resets the highlight.
const JUMP_BACK_S = 0.3;

// The closed-caption bubble, with the word being spoken highlighted. Its
// timing is estimated from how far the audio has got (see captionTiming.ts),
// so it follows pauses, jumps and speed changes along with the audio.
export default function CaptionText({ text }: { text: string }) {
  const { mic } = useApp();
  const layout = useMemo(() => layoutCaption(text), [text]);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLSpanElement>(null);

  // Follow the audio each frame; re-render only when the word changes.
  useEffect(() => {
    let frame = 0;
    let current = -1;
    let lastElapsed = 0;
    let learned = false;
    setActive(-1);

    const tick = () => {
      const progress = mic?.getSpeechProgress();
      // Only the stream this caption belongs to (between streams, the next
      // one's audio may already be scheduled while this caption still shows).
      if (progress && progress.caption === text) {
        if (progress.complete && !learned) {
          learnPace(layout, progress.total);
          learned = true;
        }
        // Only forward: the length is an estimate while the stream arrives,
        // and correcting it would otherwise pull the highlight back a few
        // words. A real jump back (the audio itself went back) starts over.
        const jumpedBack = progress.elapsed < lastElapsed - JUMP_BACK_S;
        lastElapsed = progress.elapsed;
        const estimate = activeWordIndex(layout, progress);
        const index = jumpedBack ? estimate : Math.max(current, estimate);
        if (index !== current) {
          current = index;
          setActive(index);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mic, text, layout]);

  // Keep the spoken word in view in a long, scrolling caption.
  useEffect(() => {
    const box = boxRef.current;
    const word = activeRef.current;
    if (!box || !word) return;
    const top = word.offsetTop - box.offsetTop;
    const bottom = top + word.offsetHeight;
    if (top < box.scrollTop) box.scrollTop = top;
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
  }, [active]);

  return (
    // The bubble (with its tail) wraps the scrolling text: a scrolling box
    // would clip the tail, which sits just outside it.
    <div className='panel-caption' dir='auto' aria-live='polite'>
      <div ref={boxRef} className='panel-caption-text'>
      {layout.tokens.map((token, i) =>
        token.isWord ? (
          <span
            key={i}
            ref={i === active ? activeRef : undefined}
            className={`caption-word ${i === active ? 'active' : ''}`}
          >
            {token.text}
          </span>
        ) : (
          token.text
        ),
      )}
      </div>
    </div>
  );
}

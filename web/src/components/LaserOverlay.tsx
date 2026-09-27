import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { LaserZone } from '../api/book-page/provider';
import { gaps, toMarks, type Box, type Mark } from '../lib/laserMarks';

// How long the previous marks take to fade when the laser moves on.
const LEAVE_MS = 220;
// Points whose marks would be closer than this (in hundredths of the page's
// width), or overlap, are joined into one.
const JOIN_GAP = 3;
// Marks are never smaller than this (in hundredths of the page's width), so a
// small point is easy to see and a box that's a little off still sits inside.
const MIN_SIZE = 8;
// Each mark appears this much after the one before it, up to a limit so a lot
// of scattered points don't take long to show.
const STAGGER_MS = 60;
const STAGGER_MAX_MS = 480;

type Marks = { marks: Mark[]; key: number };

// The laser: a faint tint over each thing the tutor points at, whatever it is
// (words, a shape, a picture) and wherever it is on the page, with a ring-shaped
// ripple that keeps spreading out from it. Each mark is a rounded shape padded around
// its box (a circle or pill around something small, a rounded rectangle around
// something big), so boxes that are a little off still sit inside it. The layer is multiplied into the page (see .page-laser-overlay):
// its colour tints the paper, but what's under it stays as dark as it was.
export default function LaserOverlay({
  width,
  height,
  zones,
  rtl,
}: {
  // The page's size, in the analysis' units (the SVG's viewBox).
  width: number;
  height: number;
  zones: LaserZone[];
  rtl: boolean;
}) {
  // Sizes relative to the page, whatever its units.
  const unit = width / 100;

  const generation = useRef(0);
  const last = useRef<Marks | undefined>(undefined);
  const current = useMemo<Marks>(() => {
    const near = (a: Box, b: Box) => {
      const gap = gaps(markShape(a, unit), markShape(b, unit));
      return gap.x < unit * JOIN_GAP && gap.y < unit * JOIN_GAP;
    };
    const marks = toMarks(zones, rtl, near);
    // The same marks as showing (e.g. the page's analysis was fetched again)
    // stay as they are, rather than fading out and appearing again.
    if (last.current && sameMarks(last.current.marks, marks)) return last.current;
    last.current = { marks, key: ++generation.current };
    return last.current;
  }, [zones, rtl, unit]);

  // The marks that were showing before, while they fade out.
  const [leaving, setLeaving] = useState<Marks | undefined>(undefined);
  const shown = useRef<Marks | undefined>(undefined);
  useLayoutEffect(() => {
    const previous = shown.current;
    shown.current = current;
    if (!previous || previous.marks.length === 0) return;
    setLeaving(previous);
    const timer = setTimeout(() => setLeaving(undefined), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [current]);

  return (
    <svg xmlns='http://www.w3.org/2000/svg'
      viewBox={`0 0 ${width} ${height}`}
      className='page-laser-overlay'>
      {leaving && (
        <g className='laser-set is-leaving' key={leaving.key}>
          {leaving.marks.map(mark => <MarkView key={mark.order} mark={mark} unit={unit} />)}
        </g>
      )}
      {current.marks.length > 0 && (
        <g className='laser-set' key={current.key}>
          {current.marks.map(mark => <MarkView key={mark.order} mark={mark} unit={unit} point />)}
        </g>
      )}
    </svg>
  );
}

const sameMarks = (a: Mark[], b: Mark[]) =>
  a.length === b.length && a.every((mark, i) =>
    mark.x === b[i].x && mark.y === b[i].y && mark.width === b[i].width && mark.height === b[i].height);

// The shape drawn around a box: padded in proportion to its size (within
// limits) and at least the minimum size, centred on the box. It's drawn fully
// rounded when it's small (a pill or circle), with rounded corners when it's
// big (a picture).
function markShape(box: Box, unit: number): Box {
  const pad = Math.min(Math.max(Math.min(box.width, box.height) * 0.35, unit * 0.6), unit * 2.5);
  const width = Math.max(box.width + pad * 2, unit * MIN_SIZE);
  const height = Math.max(box.height + pad * 2, unit * MIN_SIZE);
  return {
    x: box.x + box.width / 2 - width / 2,
    y: box.y + box.height / 2 - height / 2,
    width,
    height,
  };
}

function MarkView({
  mark,
  unit,
  point = false,
}: {
  mark: Mark;
  unit: number;
  // Mark it as one of the laser's points (the tutor panel keeps clear of them).
  point?: boolean;
}) {
  const delay = { animationDelay: `${Math.min(mark.order * STAGGER_MS, STAGGER_MAX_MS)}ms` };
  const shape = markShape(mark, unit);
  const rx = Math.min(Math.min(shape.width, shape.height) / 2, unit * 4);

  return (
    <g className='laser-point' style={delay} data-laser-point={point ? '' : undefined}>
      <rect className='laser-fill' {...shape} rx={rx} />
      <rect className='laser-ripple' {...shape} rx={rx} strokeWidth={unit * 0.3} style={delay} />
    </g>
  );
}

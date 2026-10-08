import { useRef, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { clarifyPart, type PartAction } from '../api/books';
import { requireConnection } from '../lib/connection';

type MenuAction = { action: PartAction; en: string; ar: string };

const EXPLAIN: MenuAction = { action: 'clarify-part', en: 'Explain', ar: 'اشرح' };

// What each part's menu offers: a question can also be solved or answered
// from options; the others can be explained.
const QUESTION_ACTIONS: MenuAction[] = [
  EXPLAIN,
  { action: 'solve', en: 'Solve', ar: 'حل' },
  { action: 'show-options', en: 'Show options', ar: 'اعرض الخيارات' },
];
const OTHER_ACTIONS: MenuAction[] = [EXPLAIN];

// How each part type is named, for screen readers and tooltips.
const PART_NAMES: Record<string, { en: string; ar: string }> = {
  question: { en: 'Question', ar: 'سؤال' },
  concept: { en: 'Concept', ar: 'مفهوم' },
  example: { en: 'Example', ar: 'مثال' },
};

// The marker's radius and its tap area's, in the page's units (it's drawn in
// the page's SVG, so it moves and zooms with the page). The tap area is also
// at least finger-sized on screen (see .page-part-hit).
const MARK_R = 8;
const HIT_R = 16;
// A press that moves further than this (px) is dragging the page, not a tap;
// a finger wobbles more than a mouse.
const TAP_SLOP_PX = 6;
const TOUCH_TAP_SLOP_PX = 12;
// Between the menu and the marker (px).
const MENU_GAP_PX = 4;

type Placement = { side: 'top' | 'bottom'; offset: number };

export type PagePart = {
  id: string;
  type: string;
  coordinates: { x: number; y: number; width: number; height: number };
};

export const partKind = (type: string | undefined) =>
  Object.keys(PART_NAMES).find(kind => type?.includes(kind));

// A part of the page the tutor can help with (a question, a concept, an
// example): the same small sparkle for every type, at the part's top corner on
// the side its text starts. The tap area around it is bigger than it looks.
// A tap opens a menu of what to ask about it.
export default function PagePartMarker({ part, rtl, isEnglish }: { part: PagePart; rtl: boolean; isEnglish: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement>({ side: 'bottom', offset: MENU_GAP_PX });
  const markerRef = useRef<SVGGElement>(null);
  const pressedAt = useRef<{ x: number; y: number; touch: boolean } | undefined>(undefined);

  // Opens the menu below the marker, or above it when the marker is in the
  // lower half of the screen (where the panel usually is, and the menu would
  // go behind it): its bottom edge then meets the marker's top. The menu is
  // placed against the marker itself, not its bigger tap area.
  const openMenu = (open: boolean) => {
    const rect = markerRef.current?.getBoundingClientRect();
    if (open && rect) {
      // The tap area's margin around the marker, in pixels at this zoom.
      const margin = (HIT_R - MARK_R) * (rect.height / (HIT_R * 2));
      const lower = rect.top + rect.height / 2 > window.innerHeight / 2;
      setPlacement({ side: lower ? 'top' : 'bottom', offset: MENU_GAP_PX - margin });
    }
    setMenuOpen(open);
  };

  const kind = partKind(part.type) ?? 'question';
  const actions = kind === 'question' ? QUESTION_ACTIONS : OTHER_ACTIONS;
  const name = isEnglish ? PART_NAMES[kind].en : PART_NAMES[kind].ar;
  const x = part.coordinates.x + (rtl ? part.coordinates.width : 0);
  const y = part.coordinates.y;

  const marker = (
    <g
      ref={markerRef}
      className='page-part'
      transform={`translate(${x}, ${y})`}
      role='button'
      tabIndex={0}
      aria-label={name}
      // Only a tap opens it (not the press itself, like a menu button
      // usually does), so a press that drags the page doesn't.
      onPointerDown={e => {
        pressedAt.current = { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' };
        e.preventDefault();
      }}
      onClick={e => {
        const from = pressedAt.current;
        pressedAt.current = undefined;
        const slop = from?.touch ? TOUCH_TAP_SLOP_PX : TAP_SLOP_PX;
        if (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) > slop) return;
        openMenu(true);
      }}
    >
      <title>{name}</title>
      <circle className='page-part-hit' r={HIT_R} />
      <circle className='page-part-chip' r={MARK_R} strokeWidth={1} />
      {/* A four-point sparkle (the AI can help with this). */}
      <path
        className='page-part-sparkle'
        d='M0 -3.8C0.4 -1.2 1.2 -0.4 3.8 0C1.2 0.4 0.4 1.2 0 3.8C-0.4 1.2 -1.2 0.4 -3.8 0C-1.2 -0.4 -0.4 -1.2 0 -3.8Z'
        transform={`scale(${MARK_R / 6})`}
      />
    </g>
  );

  return (
    <DropdownMenu.Root open={menuOpen} onOpenChange={openMenu} dir={isEnglish ? 'ltr' : 'rtl'}>
      <DropdownMenu.Trigger asChild>{marker}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side={placement.side}
          align='start'
          sideOffset={placement.offset}
          collisionPadding={12}
          // Don't put focus back on the marker after a choice: it isn't
          // needed for a tap, and it would show the focus state.
          onCloseAutoFocus={e => e.preventDefault()}
          className='z-50 min-w-40 rounded-2xl border border-border bg-surface p-1.5 shadow-e2'
        >
          {actions.map(action => (
            <DropdownMenu.Item
              key={action.action}
              // Offline, the user is asked to check their connection instead.
              onSelect={() => { if (requireConnection()) void clarifyPart(part.id, action.action) }}
              className='flex min-h-10 cursor-pointer items-center rounded-xl px-3 text-[14px] text-text outline-none transition-colors data-[highlighted]:bg-surface-2'
            >
              {isEnglish ? action.en : action.ar}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

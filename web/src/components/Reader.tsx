import {
  useEffect,
  useRef,
  useState,
} from 'react';
      
            
      import { PageProvider } from '../api/book-page/provider';
import { useBook } from '../api/book/hook';
import { useTutor } from '../api/tutor/hook';
import ReaderPage from './ReaderPage';
import { bookDirection } from '../lib/bookDirection';
import { useDocumentLang } from '../lib/useDocumentLang';
      
      type Props = {
      };

      // How long after the last wheel/scroll movement the pages settle, where
      // the browser doesn't say when scrolling ends ('scrollend').
      const SETTLE_MS = 80;
      // Zoomed, how far (a share of the view's width) a neighbouring page has
      // to be dragged in to move to it.
      const ZOOMED_SWITCH_SHARE = 0.25;
      // Longest a page centring scroll is taken to last, where the browser
      // doesn't say when it ends.
      const AUTO_SCROLL_MAX_MS = 1000;
      
    export default function Reader({
      }: Props) {

            const { currentPageIndex, book, setCurrentPageIndex, analyzingPages, analysisRevisions, zoomed } = useBook()
            const { isBoardOpen } = useTutor()
        

        const containerRef =
          useRef<HTMLDivElement>(null);

        const pageRefs =
          useRef<(HTMLDivElement | null)[]>([]);

        // The page being read. While the user drags, it stays the one they
        // started on; it changes once they let go (see settle).
        const activePage = currentPageIndex ?? 0;

        const [isDragging, setIsDragging] = useState(false);

        // Mouse drag in progress: where it started.
        const drag = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | undefined>(undefined);
        // A finger is on the pages (the browser scrolls them itself).
        const touching = useRef(false);
        // The page is scrolling to centre a page by itself: its scroll events
        // aren't the user's.
        const autoScrolling = useRef(false);
        const autoScrollEnd = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
        const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
        // Whether the reader has been put on its first page yet. Until then
        // it's hidden, and it goes there directly (no scrolling past the
        // pages before it), as soon as it has its size.
        const [positioned, setPositioned] = useState(false);
        const positionedRef = useRef(false);

        // Zoomed, read by the event handlers set up once per book.
        const zoomedRef = useRef(zoomed);
        zoomedRef.current = zoomed;
        const isRtl = bookDirection(book) === 'rtl';

        // Scrolls sideways by `delta`, to an absolute position, so asking
        // again on the way there doesn't overshoot. `instant` jumps there.
        const scrollByDelta = (delta: number, instant: boolean) => {
          const container = containerRef.current;
          if (!container || Math.abs(delta) < 1) return;
          autoScrolling.current = true;
          container.scrollTo({ left: container.scrollLeft + delta, behavior: instant ? 'instant' : 'smooth' });
          // It's over at 'scrollend'; the timer covers browsers without it.
          clearTimeout(autoScrollEnd.current);
          autoScrollEnd.current = setTimeout(() => { autoScrolling.current = false; }, AUTO_SCROLL_MAX_MS);
        };

        // The page's and the reader's boxes on screen, once it's laid out.
        const measure = (index: number) => {
          const container = containerRef.current;
          const pageEl = pageRefs.current[index];
          if (!container || !pageEl || container.clientWidth === 0) return undefined;
          return { page: pageEl.getBoundingClientRect(), view: container.getBoundingClientRect() };
        };

        // Shows a page: in the middle, or, when it's wider than the reader
        // (zoomed), from its start side (right in an RTL book), unless
        // `centred`, which also centres it up and down. `instant` jumps there
        // instead of scrolling.
        const showPage = (index: number, instant = false, centred = false) => {
          const container = containerRef.current;
          // Not laid out yet: the resize observer below tries again.
          if (!container || container.clientWidth === 0) return;

          if (!positionedRef.current) {
            positionedRef.current = true;
            setPositioned(true);
            instant = true;
          }

          const box = measure(index);
          if (!box) return;
          const { page, view } = box;
          const delta = centred || page.width <= view.width + 1
            ? (page.left + page.width / 2) - (view.left + view.width / 2)
            : isRtl ? page.right - view.right : page.left - view.left;
          scrollByDelta(delta, instant);

          // Centred up and down too: on the page's picture, which can be
          // shorter than the page's box.
          if (centred) {
            const picture = pageRefs.current[index]?.querySelector('.page-image')?.getBoundingClientRect() ?? page;
            container.scrollTop += (picture.top + picture.height / 2) - (view.top + view.height / 2);
          }
        };

        // Keeps what's shown within a page, moving as little as possible: a
        // page no wider than the reader is centred; a wider one (zoomed) is
        // only brought back if the view has gone past one of its edges.
        const keepWithin = (index: number) => {
          const box = measure(index);
          if (!box) return;
          const { page, view } = box;
          if (page.width <= view.width + 1) {
            scrollByDelta((page.left + page.width / 2) - (view.left + view.width / 2), false);
          } else if (page.left > view.left) {
            scrollByDelta(page.left - view.left, false);
          } else if (page.right < view.right) {
            scrollByDelta(page.right - view.right, false);
          }
        };

        // The page the user moved to, once settled: shown with keepWithin
        // (from the edge they came in by), rather than from its start.
        const settledTo = useRef<number | undefined>(undefined);

        // Once the user stops moving the pages: stays on the page that fills
        // most of the view, or moves to the one that does. Zoomed (pages wider
        // than the view), dragging a neighbouring page a quarter of the way
        // in is enough to move to it; otherwise it's panning around the page.
        const settle = () => {
          clearTimeout(settleTimer.current);
          settleTimer.current = undefined;
          setIsDragging(false);

          const view = containerRef.current?.getBoundingClientRect();
          if (!view) return;
          const active = activePageRef.current;

          const overlaps = pageRefs.current.map(pageEl => {
            if (!pageEl) return 0;
            const rect = pageEl.getBoundingClientRect();
            return Math.max(0, Math.min(rect.right, view.right) - Math.max(rect.left, view.left));
          });
          let target = active;
          overlaps.forEach((overlap, index) => {
            if (overlap > overlaps[target]) target = index;
          });
          if (zoomedRef.current && target === active) {
            for (const neighbour of [active - 1, active + 1]) {
              if ((overlaps[neighbour] ?? 0) > view.width * ZOOMED_SWITCH_SHARE) target = neighbour;
            }
          }

          if (target !== active) {
            settledTo.current = target;
            setCurrentPageIndex(target);
          } else {
            keepWithin(active);
          }
        };

        const activePageRef = useRef(activePage);

        // Show the current page whenever it changes (after settling, or from
        // the keyboard, the URL or the section list).
        useEffect(() => {
          const changed = activePageRef.current !== activePage;
          activePageRef.current = activePage;
          // A new page starts at its top (when zoomed, it can be scrolled).
          if (changed && containerRef.current) containerRef.current.scrollTop = 0;
          if (settledTo.current === activePage) keepWithin(activePage);
          else showPage(activePage);
          settledTo.current = undefined;
        }, [currentPageIndex, book]);

        // Zooming in or out: show the current page again, directly (its size
        // changed), centred both ways, so it grows and shrinks around its
        // middle.
        const zoomChanges = useRef(0);
        useEffect(() => {
          if (zoomChanges.current++ === 0) return;
          if (containerRef.current) containerRef.current.scrollTop = 0;
          showPage(activePageRef.current, true, true);
        }, [zoomed]);

        // The user moved the pages (a drag, the wheel, a trackpad swipe).
        // Settle once they've stopped: when the mouse is let go, or shortly
        // after the last wheel/scroll movement.
        const onUserMove = () => {
          autoScrolling.current = false;
          setIsDragging(true);
          clearTimeout(settleTimer.current);
          if (!drag.current && !touching.current) settleTimer.current = setTimeout(settle, SETTLE_MS);
        };

        const onScroll = () => {
          if (autoScrolling.current || drag.current) return;
          onUserMove();
        };

        // Scrolling has stopped. The page's own centring is over; the user's
        // scrolling (once the finger or mouse is off) settles straight away,
        // without waiting for the timer.
        const onScrollEnd = () => {
          if (autoScrolling.current) {
            autoScrolling.current = false;
            clearTimeout(autoScrollEnd.current);
            return;
          }
          // A settle is pending (see onUserMove) until settle runs.
          if (!drag.current && !touching.current && settleTimer.current !== undefined) settle();
        };

        // When the reader changes size (it first gets its size, the window is
        // resized...), keep the current page in the middle, directly.
        useEffect(() => {
          const container = containerRef.current;
          if (!container) return;
          const observer = new ResizeObserver(() => {
            if (drag.current || touching.current) return;
            showPage(activePageRef.current, true);
          });
          observer.observe(container);
          return () => observer.disconnect();
        }, [book]);

        useEffect(() => {
          const container = containerRef.current;
          if (!container) return;

          const onMouseDown = (e: MouseEvent) => {
            if (e.button !== 0) return;
            drag.current = { x: e.pageX, y: e.pageY, scrollLeft: container.scrollLeft, scrollTop: container.scrollTop };
            onUserMove();
          };

          const onMouseMove = (e: MouseEvent) => {
            if (!drag.current) return;
            e.preventDefault();
            container.scrollLeft = drag.current.scrollLeft - (e.pageX - drag.current.x);
            // Zoomed, the page is taller than the reader: dragging also moves
            // up and down it.
            container.scrollTop = drag.current.scrollTop - (e.pageY - drag.current.y);
          };

          const onMouseUp = () => {
            if (!drag.current) return;
            drag.current = undefined;
            settle();
          };

          const onTouchStart = () => {
            touching.current = true;
            autoScrolling.current = false;
            clearTimeout(settleTimer.current);
            settleTimer.current = undefined;
          };

          // The page may still glide on after the finger lifts; settle once
          // it stops (scroll events keep putting it off).
          const onTouchEnd = () => {
            touching.current = false;
            onUserMove();
          };

          container.addEventListener('mousedown', onMouseDown);
          container.addEventListener('touchstart', onTouchStart, { passive: true });
          container.addEventListener('touchend', onTouchEnd);
          container.addEventListener('touchcancel', onTouchEnd);
          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
          container.addEventListener('scrollend', onScrollEnd);

          return () => {
            container.removeEventListener('mousedown', onMouseDown);
            container.removeEventListener('touchstart', onTouchStart);
            container.removeEventListener('touchend', onTouchEnd);
            container.removeEventListener('touchcancel', onTouchEnd);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            container.removeEventListener('scrollend', onScrollEnd);
            clearTimeout(settleTimer.current);
            clearTimeout(autoScrollEnd.current);
          };
        }, [book]);


        useEffect(() => {
          const pageCount = book?.pages.length ?? 0;
          if (!pageCount) return;

          const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

            const target = e.target as HTMLElement | null;
            if (
              target?.isContentEditable ||
              target?.closest('input, textarea, select, [role="textbox"]')
            ) {
              return;
            }

            // Pages are laid out in the book's direction (the container's
            // `dir`, not the page's), so in an RTL book the next page sits to the left.
            const isRtl = bookDirection(book) === 'rtl';
            const step = (e.key === 'ArrowRight') === !isRtl ? 1 : -1;

            e.preventDefault();
            setCurrentPageIndex((i) =>
              Math.min(pageCount - 1, Math.max(0, (i ?? 0) + step))
            );
          };

          window.addEventListener('keydown', onKeyDown);
          return () => window.removeEventListener('keydown', onKeyDown);
        }, [book, setCurrentPageIndex]);

              if(!book)  {
                return <ReaderLoading />
              }
        return (
          <div
            ref={containerRef}
            // The page strip runs in the book's direction; the rest of the
            // page keeps the user's session language and direction.
            dir={bookDirection(book)}
            className={`reader-container ${isDragging ? 'dragging' : ''} ${positioned ? '' : 'positioning'} ${zoomed ? 'zoomed' : ''}`}
            onScroll={onScroll}
            onWheel={onUserMove}
          >
            {book.pages.map((page, index) => (

        <PageProvider key={page.pageNumber} pageNumber={page.pageNumber} pageUid={page.uid} analysisRevision={analysisRevisions[index] ?? 0} isActive={index === activePage}>
          <ReaderPage
            key={page.pageNumber}
            ref={(el) => {
              pageRefs.current[index] = el;
            }}
            page={page}
            isDragging={isDragging}
            isActive={index === activePage}
            isBoardOpen={isBoardOpen}
            isAnalyzing={analyzingPages.includes(index)}
          />
          </PageProvider>
        ))}

          </div>
        );
      }



      

// While the book loads: the shape of a page, its lines softly pulsing, where
// the first page will appear, so it settles in place rather than popping in.
function ReaderLoading() {
  const isEnglish = useDocumentLang() === 'en';
  const label = isEnglish ? 'Opening your book…' : 'جارٍ فتح كتابك…';
  // Uneven line lengths, like a page of text.
  const lines = ['92%', '100%', '84%', '96%', '70%', '100%', '88%', '60%'];

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full w-full flex-col items-center justify-center gap-5 bg-surface-2 px-6 py-8"
    >
      <div
        aria-hidden="true"
        className="flex aspect-[1/1.414] h-[min(70%,560px)] max-w-full flex-col gap-3 rounded-md bg-surface p-[8%] shadow-e2 motion-safe:animate-pulse"
      >
        <div className="mb-3 h-3 w-1/2 rounded-full bg-surface-3" />
        {lines.map((width, i) => (
          <div key={i} className="h-2 rounded-full bg-surface-3" style={{ width }} />
        ))}
      </div>
      <p className="text-[14px] text-text-muted">{label}</p>
    </div>
  );
}

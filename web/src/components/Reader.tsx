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
      
      type Props = {
      };
      
    export default function Reader({
      }: Props) {

            const { currentPageIndex, book, setCurrentPageIndex } = useBook()
            const { isBoardOpen } = useTutor()
        

        const containerRef =
          useRef<HTMLDivElement>(null);
      
        const pageRefs =
          useRef<(HTMLDivElement | null)[]>([]);
      
        const isMouseDownRef =
          useRef(false);
      
        const startXRef = useRef(0);
      
        const scrollLeftRef = useRef(0);
      
        const timeoutRef =
          useRef<any>(0);
      
        const [isDragging, setIsDragging] = useState(false);
      
        const [activePage, setActivePage] =
          useState(0);
      
          const activePageRef = useRef(currentPageIndex);

          const isAutoCenteringRef =
  useRef(false);

        const isScrollLocked =
          useRef(false);
  

          useEffect(() => {
        
            activePageRef.current = currentPageIndex
            centerActivePage(currentPageIndex)
      }, [currentPageIndex])

          const detectClosestPage = () => {
                const containerRect =
                  containerRef.current?.getBoundingClientRect();
                const viewportCenter = containerRect
                  ? containerRect.left + containerRect.width / 2
                  : window.innerWidth / 2;

                let closestIndex = 0;
              
                let closestDistance = Infinity;
              
                pageRefs.current.forEach(
                  (pageEl, index) => {
                    if (!pageEl) return;
              
                    const rect =
                      pageEl.getBoundingClientRect();
              
                    const elementCenter =
                      rect.left + rect.width / 2;
              
                    const distance = Math.abs(
                      viewportCenter - elementCenter
                    );
              
                    if (distance < closestDistance) {
                        if(activePage == index && distance > 100) {
                                return
                        }
                      closestDistance = distance;
              
                      closestIndex = index;
                    }
                  }
                );
              
                activePageRef.current = closestIndex;

                setActivePage(closestIndex);
                setCurrentPageIndex(closestIndex)
              };
      
              const onInteraction = () => {
                if(isScrollLocked.current) {
                        return
                }
                if (isAutoCenteringRef.current)
                  return;
              
                setIsDragging(true);
              
              
                clearTimeout(timeoutRef.current);
              
                timeoutRef.current = setTimeout(() => {
                        
                        detectClosestPage();
                        isAutoCenteringRef.current = true;
                        setIsDragging(false);
                        centerActivePage(activePageRef.current);
                        isAutoCenteringRef.current = false;
                }, 150);
              };
      
        useEffect(() => {
          const container =
            containerRef.current;
      
          if (!container) return;
      
          const onMouseDown = (
            e: MouseEvent
          ) => {
            isMouseDownRef.current = true;
      
            startXRef.current = e.pageX;
      
            scrollLeftRef.current =
              container.scrollLeft;
      
            onInteraction();
          };
      
          const onMouseMove = (
            e: MouseEvent
          ) => {
            if (!isMouseDownRef.current)
              return;
      
            e.preventDefault();
      
            const dx =
              e.pageX - startXRef.current;
      
            container.scrollLeft =
              scrollLeftRef.current - dx;
      
            onInteraction();
          };
      
          const onMouseUp = () => {
            isMouseDownRef.current = false;
          };
      
          container.addEventListener(
            'mousedown',
            onMouseDown
          );
      
          window.addEventListener(
            'mousemove',
            onMouseMove
          );
      
          window.addEventListener(
            'mouseup',
            onMouseUp
          );
      
          return () => {
            container.removeEventListener(
              'mousedown',
              onMouseDown
            );
      
            window.removeEventListener(
              'mousemove',
              onMouseMove
            );
      
            window.removeEventListener(
              'mouseup',
              onMouseUp
            );
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

        const centerActivePage = (
                index: number
              ) => {
                const container =
                  containerRef.current;
              
                const pageEl =
                  pageRefs.current[index];
              
                if (!container || !pageEl) return;
              
                const rect =
                  pageEl.getBoundingClientRect();
              
                const pageCenter =
                  rect.left +
                  rect.width / 2;

                const containerRect =
                  container.getBoundingClientRect();
                const viewportCenter =
                  containerRect.left + containerRect.width / 2;

                const delta =
                  (pageCenter - viewportCenter) // * 0.9;
              
                //   alert(isScrollLocked.current)
                  isScrollLocked.current = true
                container.scrollBy({
                  left: delta,
                  behavior: 'smooth',
                });

                // setTimeout(() => {
                        isScrollLocked.current = false
                // }, 5000)
              };

              if(!book)  {
                return <div>Loading</div>
              }
        return (
          <div
            ref={containerRef}
            // The page strip runs in the book's direction; the rest of the
            // page keeps the user's session language and direction.
            dir={bookDirection(book)}
            className={
              isDragging
                ? 'reader-container dragging'
                : 'reader-container'
            }
            onScroll={onInteraction}
            onWheel={onInteraction}
          >
            {book.pages.map((page, index) => (

        <PageProvider key={page.pageNumber} pageNumber={page.pageNumber} isActive={index === activePage}>
          <ReaderPage
            key={page.pageNumber}
            ref={(el) => {
              pageRefs.current[index] = el;
            }}
            page={page}
            isDragging={isDragging}
            isActive={index === activePage}
            isBoardOpen={isBoardOpen}
          />
          </PageProvider>
        ))}

          </div>
        );
      }



      
import {
  forwardRef,
  useEffect,
  useRef,
  useState
} from 'react';

import { useBookPage } from '../api/book-page/hook';
import { sendText } from '../api/books';
import { useBook } from '../api/book/hook';
import type { PageM } from '../domain';
import { useDocumentLang } from '../lib/useDocumentLang';
import LaserOverlay from './LaserOverlay';
import PagePartMarker, { partKind, type PagePart } from './PagePartMarker';

type Props = {
  page: PageM;
  isDragging: boolean;
  isActive: boolean;
  isBoardOpen: boolean
  // The backend is analysing this page (shows a scan over it).
  isAnalyzing: boolean;
};

const ReaderPage = forwardRef<
  HTMLDivElement,
  Props
>(
  (
    {
      page,
      isDragging,
      isActive,
      isBoardOpen,
      isAnalyzing,
    },
    ref
  ) => {
    let scale = 0.9;

    if (!isDragging && isActive) {
      scale = 1;
    }

    const [data, setData] = useState(null);

    const { book } = useBook()
    const isEnglish = useDocumentLang() === 'en'
    const { laserZones, teacherWritings, pageAnalysis } = useBookPage()

    // This hook is REACTIVE. It watches the `isActive` variable.
    useEffect(() => {
      if (!isActive) return; // Do nothing if this page isn't active

      let isMounted = true;


      const img = imgRef.current;
      if (!img) return;

      const ro = new ResizeObserver(updateScale);
      ro.observe(img);


      // Cleanup function: cancels the update if the user switches pages quickly
      return () => {
        isMounted = false;
        ro.disconnect();
      };
    }, [page.pageNumber]); // Dependencies: Hook re-runs whenever these change

    const imgRef = useRef<HTMLImageElement>(null);

    const [laserScale, setLaserScale] = useState({ x: 1, y: 1 });




    const updateScale = () => {
      const img = imgRef.current;
      if (!img) return;

      if (!img.naturalWidth || !img.clientWidth) return;

      setLaserScale({
        x: img.clientWidth / img.naturalWidth,
        y: img.clientHeight / img.naturalHeight,
      });
    };

    return (
      <div
        ref={ref}
        className="page-shell"
        style={{
          position: 'relative',
          display: 'inline-block',
        }}
      >
        <img
          ref={imgRef}
          src={page.imageUrl}
          className="page-image"
          draggable={false}
          style={{
            //   transform: `scale(${scale})`,
          }}
        />
        {/* <div
          style={{
            position: 'absolute',
            inset: 0,
          }}>
          {laserZones.map(lz => (
            <div key={lz.x}
              style={{
                position: 'absolute',
                backgroundColor: 'yellow',
                left: `${lz.x * laserScale.x}px`,
                top: `${lz.y * laserScale.y}px`,
                width: lz.width + 10,
                height: lz.height + 10,
                minWidth: 30,
                minHeight: 30,
                transform: 'translate(-50%, -50%)',
                borderRadius: "50%",
                background: "cyan",
                boxShadow:
                  `0 0 2px white,
                  0 0 8px cyan,
                  0 0 16px cyan`,
                  opacity: 0.3,
              }}></div>
          ))}
        </div> */}

        <svg xmlns="http://www.w3.org/2000/svg"
          viewBox={"0 0 " + page.width + " " + page.height}
          className='page-writings' data-s={teacherWritings.length}>
          {/* <circle cx="25" cy="25" r="20" fill="black"></circle> */}

          {teacherWritings.map((writing, i) => (
            <svg width={writing.width} height={writing.height} x={writing.x} y={writing.y} viewBox={writing.viewBox}
              key={i} // <-- Keeps React happy
              dangerouslySetInnerHTML={{ __html: writing.innerHtml }} // <-- Renders your inner SVG string
            />

          ))}
        </svg>

        <LaserOverlay
          width={page.width}
          height={page.height}
          zones={laserZones}
          rtl={book?.language == "ar"}
        />

        {/* The laser before LaserOverlay: a cyan glowing ellipse over each word.
        <svg xmlns="http://www.w3.org/2000/svg"
          viewBox={"0 0 " + page.width + " " + page.height}
          className='page-laser-overlay'>
          <defs>
            <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur1" />
              <feGaussianBlur stdDeviation="6" result="blur2" />
              <feGaussianBlur stdDeviation="12" result="blur3" />

              <feMerge>
                <feMergeNode in="blur3" />
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/ * <circle cx="25" cy="25" r="20" fill="black"></circle> * /}

          {laserZones.map((lz, i) => (
            <ellipse key={`${i}`}
              cx={lz.x + (lz.width) / 2}
              cy={lz.y + lz.height / 2}
              rx={(lz.width + 20) / 2}
              ry={(lz.height + 15) / 2}
              fill="cyan"
              filter="url(#glow)"
            />


          ))}
        </svg> */}

        <svg xmlns="http://www.w3.org/2000/svg"
          viewBox={"0 0 " + page.width + " " + page.height}
          className='page-parts'>

          {/* The parts the tutor can help with, all with the same marker. (Each
              type used to have its own: a small target for questions, an
              orange circle for concepts, a green one for examples.) */}
          {(pageAnalysis?.parts as PagePart[] | undefined)
            ?.filter(part => part.coordinates && partKind(part.type))
            .map(part => (
              <PagePartMarker key={part.id} part={part} rtl={book?.language == "ar"} isEnglish={isEnglish} />
            ))}
          </svg>

          {/* Page analysis running: a light scan sweeping down the page, over the
              image and its overlays. Same box as the overlays (full width, the
              page's own proportions), so it covers exactly the page image. */}
          {isAnalyzing && (
            <div
              className='page-scan'
              style={{ aspectRatio: `${page.width} / ${page.height}` }}
              role='status'
            >
              <span className='sr-only'>{isEnglish ? 'Analyzing page…' : 'جارٍ تحليل الصفحة…'}</span>
              <div className='page-scan-beam' />
            </div>
          )}

        
          {/* {isBoardOpen && (
            <div className='page-board' dangerouslySetInnerHTML={{ __html: boardContent }}>
            </div>
          )} */}
      </div>
    );
  }
);

export default ReaderPage;
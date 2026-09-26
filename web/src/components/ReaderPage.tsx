import {
  forwardRef,
  useEffect,
  useRef,
  useState
} from 'react';

import { useBookPage } from '../api/book-page/hook';
import { clarifyPart, sendText } from '../api/books';
import { useBook } from '../api/book/hook';
import type { PageM } from '../domain';

type Props = {
  page: PageM;
  isDragging: boolean;
  isActive: boolean;
  isBoardOpen: boolean
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
    },
    ref
  ) => {
    let scale = 0.9;

    if (!isDragging && isActive) {
      scale = 1;
    }

    const [data, setData] = useState(null);

    const { book } = useBook()
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

    const onQuestionClicked = (partId: string) => {
      clarifyPart(partId)
    }
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
          {/* <circle cx="25" cy="25" r="20" fill="black"></circle> */}

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
        </svg>

        <svg xmlns="http://www.w3.org/2000/svg"
          viewBox={"0 0 " + page.width + " " + page.height}
          className='page-parts'>

          {pageAnalysis?.parts.filter(p => p.type?.includes("question") && p.coordinates).map((part, i) => (
            // <ellipse key={`${part.id}`}
            //   cx={part.coordinates.x + (book.language == "ar" ? part.coordinates.width : 0)}
            //   cy={part.coordinates.y}
            //   rx={10}
            //   ry={10}
            //   fill="cyan"
            //   onClick={() => onQuestionClicked(part.id)}
              
            // />

            <g key={part.id} transform={"translate(" + (part.coordinates.x + (book.language == "ar" ? part.coordinates.width : 0)) + ", " + part.coordinates.y + ")"}
              onClick={() => onQuestionClicked(part.id)}>
              {/* <circle
    cx="0"
    cy="0"
    r="7"
    fill="rgba(255, 255, 255, 0.5)"
    stroke="#c8c8c8"
    stroke-width="1"
  /> */}

{/* <path
  d="M0-5 L1-1 L5 0 L1 1 L0 5 L-1 1 L-5 0 L-1-1 Z"
  fill="#555"
/> */}


<circle cx="0" cy="0" r="2" fill="#555"/>
<circle
  cx="0"
  cy="0"
  r="5"
  fill="none"
  stroke="#555"
  strokeWidth="1.4"
/>

            </g>
          ))}

          {pageAnalysis?.parts.filter(p => p.type?.includes("concept") && p.coordinates).map((part, i) => (
            <ellipse key={`${part.id}`}
            cx={part.coordinates.x + (book.language == "ar" ? part.coordinates.width : 0)}
              cy={part.coordinates.y}
              rx={10}
              ry={10}
              fill="orange"
              onClick={() => onQuestionClicked(part.id)}
            />


          ))}

          {pageAnalysis?.parts.filter(p => p.type?.includes("example") && p.coordinates).map((part, i) => (
            <ellipse key={`${part.id}`}
              cx={part.coordinates.x + (book.language == "ar" ? part.coordinates.width : 0)}
              cy={part.coordinates.y}
              rx={10}
              ry={10}
              fill="green"
              onClick={() => onQuestionClicked(part.id)}
            />


          ))}
          
          </svg>


        
          {/* {isBoardOpen && (
            <div className='page-board' dangerouslySetInnerHTML={{ __html: boardContent }}>
            </div>
          )} */}
      </div>
    );
  }
);

export default ReaderPage;
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

import { BookProvider } from '../api/book/provider';
import { useBook } from '../api/book/hook';
import PopupModal from '../components/popup-modal';
import Reader from '../components/Reader';
import SectionSelector from '../components/SectionSelector';
import TutorialPlayer from '../components/TutorialPlayer';
import { BOOK_STATUS_LABELS, bookProcessingInfo } from '../lib/bookStatus';
import { bookDirection } from '../lib/bookDirection';
import { messageForCode } from '../api/rest/apiError';
import { Button } from '../components/ui/button';
import { useDocumentLang } from '../lib/useDocumentLang';

export default function BookReaderView() {

  const { bookId, page } = useParams();

  const navigate = useNavigate();



  const [tutorialsOpen, setTutorialsOpen] = useState(false);

  const [currentTutorialStep, setCurrentTutorialStep] = useState(1);

  const openTutorial = (id: string) => {
    setTutorialsOpen(true)
  }
  const changeTutrialStep = (id: string, stepNumber: number) => {
    setCurrentTutorialStep(stepNumber)

  }

  return (
    <BookProvider bookId={bookId} pageIndex={page} openTutorial={openTutorial} changeTutrialStep={changeTutrialStep}>

    <div className="flex h-dvh w-dvw flex-col overflow-hidden bg-surface">
      <PageUrlSync bookId={bookId} page={page} />
      <TopBar onBack={() => navigate('/')} />

      <div className="relative min-h-0 flex-1">
        <ReaderOrError onBack={() => navigate('/')} />
      </div>

      {tutorialsOpen && (
        <PopupModal isOpen={tutorialsOpen} onClose={() => setTutorialsOpen(false)}>
            <TutorialPlayer stepNumber={currentTutorialStep} onStepChanged={console.log} tutorial={PAGE_DATA} setStepNumber={setCurrentTutorialStep}/>
        </PopupModal>
        )}
    </div>
    </BookProvider>
  );
}

// The book's pages, or why the book couldn't be opened.
function ReaderOrError({ onBack }: { onBack: () => void }) {
  const { loadError } = useBook();
  const lang = useDocumentLang();
  if (!loadError) return <Reader />;

  const message = loadError.code === 'NotFound'
    ? (lang === 'en' ? "This book wasn't found. It may have been removed." : 'لم يتم العثور على هذا الكتاب، ربما تم حذفه.')
    : messageForCode(loadError.code, lang, loadError.description);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <AlertCircle className="h-10 w-10 text-text-faint" strokeWidth={1.75} aria-hidden="true" />
      <p className="max-w-sm text-[15px] text-text-muted" role="alert">{message}</p>
      <Button onClick={onBack}>
        {lang === 'en' ? 'Back to library' : 'العودة إلى المكتبة'}
      </Button>
    </div>
  );
}

// Keeps the current page in the URL so a refresh reopens the same page.
function PageUrlSync({ bookId, page }: { bookId?: string; page?: string }) {
  const { book, currentPageIndex } = useBook();
  const navigate = useNavigate();
  const pageIndex = currentPageIndex === undefined ? undefined : book?.pages[currentPageIndex]?.index;

  useEffect(() => {
    if (!bookId || pageIndex === undefined || String(pageIndex) === page) return;
    // Replace rather than push, so paging through the book doesn't flood history.
    navigate(`/book/${bookId}/${pageIndex}`, { replace: true });
  }, [bookId, pageIndex, page, navigate]);

  return null;
}

// The page's chrome is in the user's session language; the book's own
// language only sets the page slider's direction.
function TopBar({ onBack }: { onBack: () => void }) {
  const { book, loadError } = useBook();
  const isEnglish = useDocumentLang() === 'en';

  const total = book?.pages.length ?? 0;

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-5">
      <button
        onClick={onBack}
        aria-label={isEnglish ? 'Back to library' : 'العودة إلى المكتبة'}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text rtl:-scale-x-100"
      >
        <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-text">
          {book?.title ?? (loadError ? '' : isEnglish ? 'Loading…' : 'جارٍ التحميل…')}
        </p>
      </div>

      {bookProcessingInfo(book).processing ? <ProcessingStatus /> : <SectionSelector />}

      {total > 0 && <PageScrubber total={total} isEnglish={isEnglish} dir={bookDirection(book)} />}
    </header>
  );
}

// Shown in place of the section picker while the backend is still processing
// the book, since its sections aren't final yet.
function ProcessingStatus() {
  const { book } = useBook();
  const { status, percent } = bookProcessingInfo(book);
  const label = BOOK_STATUS_LABELS[useDocumentLang()][status!];

  return (
    <div className="flex h-9 max-w-[220px] shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-[13px] font-medium text-text-muted sm:max-w-[280px]">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent-600" strokeWidth={2.25} />
      <span className="truncate">{label}</span>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className="h-full rounded-full bg-accent-600 transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="shrink-0 text-xs tabular-nums text-text-faint">{percent}%</span>
    </div>
  );
}

// Runs in the book's direction (`dir`): for an Arabic book the first page is
// at the right, whatever the UI language.
function PageScrubber({ total, isEnglish, dir }: { total: number; isEnglish: boolean; dir: 'rtl' | 'ltr' }) {
  const { currentPageIndex, setCurrentPageIndex } = useBook();
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const dragging = dragIndex !== null;
  const committed = Math.min(total - 1, Math.max(0, currentPageIndex ?? 0));
  // While dragging, only the scrubber previews the target page; the reader
  // switches once on release.
  const index = dragIndex ?? committed;
  const current = index + 1;
  const fraction = total > 1 ? index / (total - 1) : 1;

  const indexAt = (clientX: number): number | null => {
    const track = trackRef.current;
    if (!track) return null;
    const rect = track.getBoundingClientRect();
    if (rect.width === 0) return null;

    let ratio = (clientX - rect.left) / rect.width;
    // The fill grows from the inline-start edge, so mirror in RTL.
    if (dir === 'rtl') ratio = 1 - ratio;
    ratio = Math.min(1, Math.max(0, ratio));

    return Math.round(ratio * (total - 1));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragIndex(indexAt(e.clientX) ?? committed);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const next = indexAt(e.clientX);
    if (next !== null) setDragIndex(next);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (dragIndex !== null && dragIndex !== committed) {
      setCurrentPageIndex(dragIndex);
    }
    setDragIndex(null);
  };

  const cancelDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragIndex(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isRtl = dir === 'rtl';
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = index + (isRtl ? -1 : 1);
    else if (e.key === 'ArrowLeft') next = index + (isRtl ? 1 : -1);
    else if (e.key === 'ArrowUp') next = index + 1;
    else if (e.key === 'ArrowDown') next = index - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = total - 1;
    if (next === null) return;

    e.preventDefault();
    e.stopPropagation();
    setCurrentPageIndex(Math.min(total - 1, Math.max(0, next)));
  };

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div
        role="slider"
        dir={dir}
        tabIndex={0}
        aria-label={isEnglish ? 'Go to page' : 'الانتقال إلى صفحة'}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={isEnglish ? `Page ${current} of ${total}` : `الصفحة ${current} من ${total}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={cancelDrag}
        onKeyDown={onKeyDown}
        className="group flex h-6 w-40 cursor-pointer touch-none items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent-600/40"
      >
        <div ref={trackRef} className="relative h-1.5 w-full rounded-full bg-surface-2">
          <div
            className={`h-full rounded-full bg-accent-600 ${dragging ? '' : 'transition-[width] duration-300 ease-out'}`}
            style={{ width: `${fraction * 100}%` }}
          />
          <div
            className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-accent-600 bg-surface shadow-sm transition-transform group-hover:scale-110 ${dragging ? 'scale-110' : ''}`}
            style={{
              insetInlineStart: `calc(${fraction * 100}% - ${fraction * 16}px)`,
            }}
          />
        </div>
      </div>
      <span dir="ltr" className="text-xs font-medium tabular-nums leading-none text-text-muted">
        {current}/{total}
      </span>
    </div>
  );
}

export const PAGE_DATA = {
  "steps": [
          {
                  "stepNumber": 1,
                  "svgElements": [
                          "title",
                          "numberGroup"
                  ],
                  "textToSay": "string"
          },
          {
                  "stepNumber": 2,
                  "svgElements": [
                          "chart",
                          "colOnes",
                          "digit3",
                          "value3"
                  ],
                  "textToSay": "نبدأ من اليمين دائمًا: الرقم ٣ في بيت الآحاد، لذلك قيمته ٣ فقط."
          },
          {
                  "stepNumber": 3,
                  "svgElements": [
                          "colTens",
                          "digit1",
                          "value10"
                  ],
                  "textToSay": "ننتقل خطوة إلى اليسار: الرقم ١ في بيت العشرات، يعني ١ عشرة؛ إذن قيمته ١٠."
          },
          {
                  "stepNumber": 4,
                  "svgElements": [
                          "colHundreds",
                          "digit8",
                          "value800"
                  ],
                  "textToSay": "الرقم ٨ في بيت المئات، يعني ٨ مئات؛ إذن قيمته ٨٠٠."
          },
          {
                  "stepNumber": 5,
                  "svgElements": [
                          "colThousands",
                          "digit2",
                          "value2000"
                  ],
                  "textToSay": "الرقم ٢ في بيت الآلاف، يعني ٢ من الألوف؛ إذن قيمته ٢٠٠٠."
          },
          {
                  "stepNumber": 6,
                  "svgElements": [
                          "colTenThousands",
                          "digit4",
                          "value40000"
                  ],
                  "textToSay": "الرقم ٤ في بيت عشرات الألوف، يعني ٤ عشرات ألوف؛ إذن قيمته ٤٠٠٠٠."
          },
          {
                  "stepNumber": 7,
                  "svgElements": [
                          "expandedForm",
                          "ruleBox"
                  ],
                  "textToSay": "والآن نجمع القيم المنزلية كلها: ٤٢٨١٣ = ٤٠٠٠٠ + ٢٠٠٠ + ٨٠٠ + ١٠ + ٣. هذه هي صورة العدد المفككة حسب المنازل."
          }
  ],
  "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"40 20 920 600\" width=\"920\" height=\"600\" role=\"img\" aria-label=\"شرح القيم المنزلية للعدد ٤٢٨١٣\">\n  <style>\n    .title{font-family:Tahoma,Arial,sans-serif;font-size:34px;font-weight:700;fill:#1f2937;}\n    .subtitle{font-family:Tahoma,Arial,sans-serif;font-size:20px;fill:#374151;}\n    .label{font-family:Tahoma,Arial,sans-serif;font-size:19px;font-weight:700;fill:#111827;}\n    .digit{font-family:Tahoma,Arial,sans-serif;font-size:42px;font-weight:700;fill:#111827;}\n    .value{font-family:Tahoma,Arial,sans-serif;font-size:25px;font-weight:700;fill:#111827;}\n    .small{font-family:Tahoma,Arial,sans-serif;font-size:18px;fill:#374151;}\n    .math{font-family:Tahoma,Arial,sans-serif;font-size:30px;font-weight:700;fill:#111827;}\n    .cell{stroke:#334155;stroke-width:2;}\n    .arrow{stroke:#64748b;stroke-width:2.2;fill:none;marker-end:url(#arrowHead);}\n  </style>\n  <defs>\n    <marker id=\"arrowHead\" markerWidth=\"10\" markerHeight=\"10\" refX=\"8\" refY=\"3\" orient=\"auto\" markerUnits=\"strokeWidth\">\n      <path d=\"M0,0 L8,3 L0,6 Z\" fill=\"#64748b\"/>\n    </marker>\n  </defs>\n\n  <text id=\"title\" x=\"500\" y=\"55\" text-anchor=\"middle\" direction=\"rtl\" class=\"title\">القيم المنزلية في العدد ٤٢٨١٣</text>\n  <text x=\"500\" y=\"88\" text-anchor=\"middle\" direction=\"rtl\" class=\"subtitle\">كل رقم يأخذ قيمته من المنزل الذي يقف فيه</text>\n\n  <g id=\"numberGroup\">\n    <text x=\"500\" y=\"130\" text-anchor=\"middle\" direction=\"rtl\" class=\"small\">العدد</text>\n    <rect x=\"300\" y=\"145\" width=\"400\" height=\"60\" rx=\"14\" fill=\"#f8fafc\" stroke=\"#94a3b8\" stroke-width=\"2\"/>\n    <text id=\"topDigit4\" x=\"370\" y=\"188\" text-anchor=\"middle\" class=\"digit\">٤</text>\n    <text id=\"topDigit2\" x=\"435\" y=\"188\" text-anchor=\"middle\" class=\"digit\">٢</text>\n    <text id=\"topDigit8\" x=\"500\" y=\"188\" text-anchor=\"middle\" class=\"digit\">٨</text>\n    <text id=\"topDigit1\" x=\"565\" y=\"188\" text-anchor=\"middle\" class=\"digit\">١</text>\n    <text id=\"topDigit3\" x=\"630\" y=\"188\" text-anchor=\"middle\" class=\"digit\">٣</text>\n  </g>\n\n  <g id=\"chart\">\n    <path class=\"arrow\" d=\"M370,207 C335,222 225,222 180,245\"/>\n    <path class=\"arrow\" d=\"M435,207 C420,222 365,225 340,245\"/>\n    <path class=\"arrow\" d=\"M500,207 L500,245\"/>\n    <path class=\"arrow\" d=\"M565,207 C580,222 635,225 660,245\"/>\n    <path class=\"arrow\" d=\"M630,207 C665,222 775,222 820,245\"/>\n\n    <g id=\"colTenThousands\">\n      <rect x=\"100\" y=\"250\" width=\"160\" height=\"70\" fill=\"#dbeafe\" class=\"cell\"/>\n      <rect x=\"100\" y=\"320\" width=\"160\" height=\"78\" fill=\"#eff6ff\" class=\"cell\"/>\n      <rect x=\"100\" y=\"398\" width=\"160\" height=\"72\" fill=\"#f8fafc\" class=\"cell\"/>\n      <text x=\"180\" y=\"286\" text-anchor=\"middle\" direction=\"rtl\" class=\"label\">عشرات الألوف</text>\n      <text id=\"digit4\" x=\"180\" y=\"371\" text-anchor=\"middle\" class=\"digit\">٤</text>\n      <text id=\"value40000\" x=\"180\" y=\"445\" text-anchor=\"middle\" class=\"value\">٤٠٠٠٠</text>\n    </g>\n\n    <g id=\"colThousands\">\n      <rect x=\"260\" y=\"250\" width=\"160\" height=\"70\" fill=\"#dcfce7\" class=\"cell\"/>\n      <rect x=\"260\" y=\"320\" width=\"160\" height=\"78\" fill=\"#f0fdf4\" class=\"cell\"/>\n      <rect x=\"260\" y=\"398\" width=\"160\" height=\"72\" fill=\"#f8fafc\" class=\"cell\"/>\n      <text x=\"340\" y=\"286\" text-anchor=\"middle\" direction=\"rtl\" class=\"label\">الألوف</text>\n      <text id=\"digit2\" x=\"340\" y=\"371\" text-anchor=\"middle\" class=\"digit\">٢</text>\n      <text id=\"value2000\" x=\"340\" y=\"445\" text-anchor=\"middle\" class=\"value\">٢٠٠٠</text>\n    </g>\n\n    <g id=\"colHundreds\">\n      <rect x=\"420\" y=\"250\" width=\"160\" height=\"70\" fill=\"#fef3c7\" class=\"cell\"/>\n      <rect x=\"420\" y=\"320\" width=\"160\" height=\"78\" fill=\"#fffbeb\" class=\"cell\"/>\n      <rect x=\"420\" y=\"398\" width=\"160\" height=\"72\" fill=\"#f8fafc\" class=\"cell\"/>\n      <text x=\"500\" y=\"286\" text-anchor=\"middle\" direction=\"rtl\" class=\"label\">المئات</text>\n      <text id=\"digit8\" x=\"500\" y=\"371\" text-anchor=\"middle\" class=\"digit\">٨</text>\n      <text id=\"value800\" x=\"500\" y=\"445\" text-anchor=\"middle\" class=\"value\">٨٠٠</text>\n    </g>\n\n    <g id=\"colTens\">\n      <rect x=\"580\" y=\"250\" width=\"160\" height=\"70\" fill=\"#fee2e2\" class=\"cell\"/>\n      <rect x=\"580\" y=\"320\" width=\"160\" height=\"78\" fill=\"#fef2f2\" class=\"cell\"/>\n      <rect x=\"580\" y=\"398\" width=\"160\" height=\"72\" fill=\"#f8fafc\" class=\"cell\"/>\n      <text x=\"660\" y=\"286\" text-anchor=\"middle\" direction=\"rtl\" class=\"label\">العشرات</text>\n      <text id=\"digit1\" x=\"660\" y=\"371\" text-anchor=\"middle\" class=\"digit\">١</text>\n      <text id=\"value10\" x=\"660\" y=\"445\" text-anchor=\"middle\" class=\"value\">١٠</text>\n    </g>\n\n    <g id=\"colOnes\">\n      <rect x=\"740\" y=\"250\" width=\"160\" height=\"70\" fill=\"#ede9fe\" class=\"cell\"/>\n      <rect x=\"740\" y=\"320\" width=\"160\" height=\"78\" fill=\"#f5f3ff\" class=\"cell\"/>\n      <rect x=\"740\" y=\"398\" width=\"160\" height=\"72\" fill=\"#f8fafc\" class=\"cell\"/>\n      <text x=\"820\" y=\"286\" text-anchor=\"middle\" direction=\"rtl\" class=\"label\">الآحاد</text>\n      <text id=\"digit3\" x=\"820\" y=\"371\" text-anchor=\"middle\" class=\"digit\">٣</text>\n      <text id=\"value3\" x=\"820\" y=\"445\" text-anchor=\"middle\" class=\"value\">٣</text>\n    </g>\n  </g>\n\n  <g id=\"ruleBox\">\n    <rect x=\"160\" y=\"500\" width=\"680\" height=\"45\" rx=\"12\" fill=\"#ecfeff\" stroke=\"#0891b2\" stroke-width=\"2\"/>\n    <text x=\"500\" y=\"529\" text-anchor=\"middle\" direction=\"rtl\" class=\"small\">قاعدة سريعة: قيمة الرقم = الرقم × قيمة منزله</text>\n  </g>\n\n  <g id=\"expandedForm\">\n    <text x=\"500\" y=\"590\" text-anchor=\"middle\" direction=\"ltr\" class=\"math\">٤٢٨١٣ = ٤٠٠٠٠ + ٢٠٠٠ + ٨٠٠ + ١٠ + ٣</text>\n  </g>\n</svg>"
}

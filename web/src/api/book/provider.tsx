import { useEffect, useState } from 'react';
import type { BookM } from '../../domain';
import { setBooksDelegate, setCurrentContext, type BooksDelegate } from '../books';
import { BookContext } from './context';
import { getBook } from '../rest/services/books';
import { BOOK_PROCESSING_POLL_MS, bookProcessingInfo } from '../../lib/bookStatus';

export type LaserZone = {x: number; y: number; width: number; height: number}

// The open book and page. The tutor itself (conversation, board, mic) lives
// in TutorProvider for the whole app; this adds what it needs while reading.
export function BookProvider({
  children,
  bookId,
  pageIndex,
  openTutorial,
  changeTutrialStep,
}: {
  children: React.ReactNode;
  bookId: string,
  pageIndex?: string,
  openTutorial: BooksDelegate["openTutorial"],
  changeTutrialStep: BooksDelegate["changeTutrialStep"],
}) {
    const [currentPageIndex, setCurrentPageIndex] = useState<number>(undefined);
    const [book, setBook] = useState<BookM | null>(null);
    const [loadError, setLoadError] = useState<{ code: string; description?: string }>();
    const [analyzingPages, setAnalyzingPages] = useState<number[]>([]);
    const [analysisRevisions, setAnalysisRevisions] = useState<Record<number, number>>({});
    const [zoomed, setZoomed] = useState(false);


  useEffect(() => {
    // A late answer for a book the user has since left is ignored.
    let cancelled = false;
    setLoadError(undefined);
    setAnalyzingPages([]);

    async function load() {
      // Failures come back as { error: { code, description } } (see CLAUDE.md),
      // not as exceptions; GetBook's own code is NotFound. Anything thrown
      // (e.g. unreadable response) is reported as UnknownError.
      try {
        const result = await getBook({ uid: bookId! }, {});
        if (cancelled) return;

        const item = result.data?.item;
        if (result.error || !item) {
          setLoadError({ code: result.error?.code ?? 'NotFound', description: result.error?.description });
          return;
        }

        // Set the index in the same update as the book, so there's never a
        // render (or a getCurrentPageIndex() read) with a book but no page.
        setBook(item);
        setCurrentPageIndex(initialPageIndex(item, pageIndex));
      } catch (err) {
        if (!cancelled) setLoadError({ code: 'UnknownError', description: (err as Error)?.message });
      }
    }
    void load();

    return () => { cancelled = true; };
  }, [bookId]);


  
  useEffect(() => {
    setCurrentContext(book?.uid, currentPageIndex);
  }, [book, currentPageIndex]);

  // Don't leave the previous book's context behind for non-React readers.
  useEffect(() => () => setCurrentContext(undefined, undefined), []);

  useEffect(() => {
    if (!book) return;
    // The reader writes the current page back into the URL, so only follow
    // the URL when it points somewhere other than the page already shown.
    if (pageIndex && String(book.pages[currentPageIndex]?.index) === pageIndex) return;
    setCurrentPageIndex(initialPageIndex(book, pageIndex));
    // Keyed on the uid so the polling refresh below doesn't reset the page.
  }, [book?.uid, pageIndex]);

  // While the backend is still processing the book, re-fetch it so the
  // status/progress (and newly parsed pages/sections) stay current.
  const processing = bookProcessingInfo(book).processing;

  useEffect(() => {
    if (!processing) return;

    const interval = setInterval(() => {
      getBook({ uid: bookId }, {})
        .then(result => {
          const item = result.data?.item;
          if (!result.error && item) setBook(item);
        })
        .catch(() => {});
    }, BOOK_PROCESSING_POLL_MS);
    return () => clearInterval(interval);
  }, [bookId, processing]);

  // Book-only actions the server can trigger; outside the reader they do nothing.
  useEffect(() => {
    setBooksDelegate({
      goToPage: (id: string) => {
        if (!book) return
        const index = book.pages.findIndex(p => p.pageNumber == id)
        if (index >= 0) setCurrentPageIndex(index)
      },
      openTutorial,
      changeTutrialStep,
      // Page analysis progress: the page shows a scan while it runs, and
      // fetches its analysis again once it completes.
      onAiTask: ({ task, pageIndex, status }) => {
        if (task !== 'page-analysis' || typeof pageIndex !== 'number') return
        setAnalyzingPages(current => {
          const others = current.filter(index => index !== pageIndex)
          return status === 'started' ? [...others, pageIndex] : others
        })
        if (status === 'completed') {
          setAnalysisRevisions(current => ({ ...current, [pageIndex]: (current[pageIndex] ?? 0) + 1 }))
        }
      },
    })
  }, [book, openTutorial, changeTutrialStep]);

  useEffect(() => () => { void setBooksDelegate(undefined) }, []);


  return (
    <BookContext.Provider
      value={{
        currentPageIndex,
        setCurrentPageIndex,
        book,
        loadError,
        analyzingPages,
        analysisRevisions,
        zoomed,
        setZoomed,
      }}
    >
      {children}
    </BookContext.Provider>
  );
}

// Position of the page whose `index` is in the URL, or the first page when
// none was requested or no page has that index.
function initialPageIndex(book: BookM, pageIndex?: string): number {
  if (!pageIndex) return 0;
  const index = book.pages.findIndex(p => String(p.index) === pageIndex);
  return index >= 0 ? index : 0;
}

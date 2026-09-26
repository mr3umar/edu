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


  useEffect(() => {
    async function load() {
      const data = await getBook({
        uid: bookId!
      }, {});

      // Set the index in the same update as the book, so there's never a
      // render (or a getCurrentPageIndex() read) with a book but no page.
      const item = data.data.item;
      setBook(item);
      setCurrentPageIndex(initialPageIndex(item, pageIndex));
    }
    load (); 

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
    })
  }, [book, openTutorial, changeTutrialStep]);

  useEffect(() => () => { void setBooksDelegate(undefined) }, []);


  return (
    <BookContext.Provider
      value={{
        currentPageIndex,
        setCurrentPageIndex,
        book,
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

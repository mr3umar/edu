
import { createContext } from 'react';
import type { BookM } from '../../domain';

export type BookContextType = {
  book: BookM,
  currentPageIndex: number,
  setCurrentPageIndex: React.Dispatch<React.SetStateAction<number>>,
  // Why the book couldn't be loaded (a service error code, e.g. NotFound, or
  // NetworkError), with the backend's description; undefined while loading or
  // once loaded.
  loadError: { code: string; description?: string } | undefined,
  // Pages (indexes into book.pages) the backend is analysing right now.
  analyzingPages: number[],
  // Bumped per page each time its analysis completes, so it's fetched again.
  analysisRevisions: Record<number, number>,
};

export const BookContext =
  createContext<BookContextType | null>(null);

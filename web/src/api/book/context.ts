
import { createContext } from 'react';
import type { BookM } from '../../domain';

export type BookContextType = {
  book: BookM,
  currentPageIndex: number,
  setCurrentPageIndex: React.Dispatch<React.SetStateAction<number>>,
};

export const BookContext =
  createContext<BookContextType | null>(null);

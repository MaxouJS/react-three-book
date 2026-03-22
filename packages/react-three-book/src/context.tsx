/**
 * BookContext — shares a ThreeBook instance with any R3F component
 * rendered inside a <Book>.
 *
 * useBook()         safe: returns null when called outside a <Book> tree
 * useRequiredBook() throws when called outside a <Book> tree
 */

import { createContext, useContext } from 'react';
import type { Book as ThreeBook } from '@objectifthunes/three-book';

export const BookContext = createContext<ThreeBook | null>(null);

/** Returns the nearest ancestor Book instance, or null if none. */
export function useBook(): ThreeBook | null {
  return useContext(BookContext);
}

/** Returns the nearest ancestor Book instance. Throws outside a <Book> tree. */
export function useRequiredBook(): ThreeBook {
  const book = useContext(BookContext);
  if (!book) {
    throw new Error('useRequiredBook() must be called inside a <Book> component.');
  }
  return book;
}

/**
 * useBookState — reactive snapshot of a ThreeBook's runtime state.
 *
 * Polls the book instance every frame (via useFrame) and returns a plain
 * React state object so components can re-render in response to changes.
 * A deep-equal check prevents unnecessary re-renders when nothing changes.
 *
 * Usage:
 *
 *   const state = useBookState(bookRef);
 *   // or inside a <Book> tree:
 *   const state = useBookState();
 *
 *   if (state.isIdle) console.log('book is idle');
 */

import { useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Book as ThreeBook } from '../core/Book';
import { useBook } from '../context';

export interface BookState {
  /** True once `book.init()` has been called successfully. */
  isBuilt: boolean;
  /** True while the user is dragging a page. */
  isTurning: boolean;
  /** True while any page is in its falling/settling animation. */
  isFalling: boolean;
  /** True when no turning, falling, or auto-turning is happening. */
  isIdle: boolean;
  /** True while an auto-turn is currently playing. */
  isAutoTurning: boolean;
  /** True while there are queued auto-turns waiting to start. */
  hasPendingAutoTurns: boolean;
  /** Total number of papers (covers + pages). */
  paperCount: number;
  /** Number of cover papers (2 physical sheets = 4 surfaces). */
  coverPaperCount: number;
  /** Number of interior page papers. */
  pagePaperCount: number;
}

const IDLE_STATE: BookState = {
  isBuilt: false,
  isTurning: false,
  isFalling: false,
  isIdle: true,
  isAutoTurning: false,
  hasPendingAutoTurns: false,
  paperCount: 0,
  coverPaperCount: 0,
  pagePaperCount: 0,
};

function snapshot(book: ThreeBook): BookState {
  return {
    isBuilt: book.isBuilt,
    isTurning: book.isTurning,
    isFalling: book.isFalling,
    isIdle: book.isIdle,
    isAutoTurning: book.isAutoTurning,
    hasPendingAutoTurns: book.hasPendingAutoTurns,
    paperCount: book.paperCount,
    coverPaperCount: book.coverPaperCount,
    pagePaperCount: book.pagePaperCount,
  };
}

function equal(a: BookState, b: BookState): boolean {
  return (
    a.isBuilt === b.isBuilt &&
    a.isTurning === b.isTurning &&
    a.isFalling === b.isFalling &&
    a.isIdle === b.isIdle &&
    a.isAutoTurning === b.isAutoTurning &&
    a.hasPendingAutoTurns === b.hasPendingAutoTurns &&
    a.paperCount === b.paperCount &&
    a.coverPaperCount === b.coverPaperCount &&
    a.pagePaperCount === b.pagePaperCount
  );
}

/**
 * Returns a reactive snapshot of the ThreeBook's runtime state.
 *
 * @param bookRef  Optional explicit ref.  If omitted, the nearest
 *                 `<Book>` context is used.
 */
export function useBookState(
  bookRef?: React.RefObject<ThreeBook | null>,
): BookState {
  const contextBook = useBook();
  const [state, setState] = useState<BookState>(IDLE_STATE);

  useFrame(() => {
    const book = bookRef?.current ?? contextBook;
    if (!book) return;

    const next = snapshot(book);
    setState((prev) => (equal(prev, next) ? prev : next));
  });

  return state;
}

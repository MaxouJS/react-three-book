/**
 * useBookControls — stable imperative handles for the most common book
 * control operations (open progress, page navigation, etc.).
 *
 * All callbacks are stable across renders (wrapped in useCallback).
 *
 * Usage:
 *
 *   const { setOpenProgress, turnNext, turnPrev } = useBookControls(bookRef);
 *   // or inside a <Book> tree:
 *   const { setOpenProgress } = useBookControls();
 */

import { useCallback } from 'react';
import type { Book as ThreeBook } from '@objectifthunes/three-book';
import { useBook } from '../context';

export interface BookControls {
  /**
   * Instantly jumps the book to the given open-progress position.
   * 0 = fully closed (all pages on the right stack),
   * 1 = fully open (all pages on the left stack).
   */
  setOpenProgress: (progress: number) => void;

  /**
   * Jumps to the page identified by a paper-side index
   * (as returned by `book.getActivePaperSideIndices`).
   */
  setOpenProgressByIndex: (index: number) => void;

  /**
   * Stops any in-progress interactive turn and releases the selected paper.
   */
  stopTurning: () => void;

  /**
   * Removes all queued auto-turns without stopping the one currently playing.
   */
  cancelAutoTurns: () => void;
}

/**
 * Returns stable imperative controls for a ThreeBook instance.
 *
 * @param bookRef  Optional explicit ref.  If omitted, the nearest
 *                 `<Book>` context is used.
 */
export function useBookControls(
  bookRef?: React.RefObject<ThreeBook | null>,
): BookControls {
  const contextBook = useBook();

  const getBook = useCallback(
    () => bookRef?.current ?? contextBook,
    [bookRef, contextBook],
  );

  const setOpenProgress = useCallback(
    (progress: number) => getBook()?.setOpenProgress(progress),
    [getBook],
  );

  const setOpenProgressByIndex = useCallback(
    (index: number) => getBook()?.setOpenProgressByIndex(index),
    [getBook],
  );

  const stopTurning = useCallback(
    () => getBook()?.stopTurning(),
    [getBook],
  );

  const cancelAutoTurns = useCallback(
    () => getBook()?.cancelPendingAutoTurns(),
    [getBook],
  );

  return { setOpenProgress, setOpenProgressByIndex, stopTurning, cancelAutoTurns };
}

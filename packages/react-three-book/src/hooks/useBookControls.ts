import { useCallback } from 'react';
import type { Book as ThreeBook } from '../core/Book';
import { useBook } from '../context';

export interface BookControls {
  /** Jump to open progress 0–1 (0 = closed, 1 = fully open). */
  setOpenProgress: (progress: number) => void;
  /** Jump to a specific paper-side index. */
  setOpenProgressByIndex: (index: number) => void;
  /** Cancel any in-progress interactive drag turn. */
  stopTurning: () => void;
}

/**
 * Stable imperative controls for open-progress and drag-turn management.
 * Reads from the nearest `<Book>` context, or from an explicit ref.
 */
export function useBookControls(bookRef?: React.RefObject<ThreeBook | null>): BookControls {
  const ctx = useBook();

  const setOpenProgress = useCallback(
    (progress: number) => (bookRef?.current ?? ctx)?.setOpenProgress(progress),
    [bookRef, ctx],
  );

  const setOpenProgressByIndex = useCallback(
    (index: number) => (bookRef?.current ?? ctx)?.setOpenProgressByIndex(index),
    [bookRef, ctx],
  );

  const stopTurning = useCallback(
    () => (bookRef?.current ?? ctx)?.stopTurning(),
    [bookRef, ctx],
  );

  return { setOpenProgress, setOpenProgressByIndex, stopTurning };
}

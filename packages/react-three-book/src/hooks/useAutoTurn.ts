/**
 * useAutoTurn — imperative handles for the book's auto-turn system.
 *
 * Usage:
 *
 *   const { turnNext, turnPrev, startAutoTurning } = useAutoTurn(bookRef);
 *   turnNext();            // turn one page forward with default settings
 *   turnNext(mySettings);  // turn one page forward with custom settings
 *   startAutoTurning(AutoTurnDirection.Next, settings, 5); // queue 5 turns
 *
 * Or inside a <Book> tree without an explicit ref:
 *
 *   const { turnNext } = useAutoTurn();
 */

import { useCallback } from 'react';
import {
  AutoTurnDirection,
  AutoTurnSettings,
} from '../core/AutoTurn';
import type { AutoTurnSetting } from '../core/AutoTurn';
import type { Book as ThreeBook } from '../core/Book';
import { useBook } from '../context';

export interface AutoTurnControls {
  /**
   * Queues auto-turns in the given direction.
   * Returns false if the book is not built or no turns are available.
   *
   * @param direction     `AutoTurnDirection.Next` or `AutoTurnDirection.Back`
   * @param settings      Turn shape / speed settings.
   * @param turnCount     Number of pages to turn (default 1).
   * @param delayPerTurn  Seconds between consecutive queued turns (default 0).
   */
  startAutoTurning: (
    direction: AutoTurnDirection,
    settings?: AutoTurnSettings,
    turnCount?: number,
    delayPerTurn?: number | AutoTurnSetting,
  ) => boolean;

  /** Convenience: turn one page toward the "next" direction. */
  turnNext: (settings?: AutoTurnSettings) => boolean;

  /** Convenience: turn one page toward the "previous" direction. */
  turnPrev: (settings?: AutoTurnSettings) => boolean;

  /**
   * Turn all remaining pages in the given direction.
   * Uses `book.pagePaperCount` as the max turn count.
   */
  turnAll: (direction: AutoTurnDirection, settings?: AutoTurnSettings) => boolean;

  /** Remove all pending (not yet started) auto-turns from the queue. */
  cancelPendingAutoTurns: () => void;
}

/**
 * Returns stable auto-turn controls for a ThreeBook instance.
 *
 * @param bookRef  Optional explicit ref.  If omitted, the nearest
 *                 `<Book>` context is used.
 */
export function useAutoTurn(
  bookRef?: React.RefObject<ThreeBook | null>,
): AutoTurnControls {
  const contextBook = useBook();

  const getBook = useCallback(
    () => bookRef?.current ?? contextBook,
    [bookRef, contextBook],
  );

  const startAutoTurning = useCallback(
    (
      direction: AutoTurnDirection,
      settings: AutoTurnSettings = new AutoTurnSettings(),
      turnCount = 1,
      delayPerTurn: number | AutoTurnSetting = 0,
    ) => getBook()?.startAutoTurning(direction, settings, turnCount, delayPerTurn) ?? false,
    [getBook],
  );

  const turnNext = useCallback(
    (settings?: AutoTurnSettings) =>
      getBook()?.startAutoTurning(
        AutoTurnDirection.Next,
        settings ?? new AutoTurnSettings(),
        1,
      ) ?? false,
    [getBook],
  );

  const turnPrev = useCallback(
    (settings?: AutoTurnSettings) =>
      getBook()?.startAutoTurning(
        AutoTurnDirection.Back,
        settings ?? new AutoTurnSettings(),
        1,
      ) ?? false,
    [getBook],
  );

  const turnAll = useCallback(
    (direction: AutoTurnDirection, settings?: AutoTurnSettings) => {
      const book = getBook();
      if (!book) return false;
      return book.startAutoTurning(
        direction,
        settings ?? new AutoTurnSettings(),
        book.pagePaperCount + book.coverPaperCount,
      );
    },
    [getBook],
  );

  const cancelPendingAutoTurns = useCallback(
    () => getBook()?.cancelPendingAutoTurns(),
    [getBook],
  );

  return { startAutoTurning, turnNext, turnPrev, turnAll, cancelPendingAutoTurns };
}

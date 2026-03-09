import { useCallback } from 'react';
import { AutoTurnDirection, AutoTurnSettings } from '../core/AutoTurn';
import type { AutoTurnSetting } from '../core/AutoTurn';
import type { Book as ThreeBook } from '../core/Book';
import { useBook } from '../context';

export interface AutoTurnControls {
  /** Turn one page forward. */
  turnNext: (settings?: AutoTurnSettings) => boolean;
  /** Turn one page backward. */
  turnPrev: (settings?: AutoTurnSettings) => boolean;
  /** Turn all remaining pages in the given direction. */
  turnAll: (direction: AutoTurnDirection, settings?: AutoTurnSettings) => boolean;
  /** Full control: queue `turnCount` auto-turns in one call. */
  startAutoTurning: (
    direction: AutoTurnDirection,
    settings?: AutoTurnSettings,
    turnCount?: number,
    delayPerTurn?: number | AutoTurnSetting,
  ) => boolean;
  /** Remove queued turns that haven't started yet. */
  cancelPendingAutoTurns: () => void;
}

/**
 * Auto-turn controls. Reads from the nearest `<Book>` context, or from an explicit ref.
 */
export function useAutoTurn(bookRef?: React.RefObject<ThreeBook | null>): AutoTurnControls {
  const ctx = useBook();
  const book = () => bookRef?.current ?? ctx;

  const turnNext = useCallback(
    (settings?: AutoTurnSettings) =>
      book()?.startAutoTurning(AutoTurnDirection.Next, settings ?? new AutoTurnSettings(), 1) ?? false,
    [bookRef, ctx], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const turnPrev = useCallback(
    (settings?: AutoTurnSettings) =>
      book()?.startAutoTurning(AutoTurnDirection.Back, settings ?? new AutoTurnSettings(), 1) ?? false,
    [bookRef, ctx], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const turnAll = useCallback(
    (direction: AutoTurnDirection, settings?: AutoTurnSettings) => {
      const b = book();
      if (!b) return false;
      return b.startAutoTurning(direction, settings ?? new AutoTurnSettings(), b.paperCount);
    },
    [bookRef, ctx], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const startAutoTurning = useCallback(
    (
      direction: AutoTurnDirection,
      settings: AutoTurnSettings = new AutoTurnSettings(),
      turnCount = 1,
      delayPerTurn: number | AutoTurnSetting = 0,
    ) => book()?.startAutoTurning(direction, settings, turnCount, delayPerTurn) ?? false,
    [bookRef, ctx], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const cancelPendingAutoTurns = useCallback(
    () => book()?.cancelPendingAutoTurns(),
    [bookRef, ctx], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { turnNext, turnPrev, turnAll, startAutoTurning, cancelPendingAutoTurns };
}

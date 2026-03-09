import { useRef } from 'react';
import type { Book as ThreeBook } from './core/Book';
import { useBook } from './context';
import { usePageTurning } from './hooks/usePageTurning';

export interface BookInteractionProps {
  /** Explicit book ref. If omitted, the nearest `<Book>` context is used. */
  bookRef?: React.RefObject<ThreeBook | null>;
  /** Disable turning without unmounting. Default: true. */
  enabled?: boolean;
  /** OrbitControls ref — disabled during drag, re-enabled on release. */
  orbitControlsRef?: React.RefObject<{ enabled: boolean } | null>;
}

/**
 * Wires pointer-drag events for interactive page turning. Renders nothing.
 *
 * Place inside `<Book>` to pick up the book automatically:
 *   <Book ...><BookInteraction orbitControlsRef={orbitRef} /></Book>
 *
 * Or pass an explicit ref when used outside a `<Book>` tree:
 *   <BookInteraction bookRef={bookRef} orbitControlsRef={orbitRef} />
 */
export function BookInteraction({ bookRef: externalRef, enabled = true, orbitControlsRef }: BookInteractionProps) {
  const ctx = useBook();

  // Stable ref whose .current always resolves to whichever book is active.
  const resolvedRef = useRef<ThreeBook | null>(null);
  resolvedRef.current = externalRef?.current ?? ctx;

  usePageTurning(resolvedRef, { enabled, orbitControlsRef });
  return null;
}

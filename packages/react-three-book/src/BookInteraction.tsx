/**
 * <BookInteraction> — declarative scene component that wires up pointer
 * events for interactive page turning.
 *
 * Place it anywhere inside the R3F <Canvas> (it renders nothing to the scene).
 * It picks up the nearest <Book> context automatically, or you can pass an
 * explicit `bookRef`.
 *
 * Typical usage (inside <Book>):
 *
 *   <Book ref={bookRef} ...>
 *     <BookInteraction orbitControlsRef={orbitRef} />
 *   </Book>
 *
 * Standalone usage (outside <Book>, e.g. with useBookRef):
 *
 *   <BookInteraction bookRef={bookRef} orbitControlsRef={orbitRef} />
 */

import type { Book as ThreeBook } from '@objectifthunes/three-book';
import { useBook } from './context';
import { usePageTurning } from './hooks/usePageTurning';

export interface BookInteractionProps {
  /**
   * Explicit book ref.  If omitted, the nearest `<Book>` context is used.
   * One of `bookRef` or a parent `<Book>` is required.
   */
  bookRef?: React.RefObject<ThreeBook | null>;

  /**
   * When false, all pointer events are ignored.  Defaults to true.
   * You can toggle this at runtime (e.g. to disable turning from a UI button)
   * without unmounting the component.
   */
  enabled?: boolean;

  /**
   * Ref to an OrbitControls instance (or any object with an `enabled` flag).
   * Orbit is disabled while the user drags a page so the two gestures don't
   * conflict; it is re-enabled on pointer-up.
   */
  orbitControlsRef?: React.RefObject<{ enabled: boolean } | null>;
}

/**
 * Attaches pointer-event listeners to the R3F canvas for interactive page
 * turning.  Renders null — has no visual output.
 */
export function BookInteraction({
  bookRef: externalRef,
  enabled = true,
  orbitControlsRef,
}: BookInteractionProps) {
  // Merge explicit ref + context book into a stable ref-like object so
  // usePageTurning always has a single RefObject to work with.
  const contextBook = useBook();

  // Build a fake RefObject whose .current always resolves to the right book.
  // This avoids calling hooks conditionally while still supporting both modes.
  const resolvedRef: React.RefObject<ThreeBook | null> = externalRef ?? {
    get current() {
      return contextBook;
    },
  };

  usePageTurning(resolvedRef, { enabled, orbitControlsRef });

  return null;
}

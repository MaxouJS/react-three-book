/**
 * <Book> — the primary R3F component for @objectifthunes/three-book.
 *
 * Handles the full ThreeBook lifecycle:
 *   Mount   → new Book(options) + book.init()
 *   Frame   → book.update(delta)  via useFrame
 *   Unmount → book.dispose()
 *
 * Provides a BookContext so child components and hooks can access the
 * ThreeBook instance without prop-drilling:
 *
 *   <Book ref={bookRef} content={content} binding={binding} ...>
 *     <BookInteraction orbitControlsRef={orbitRef} />
 *   </Book>
 *
 * All option changes are applied during render via guarded setters.
 * `update(delta)` detects changes via dirty flags and applies the
 * cheapest path (content refresh vs structural rebuild) while
 * preserving open progress, turning state, and animations.
 *
 * Accessing the ThreeBook imperatively:
 *   Pass a ref; it exposes the raw ThreeBook instance:
 *
 *   const bookRef = useRef<ThreeBook>(null);
 *   <Book ref={bookRef} ... />
 *   bookRef.current?.setOpenProgress(0.5);
 */

import { forwardRef, useImperativeHandle } from 'react';
import type { ReactNode } from 'react';
import { Book as ThreeBook } from './core/Book';
import type { BookOptions } from './core/Book';
import { useBookRef } from './hooks/useBookRef';
import { BookContext } from './context';

export interface BookProps extends BookOptions {
  /** Called after `book.init()` succeeds. */
  onBuilt?: (book: ThreeBook) => void;
  /**
   * Called if `book.init()` throws (e.g. BookHeightException when the stack
   * is too tall for the given page dimensions).
   */
  onError?: (err: Error) => void;
  /**
   * Children are rendered inside the BookContext so they can call
   * `useBook()`, `useBookControls()`, `useAutoTurn()`, etc. without a ref.
   *
   * Example: <BookInteraction> placed here automatically discovers the book.
   */
  children?: ReactNode;
}

/**
 * R3F component that manages the complete lifecycle of a ThreeBook.
 * Forward-refs to the underlying `ThreeBook` instance.
 */
export const Book = forwardRef<ThreeBook, BookProps>(function Book(
  { onBuilt, onError, children, ...options },
  ref,
) {
  const { bookRef, ready } = useBookRef(options, onBuilt, onError);

  // Expose the ThreeBook instance through the forwarded ref.
  useImperativeHandle(ref, () => bookRef.current as ThreeBook, [ready]);

  if (!ready || !bookRef.current) return null;

  return (
    <BookContext.Provider value={bookRef.current}>
      {/*
       * <primitive> injects the ThreeBook (a THREE.Group subclass) into the
       * R3F scene graph.  Children are rendered in the React tree alongside it.
       */}
      <primitive object={bookRef.current} />
      {children}
    </BookContext.Provider>
  );
});

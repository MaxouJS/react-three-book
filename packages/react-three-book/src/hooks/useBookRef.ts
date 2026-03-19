/**
 * useBookRef — creates a ThreeBook, initialises it, drives update() each frame,
 * and disposes it on unmount.
 *
 * This is the underlying hook used by <Book>.  You can also call it directly
 * when you want full control without the JSX wrapper.
 *
 * Content updates are applied incrementally via `book.updateContent()` —
 * open progress, turning state, and animations are preserved.  A full
 * teardown only happens when the component unmounts (or when `key` changes).
 *
 * Structural options (binding, paper setup, dimensions) are still captured
 * once at init.  Use `key` to trigger a full rebuild for those.
 */

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Book as ThreeBook } from '../core/Book';
import type { BookOptions } from '../core/Book';
import type { BookContent } from '../core/BookContent';

export interface UseBookRefResult {
  /** Ref to the ThreeBook instance (null until init succeeds). */
  bookRef: React.MutableRefObject<ThreeBook | null>;
  /** True once init() has returned without error. */
  ready: boolean;
}

/**
 * Creates and manages the lifecycle of a ThreeBook instance.
 *
 * @param options  Passed directly to `new Book(options)`.  Structural options
 *                 (binding, paper setup) are captured at init — use `key` to
 *                 rebuild.  `content` is watched and applied incrementally.
 * @param onBuilt  Called after `book.init()` succeeds.
 * @param onError  Called if `book.init()` throws.
 */
export function useBookRef(
  options: BookOptions,
  onBuilt?: (book: ThreeBook) => void,
  onError?: (err: Error) => void,
): UseBookRefResult {
  const bookRef = useRef<ThreeBook | null>(null);
  const [ready, setReady] = useState(false);
  const prevContentRef = useRef<BookContent | undefined>(undefined);

  useEffect(() => {
    const book = new ThreeBook(options);
    bookRef.current = book;
    prevContentRef.current = options.content;

    try {
      book.init();
      setReady(true);
      onBuilt?.(book);
    } catch (err) {
      onError?.(err as Error);
    }

    return () => {
      book.dispose();
      bookRef.current = null;
      setReady(false);
    };
    // Structural options intentionally excluded — use `key` to rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Incremental content updates — preserves book state.
  useEffect(() => {
    const book = bookRef.current;
    if (!book || !ready) return;
    if (options.content === prevContentRef.current) return;
    prevContentRef.current = options.content;

    if (options.content) {
      book.updateContent(options.content);
    }
  }, [options.content, ready]);

  // Drive the physics simulation every frame.
  useFrame((_, delta) => {
    bookRef.current?.update(delta);
  });

  return { bookRef, ready };
}

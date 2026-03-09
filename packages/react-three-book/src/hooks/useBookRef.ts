/**
 * useBookRef — creates a ThreeBook, initialises it, drives update() each frame,
 * and disposes it on unmount.
 *
 * This is the underlying hook used by <Book>.  You can also call it directly
 * when you want full control without the JSX wrapper.
 *
 * Rebuild behaviour: React's `key` prop is the idiomatic way to trigger a
 * full teardown + reinitialisation.  Pass `key={buildKey}` on the component
 * that calls this hook (or on <Book>) to get a clean rebuild.
 */

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Book as ThreeBook } from '../core/Book';
import type { BookOptions } from '../core/Book';

export interface UseBookRefResult {
  /** Ref to the ThreeBook instance (null until init succeeds). */
  bookRef: React.MutableRefObject<ThreeBook | null>;
  /** True once init() has returned without error. */
  ready: boolean;
}

/**
 * Creates and manages the lifecycle of a ThreeBook instance.
 *
 * @param options  Passed directly to `new Book(options)`.  Changes after
 *                 mount are **ignored** — trigger a rebuild via `key` instead.
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

  useEffect(() => {
    const book = new ThreeBook(options);
    bookRef.current = book;

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
    // Options intentionally excluded — use `key` to rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drive the physics simulation every frame.
  useFrame((_, delta) => {
    bookRef.current?.update(delta);
  });

  return { bookRef, ready };
}

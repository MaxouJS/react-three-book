/**
 * useBookRef — creates a ThreeBook, initialises it, drives update() each frame,
 * and disposes it on unmount.
 *
 * This is the underlying hook used by <Book>.  You can also call it directly
 * when you want full control without the JSX wrapper.
 *
 * Properties are set during render (cheap stores with equality guards).
 * `update(delta)` in useFrame detects changes via dirty flags and applies
 * the cheapest path — no useEffect for option sync, no diffing, no prev-refs.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Book as ThreeBook } from '@objectifthunes/three-book';
import type { BookOptions } from '@objectifthunes/three-book';

export interface UseBookRefResult {
  /** Ref to the ThreeBook instance (null until init succeeds). */
  bookRef: React.MutableRefObject<ThreeBook | null>;
  /** True once init() has returned without error. */
  ready: boolean;
}

/**
 * Creates and manages the lifecycle of a ThreeBook instance.
 *
 * @param options  Passed directly to `new Book(options)`.  Property changes
 *                 are applied during render via guarded setters; `update()`
 *                 detects and applies them each frame.
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

  const onBuiltRef = useRef(onBuilt);
  const onErrorRef = useRef(onError);
  useLayoutEffect(() => {
    onBuiltRef.current = onBuilt;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    const book = new ThreeBook(options);
    bookRef.current = book;

    try {
      book.init();
      setReady(true);
      onBuiltRef.current?.(book);
    } catch (err) {
      onErrorRef.current?.(err as Error);
    }

    return () => {
      book.dispose();
      bookRef.current = null;
      setReady(false);
    };
    // Book created once — property changes applied during render below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set properties during render — guarded setters skip unchanged values.
  const book = bookRef.current;
  if (book && ready) {
    if (options.content !== undefined) book.content = options.content;
    book.binding = options.binding ?? null;
    book.castShadows = options.castShadows ?? true;
    book.alignToGround = options.alignToGround ?? false;
    book.hideBinder = options.hideBinder ?? false;
    book.reduceShadows = options.reduceShadows ?? false;
    book.reduceSubMeshes = options.reduceSubMeshes ?? false;
    book.reduceOverdraw = options.reduceOverdraw ?? false;
    if (options.pagePaperSetup) book.pagePaperSetup = options.pagePaperSetup;
    if (options.coverPaperSetup) book.coverPaperSetup = options.coverPaperSetup;
  }

  // Drive the physics simulation every frame.
  useFrame((_, delta) => {
    bookRef.current?.update(delta);
  });

  return { bookRef, ready };
}

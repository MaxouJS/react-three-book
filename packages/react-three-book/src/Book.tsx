/**
 * <Book> — the primary R3F component for @objectifthunes/three-book.
 *
 * Supports two modes:
 *
 * **Imperative mode** — pass a `content` prop (BookContent) built manually:
 *   <Book content={content} binding={binding} ... />
 *
 * **Declarative mode** — use <Cover>, <Page>, <Spread>, <Text> children:
 *   <Book binding={binding} ...>
 *     <Cover image={front} fitMode="cover" />
 *     <Page image={p1} color="#fff">
 *       <Text x={50} y={200} fontSize={18}>Hello</Text>
 *     </Page>
 *     <Spread image={spreadImg}>
 *       <Text x={50} y={400}>Across the fold</Text>
 *     </Spread>
 *   </Book>
 *
 * In declarative mode, BookContent is built automatically from children.
 * TextOverlayContent/SpreadContent lifecycle and per-frame updates are
 * handled internally — consumers don't call overlay.update() or manage refs.
 */

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Book as ThreeBook, BookDirection } from '@objectifthunes/three-book';
import type { BookOptions } from '@objectifthunes/three-book';
import { BookContext } from './context';
import { useContentFromChildren } from './useContentFromChildren';

export interface BookProps extends BookOptions {
  /** Called after `book.init()` succeeds. */
  onBuilt?: (book: ThreeBook) => void;
  /**
   * Called if `book.init()` throws (e.g. BookHeightException when the stack
   * is too tall for the given page dimensions).
   */
  onError?: (err: Error) => void;
  /**
   * Book direction for declarative mode (when using <Cover>, <Page>, <Spread> children).
   * In imperative mode, set direction on BookContent directly.
   */
  direction?: BookDirection;
  children?: ReactNode;
}

/**
 * R3F component that manages the complete lifecycle of a ThreeBook.
 * Forward-refs to the underlying `ThreeBook` instance.
 */
export const Book = forwardRef<ThreeBook, BookProps>(function Book(
  { onBuilt, onError, direction, children, ...options },
  ref,
) {
  const bookRef = useRef<ThreeBook | null>(null);
  const [ready, setReady] = useState(false);

  const onBuiltRef = useRef(onBuilt);
  const onErrorRef = useRef(onError);
  useLayoutEffect(() => {
    onBuiltRef.current = onBuilt;
    onErrorRef.current = onError;
  });

  // Resolve page/cover dimensions for content building
  const pageWidth = options.pagePaperSetup?.width ?? 2;
  const pageHeight = options.pagePaperSetup?.height ?? 3;
  const coverWidth = options.coverPaperSetup?.width ?? 2.1;
  const coverHeight = options.coverPaperSetup?.height ?? 3.1;

  // Build content from children (declarative mode)
  const childContent = useContentFromChildren(
    children, bookRef, pageWidth, pageHeight, coverWidth, coverHeight,
    direction ?? BookDirection.LeftToRight,
  );

  // Store childContent in a ref so useEffect can read it on mount
  const childContentRef = useRef(childContent);
  childContentRef.current = childContent;

  // Create book instance once
  useEffect(() => {
    const book = new ThreeBook(options);
    bookRef.current = book;

    // Apply declarative content before init() so the book builds with pages
    if (childContentRef.current && !options.content) {
      book.content = childContentRef.current;
    }

    try {
      book.init();
      setReady(true);
      onBuiltRef.current?.(book);
    } catch (err) {
      if (onErrorRef.current) {
        onErrorRef.current(err as Error);
      } else {
        console.error('react-three-book <Book>: init() failed', err);
      }
    }

    return () => {
      book.dispose();
      bookRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync properties during render (guarded setters skip unchanged values)
  const book = bookRef.current;
  if (book && ready) {
    // In imperative mode, apply content prop
    if (options.content !== undefined) book.content = options.content;
    // In declarative mode, apply child content
    if (childContent && !options.content) book.content = childContent;

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

  // Drive the physics simulation every frame
  useFrame((_, delta) => {
    bookRef.current?.update(delta);
  });

  // Expose the ThreeBook instance through the forwarded ref
  useImperativeHandle(ref, () => bookRef.current as ThreeBook, [ready]);

  if (!ready || !bookRef.current) return null;

  return (
    <BookContext.Provider value={bookRef.current}>
      <primitive object={bookRef.current} />
      {children}
    </BookContext.Provider>
  );
});

/**
 * useBookContent — creates a BookContent and manages the lifetime of any
 * THREE.Texture objects it holds.
 *
 * Pass a factory function that builds the BookContent; pass a dependency
 * array that controls when it is rebuilt (same semantics as useMemo).
 * Textures found in content.covers and content.pages are disposed
 * automatically when the content is rebuilt or the component unmounts.
 *
 * Usage:
 *
 *   const content = useBookContent(() => {
 *     const c = new BookContent();
 *     c.direction = BookDirection.LeftToRight;
 *     c.covers.push(myTexture);
 *     c.pages.push(pageTexA, pageTexB);
 *     return c;
 *   }, [rebuildKey]);
 */

import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { BookContent } from '../core/BookContent';

function collectTextures(content: BookContent): THREE.Texture[] {
  const all = [...content.covers, ...content.pages];
  return all.filter((item): item is THREE.Texture => item instanceof THREE.Texture);
}

/**
 * @param factory  Pure function that creates a BookContent.  Treated as
 *                 unstable — only called when `deps` change.
 * @param deps     Dependency array, like useMemo.
 */
export function useBookContent(
  factory: () => BookContent,
  deps: React.DependencyList,
): BookContent {
  const prevTexturesRef = useRef<THREE.Texture[]>([]);

  const content = useMemo(() => {
    return factory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    // Dispose the previous content's textures now that the new content is active.
    const stale = prevTexturesRef.current;

    // Track the current content's textures so they can be disposed next time.
    prevTexturesRef.current = collectTextures(content);

    for (const t of stale) t.dispose();

    // On unmount, dispose the current content's textures.
    return () => {
      for (const t of prevTexturesRef.current) t.dispose();
    };
  }, [content]);

  return content;
}

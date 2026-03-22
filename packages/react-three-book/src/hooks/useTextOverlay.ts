import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { TextOverlayContent } from '@objectifthunes/three-book';
import type { TextOverlayContentOptions } from '@objectifthunes/three-book';
import { useBook } from '../context';

/**
 * Creates and manages a TextOverlayContent instance with per-frame compositing.
 *
 * The returned overlay's canvas is re-composited every frame (source + text blocks).
 * Material sync is performed automatically if inside a `<Book>` tree.
 *
 * @param options  Initial options (width, height, source).
 * @returns The TextOverlayContent instance (stable ref).
 */
export function useTextOverlay(options?: TextOverlayContentOptions): TextOverlayContent {
  const ref = useRef<TextOverlayContent | null>(null);
  if (!ref.current) {
    ref.current = new TextOverlayContent(options);
  }
  const overlay = ref.current;

  const book = useBook();

  useFrame(() => {
    overlay.update(book ?? undefined);
  });

  useEffect(() => {
    return () => { overlay.dispose(); };
  }, [overlay]);

  return overlay;
}

export type { TextOverlayContentOptions };

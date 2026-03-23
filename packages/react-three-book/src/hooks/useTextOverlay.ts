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
  const dimsRef = useRef({ w: 0, h: 0 });

  const w = options?.width ?? 512;
  const h = options?.height ?? 512;

  // Create on first call, or recreate when dimensions change (requires new canvas)
  if (!ref.current || dimsRef.current.w !== w || dimsRef.current.h !== h) {
    ref.current?.dispose();
    ref.current = new TextOverlayContent(options);
    dimsRef.current = { w, h };
  }
  const overlay = ref.current;

  // Sync source via setter (no recreation needed)
  const source = options?.source ?? null;
  if (overlay.source !== source) {
    overlay.source = source;
  }

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

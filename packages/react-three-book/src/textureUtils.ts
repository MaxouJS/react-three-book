/**
 * Texture helpers for building book page content from canvas or images.
 * All utilities are browser-only (require document / URL APIs).
 */

import * as THREE from 'three';

// ── Types ─────────────────────────────────────────────────────────────────────

/** How an image is scaled to fit a rectangular area. */
export type ImageFitMode = 'contain' | 'cover' | 'fill';

/** Resolved image ready to be passed to createPageTexture. */
export interface LoadedImage {
  image: HTMLImageElement;
  /** Object URL created by URL.createObjectURL — revoke when no longer needed. */
  objectUrl: string;
}

// ── drawImageWithFit ──────────────────────────────────────────────────────────

/**
 * Draws `image` into a 2D canvas context within the rectangle
 * (x, y, width, height) using the given fit mode.
 *
 * - `'fill'`    — stretches to fill exactly, ignoring aspect ratio
 * - `'contain'` — scales uniformly to fit inside, letterboxed
 * - `'cover'`   — scales uniformly to fill, cropping the overflow
 */
export function drawImageWithFit(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  fit: ImageFitMode,
): void {
  const srcW = image.naturalWidth || image.width;
  const srcH = image.naturalHeight || image.height;
  if (srcW <= 0 || srcH <= 0) return;

  if (fit === 'fill') {
    ctx.drawImage(image, x, y, width, height);
    return;
  }

  const scale =
    fit === 'contain'
      ? Math.min(width / srcW, height / srcH)
      : Math.max(width / srcW, height / srcH);

  const dw = srcW * scale;
  const dh = srcH * scale;
  ctx.drawImage(image, x + (width - dw) * 0.5, y + (height - dh) * 0.5, dw, dh);
}

// ── createPageTexture ─────────────────────────────────────────────────────────

/**
 * Creates a 512×512 `THREE.CanvasTexture` suitable for use as a book page.
 *
 * - Fills the background with `color`.
 * - If `image` is provided, draws it using `fitMode` and `fullBleed`.
 * - Otherwise, renders `label` as centred text (useful for debugging).
 */
export function createPageTexture(
  color: string,
  label: string,
  image: HTMLImageElement | null,
  fitMode: ImageFitMode,
  fullBleed: boolean,
): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 512);

  if (image) {
    const margin = fullBleed ? 0 : 56;
    drawImageWithFit(ctx, image, margin, margin, 512 - margin * 2, 512 - margin * 2, fitMode);
  } else {
    ctx.fillStyle = '#333';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 256, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ── loadImage ─────────────────────────────────────────────────────────────────

/**
 * Loads a `File` into an `HTMLImageElement` and returns both the element
 * and the object URL it was decoded from.
 *
 * The caller is responsible for calling `URL.revokeObjectURL(result.objectUrl)`
 * when the image is no longer needed.
 *
 * Returns `null` if `file` is null/undefined or if decoding fails.
 */
export async function loadImage(file: File | null | undefined): Promise<LoadedImage | null> {
  if (!file) return null;

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = objectUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Failed to decode image: ${file.name}`));
    });
    return { image, objectUrl };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    console.error(err);
    return null;
  }
}

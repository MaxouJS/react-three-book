/**
 * Re-export texture utilities from @objectifthunes/three-book.
 * These were previously duplicated here — now a single source of truth.
 */
export {
  drawImageWithFit,
  createPageCanvas,
  createPageTexture,
  computeDefaultImageRect,
  loadImage,
  PX_PER_UNIT,
} from '@objectifthunes/three-book';

export type { ImageFitMode, ImageRect, LoadedImage } from '@objectifthunes/three-book';

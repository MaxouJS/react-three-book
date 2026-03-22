/**
 * Re-export texture utilities from @objectifthunes/three-book.
 * These were previously duplicated here — now a single source of truth.
 */
export {
  drawImageWithFit,
  createPageTexture,
  loadImage,
  PX_PER_UNIT,
} from '@objectifthunes/three-book';

export type { ImageFitMode, LoadedImage } from '@objectifthunes/three-book';

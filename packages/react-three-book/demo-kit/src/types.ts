export type { ImageSlot, PageTextBlock, DirectionOption, ImageFitMode, ImageRect } from '@objectifthunes/three-book/demo-kit';
export { FONT_OPTIONS, createDefaultTextBlock, toBookDirection, createImageSlot, clearImageSlot } from '@objectifthunes/three-book/demo-kit';

import type { ImageSlot } from '@objectifthunes/three-book/demo-kit';

export const EMPTY_SLOT: ImageSlot = { image: null, objectUrl: null, useImage: false, fitMode: 'cover', fullBleed: true, imageRect: null };

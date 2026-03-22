/**
 * <Cover> — declarative cover inside a <Book>.
 *
 * Renders nothing; its props are collected by <Book> during reconciliation
 * and mapped to entries in BookContent.covers[].
 *
 * A book has 4 cover surfaces (front outer, front inner, back inner, back outer).
 * Declare up to 4 <Cover> elements; order matches the surface order.
 *
 *   <Book binding={binding}>
 *     <Cover image={frontImg} fitMode="cover" />
 *     <Cover />
 *     <Cover />
 *     <Cover image={backImg} fitMode="cover" />
 *   </Book>
 */

import type { ReactNode } from 'react';
import type { ImageFitMode, ImageRect } from '../textureUtils';

export interface CoverProps {
  image?: HTMLImageElement | null;
  color?: string;
  fitMode?: ImageFitMode;
  fullBleed?: boolean;
  /** Custom image position/size in canvas pixels. Overrides fitMode when set. */
  imageRect?: ImageRect | null;
  children?: ReactNode;
}

export function Cover(_props: CoverProps): null {
  return null;
}

Cover.displayName = 'BookCover';

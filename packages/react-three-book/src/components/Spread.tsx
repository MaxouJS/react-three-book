/**
 * <Spread> — declarative double-page spread inside a <Book>.
 *
 * Renders nothing; its props are collected by <Book> during reconciliation.
 * A <Spread> contributes two entries to BookContent.pages[] (left + right).
 * Text coordinates span the full double-width canvas.
 *
 *   <Book binding={binding}>
 *     <Page image={p1} />
 *     <Spread image={spreadImg} fitMode="cover" fullBleed>
 *       <Text x={50} y={400} width={924} fontSize={18}>
 *         Text across both pages...
 *       </Text>
 *     </Spread>
 *     <Page image={p4} />
 *   </Book>
 */

import type { ReactNode } from 'react';
import type { ImageFitMode, ImageRect } from '../textureUtils';

export interface SpreadProps {
  image?: HTMLImageElement | null;
  color?: string;
  fitMode?: ImageFitMode;
  fullBleed?: boolean;
  /** Custom image position/size in canvas pixels. Overrides fitMode when set. */
  imageRect?: ImageRect | null;
  children?: ReactNode;
}

export function Spread(_props: SpreadProps): null {
  return null;
}

Spread.displayName = 'BookSpread';

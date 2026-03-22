/**
 * <Page> — declarative page inside a <Book>.
 *
 * Renders nothing; its props are collected by <Book> during reconciliation
 * and mapped to entries in BookContent.pages[].
 *
 *   <Book binding={binding}>
 *     <Page image={img} color="#f5f5dc" fitMode="cover" fullBleed>
 *       <Text x={50} y={200} fontSize={18}>Hello world</Text>
 *     </Page>
 *   </Book>
 */

import type { ReactNode } from 'react';
import type { ImageFitMode } from '../textureUtils';

export interface PageProps {
  image?: HTMLImageElement | null;
  color?: string;
  fitMode?: ImageFitMode;
  fullBleed?: boolean;
  children?: ReactNode;
}

export function Page(_props: PageProps): null {
  return null;
}

Page.displayName = 'BookPage';

/**
 * useContentFromChildren — reconciles <Cover>, <Page>, <Spread>, <Text>
 * children into a BookContent instance with managed TextOverlayContent
 * and SpreadContent lifecycles.
 *
 * Called by <Book> when no `content` prop is provided.
 */

import { Children, isValidElement, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ReactNode, ReactElement } from 'react';
import {
  BookContent,
  BookDirection,
  TextOverlayContent,
  SpreadContent,
  Book as ThreeBook,
} from '@objectifthunes/three-book';
import type { TextBlockOptions } from '@objectifthunes/three-book';
import { createPageTexture, PX_PER_UNIT } from './textureUtils';
import type { ImageFitMode, ImageRect } from './textureUtils';
import type { CoverProps } from './components/Cover';
import type { PageProps } from './components/Page';
import type { SpreadProps } from './components/Spread';
import type { TextProps } from './components/Text';

// ── Descriptor types (plain data extracted from JSX) ─────────────────────────

interface TextDescriptor {
  text: string;
  x?: number;
  y?: number;
  width?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  opacity?: number;
  shadowColor?: string;
  shadowBlur?: number;
}

interface ContentDescriptor {
  type: 'page' | 'cover' | 'spread';
  label: string;
  image?: HTMLImageElement | null;
  color?: string;
  fitMode?: ImageFitMode;
  fullBleed?: boolean;
  imageRect?: ImageRect | null;
  texts: TextDescriptor[];
}

// ── Child extraction ─────────────────────────────────────────────────────────

function extractTexts(children: ReactNode): TextDescriptor[] {
  const texts: TextDescriptor[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<TextProps>;
    if (typeof el.type !== 'function' || (el.type as { displayName?: string }).displayName !== 'BookText') return;
    texts.push({
      text: el.props.children,
      x: el.props.x,
      y: el.props.y,
      width: el.props.width,
      fontSize: el.props.fontSize,
      fontFamily: el.props.fontFamily,
      fontWeight: el.props.fontWeight,
      fontStyle: el.props.fontStyle,
      color: el.props.color,
      textAlign: el.props.textAlign,
      lineHeight: el.props.lineHeight,
      opacity: el.props.opacity,
      shadowColor: el.props.shadowColor,
      shadowBlur: el.props.shadowBlur,
    });
  });
  return texts;
}

type ContentChild = ReactElement<CoverProps | PageProps | SpreadProps>;

const COVER_LABELS = ['Front Cover Outer', 'Front Cover Inner', 'Back Cover Inner', 'Back Cover Outer'];

function extractDescriptors(children: ReactNode): ContentDescriptor[] {
  const descriptors: ContentDescriptor[] = [];
  let coverIndex = 0;
  let pageIndex = 0;
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ContentChild;
    const displayName = typeof el.type === 'function'
      ? (el.type as { displayName?: string }).displayName
      : undefined;

    if (displayName === 'BookCover') {
      const props = el.props as CoverProps;
      descriptors.push({
        type: 'cover',
        label: COVER_LABELS[coverIndex] ?? `Cover ${coverIndex + 1}`,
        image: props.image,
        color: props.color,
        fitMode: props.fitMode,
        fullBleed: props.fullBleed,
        imageRect: props.imageRect,
        texts: extractTexts(props.children),
      });
      coverIndex++;
    } else if (displayName === 'BookPage') {
      const props = el.props as PageProps;
      pageIndex++;
      descriptors.push({
        type: 'page',
        label: `Page ${pageIndex}`,
        image: props.image,
        color: props.color,
        fitMode: props.fitMode,
        fullBleed: props.fullBleed,
        imageRect: props.imageRect,
        texts: extractTexts(props.children),
      });
    } else if (displayName === 'BookSpread') {
      const props = el.props as SpreadProps;
      const leftPage = pageIndex + 1;
      const rightPage = pageIndex + 2;
      pageIndex += 2;
      descriptors.push({
        type: 'spread',
        label: `Spread ${leftPage}-${rightPage}`,
        image: props.image,
        color: props.color,
        fitMode: props.fitMode,
        fullBleed: props.fullBleed,
        imageRect: props.imageRect,
        texts: extractTexts(props.children),
      });
    }
  });
  return descriptors;
}

// ── Descriptor serialization for memoization ─────────────────────────────────

function serializeDescriptors(descs: ContentDescriptor[]): string {
  return JSON.stringify(descs.map((d) => ({
    type: d.type,
    label: d.label,
    imageRef: d.image ? `img:${d.image.src}:${d.image.naturalWidth}` : null,
    color: d.color,
    fitMode: d.fitMode,
    fullBleed: d.fullBleed,
    imageRect: d.imageRect ?? null,
    texts: d.texts,
  })));
}

// ── Content builder ──────────────────────────────────────────────────────────

interface ManagedContent {
  content: BookContent;
  overlays: TextOverlayContent[];
  spreads: SpreadContent[];
}

function buildContent(
  descriptors: ContentDescriptor[],
  pageWidth: number,
  pageHeight: number,
  coverWidth: number,
  coverHeight: number,
  direction: BookDirection,
): ManagedContent {
  const content = new BookContent();
  content.direction = direction;
  content.covers.length = 0;
  content.pages.length = 0;
  const overlays: TextOverlayContent[] = [];
  const spreads: SpreadContent[] = [];

  const pageCW = Math.round(pageWidth * PX_PER_UNIT);
  const pageCH = Math.round(pageHeight * PX_PER_UNIT);
  const coverCW = Math.round(coverWidth * PX_PER_UNIT);
  const coverCH = Math.round(coverHeight * PX_PER_UNIT);

  for (const desc of descriptors) {
    if (desc.type === 'cover') {
      if (desc.texts.length > 0) {
        const overlay = new TextOverlayContent({ width: coverCW, height: coverCH });
        if (desc.image || desc.color) {
          const tex = createPageTexture(
            desc.color ?? '#cc0000', desc.label, desc.image ?? null,
            desc.fitMode ?? 'cover', desc.fullBleed ?? false, coverWidth, coverHeight, desc.imageRect,
          );
          overlay.source = (tex.image as HTMLCanvasElement) ?? null;
        }
        for (const t of desc.texts) {
          overlay.addText(textDescriptorToOptions(t));
        }
        overlays.push(overlay);
        content.covers.push(overlay);
      } else {
        content.covers.push(
          createPageTexture(
            desc.color ?? '#cc0000', desc.label, desc.image ?? null,
            desc.fitMode ?? 'cover', desc.fullBleed ?? false, coverWidth, coverHeight, desc.imageRect,
          ),
        );
      }
    } else if (desc.type === 'page') {
      if (desc.texts.length > 0) {
        const overlay = new TextOverlayContent({ width: pageCW, height: pageCH });
        if (desc.image || desc.color) {
          const tex = createPageTexture(
            desc.color ?? '#f5f5dc', desc.label, desc.image ?? null,
            desc.fitMode ?? 'cover', desc.fullBleed ?? false, pageWidth, pageHeight, desc.imageRect,
          );
          overlay.source = (tex.image as HTMLCanvasElement) ?? null;
        }
        for (const t of desc.texts) {
          overlay.addText(textDescriptorToOptions(t));
        }
        overlays.push(overlay);
        content.pages.push(overlay);
      } else {
        content.pages.push(
          createPageTexture(
            desc.color ?? '#f5f5dc', desc.label, desc.image ?? null,
            desc.fitMode ?? 'cover', desc.fullBleed ?? false, pageWidth, pageHeight, desc.imageRect,
          ),
        );
      }
    } else if (desc.type === 'spread') {
      const spread = new SpreadContent({ pageWidth: pageCW, pageHeight: pageCH });
      if (desc.image || desc.color) {
        const tex = createPageTexture(
          desc.color ?? '#f5f5dc', desc.label, desc.image ?? null,
          desc.fitMode ?? 'cover', desc.fullBleed ?? false, pageWidth * 2, pageHeight, desc.imageRect,
        );
        spread.source = (tex.image as HTMLCanvasElement) ?? null;
      }
      for (const t of desc.texts) {
        spread.addText(textDescriptorToOptions(t));
      }
      spreads.push(spread);
      content.pages.push(spread.left);
      content.pages.push(spread.right);
    }
  }

  return { content, overlays, spreads };
}

function textDescriptorToOptions(t: TextDescriptor): TextBlockOptions {
  const opts: TextBlockOptions = { text: t.text };
  if (t.x !== undefined) opts.x = t.x;
  if (t.y !== undefined) opts.y = t.y;
  if (t.width !== undefined) opts.width = t.width;
  if (t.fontSize !== undefined) opts.fontSize = t.fontSize;
  if (t.fontFamily !== undefined) opts.fontFamily = t.fontFamily;
  if (t.fontWeight !== undefined) opts.fontWeight = t.fontWeight;
  if (t.fontStyle !== undefined) opts.fontStyle = t.fontStyle;
  if (t.color !== undefined) opts.color = t.color;
  if (t.textAlign !== undefined) opts.textAlign = t.textAlign;
  if (t.lineHeight !== undefined) opts.lineHeight = t.lineHeight;
  if (t.opacity !== undefined) opts.opacity = t.opacity;
  if (t.shadowColor !== undefined) opts.shadowColor = t.shadowColor;
  if (t.shadowBlur !== undefined) opts.shadowBlur = t.shadowBlur;
  return opts;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useContentFromChildren(
  children: ReactNode,
  bookRef: React.RefObject<ThreeBook | null>,
  pageWidth: number,
  pageHeight: number,
  coverWidth: number,
  coverHeight: number,
  direction: BookDirection = BookDirection.LeftToRight,
): BookContent | null {
  const descriptors = extractDescriptors(children);
  const hasContent = descriptors.length > 0;
  const key = hasContent ? `${direction}:${serializeDescriptors(descriptors)}` : '';
  const managedRef = useRef<ManagedContent | null>(null);

  // Rebuild content when descriptors change (or clear when no content children)
  const managed = useMemo(() => {
    // Dispose previous overlays/spreads
    if (managedRef.current) {
      for (const o of managedRef.current.overlays) o.dispose();
      for (const s of managedRef.current.spreads) s.dispose();
      managedRef.current = null;
    }
    if (!hasContent) return null;
    const result = buildContent(descriptors, pageWidth, pageHeight, coverWidth, coverHeight, direction);
    managedRef.current = result;
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Per-frame: update all overlays and spreads (canvas compositing + material sync)
  useFrame(() => {
    if (!managed) return;
    const book = bookRef.current;
    for (const overlay of managed.overlays) overlay.update(book ?? undefined);
    for (const spread of managed.spreads) spread.update(book ?? undefined);
  });

  return managed?.content ?? null;
}

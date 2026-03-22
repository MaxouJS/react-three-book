/**
 * <Text> — declarative text block inside a <Page>, <Cover>, or <Spread>.
 *
 * Renders nothing; its props are collected by the parent content component
 * and mapped to a TextBlock on the underlying TextOverlayContent/SpreadContent.
 *
 *   <Page image={img}>
 *     <Text x={50} y={100} fontSize={24} fontWeight="bold">Chapter 1</Text>
 *   </Page>
 */

export interface TextProps {
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
  children: string;
}

/**
 * Data-only component — renders nothing.
 * Props are read by the parent <Page>/<Cover>/<Spread> during reconciliation.
 */
export function Text(_props: TextProps): null {
  return null;
}

/** Marker so Book can identify <Text> elements during children traversal. */
Text.displayName = 'BookText';

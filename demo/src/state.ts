import { BookDirection, PX_PER_UNIT } from '@objectifthunes/react-three-book';
import type { ImageFitMode, ImageRect } from '@objectifthunes/react-three-book';
export { DEMO_SHADOW_COLOR, DEMO_SHADOW_BLUR, DEFAULT_LINE_HEIGHT, DEFAULT_FONT_SIZE, DEFAULT_TEXT_COLOR } from '@objectifthunes/react-three-book/demo-kit';
import { DEFAULT_FONT_SIZE, DEFAULT_TEXT_COLOR } from '@objectifthunes/react-three-book/demo-kit';

export type { ImageFitMode, ImageRect };
export { PX_PER_UNIT };

export type DirectionOption = 'left-to-right' | 'right-to-left' | 'up-to-down' | 'down-to-up';

export interface ImageSlot {
  image: HTMLImageElement | null;
  objectUrl: string | null;
  useImage: boolean;
  fitMode: ImageFitMode;
  fullBleed: boolean;
  imageRect: ImageRect | null;
}

export interface PageTextBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  fontFamily: string; // empty string = use book default
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  textAlign: 'left' | 'center' | 'right';
}

export const FONT_OPTIONS = [
  'Georgia',
  'Times New Roman',
  'Garamond',
  'Palatino',
  'Arial',
  'Helvetica',
  'Verdana',
  'Trebuchet MS',
  'Tahoma',
  'Courier New',
  'Lucida Console',
  'Comic Sans MS',
];

export function createDefaultTextBlock(pageWidth: number, pageHeight: number): PageTextBlock {
  const cw = Math.round(pageWidth * PX_PER_UNIT);
  const ch = Math.round(pageHeight * PX_PER_UNIT);
  return {
    text: 'Your text here',
    x: Math.round(cw * 0.06),
    y: Math.round(ch * 0.55),
    width: Math.round(cw * 0.88),
    fontFamily: '',
    fontSize: DEFAULT_FONT_SIZE,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: DEFAULT_TEXT_COLOR,
    textAlign: 'left',
  };
}

export interface DemoParams {
  pageWidth: number;
  pageHeight: number;
  pageThickness: number;
  pageStiffness: number;
  pageCount: number;
  pageColor: string;
  coverWidth: number;
  coverHeight: number;
  coverThickness: number;
  coverStiffness: number;
  coverColor: string;
  direction: DirectionOption;
  openProgress: number;
  castShadows: boolean;
  alignToGround: boolean;
  hideBinder: boolean;
  reduceShadows: boolean;
  reduceSubMeshes: boolean;
  reduceOverdraw: boolean;
  interactive: boolean;
  sunIntensity: number;
  ambientIntensity: number;
  sunX: number;
  sunY: number;
  sunZ: number;
  bookFont: string;
}

export const defaultParams: DemoParams = {
  pageWidth: 2,
  pageHeight: 3,
  pageThickness: 0.02,
  pageStiffness: 0.2,
  pageCount: 8,
  pageColor: '#f5f5dc',
  coverWidth: 2.1,
  coverHeight: 3.1,
  coverThickness: 0.04,
  coverStiffness: 0.5,
  coverColor: '#ff0000',
  direction: 'left-to-right',
  openProgress: 0,
  castShadows: true,
  alignToGround: true,
  hideBinder: false,
  reduceShadows: false,
  reduceSubMeshes: false,
  reduceOverdraw: false,
  interactive: true,
  sunIntensity: 1.2,
  ambientIntensity: 0.6,
  sunX: 5,
  sunY: 10,
  sunZ: 5,
  bookFont: 'Georgia',
};

export const DIRECTION_TO_BOOK_DIRECTION: Record<DirectionOption, BookDirection> = {
  'left-to-right': BookDirection.LeftToRight,
  'right-to-left': BookDirection.RightToLeft,
  'up-to-down':    BookDirection.UpToDown,
  'down-to-up':    BookDirection.DownToUp,
};

export const EMPTY_SLOT: ImageSlot = {
  image: null,
  objectUrl: null,
  useImage: false,
  fitMode: 'cover',
  fullBleed: true,
  imageRect: null,
};


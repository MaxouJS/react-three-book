import { BookDirection } from '@objectifthunes/react-three-book';
import type { ImageFitMode } from '@objectifthunes/react-three-book';

export type { ImageFitMode };

export type DirectionOption = 'left-to-right' | 'right-to-left' | 'up-to-down' | 'down-to-up';

export interface ImageSlot {
  image: HTMLImageElement | null;
  objectUrl: string | null;
  useImage: boolean;
  fitMode: ImageFitMode;
  fullBleed: boolean;
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
};

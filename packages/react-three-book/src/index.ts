// ─────────────────────────────────────────────────────────────────────────────
// @objectifthunes/react-three-book
//
// Components
//   <Book>             — main scene component (lifecycle + context provider)
//   <BookInteraction>  — pointer-event wiring for interactive page turning
//
// Context
//   BookContext        — React context carrying the Book instance
//   useBook()          — safe access (returns null outside a <Book> tree)
//   useRequiredBook()  — throws outside a <Book> tree
//
// Hooks (must be called inside a <Canvas>)
//   useBookRef()       — create + manage a Book without JSX
//   usePageTurning()   — attach pointer events for page dragging
//   useBookControls()  — setOpenProgress, stopTurning, cancelAutoTurns, …
//   useAutoTurn()      — turnNext, turnPrev, turnAll, startAutoTurning, …
//   useBookState()     — reactive snapshot (isTurning, isIdle, paperCount, …)
// ─────────────────────────────────────────────────────────────────────────────

// ── R3F Components ────────────────────────────────────────────────────────────
export { Book } from './Book';
export type { BookProps } from './Book';

export { BookInteraction } from './BookInteraction';
export type { BookInteractionProps } from './BookInteraction';

// ── Declarative content components ───────────────────────────────────────────
export { Cover } from './components/Cover';
export type { CoverProps } from './components/Cover';

export { Page } from './components/Page';
export type { PageProps } from './components/Page';

export { Spread } from './components/Spread';
export type { SpreadProps } from './components/Spread';

export { Text } from './components/Text';
export type { TextProps } from './components/Text';

// ── Context ───────────────────────────────────────────────────────────────────
export { BookContext, useBook, useRequiredBook } from './context';

// ── Hooks ─────────────────────────────────────────────────────────────────────
export { useBookRef } from './hooks/useBookRef';
export type { UseBookRefResult } from './hooks/useBookRef';

export { usePageTurning } from './hooks/usePageTurning';
export type { UsePageTurningOptions } from './hooks/usePageTurning';

export { useBookControls } from './hooks/useBookControls';
export type { BookControls } from './hooks/useBookControls';

export { useAutoTurn } from './hooks/useAutoTurn';
export type { AutoTurnControls } from './hooks/useAutoTurn';

export { useBookState } from './hooks/useBookState';
export type { BookState } from './hooks/useBookState';

export { useBookContent } from './hooks/useBookContent';

export { useTextOverlay } from './hooks/useTextOverlay';

// ── Texture utilities ──────────────────────────────────────────────────────────
export { drawImageWithFit, createPageCanvas, createPageTexture, computeDefaultImageRect, loadImage, PX_PER_UNIT } from './textureUtils';
export type { ImageFitMode, ImageRect, LoadedImage } from './textureUtils';

// ── Core library (re-exported from @objectifthunes/three-book) ───────────────
export { Book as ThreeBook, BookHeightException } from '@objectifthunes/three-book';
export type { BookOptions, BookRaycastHit, PaperSetupInit } from '@objectifthunes/three-book';

export { BookContent } from '@objectifthunes/three-book';
export { BookDirection } from '@objectifthunes/three-book';
export { BookBinding, BookBound } from '@objectifthunes/three-book';
export { StapleBookBound, StapleBookBinding, StapleSetup } from '@objectifthunes/three-book';

export { Paper } from '@objectifthunes/three-book';
export { PaperSetup } from '@objectifthunes/three-book';
export { PaperUVMargin } from '@objectifthunes/three-book';
export { PaperMeshData } from '@objectifthunes/three-book';
export { PaperMaterialData } from '@objectifthunes/three-book';
export { PaperPattern } from '@objectifthunes/three-book';
export { PaperNode } from '@objectifthunes/three-book';
export { PaperSeam, PaperBorder, PaperNodeMargin } from '@objectifthunes/three-book';

export { Cylinder } from '@objectifthunes/three-book';

export {
  AutoTurnDirection,
  AutoTurnMode,
  AutoTurnSettings,
  AutoTurnSetting,
  AutoTurnSettingMode,
  AutoTurnSettingCurveTimeMode,
  AnimationCurve,
} from '@objectifthunes/three-book';
export type { Keyframe } from '@objectifthunes/three-book';

export { BookRenderer, RendererFactory, MeshFactory, PaperMeshDataPool } from '@objectifthunes/three-book';
export type { IPageContent } from '@objectifthunes/three-book';
export type { PropertyBlock } from '@objectifthunes/three-book';
export { PageContent, SpritePageContent2 } from '@objectifthunes/three-book';

export { TextBlock } from '@objectifthunes/three-book';
export type { TextBlockOptions } from '@objectifthunes/three-book';

export { TextOverlayContent } from '@objectifthunes/three-book';
export type { TextOverlayContentOptions } from '@objectifthunes/three-book';

export { SpreadContent, getSpreadPairs } from '@objectifthunes/three-book';
export type { SpreadContentOptions } from '@objectifthunes/three-book';

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
export { drawImageWithFit, createPageTexture, loadImage, PX_PER_UNIT } from './textureUtils';
export type { ImageFitMode, LoadedImage } from './textureUtils';

// ── Core library (re-exported for consumers that need raw Three.js types) ─────
export { Book as ThreeBook, BookHeightException } from './core/Book';
export type { BookOptions, BookRaycastHit, PaperSetupInit } from './core/Book';

export { BookContent } from './core/BookContent';
export { BookDirection } from './core/BookDirection';
export { BookBinding, BookBound } from './core/BookBinding';
export { StapleBookBound, StapleBookBinding, StapleSetup } from './core/StapleBinding';

export { Paper } from './core/Paper';
export { PaperSetup } from './core/PaperSetup';
export { PaperUVMargin } from './core/PaperUVMargin';
export { PaperMeshData } from './core/PaperMeshData';
export { PaperMaterialData } from './core/PaperMaterialData';
export { PaperPattern } from './core/PaperPattern';
export { PaperNode } from './core/PaperNode';
export { PaperSeam, PaperBorder, PaperNodeMargin } from './core/PaperStructs';

export { Cylinder } from './core/Cylinder';

export {
  AutoTurnDirection,
  AutoTurnMode,
  AutoTurnSettings,
  AutoTurnSetting,
  AutoTurnSettingMode,
  AutoTurnSettingCurveTimeMode,
  AnimationCurve,
} from './core/AutoTurn';
export type { Keyframe } from './core/AutoTurn';

export { BookRenderer, RendererFactory, MeshFactory, PaperMeshDataPool } from './core/Renderer';
export type { IPageContent } from './core/PageContent';
export { PageContent, SpritePageContent2 } from './core/PageContent';

export { TextBlock } from './core/TextBlock';
export type { TextBlockOptions } from './core/TextBlock';

export { TextOverlayContent } from './core/TextOverlayContent';
export type { TextOverlayContentOptions } from './core/TextOverlayContent';

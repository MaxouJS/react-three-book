// ─────────────────────────────────────────────────────────────────────────────
// @objectifthunes/react-three-book
//
// R3F wrapper for @objectifthunes/three-book.
//
// Components
//   <Book>             — main scene component (lifecycle + context provider)
//   <BookInteraction>  — pointer-event wiring for interactive page turning
//
// Context
//   BookContext        — React context carrying the ThreeBook instance
//   useBook()          — safe access (returns null outside a <Book> tree)
//   useRequiredBook()  — throws outside a <Book> tree
//
// Hooks (must be called inside a <Canvas>)
//   useBookRef()       — create + manage a ThreeBook without JSX
//   usePageTurning()   — attach pointer events for page dragging
//   useBookControls()  — setOpenProgress, stopTurning, cancelAutoTurns, …
//   useAutoTurn()      — turnNext, turnPrev, turnAll, startAutoTurning, …
//   useBookState()     — reactive snapshot (isTurning, isIdle, paperCount, …)
//
// All types and classes from @objectifthunes/three-book are re-exported so
// consumers only need one import path.
// ─────────────────────────────────────────────────────────────────────────────

// ── Components ────────────────────────────────────────────────────────────────
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

// ── Re-exports from @objectifthunes/three-book ────────────────────────────────
// Consumers get all three-book types and classes from this single package.

export {
  // Book class (as ThreeBook alias to avoid name clash with the R3F component)
  Book as ThreeBook,
  BookHeightException,
} from '@objectifthunes/three-book';
export type { BookOptions, BookRaycastHit, PaperSetupInit } from '@objectifthunes/three-book';

export {
  BookContent,
  BookDirection,
  BookBinding,
  BookBound,
  StapleBookBinding,
  StapleBookBound,
  StapleSetup,
} from '@objectifthunes/three-book';

export {
  Paper,
  PaperSetup,
  PaperUVMargin,
  PaperMeshData,
  PaperMaterialData,
  PaperPattern,
  PaperNode,
  PaperSeam,
  PaperBorder,
  PaperNodeMargin,
} from '@objectifthunes/three-book';

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

export {
  BookRenderer,
  RendererFactory,
  MeshFactory,
  PaperMeshDataPool,
  PageContent,
  SpritePageContent2,
} from '@objectifthunes/three-book';
export type { IPageContent } from '@objectifthunes/three-book';

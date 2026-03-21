/**
 * Shared type definitions for the three-book library.
 *
 * Centralises interfaces and enums that are referenced across multiple files,
 * breaking circular dependencies between Book, Paper, BookBinding, etc.
 */

import * as THREE from 'three';
import type { BookContent } from './BookContent';
import type { BookDirection } from './BookDirection';
import type { Paper } from './Paper';

// ─────────────────────────────────────────────────────────────────────────────
// IPageContent (PageContent.cs lines 8-17)
// ─────────────────────────────────────────────────────────────────────────────

export interface IPageContent {
  readonly texture: THREE.Texture | null;
  readonly textureST: THREE.Vector4;
  isPointOverUI(textureCoord: THREE.Vector2): boolean;
  init(bookContent: BookContent): void;
  setActive(active: boolean): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// BookRaycastHit (Book.cs lines 1607-1614)
// ─────────────────────────────────────────────────────────────────────────────

export interface BookRaycastHit {
  point: THREE.Vector3;
  textureCoordinate: THREE.Vector2;
  pageContent: IPageContent | null;
  paperIndex: number;
  pageIndex: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// AutoTurnMode (Book.cs ~1100-1111)
// ─────────────────────────────────────────────────────────────────────────────

export enum AutoTurnMode {
  /** This mode simulates swiping the paper surface to turn it. */
  Surface = 0,
  /** This mode simulates holding the paper edge and turning it. */
  Edge = 1,
}

// ─────────────────────────────────────────────────────────────────────────────
// IBookBound — minimal interface for BookBound as used by Paper
// ─────────────────────────────────────────────────────────────────────────────

export interface IBookBound {
  resetPaperPosition(paper: Paper): void;
  updatePaperPosition(paper: Paper): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// IBookOwner — minimal interface the Paper class expects from Book
// ─────────────────────────────────────────────────────────────────────────────

export interface IBookOwner {
  readonly bound: IBookBound | null;
  readonly castShadows: boolean;
  readonly reduceShadows: boolean;
  readonly direction: BookDirection;
}

// ─────────────────────────────────────────────────────────────────────────────
// PropertyBlock — typed material overrides (replaces Record<string, unknown>)
// ─────────────────────────────────────────────────────────────────────────────

export interface PropertyBlock {
  color: THREE.Color;
  map: THREE.Texture | null;
  textureST: THREE.Vector4;
}

// ─────────────────────────────────────────────────────────────────────────────
// IBinderRenderer — minimal interface for BookBound.binderRenderer
// ─────────────────────────────────────────────────────────────────────────────

export interface IBinderRenderer {
  setVisibility(visible: boolean): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// IPaperRenderer — minimal wrapper for the C# Renderer helper class
// ─────────────────────────────────────────────────────────────────────────────

export interface IPaperRenderer {
  readonly transform: THREE.Object3D;
  mesh: THREE.BufferGeometry | null;
  castShadows: boolean;
  setMaterials(materials: THREE.Material[]): void;
  setPropertyBlock(props: PropertyBlock, materialIndex: number): void;
  readonly bounds: THREE.Box3;
}

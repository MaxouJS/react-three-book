/**
 * Ported from BookBinding.cs — BookBinding and BookBound abstract classes.
 *
 * Unity MonoBehaviour → plain abstract class.
 */

import * as THREE from 'three';
import type { Book } from './Book';
import type { BookRenderer, MeshFactory, RendererFactory } from './Renderer';
import type { Paper } from './Paper';
import type { PaperPattern } from './PaperPattern';
import type { PaperUVMargin } from './PaperUVMargin';

// ─────────────────────────────────────────────────────────────────────────────
// BookBinding (BookBinding.cs lines 5-8)
// ─────────────────────────────────────────────────────────────────────────────

export abstract class BookBinding {
  abstract createBound(
    book: Book,
    root: THREE.Object3D,
    rendererFactory: RendererFactory,
    meshFactory: MeshFactory,
  ): BookBound;
}

// ─────────────────────────────────────────────────────────────────────────────
// BookBound (BookBinding.cs lines 10-30)
// ─────────────────────────────────────────────────────────────────────────────

export abstract class BookBound {
  protected m_Book: Book;
  protected m_Root: THREE.Object3D;

  abstract get useSharedMeshDataForLowpoly(): boolean;
  abstract get binderRenderer(): BookRenderer;

  constructor(book: Book, root: THREE.Object3D) {
    this.m_Book = book;
    this.m_Root = root;
  }

  abstract createPaperPattern(
    quality: number,
    size: THREE.Vector2,
    thickness: number,
    uvMargin: PaperUVMargin,
    reduceOverdraw: boolean,
    reduceSubMeshes: boolean,
  ): PaperPattern;

  abstract resetPaperPosition(paper: Paper): void;
  abstract updatePaperPosition(paper: Paper): void;
  abstract onLateUpdate(): void;
}

/**
 * SpreadContent — manages a double-page spread where a single image and text
 * blocks span across two facing pages.
 *
 * Creates a double-width canvas and exposes `left` and `right` IPageContent
 * objects. Each half uses textureST to crop to its side of the shared texture.
 *
 * Usage:
 *   const spread = new SpreadContent({ pageWidth: 512, pageHeight: 768 });
 *   spread.source = spreadImage;
 *   spread.addText({ text: 'Hello', x: 100, y: 400, width: 900, fontSize: 28 });
 *   bookContent.pages.push(spread.left);   // left page
 *   bookContent.pages.push(spread.right);  // right page
 *
 *   // Per-frame:
 *   spread.update(bookRoot);
 */

import * as THREE from 'three';
import { TextBlock } from './TextBlock';
import type { TextBlockOptions } from './TextBlock';
import type { IPageContent } from './PageContent';
import type { BookContent } from './BookContent';

export interface SpreadContentOptions {
  /** Width of a single page in pixels. The spread canvas will be 2x this. */
  pageWidth?: number;
  /** Height of a single page in pixels. */
  pageHeight?: number;
  /** Source canvas or image to draw as the base layer (full spread width). */
  source?: HTMLCanvasElement | HTMLImageElement | null;
}

type MappedMaterial = THREE.Material & { map: THREE.Texture };
function hasMaterialMap(mat: THREE.Material): mat is MappedMaterial {
  return (mat as { map?: unknown }).map instanceof THREE.Texture;
}

class SpreadHalfContent implements IPageContent {
  private readonly _spread: SpreadContent;
  private readonly _textureST: THREE.Vector4;

  constructor(spread: SpreadContent, side: 'left' | 'right') {
    this._spread = spread;
    // Left half: show x=[0, 0.5], right half: show x=[0.5, 1]
    this._textureST = side === 'left'
      ? new THREE.Vector4(0.5, 1, 0, 0)
      : new THREE.Vector4(0.5, 1, 0.5, 0);
  }

  get texture(): THREE.Texture { return this._spread.texture; }
  get textureST(): THREE.Vector4 { return this._textureST; }

  isPointOverUI(_textureCoord: THREE.Vector2): boolean { return false; }
  init(_bookContent: BookContent): void {}
  setActive(_active: boolean): void {}
}

/**
 * Returns the 0-indexed page indices where a spread can start.
 * In a staple-bound book, facing page pairs are (1,2), (3,4), (5,6), …
 * — i.e. odd indices where i+1 < pageCount.
 */
export function getSpreadPairs(pageCount: number): number[] {
  const pairs: number[] = [];
  for (let i = 1; i + 1 < pageCount; i += 2) {
    pairs.push(i);
  }
  return pairs;
}

export class SpreadContent {
  readonly canvas: HTMLCanvasElement;
  readonly texts: TextBlock[] = [];
  readonly left: IPageContent;
  readonly right: IPageContent;

  /** Width of a single page in pixels. */
  readonly pageWidth: number;
  /** Height of a single page in pixels. */
  readonly pageHeight: number;

  private readonly ctx: CanvasRenderingContext2D;
  private readonly _texture: THREE.CanvasTexture;
  private _source: HTMLCanvasElement | HTMLImageElement | null;

  get texture(): THREE.Texture { return this._texture; }

  /** The base layer drawn beneath text blocks (full spread width). */
  get source(): HTMLCanvasElement | HTMLImageElement | null { return this._source; }
  set source(v: HTMLCanvasElement | HTMLImageElement | null) { this._source = v; }

  constructor(options?: SpreadContentOptions) {
    this.pageWidth = options?.pageWidth ?? 512;
    this.pageHeight = options?.pageHeight ?? 512;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.pageWidth * 2;
    this.canvas.height = this.pageHeight;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('SpreadContent: could not get 2D context');
    this.ctx = ctx;

    this._source = options?.source ?? null;
    this._texture = new THREE.CanvasTexture(this.canvas);
    this._texture.colorSpace = THREE.SRGBColorSpace;

    this.left = new SpreadHalfContent(this, 'left');
    this.right = new SpreadHalfContent(this, 'right');
  }

  // ── Text API ─────────────────────────────────────────────────────────────

  addText(options?: TextBlockOptions): TextBlock {
    const t = new TextBlock(options);
    this.texts.push(t);
    return t;
  }

  removeText(text: TextBlock): void {
    const idx = this.texts.indexOf(text);
    if (idx !== -1) this.texts.splice(idx, 1);
  }

  /** Update a text block by index. Only provided fields are changed. */
  updateText(index: number, options: Partial<TextBlockOptions>): void {
    const t = this.texts[index];
    if (!t) return;
    if (options.x          !== undefined) t.x          = options.x;
    if (options.y          !== undefined) t.y          = options.y;
    if (options.width      !== undefined) t.width      = options.width;
    if (options.text       !== undefined) t.text       = options.text;
    if (options.fontFamily !== undefined) t.fontFamily = options.fontFamily;
    if (options.fontSize   !== undefined) t.fontSize   = options.fontSize;
    if (options.fontWeight !== undefined) t.fontWeight = options.fontWeight;
    if (options.fontStyle  !== undefined) t.fontStyle  = options.fontStyle;
    if (options.color      !== undefined) t.color      = options.color;
    if (options.lineHeight !== undefined) t.lineHeight = options.lineHeight;
    if (options.textAlign  !== undefined) t.textAlign  = options.textAlign;
    if (options.opacity    !== undefined) t.opacity    = options.opacity;
    if (options.shadowColor !== undefined) t.shadowColor = options.shadowColor;
    if (options.shadowBlur  !== undefined) t.shadowBlur  = options.shadowBlur;
  }

  // ── Per-frame update ─────────────────────────────────────────────────────

  /**
   * Re-composite the canvas: source layer + text blocks.
   * Call every frame (or when content changes).
   *
   * @param root  Optional THREE.Object3D to traverse for texture sync
   *              (needed because three-book clones material textures).
   */
  update(root?: THREE.Object3D): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (this._source) {
      ctx.drawImage(this._source, 0, 0, w, h);
    }

    for (const t of this.texts) t.draw(ctx);

    this._texture.needsUpdate = true;
    if (root) this.syncMaterials(root);
  }

  /**
   * Traverse `root` and set `needsUpdate = true` on every material map whose
   * source image is this spread's canvas.
   */
  syncMaterials(root: THREE.Object3D): void {
    root.traverse((obj: THREE.Object3D) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (hasMaterialMap(mat) && mat.map.image === this.canvas) {
          mat.map.needsUpdate = true;
        }
      }
    });
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  dispose(): void {
    this._texture.dispose();
  }
}

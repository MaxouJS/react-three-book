/**
 * TextOverlayContent — an IPageContent that composites text blocks on top of
 * a source canvas (e.g. a SpriteScene canvas from three-book-theatre).
 *
 * Usage:
 *   const overlay = new TextOverlayContent(512, 512);
 *   overlay.source = spriteScene.canvas;          // set the underlying layer
 *   overlay.addText({ text: 'Hello', x: 20, y: 400, width: 472, fontSize: 28 });
 *   bookContent.pages.push(overlay);
 *
 *   // Per-frame: call update() to re-composite
 *   overlay.update();
 *
 * The update flow:
 *   1. Clear own canvas
 *   2. Draw `source` canvas/image onto own canvas (full size)
 *   3. Draw all text blocks on top
 *   4. Set texture.needsUpdate = true
 *
 * For three-book material sync, pass the book root to syncMaterials() —
 * same pattern as SpriteScene.
 */

import * as THREE from 'three';
import { TextBlock } from './TextBlock';
import type { TextBlockOptions } from './TextBlock';
import type { IPageContent } from './PageContent';
import type { BookContent } from './BookContent';
import { syncMaterialsForCanvas, applyTextBlockOptions } from './textContentUtils';

export interface TextOverlayContentOptions {
  /** Canvas width in pixels (default 512). */
  width?: number;
  /** Canvas height in pixels (default 512). */
  height?: number;
  /** Source canvas or image to draw as the base layer. */
  source?: HTMLCanvasElement | HTMLImageElement | null;
}

export class TextOverlayContent implements IPageContent {
  readonly canvas: HTMLCanvasElement;
  readonly texts: TextBlock[] = [];

  private readonly ctx: CanvasRenderingContext2D;
  private readonly _texture: THREE.CanvasTexture;
  private readonly _textureST = new THREE.Vector4(1, 1, 0, 0);
  private _source: HTMLCanvasElement | HTMLImageElement | null;

  get texture(): THREE.Texture { return this._texture; }
  get textureST(): THREE.Vector4 { return this._textureST; }

  /** The base layer drawn beneath text blocks. */
  get source(): HTMLCanvasElement | HTMLImageElement | null { return this._source; }
  set source(v: HTMLCanvasElement | HTMLImageElement | null) { this._source = v; }

  constructor(options?: TextOverlayContentOptions) {
    const w = options?.width ?? 512;
    const h = options?.height ?? 512;

    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('TextOverlayContent: could not get 2D context');
    this.ctx = ctx;

    this._source = options?.source ?? null;
    this._texture = new THREE.CanvasTexture(this.canvas);
    this._texture.colorSpace = THREE.SRGBColorSpace;
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
    applyTextBlockOptions(t, options);
  }

  // ── Per-frame update ─────────────────────────────────────────────────────

  /**
   * Re-composite the canvas: source layer + text blocks.
   * Call every frame (or when content changes).
   *
   * @param root  Optional THREE.Object3D to traverse for texture sync
   *              (same pattern as SpriteScene — needed because three-book
   *              clones material textures).
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
   * source image is this overlay's canvas.
   */
  syncMaterials(root: THREE.Object3D): void {
    syncMaterialsForCanvas(root, this.canvas);
  }

  // ── IPageContent ─────────────────────────────────────────────────────────

  isPointOverUI(_textureCoord: THREE.Vector2): boolean {
    return false;
  }

  init(_bookContent: BookContent): void {}

  setActive(_active: boolean): void {}

  dispose(): void {
    this._texture.dispose();
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}

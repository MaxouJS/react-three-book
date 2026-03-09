/**
 * Ported from PageContent.cs — IPageContent interface, PageContent base class,
 * SpritePageContent2.
 *
 * In Unity, PageContent extends MonoBehaviour. In Three.js, we use plain
 * classes. "Sprite" maps to a THREE.Texture with optional ST (scale/translate)
 * for atlas cropping.
 */

import * as THREE from 'three';
import type { BookContent } from './BookContent';

// ─────────────────────────────────────────────────────────────────────────────
// IPageContent interface (PageContent.cs lines 8-17)
// ─────────────────────────────────────────────────────────────────────────────

export interface IPageContent {
  readonly texture: THREE.Texture | null;
  readonly textureST: THREE.Vector4;
  isPointOverUI(textureCoord: THREE.Vector2): boolean;
  init(bookContent: BookContent): void;
  setActive(active: boolean): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// PageContent abstract class (PageContent.cs lines 19-70)
// Unity MonoBehaviour → plain class
// ─────────────────────────────────────────────────────────────────────────────

export abstract class PageContent implements IPageContent {
  private m_BookContent: BookContent | null = null;
  private m_IsActive: boolean = false;

  get bookContent(): BookContent | null {
    return this.m_BookContent;
  }

  get isActive(): boolean {
    return this.m_IsActive;
  }

  abstract get texture(): THREE.Texture | null;

  get textureST(): THREE.Vector4 {
    return new THREE.Vector4(1, 1, 0, 0);
  }

  get isShareable(): boolean {
    return true;
  }

  onActiveChangedCallback: (() => void) | null = null;

  protected onInit(): void {}
  protected onActiveChanged(): void {}
  protected onIsPointOverUI(_textureCoord: THREE.Vector2): boolean {
    return false;
  }

  isPointOverUI(textureCoord: THREE.Vector2): boolean {
    return this.onIsPointOverUI(textureCoord);
  }

  init(bookContent: BookContent): void {
    if (!this.isShareable && this.m_BookContent !== null && this.m_BookContent !== bookContent) {
      console.error('The page content is already in use. It can only be assigned to one book content.');
      this.m_BookContent.book?.clear();
    }

    this.m_BookContent = bookContent;
    this.m_IsActive = false;
    this.onInit();
  }

  setActive(active: boolean): void {
    if (this.m_IsActive !== active) {
      this.m_IsActive = active;
      this.onActiveChanged();
      this.onActiveChangedCallback?.();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SpritePageContent2 (PageContent.cs lines 72-106)
// Unity Sprite → THREE.Texture
// ─────────────────────────────────────────────────────────────────────────────

export class SpritePageContent2 implements IPageContent {
  private m_Texture: THREE.Texture | null;
  private m_TextureST: THREE.Vector4;

  constructor(texture: THREE.Texture | null, textureST?: THREE.Vector4) {
    this.m_Texture = texture;
    this.m_TextureST = textureST ?? new THREE.Vector4(1, 1, 0, 0);
  }

  get texture(): THREE.Texture | null {
    return this.m_Texture;
  }

  get textureST(): THREE.Vector4 {
    if (this.m_Texture) return this.m_TextureST;
    return new THREE.Vector4(1, 1, 0, 0);
  }

  isPointOverUI(_textureCoord: THREE.Vector2): boolean {
    return false;
  }

  init(_bookContent: BookContent): void {}

  setActive(_active: boolean): void {}
}

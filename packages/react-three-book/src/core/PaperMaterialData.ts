/**
 * Ported from Book.cs lines ~2880-2918 — PaperMaterialData.
 *
 * In Unity, this wraps MaterialPropertyBlock for per-instance material
 * overrides. In Three.js, we use per-paper material clones with
 * uniform overrides (map, color, textureST).
 */

import * as THREE from 'three';
import type { PaperSetup } from './PaperSetup';
import type { PropertyBlock } from './types';

export class PaperMaterialData {
  private m_Materials1: THREE.Material[];
  private m_Materials3: THREE.Material[];
  private m_Color: THREE.Color;

  // Property block equivalent: stored uniforms per paper
  private m_Texture: THREE.Texture | null = null;
  private m_TextureST: THREE.Vector4 = new THREE.Vector4(1, 1, 0, 0);

  // Cached property block — rebuilt only when dirty
  private _cachedPropertyBlock: PropertyBlock | null = null;
  private _propertyBlockDirty: boolean = true;

  get materials1(): THREE.Material[] {
    return this.m_Materials1;
  }

  get materials3(): THREE.Material[] {
    return this.m_Materials3;
  }

  get color(): THREE.Color {
    return this.m_Color;
  }

  get texture(): THREE.Texture | null {
    return this.m_Texture;
  }

  get textureST(): THREE.Vector4 {
    return this.m_TextureST;
  }

  constructor(paperSetup: PaperSetup) {
    const material = paperSetup.material ?? new THREE.MeshStandardMaterial();

    // materials1: array of 1 material (for single-submesh papers)
    this.m_Materials1 = [material.clone()];
    // materials3: array of 3 materials (front, back, border)
    this.m_Materials3 = [material.clone(), material.clone(), material.clone()];

    this.m_Color = paperSetup.color.clone();
  }

  /**
   * Mirrors Unity's MaterialPropertyBlock: stores color, texture, and textureST.
   * Paper.ts reads this after calling updatePropertyBlock.
   *
   * Returns a cached object — callers must NOT mutate the returned values.
   */
  get propertyBlock(): PropertyBlock {
    if (this._propertyBlockDirty || this._cachedPropertyBlock === null) {
      this._cachedPropertyBlock = {
        color: this.m_Color.clone(),
        map: this.m_Texture,
        textureST: this.m_TextureST.clone(),
      };
      this._propertyBlockDirty = false;
    }
    return this._cachedPropertyBlock;
  }

  updatePropertyBlock(texture: THREE.Texture | null, textureST: THREE.Vector4): void {
    this.m_Texture = texture;
    this.m_TextureST.copy(textureST);
    this._propertyBlockDirty = true;
  }
}

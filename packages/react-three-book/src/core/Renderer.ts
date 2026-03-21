/**
 * Ported from Book.cs lines ~1798-2125:
 *   - MeshFactory (lines 1798-1838)
 *   - RendererFactory (lines 1840-1951)
 *   - Renderer (lines 1953-2082)
 *   - PaperMeshDataPool (lines 2084-2125)
 *
 * Unity MeshRenderer + MeshFilter + MeshCollider → THREE.Mesh
 * Faithful line-by-line port.
 */

import * as THREE from 'three';
import { PaperMeshData } from './PaperMeshData';
import type { PaperPattern } from './PaperPattern';
import type { PropertyBlock, IPaperRenderer } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// MeshFactory (Book.cs lines 1798-1838)
// ─────────────────────────────────────────────────────────────────────────────

export class MeshFactory {
  private m_UsedMeshs: THREE.BufferGeometry[] = [];
  private m_FreeMeshs: THREE.BufferGeometry[] = [];
  private m_Meshs: Set<THREE.BufferGeometry> = new Set();

  get(): THREE.BufferGeometry {
    let mesh: THREE.BufferGeometry;
    if (this.m_FreeMeshs.length > 0) {
      mesh = this.m_FreeMeshs.pop()!;
    } else {
      mesh = new THREE.BufferGeometry();
      this.m_Meshs.add(mesh);
    }
    this.m_UsedMeshs.push(mesh);
    return mesh;
  }

  recycle(): void {
    for (const mesh of this.m_UsedMeshs) {
      // Clear geometry data
      mesh.deleteAttribute('position');
      mesh.deleteAttribute('normal');
      mesh.deleteAttribute('uv');
      mesh.setIndex(null);
      mesh.clearGroups();
      this.m_FreeMeshs.push(mesh);
    }
    this.m_UsedMeshs.length = 0;
  }

  destroy(): void {
    for (const mesh of this.m_Meshs) {
      mesh.dispose();
    }
    this.m_Meshs.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RendererFactory (Book.cs lines 1840-1951)
// ─────────────────────────────────────────────────────────────────────────────

export class RendererFactory {
  private m_Root: THREE.Object3D;
  private m_UsedRenderers: BookRenderer[] = [];
  private m_FreeRenderers: BookRenderer[] = [];
  private m_Renderers: Set<BookRenderer> = new Set();
  private m_Ids: number[] = [];

  get ids(): number[] {
    return [...this.m_Ids];
  }

  constructor(root: THREE.Object3D) {
    this.m_Root = root;
  }

  get(name: string): BookRenderer {
    let renderer: BookRenderer;
    if (this.m_FreeRenderers.length > 0) {
      renderer = this.m_FreeRenderers.pop()!;
      renderer.reset(name);
    } else {
      renderer = new BookRenderer(this.m_Root, name);
      this.m_Renderers.add(renderer);
    }
    this.m_UsedRenderers.push(renderer);
    this.m_Ids.push(renderer.id);
    return renderer;
  }

  recycle(): void {
    for (const renderer of this.m_UsedRenderers) {
      renderer.clear();
      this.m_FreeRenderers.push(renderer);
    }
    this.m_UsedRenderers.length = 0;
    this.m_Ids.length = 0;
  }

  destroy(): void {
    for (const renderer of this.m_Renderers) {
      renderer.destroy();
    }
    this.m_Renderers.clear();
  }

  getBounds(): THREE.Box3 {
    const bounds = new THREE.Box3();
    let first = true;

    for (const renderer of this.m_UsedRenderers) {
      if (first) {
        bounds.copy(renderer.bounds);
        first = false;
      } else {
        bounds.union(renderer.bounds);
      }
    }

    return bounds;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderer (Book.cs lines 1953-2082)
// Unity: GameObject + MeshRenderer + MeshFilter → Three.js: THREE.Mesh
// ─────────────────────────────────────────────────────────────────────────────

let nextRendererId = 1;

type MapCapableMaterial = THREE.Material & {
  map: THREE.Texture | null;
  needsUpdate: boolean;
};

type ColorCapableMaterial = THREE.Material & {
  color: THREE.Color;
};

interface ManagedTextureState {
  source: THREE.Texture;
  texture: THREE.Texture;
  stKey: string;
}

export class BookRenderer implements IPaperRenderer {
  private m_Object3D: THREE.Object3D;
  private m_Mesh: THREE.Mesh;
  private m_Visibility: boolean = true;
  private m_Id: number;

  // Per-material-index property blocks (uniforms)
  private m_PropertyBlocks: Map<number, PropertyBlock> = new Map();
  private m_MaterialTextures: Map<number, ManagedTextureState> = new Map();

  get bounds(): THREE.Box3 {
    const box = new THREE.Box3();
    if (this.m_Mesh.geometry) {
      this.m_Mesh.geometry.computeBoundingBox();
      if (this.m_Mesh.geometry.boundingBox) {
        box.copy(this.m_Mesh.geometry.boundingBox);
        box.applyMatrix4(this.m_Mesh.matrixWorld);
      }
    }
    return box;
  }

  get id(): number {
    return this.m_Id;
  }

  get transform(): THREE.Object3D {
    return this.m_Object3D;
  }

  get visibility(): boolean {
    return this.m_Visibility;
  }

  get castShadows(): boolean {
    return this.m_Mesh.castShadow;
  }

  set castShadows(value: boolean) {
    this.m_Mesh.castShadow = value;
  }

  get mesh(): THREE.BufferGeometry | null {
    return this.m_Mesh.geometry ?? null;
  }

  set mesh(value: THREE.BufferGeometry | null) {
    if (value) {
      this.m_Mesh.geometry = value;
    }
  }

  get meshObject(): THREE.Mesh {
    return this.m_Mesh;
  }

  constructor(root: THREE.Object3D, name: string) {
    this.m_Id = nextRendererId++;
    this.m_Object3D = new THREE.Object3D();
    this.m_Object3D.name = name;

    this.m_Mesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial(),
    );
    this.m_Object3D.add(this.m_Mesh);
    root.add(this.m_Object3D);
  }

  setMaterials(materials: THREE.Material | THREE.Material[]): void {
    this.disposeManagedTextures();
    this.disposeCurrentMaterials();

    if (Array.isArray(materials)) {
      if (materials.length === 0) {
        this.m_Mesh.material = new THREE.MeshStandardMaterial();
      } else if (materials.length === 1) {
        this.m_Mesh.material = materials[0].clone();
      } else {
        // Clone each material so per-paper setPropertyBlock doesn't
        // bleed across renderers (replaces Unity's MaterialPropertyBlock).
        this.m_Mesh.material = materials.map((m) => m.clone());
      }
    } else {
      this.m_Mesh.material = materials.clone();
    }

    this.m_PropertyBlocks.clear();
  }

  setPropertyBlock(properties: PropertyBlock, materialIndex: number): void {
    this.m_PropertyBlocks.set(materialIndex, properties);
    // Apply texture/color from property block to the appropriate material
    const mat = this.getMaterial(materialIndex);
    if (!mat) return;

    if (this.isMapCapable(mat)) {
      if (properties.map instanceof THREE.Texture) {
        this.applyTextureProperty(
          mat,
          materialIndex,
          properties.map,
          properties.textureST,
        );
      } else {
        this.clearMaterialTexture(materialIndex, mat);
      }
    }

    if (this.isColorCapable(mat)) {
      mat.color.copy(properties.color);
    }
  }

  reset(name: string): void {
    this.m_Object3D.name = name;
    this.setVisibility(true);
    this.m_Mesh.geometry.dispose();
    this.m_Mesh.geometry = new THREE.BufferGeometry();
    this.setMaterials([]);
  }

  clear(): void {
    this.m_Object3D.name = '';
    this.m_Mesh.geometry.dispose();
    this.m_Mesh.geometry = new THREE.BufferGeometry();
    this.m_PropertyBlocks.clear();
    this.setVisibility(false);
    this.m_Object3D.position.set(0, 0, 0);
    this.m_Object3D.rotation.set(0, 0, 0);
    this.m_Object3D.scale.set(1, 1, 1);
  }

  destroy(): void {
    this.disposeManagedTextures();
    this.disposeCurrentMaterials();
    if (this.m_Mesh.geometry) this.m_Mesh.geometry.dispose();
    if (this.m_Object3D.parent) {
      this.m_Object3D.parent.remove(this.m_Object3D);
    }
  }

  setVisibility(visibility: boolean): void {
    if (this.m_Visibility === visibility) return;
    this.m_Visibility = visibility;
    this.m_Object3D.visible = visibility;
  }

  private getMaterial(materialIndex: number): THREE.Material | null {
    if (Array.isArray(this.m_Mesh.material)) {
      return this.m_Mesh.material[materialIndex] ?? null;
    }
    return this.m_Mesh.material;
  }

  private isMapCapable(material: THREE.Material): material is MapCapableMaterial {
    return 'map' in material;
  }

  private isColorCapable(material: THREE.Material): material is ColorCapableMaterial {
    return 'color' in material && (material as Partial<ColorCapableMaterial>).color instanceof THREE.Color;
  }

  private getSTKey(st?: THREE.Vector4): string {
    if (!st) return '1,1,0,0';
    return `${st.x.toFixed(6)},${st.y.toFixed(6)},${st.z.toFixed(6)},${st.w.toFixed(6)}`;
  }

  private applyTextureProperty(
    material: MapCapableMaterial,
    materialIndex: number,
    sourceTexture: THREE.Texture,
    st?: THREE.Vector4,
  ): void {
    const stKey = this.getSTKey(st);
    const existing = this.m_MaterialTextures.get(materialIndex);
    if (
      existing &&
      existing.source === sourceTexture &&
      existing.stKey === stKey
    ) {
      if (material.map !== existing.texture) {
        material.map = existing.texture;
        material.needsUpdate = true;
      }
      return;
    }

    this.clearManagedTexture(materialIndex);

    // Clone texture so repeat/offset don't bleed across materials.
    const texture = sourceTexture.clone();
    texture.needsUpdate = true;

    if (st) {
      // Apply Unity _MainTex_ST (scaleX, scaleY, offsetX, offsetY)
      texture.repeat.set(st.x, st.y);
      texture.offset.set(st.z, st.w);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
    }

    material.map = texture;
    material.needsUpdate = true;
    this.m_MaterialTextures.set(materialIndex, {
      source: sourceTexture,
      texture,
      stKey,
    });
  }

  private clearMaterialTexture(
    materialIndex: number,
    material: MapCapableMaterial,
  ): void {
    this.clearManagedTexture(materialIndex);
    if (material.map !== null) {
      material.map = null;
      material.needsUpdate = true;
    }
  }

  private clearManagedTexture(materialIndex: number): void {
    const existing = this.m_MaterialTextures.get(materialIndex);
    if (!existing) return;
    existing.texture.dispose();
    this.m_MaterialTextures.delete(materialIndex);
  }

  private disposeManagedTextures(): void {
    for (const state of this.m_MaterialTextures.values()) {
      state.texture.dispose();
    }
    this.m_MaterialTextures.clear();
  }

  private disposeCurrentMaterials(): void {
    const materials = Array.isArray(this.m_Mesh.material)
      ? this.m_Mesh.material
      : [this.m_Mesh.material];
    for (const material of materials) {
      material.dispose();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PaperMeshDataPool (Book.cs lines 2084-2125)
// ─────────────────────────────────────────────────────────────────────────────

export class PaperMeshDataPool {
  private m_Stack: PaperMeshData[] = [];
  private m_MeshFactory: MeshFactory;
  private m_Pattern: PaperPattern;
  private m_SharedData: PaperMeshData | null = null;
  private m_UseSharedData: boolean;

  constructor(meshFactory: MeshFactory, pattern: PaperPattern, useSharedData: boolean = false) {
    this.m_MeshFactory = meshFactory;
    this.m_Pattern = pattern;
    if ((this.m_UseSharedData = useSharedData)) {
      this.m_SharedData = new PaperMeshData(this.m_MeshFactory.get(), this.m_Pattern);
      this.m_SharedData.updateMesh();
    }
  }

  get(): PaperMeshData {
    if (this.m_UseSharedData) return this.m_SharedData!;

    if (this.m_Stack.length > 0) {
      return this.m_Stack.pop()!;
    }

    return new PaperMeshData(this.m_MeshFactory.get(), this.m_Pattern);
  }

  free(mesh: PaperMeshData): void {
    if (this.m_UseSharedData) throw new Error('Not implemented');
    this.m_Stack.push(mesh);
  }
}

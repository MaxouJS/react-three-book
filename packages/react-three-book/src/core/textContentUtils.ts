/**
 * Shared utilities for canvas-based page content classes
 * (TextOverlayContent, SpreadContent).
 */

import * as THREE from 'three';
import type { TextBlock } from './TextBlock';
import type { TextBlockOptions } from './TextBlock';

// ── Material type guard ──────────────────────────────────────────────────────

export type MappedMaterial = THREE.Material & { map: THREE.Texture };

export function hasMaterialMap(mat: THREE.Material): mat is MappedMaterial {
  return (mat as { map?: unknown }).map instanceof THREE.Texture;
}

// ── Material sync ────────────────────────────────────────────────────────────

/**
 * Traverse `root` and set `needsUpdate = true` on every material map whose
 * source image matches the given canvas.
 *
 * This compensates for three-book's Renderer cloning textures on first
 * assignment — cloned textures share the same `image` reference but won't
 * pick up the `needsUpdate` flag from the original CanvasTexture.
 */
export function syncMaterialsForCanvas(
  root: THREE.Object3D,
  canvas: HTMLCanvasElement,
): void {
  root.traverse((obj: THREE.Object3D) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    if (Array.isArray(mesh.material)) {
      for (const mat of mesh.material) {
        if (hasMaterialMap(mat) && mat.map.image === canvas) {
          mat.map.needsUpdate = true;
        }
      }
    } else {
      const mat = mesh.material;
      if (hasMaterialMap(mat) && mat.map.image === canvas) {
        mat.map.needsUpdate = true;
      }
    }
  });
}

// ── Text block options ───────────────────────────────────────────────────────

/**
 * Apply a partial set of TextBlockOptions onto an existing TextBlock.
 * Only provided (non-undefined) fields are written.
 */
export function applyTextBlockOptions(
  block: TextBlock,
  options: Partial<TextBlockOptions>,
): void {
  if (options.x          !== undefined) block.x          = options.x;
  if (options.y          !== undefined) block.y          = options.y;
  if (options.width      !== undefined) block.width      = options.width;
  if (options.text       !== undefined) block.text       = options.text;
  if (options.fontFamily !== undefined) block.fontFamily = options.fontFamily;
  if (options.fontSize   !== undefined) block.fontSize   = options.fontSize;
  if (options.fontWeight !== undefined) block.fontWeight = options.fontWeight;
  if (options.fontStyle  !== undefined) block.fontStyle  = options.fontStyle;
  if (options.color      !== undefined) block.color      = options.color;
  if (options.lineHeight !== undefined) block.lineHeight = options.lineHeight;
  if (options.textAlign  !== undefined) block.textAlign  = options.textAlign;
  if (options.opacity    !== undefined) block.opacity    = options.opacity;
  if (options.shadowColor !== undefined) block.shadowColor = options.shadowColor;
  if (options.shadowBlur  !== undefined) block.shadowBlur  = options.shadowBlur;
}

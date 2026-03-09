/**
 * Minimal TextureUtility — ported from the portions of TextureUtility.cs
 * that are used by the Paper class (ST flip operations).
 * Unity-specific texture creation is omitted.
 */

import * as THREE from 'three';

/**
 * Flip the X axis of a texture ST vector.
 * ST format: (scaleX, scaleY, offsetX, offsetY)
 */
export function xFlipST(st: THREE.Vector4): THREE.Vector4 {
  return new THREE.Vector4(-st.x, st.y, st.z + st.x, st.w);
}

/**
 * Flip the Y axis of a texture ST vector.
 */
export function yFlipST(st: THREE.Vector4): THREE.Vector4 {
  return new THREE.Vector4(st.x, -st.y, st.z, st.w + st.y);
}

/**
 * Return a fallback texture if input is null.
 * In Unity this returns Texture2D.whiteTexture; here we return a 1x1 white texture.
 */
let _whiteTexture: THREE.Texture | null = null;

export function fixNull(texture: THREE.Texture | null): THREE.Texture {
  if (texture !== null) return texture;

  if (_whiteTexture === null) {
    const data = new Uint8Array([255, 255, 255, 255]);
    const dt = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    dt.needsUpdate = true;
    _whiteTexture = dt;
  }

  return _whiteTexture;
}

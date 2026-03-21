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

import * as THREE from 'three';

/**
 * Transforms a ray by a matrix.
 *
 * The original C# uses Matrix4x4.MultiplyPoint3x4 which applies the full
 * affine transform (rotation + scale + translation) but ignores the
 * projective row. THREE.Vector3.applyMatrix4 does the same for affine
 * matrices (w is assumed 1 and the perspective divide is a no-op).
 *
 * Returns a new THREE.Ray with the transformed origin and direction.
 */
export function transformRay(
  ray: THREE.Ray,
  matrix: THREE.Matrix4,
): THREE.Ray {
  const a = ray.origin.clone().applyMatrix4(matrix);
  const b = ray.origin.clone().add(ray.direction).applyMatrix4(matrix);
  return new THREE.Ray(a, b.sub(a));
}

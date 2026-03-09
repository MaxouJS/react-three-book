import * as THREE from 'three';

/**
 * Evaluates a quadratic Bezier curve at parameter t.
 *
 * B(t) = (1-t)^2 * p0 + 2*(1-t)*t * p1 + t^2 * p2
 */
export function evaluate(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  t: number,
): THREE.Vector3 {
  const i = 1 - t;
  // i*i * p0 + 2*i*t * p1 + t*t * p2
  return new THREE.Vector3(
    i * i * p0.x + 2 * i * t * p1.x + t * t * p2.x,
    i * i * p0.y + 2 * i * t * p1.y + t * t * p2.y,
    i * i * p0.z + 2 * i * t * p1.z + t * t * p2.z,
  );
}

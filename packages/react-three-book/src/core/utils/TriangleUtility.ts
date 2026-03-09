import * as THREE from 'three';

/**
 * Computes the normal of a triangle defined by vertices a, b, c.
 *
 * This is a faithful port of the original C# implementation which manually
 * normalises the edge vectors before computing the cross product, then
 * normalises the result. This differs from a simple (b-a).cross(c-a).normalize()
 * and is preserved exactly.
 */
export function getNormal(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  out: THREE.Vector3 = new THREE.Vector3(),
): THREE.Vector3 {
  let abx = b.x - a.x;
  let aby = b.y - a.y;
  let abz = b.z - a.z;
  let m = 1 / Math.sqrt(abx * abx + aby * aby + abz * abz);
  abx *= m;
  aby *= m;
  abz *= m;

  let acx = c.x - a.x;
  let acy = c.y - a.y;
  let acz = c.z - a.z;
  m = 1 / Math.sqrt(acx * acx + acy * acy + acz * acz);
  acx *= m;
  acy *= m;
  acz *= m;

  const x = aby * acz - abz * acy;
  const y = abz * acx - abx * acz;
  const z = abx * acy - aby * acx;
  m = 1 / Math.sqrt(x * x + y * y + z * z);

  return out.set(x * m, y * m, z * m);
}

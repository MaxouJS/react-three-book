import * as THREE from 'three';

// ---------------------------------------------------------------------------
// QuadraticEquation (faithful port of the C# struct)
// ---------------------------------------------------------------------------

interface QuadraticEquationResult {
  rootCount: number;
  root0: number;
  root1: number;
}

function solveQuadratic(
  a: number,
  b: number,
  c: number,
): QuadraticEquationResult {
  const delta = b * b - 4 * a * c;
  if (delta < 0) {
    return { rootCount: 0, root0: 0, root1: 0 };
  } else if (delta === 0) {
    // NOTE: The original C# had `root0 = -b / 2 * a` which was parsed as
    // `(-b / 2) * a` due to operator precedence. Fixed to the correct
    // quadratic formula: x = -b / (2a).
    return { rootCount: 1, root0: (-b) / (2 * a), root1: 0 };
  } else {
    const s = Math.sqrt(delta);
    return {
      rootCount: 2,
      root0: (-b + s) / (2 * a),
      root1: (-b - s) / (2 * a),
    };
  }
}

// ---------------------------------------------------------------------------
// EllipseUtility (faithful port)
// ---------------------------------------------------------------------------

/**
 * Clamps a point to the surface of an ellipse if it lies outside.
 * (Note: the original C# method was named "Calmp" -- a typo preserved here
 * in the comment but corrected in the exported function name.)
 */
export function clamp(
  point: THREE.Vector2,
  ellipseCenter: THREE.Vector2,
  ellipseSize: THREE.Vector2,
): THREE.Vector2 {
  if (isPointInside(point, ellipseCenter, ellipseSize)) return point.clone();

  return linecast(
    new THREE.Vector2(point.x, ellipseCenter.y),
    point,
    ellipseCenter,
    ellipseSize,
  );
}

function isPointInside(
  point: THREE.Vector2,
  ellipseCenter: THREE.Vector2,
  ellipseSize: THREE.Vector2,
): boolean {
  // Original C# uses Vector3 for `dir` but only .x, .y, .magnitude are used.
  // We replicate: dir = point - ellipseCenter, then dir.y *= ratio, check magnitude.
  const dx = point.x - ellipseCenter.x;
  let dy = point.y - ellipseCenter.y;
  dy *= ellipseSize.x / ellipseSize.y;
  // magnitude of (dx, dy, 0) in the original C# (Vector3) is just sqrt(dx*dx + dy*dy)
  const magnitude = Math.sqrt(dx * dx + dy * dy);
  return magnitude < ellipseSize.x;
}

function linecast(
  lineStart: THREE.Vector2,
  lineEnd: THREE.Vector2,
  ellipseCenter: THREE.Vector2,
  ellipseSize: THREE.Vector2,
): THREE.Vector2 {
  const h = ellipseCenter.x;
  const k = ellipseCenter.y;

  const x1 = lineStart.x;
  const y1 = lineStart.y;
  const x2 = lineEnd.x;
  const y2 = lineEnd.y;

  const a = ellipseSize.x;
  const b = ellipseSize.y;

  const A = 1 / (a * a);
  const B = 1 / (b * b);

  if (Math.abs(x1 - x2) < 1e-5) {
    if (x1 >= h - a && x1 <= h + a) {
      const e = solveQuadratic(
        B,
        -2 * B * k,
        A * (x1 * x1 - 2 * h * x1 + h * h) + B * k * k - 1,
      );

      if (e.rootCount === 1) {
        return new THREE.Vector2(x1, e.root0);
      } else if (e.rootCount === 2) {
        let r0 = e.root0;
        let r1 = e.root1;
        if (y1 < y2) {
          [r0, r1] = [r1, r0];
        }
        // Original C# returns p1 (root1 after potential swap)
        return new THREE.Vector2(x1, r1);
      }
    }
  } else {
    const m = (y2 - y1) / (x2 - x1);
    const c = y1 - m * x1;
    const w = c - k;
    const e = solveQuadratic(
      A + B * m * m,
      2 * w * m * B - 2 * h * A,
      h * h * A + w * w * B - 1,
    );
    if (e.rootCount === 1) {
      return new THREE.Vector2(e.root0, m * e.root0 + c);
    } else if (e.rootCount === 2) {
      let r0 = e.root0;
      let r1 = e.root1;
      if (x1 < x2) {
        [r0, r1] = [r1, r0];
      }
      // Original C# returns p1 (root1 after potential swap)
      return new THREE.Vector2(r1, m * r1 + c);
    }
  }

  return lineStart.clone();
}

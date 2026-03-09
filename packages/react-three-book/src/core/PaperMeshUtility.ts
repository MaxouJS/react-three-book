import * as THREE from 'three';
import { PaperSeam, PaperBorder } from './PaperStructs';
import { PaperNode } from './PaperNode';
import { PaperUVMargin } from './PaperUVMargin';
import { BookDirection } from './BookDirection';

// ─────────────────────────────────────────────────────────────────────────────
// PaperMeshUtility  (ported from Book.cs lines ~2511-2878)
//
// Static helper class with mesh generation methods: seam interpolation,
// face generation, border geometry, UV texcoord generation, wireframe debug.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Unity's `Mathf.InverseLerp(a, b, value)` — returns `(value - a) / (b - a)`
 * clamped to [0, 1].
 */
function inverseLerp(a: number, b: number, value: number): number {
  if (a === b) return 0;
  const t = (value - a) / (b - a);
  return Math.max(0, Math.min(1, t));
}

// ─────────────────────────────────────────────────────────────────────────────
// Seam helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a list of seam-flagged PaperNodes into PaperSeam objects.
 *
 * Ported from `PaperMeshUtility.SeamNodesToSeams` (lines ~2513-2523).
 */
export function seamNodesToSeams(
  seamNodes: PaperNode[],
  seams: PaperSeam[],
): void {
  for (const node of seamNodes) {
    const prevNode = node.prevNoneSeam;
    const nextNode = node.nextNoneSeam;
    const t = inverseLerp(prevNode.value, nextNode.value, node.value);
    const seam = new PaperSeam(prevNode.index, node.index, nextNode.index, t);
    seams.push(seam);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// X/Z seam interpolation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Interpolates seam vertices along the X axis.
 *
 * When `useSlerp` is false, uses `THREE.Vector3.lerp`.
 * When `useSlerp` is true, uses `THREE.Vector3.slerp` (for normals).
 *
 * Ported from `PaperMeshUtility.UpdateXSeams` (lines ~2525-2542).
 *
 * `vertices` is a flat `number[]` of packed Vector3-like objects at indices
 * matching the C# `Vector3[]` layout. However, in the calling code
 * (PaperMeshData) we work with THREE.Vector3 arrays, so we accept
 * `THREE.Vector3[]` and mutate in place.
 */
export function updateXSeams(
  seams: PaperSeam[],
  vertices: THREE.Vector3[],
  nX: number,
  nZ: number,
  useSlerp: boolean,
): void {
  for (const seam of seams) {
    if (!seam.active) return;

    for (let z = 0; z < nZ; z++) {
      const iPrev = seam.prevIndex;
      const iNext = seam.nextIndex;

      const a = vertices[z * nX + iPrev];
      const b = vertices[z * nX + iNext];
      const p = vertices[z * nX + seam.index];
      if (useSlerp) {
        // THREE.Vector3 doesn't have slerp natively, so use manual slerp
        // matching Unity's Vector3.Slerp behaviour.
        vec3Slerp(a, b, seam.time, p);
      } else {
        p.copy(a).lerp(b, seam.time);
      }
    }
  }
}

/**
 * Interpolates seam vertices along the Z axis.
 *
 * Ported from `PaperMeshUtility.UpdateZSeams` (lines ~2544-2560).
 */
export function updateZSeams(
  seams: PaperSeam[],
  vertices: THREE.Vector3[],
  nX: number,
  _nZ: number,
  useSlerp: boolean,
): void {
  for (const seam of seams) {
    if (!seam.active) return;

    for (let x = 0; x < nX; x++) {
      const iPrev = seam.prevIndex;
      const iNext = seam.nextIndex;
      const a = vertices[iPrev * nX + x];
      const b = vertices[iNext * nX + x];
      const p = vertices[seam.index * nX + x];
      if (useSlerp) {
        vec3Slerp(a, b, seam.time, p);
      } else {
        p.copy(a).lerp(b, seam.time);
      }
    }
  }
}

/**
 * Unity's `Vector3.Slerp` — spherical linear interpolation between two vectors.
 * Uses the standard formula: slerp(a, b, t) = sin((1-t)*theta)/sin(theta) * a + sin(t*theta)/sin(theta) * b
 * Falls back to lerp when vectors are nearly parallel.
 */
function vec3Slerp(
  a: THREE.Vector3,
  b: THREE.Vector3,
  t: number,
  out: THREE.Vector3 = new THREE.Vector3(),
): THREE.Vector3 {
  const la = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  const lb = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z);
  if (la === 0 || lb === 0) {
    return out.copy(a).lerp(b, t);
  }

  const anx = a.x / la;
  const any = a.y / la;
  const anz = a.z / la;
  const bnx = b.x / lb;
  const bny = b.y / lb;
  const bnz = b.z / lb;

  let dot = anx * bnx + any * bny + anz * bnz;
  dot = Math.max(-1, Math.min(1, dot));

  const theta = Math.acos(dot);

  if (theta < 1e-6) {
    return out.copy(a).lerp(b, t);
  }

  const sinTheta = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sinTheta;
  const wb = Math.sin(t * theta) / sinTheta;

  const len = la + (lb - la) * t;

  return out.set(
    (anx * wa + bnx * wb) * len,
    (any * wa + bny * wb) * len,
    (anz * wa + bnz * wb) * len,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Border geometry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adds border triangles and texcoords for each PaperBorder.
 *
 * Ported from `PaperMeshUtility.AddBorders` (lines ~2563-2645).
 */
export function addBorders(
  borders: PaperBorder[],
  triangles: number[],
  texcoords: THREE.Vector2[],
  nX: number,
  nZ: number,
): void {
  for (const border of borders) {
    const nX2 = (border.endX - border.startX + 1) * 2;
    const nZ2 = (border.endZ - border.startZ + 1) * 2;

    const iV = texcoords.length;

    for (let i = 0, n = border.endX - border.startX; i < n; i++) {
      const a = iV + i * 2 + 0;
      const b = iV + i * 2 + 1;
      const c = iV + i * 2 + 2;
      const d = iV + i * 2 + 3;

      if (border.flip) add2BackFaces(triangles, a, b, c, d, nX2);
      else add2FrontFaces(triangles, a, b, c, d, nX2);
    }

    if (border.left) {
      for (let i = 0, n = border.endZ - border.startZ; i < n; i++) {
        const a = iV + i * 2 + 0 + nX2 * 2;
        const b = iV + i * 2 + 1 + nX2 * 2;
        const c = iV + i * 2 + 2 + nX2 * 2;
        const d = iV + i * 2 + 3 + nX2 * 2;

        if (border.flip) add2BackFaces(triangles, a, b, c, d, nZ2);
        else add2FrontFaces(triangles, a, b, c, d, nZ2);
      }
    } else {
      for (let i = 0, n = border.endZ - border.startZ; i < n; i++) {
        const a = iV + i * 2 + 0 + nX2 * 2 + nZ2;
        const b = iV + i * 2 + 1 + nX2 * 2 + nZ2;
        const c = iV + i * 2 + 2 + nX2 * 2 + nZ2;
        const d = iV + i * 2 + 3 + nX2 * 2 + nZ2;

        if (border.flip) addBackFace(triangles, a, b, c, d);
        else addFrontFace(triangles, a, b, c, d);
      }
    }

    const nXZ = nX * nZ;
    for (let i = border.startX; i <= border.endX; i++) {
      const j = border.startZ * nX + i;
      texcoords.push(texcoords[j].clone());
      texcoords.push(texcoords[j + nXZ].clone());
    }

    for (let i = border.startX; i <= border.endX; i++) {
      const j = i + border.endZ * nX;
      texcoords.push(texcoords[j + nXZ].clone());
      texcoords.push(texcoords[j].clone());
    }

    for (let i = border.startZ; i <= border.endZ; i++) {
      const j = border.startX + i * nX;
      texcoords.push(texcoords[j + nXZ].clone());
      texcoords.push(texcoords[j].clone());
    }

    for (let i = border.startZ; i <= border.endZ; i++) {
      const j = i * nX + border.endX;
      texcoords.push(texcoords[j].clone());
      texcoords.push(texcoords[j + nXZ].clone());
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UpdateBorders (runtime per-frame)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates border vertex positions and normals each frame.
 *
 * Ported from `PaperMeshUtility.UpdateBorders` (lines ~2647-2705).
 */
export function updateBorders(
  borders: PaperBorder[],
  vertices: THREE.Vector3[],
  normals: THREE.Vector3[],
  nX: number,
  nZ: number,
): void {
  const baseVertexCount = nX * nZ;
  let vertexIndex = baseVertexCount * 2;
  const n = new THREE.Vector3();
  for (const border of borders) {
    for (let i = border.startX; i <= border.endX; i++) {
      const j = i + border.startZ * nX;
      const v = vertices[j];
      const v2 = vertices[j + nX];
      n.subVectors(v, v2).normalize();
      if (border.flip) n.multiplyScalar(-1);
      normals[vertexIndex].copy(n);
      vertices[vertexIndex++].copy(v);
      normals[vertexIndex].copy(n);
      vertices[vertexIndex++].copy(vertices[j + baseVertexCount]);
    }

    for (let i = border.startX; i <= border.endX; i++) {
      const j = i + border.endZ * nX;
      const v = vertices[j + baseVertexCount];
      const v2 = vertices[j + baseVertexCount - nX];
      n.subVectors(v, v2).normalize();
      if (border.flip) n.multiplyScalar(-1);
      normals[vertexIndex].copy(n);
      vertices[vertexIndex++].copy(v);
      normals[vertexIndex].copy(n);
      vertices[vertexIndex++].copy(vertices[j]);
    }

    for (let i = border.startZ; i <= border.endZ; i++) {
      const j = i * nX + border.startX;
      const v = vertices[j + baseVertexCount];
      const v2 = vertices[j + baseVertexCount + 1];
      n.subVectors(v, v2).normalize();
      if (border.flip) n.multiplyScalar(-1);
      normals[vertexIndex].copy(n);
      vertices[vertexIndex++].copy(v);
      normals[vertexIndex].copy(n);
      vertices[vertexIndex++].copy(vertices[j]);
    }

    for (let i = border.startZ; i <= border.endZ; i++) {
      const j = i * nX + border.endX;
      const v = vertices[j];
      const v2 = vertices[j - 1];
      n.subVectors(v, v2).normalize();
      if (border.flip) n.multiplyScalar(-1);
      normals[vertexIndex].copy(n);
      vertices[vertexIndex++].copy(v);
      normals[vertexIndex].copy(n);
      vertices[vertexIndex++].copy(vertices[j + baseVertexCount]);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DebugDrawBorders  (debug / editor only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Debug draws border edges in world space. In Three.js, callers can use
 * THREE.LineSegments or a helper to visualise these.
 *
 * Returns pairs of [start, end] line segment positions in world space.
 *
 * Ported from `PaperMeshUtility.DebugDrawBorders` (lines ~2707-2747).
 */
export function debugDrawBorders(
  borders: PaperBorder[],
  vertices: THREE.Vector3[],
  nX: number,
  _nZ: number,
  matrix: THREE.Matrix4,
): Array<[THREE.Vector3, THREE.Vector3]> {
  const lines: Array<[THREE.Vector3, THREE.Vector3]> = [];
  for (const border of borders) {
    for (let i = border.startX; i < border.endX; i++) {
      const j = i + border.startZ * nX;
      const a = vertices[j].clone().applyMatrix4(matrix);
      const b = vertices[j + 1].clone().applyMatrix4(matrix);
      lines.push([a, b]);
    }

    for (let i = border.startX; i < border.endX; i++) {
      const j = i + border.endZ * nX;
      const a = vertices[j].clone().applyMatrix4(matrix);
      const b = vertices[j + 1].clone().applyMatrix4(matrix);
      lines.push([a, b]);
    }

    for (let i = border.startZ; i < border.endZ; i++) {
      const j = i * nX + border.startX;
      const j2 = (i + 1) * nX + border.startX;
      const a = vertices[j].clone().applyMatrix4(matrix);
      const b = vertices[j2].clone().applyMatrix4(matrix);
      lines.push([a, b]);
    }

    for (let i = border.startZ; i < border.endZ; i++) {
      const j = i * nX + border.endX;
      const j2 = (i + 1) * nX + border.endX;
      const a = vertices[j].clone().applyMatrix4(matrix);
      const b = vertices[j2].clone().applyMatrix4(matrix);
      lines.push([a, b]);
    }
  }
  return lines;
}

// ─────────────────────────────────────────────────────────────────────────────
// Face index helpers (private)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adds two front faces (offset by `offset`).
 *
 * Ported from `PaperMeshUtility.Add2FrontFaces` (lines ~2750-2758).
 */
function add2FrontFaces(
  triangles: number[],
  a: number,
  b: number,
  c: number,
  d: number,
  offset: number,
): void {
  addFrontFace(triangles, a, b, c, d);
  a += offset;
  b += offset;
  c += offset;
  d += offset;
  addFrontFace(triangles, a, b, c, d);
}

/**
 * Adds two back faces (offset by `offset`).
 *
 * Ported from `PaperMeshUtility.Add2BackFaces` (lines ~2760-2768).
 */
function add2BackFaces(
  triangles: number[],
  a: number,
  b: number,
  c: number,
  d: number,
  offset: number,
): void {
  addBackFace(triangles, a, b, c, d);
  a += offset;
  b += offset;
  c += offset;
  d += offset;
  addBackFace(triangles, a, b, c, d);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public face helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adds a front face and its matching back face (offset by `offset`).
 *
 * Ported from `PaperMeshUtility.AddFrontAndBackFaces` (lines ~2770-2778).
 */
export function addFrontAndBackFaces(
  frontTriangles: number[],
  backTriangles: number[],
  a: number,
  b: number,
  c: number,
  d: number,
  offset: number,
): void {
  addFrontFace(frontTriangles, a, b, c, d);
  a += offset;
  b += offset;
  c += offset;
  d += offset;
  addBackFace(backTriangles, a, b, c, d);
}

/**
 * Generates front and (duplicated) back UV texcoords.
 *
 * Ported from `PaperMeshUtility.AddFrontAndBackTexcoords` (lines ~2780-2815).
 */
export function addFrontAndBackTexcoords(
  texcoords: THREE.Vector2[],
  xList: number[],
  zList: number[],
  size: THREE.Vector2,
  uvMargin: PaperUVMargin,
  direction: BookDirection,
): void {
  const uStart = uvMargin.left * size.x;
  const uEnd = (1 - uvMargin.right) * size.x;
  const vStart = uvMargin.down * size.y;
  const vEnd = (1 - uvMargin.up) * size.y;

  const nX = xList.length;
  const nZ = zList.length;

  if ((direction as number) > 1) {
    for (let z = 0; z < nZ; z++) {
      for (let x = 0; x < nX; x++) {
        const u = inverseLerp(uEnd, uStart, xList[x]);
        const v = inverseLerp(vEnd, vStart, zList[z]);
        texcoords.push(new THREE.Vector2(v, u));
      }
    }
  } else {
    for (let z = 0; z < nZ; z++) {
      for (let x = 0; x < nX; x++) {
        const u = inverseLerp(uStart, uEnd, xList[x]);
        const v = inverseLerp(vEnd, vStart, zList[z]);
        texcoords.push(new THREE.Vector2(u, v));
      }
    }
  }

  // Duplicate the texcoords for the back face (C#: texcoords.AddRange(texcoords))
  const frontTexcoordCount = texcoords.length;
  for (let i = 0; i < frontTexcoordCount; i++) {
    texcoords.push(texcoords[i].clone());
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Primitive face helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Appends 6 indices for a front-facing quad (a, c, b, b, c, d).
 *
 * Ported from `PaperMeshUtility.AddFrontFace` (lines ~2817-2825).
 * Original C# winding preserved — material indices are swapped in
 * Paper.updateMaterials to compensate for Three.js handedness.
 */
function addFrontFace(triangles: number[], a: number, b: number, c: number, d: number): void {
  triangles.push(a);
  triangles.push(c);
  triangles.push(b);
  triangles.push(b);
  triangles.push(c);
  triangles.push(d);
}

/**
 * Appends 6 indices for a back-facing quad (a, b, c, b, d, c).
 *
 * Ported from `PaperMeshUtility.AddBackFace` (lines ~2827-2835).
 * Original C# winding preserved.
 */
function addBackFace(triangles: number[], a: number, b: number, c: number, d: number): void {
  triangles.push(a);
  triangles.push(b);
  triangles.push(c);
  triangles.push(b);
  triangles.push(d);
  triangles.push(c);
}

// ─────────────────────────────────────────────────────────────────────────────
// DrawWireframe (debug / editor only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns wireframe quad data for debug visualisation.
 * In Unity this used Handles; in Three.js, callers can use THREE.LineSegments.
 *
 * Ported from `PaperMeshUtility.DrawWireframe` (lines ~2838-2877).
 */
export function drawWireframe(
  vertices: THREE.Vector3[],
  nX: number,
  nZ: number,
  matrix: THREE.Matrix4,
): Array<[THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3]> {
  const quads: Array<[THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3]> = [];

  for (let z = 0; z < nZ - 1; z++) {
    for (let x = 0; x < nX - 1; x++) {
      let a = vertices[z * nX + x].clone();
      let b = vertices[z * nX + x + 1].clone();
      let c = vertices[(z + 1) * nX + x].clone();
      let d = vertices[(z + 1) * nX + x + 1].clone();

      //c d
      //a b

      a.applyMatrix4(matrix);
      b.applyMatrix4(matrix);
      c.applyMatrix4(matrix);
      d.applyMatrix4(matrix);

      quads.push([a, b, c, d]);
    }
  }

  return quads;
}

import * as THREE from 'three';
import { PaperPattern } from './PaperPattern';
import { getNormal } from './utils/TriangleUtility';
import {
  updateXSeams,
  updateZSeams,
  updateBorders,
  drawWireframe,
} from './PaperMeshUtility';

// ─────────────────────────────────────────────────────────────────────────────
// PaperMeshData  (ported from Book.cs lines ~2127-2263)
//
// Manages a single paper sheet mesh.  The mesh has:
//   - Front vertices      [0 .. baseVertexCount)
//   - Back vertices       [baseVertexCount .. baseVertexCount*2)
//   - Border vertices     [baseVertexCount*2 .. vertexCount)
//
// Unity `Mesh` is mapped to `THREE.BufferGeometry` with position, normal and
// uv attributes.  Unity submeshes (front/back/border) become geometry groups.
// ─────────────────────────────────────────────────────────────────────────────

export class PaperMeshData {
  private m_Geometry: THREE.BufferGeometry;
  private m_Pattern: PaperPattern;
  private m_BaseVertices: THREE.Vector3[];
  private m_Vertices: THREE.Vector3[];
  private m_Normals: THREE.Vector3[];

  public get geometry(): THREE.BufferGeometry {
    return this.m_Geometry;
  }

  public get pattern(): PaperPattern {
    return this.m_Pattern;
  }

  public get baseVertices(): THREE.Vector3[] {
    return this.m_BaseVertices;
  }

  constructor(geometry: THREE.BufferGeometry, pattern: PaperPattern) {
    this.m_Pattern = pattern;
    this.m_BaseVertices = new Array<THREE.Vector3>(pattern.baseVertexCount);
    for (let i = 0; i < pattern.baseVertexCount; i++) {
      this.m_BaseVertices[i] = new THREE.Vector3();
    }
    this.m_Vertices = new Array<THREE.Vector3>(pattern.vertexCount);
    for (let i = 0; i < pattern.vertexCount; i++) {
      this.m_Vertices[i] = new THREE.Vector3();
    }
    this.m_Normals = new Array<THREE.Vector3>(pattern.vertexCount);
    for (let i = 0; i < pattern.vertexCount; i++) {
      this.m_Normals[i] = new THREE.Vector3();
    }

    this.m_Geometry = geometry;

    // --- Build index buffer and groups (Unity submeshes) ---
    if (this.m_Pattern.subMeshCount === 1) {
      // Single submesh: all triangles combined
      const indexArray = new Uint32Array(pattern.triangles);
      this.m_Geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));
      this.m_Geometry.addGroup(0, pattern.triangles.length, 0);
    } else {
      // Three submeshes: front (0), back (1), border (2)
      const totalCount =
        pattern.frontTriangles.length +
        pattern.backTriangles.length +
        pattern.borderTriangles.length;
      const indexArray = new Uint32Array(totalCount);
      let offset = 0;

      // Submesh 0: front
      indexArray.set(pattern.frontTriangles, offset);
      this.m_Geometry.addGroup(offset, pattern.frontTriangles.length, 0);
      offset += pattern.frontTriangles.length;

      // Submesh 1: back
      indexArray.set(pattern.backTriangles, offset);
      this.m_Geometry.addGroup(offset, pattern.backTriangles.length, 1);
      offset += pattern.backTriangles.length;

      // Submesh 2: border
      indexArray.set(pattern.borderTriangles, offset);
      this.m_Geometry.addGroup(offset, pattern.borderTriangles.length, 2);

      this.m_Geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));
    }

    // --- Create position, normal, and uv attribute buffers ---
    const positionBuffer = new Float32Array(pattern.vertexCount * 3);
    const normalBuffer = new Float32Array(pattern.vertexCount * 3);
    const uvBuffer = new Float32Array(pattern.vertexCount * 2);

    // Fill UV buffer from pattern.texcoords
    for (let i = 0; i < pattern.texcoords.length; i++) {
      uvBuffer[i * 2] = pattern.texcoords[i].x;
      uvBuffer[i * 2 + 1] = pattern.texcoords[i].y;
    }

    this.m_Geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positionBuffer, 3),
    );
    this.m_Geometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(normalBuffer, 3),
    );
    this.m_Geometry.setAttribute(
      'uv',
      new THREE.BufferAttribute(uvBuffer, 2),
    );

    this.updateBaseVertices();
  }

  // ── UpdateBaseVertices ──────────────────────────────────────────────────

  /**
   * Recalculates base vertex positions from the pattern's X/Z arrays
   * and offset.
   *
   * Ported from lines ~2167-2183.
   */
  public updateBaseVertices(): void {
    const baseVertices = this.m_BaseVertices;
    const baseXArray = this.m_Pattern.baseXArray;
    const baseZArray = this.m_Pattern.baseZArray;
    const baseXOffset = this.m_Pattern.baseXOffset;
    const nX = baseXArray.length;
    const nZ = baseZArray.length;
    let i = 0;
    for (let z = 0; z < nZ; z++) {
      for (let x = 0; x < nX; x++) {
        baseVertices[i++].set(baseXArray[x] + baseXOffset, 0, baseZArray[z]);
      }
    }
  }

  // ── UpdateMesh ─────────────────────────────────────────────────────────

  /**
   * Recomputes all vertex positions and normals.
   *
   * Algorithm:
   * 1. Clear normals for all base vertices.
   * 2. Interpolate seam positions in X and Z.
   * 3. Accumulate face normals per quad onto each vertex.
   * 4. Normalise by dividing by weight and re-normalising.
   * 5. Interpolate seam normals (with slerp).
   * 6. Offset front/back by +/- halfThickness along normal.
   * 7. Update border vertex positions and normals.
   * 8. Push data into BufferGeometry attributes.
   *
   * Ported from lines ~2185-2255.
   */
  public updateMesh(): void {
    const baseVertices = this.m_BaseVertices;
    const vertices = this.m_Vertices;
    const normals = this.m_Normals;
    const weights = this.m_Pattern.weights;
    const nX = this.m_Pattern.baseXArray.length;
    const nZ = this.m_Pattern.baseZArray.length;
    const baseVertexCount = this.m_Pattern.baseVertexCount;
    const faceNormalA = new THREE.Vector3();
    const faceNormalD = new THREE.Vector3();
    const faceNormalSum = new THREE.Vector3();

    // Array.Clear(normals, 0, baseVertexCount)
    for (let i = 0; i < baseVertexCount; i++) {
      normals[i].set(0, 0, 0);
    }

    updateXSeams(this.m_Pattern.xSeams, baseVertices, nX, nZ, false);
    updateZSeams(this.m_Pattern.zSeams, baseVertices, nX, nZ, false);

    // Accumulate face normals
    for (let z = 0; z < nZ - 1; z++) {
      const zNext = z + 1;

      for (let x = 0; x < nX - 1; x++) {
        const xNext = x + 1;

        const a = z * nX + x;
        const b = z * nX + xNext;
        const c = zNext * nX + x;
        const d = zNext * nX + xNext;

        const pa = baseVertices[a];
        const pb = baseVertices[b];
        const pc = baseVertices[c];
        const pd = baseVertices[d];

        getNormal(pa, pc, pb, faceNormalA);
        getNormal(pd, pb, pc, faceNormalD);

        faceNormalSum.addVectors(faceNormalA, faceNormalD);
        normals[a].add(faceNormalSum);
        normals[b].add(faceNormalSum);
        normals[c].add(faceNormalSum);
        normals[d].add(faceNormalSum);
      }
    }

    // Normalise by weight
    for (let i = 0; i < baseVertexCount; i++) {
      normals[i].divideScalar(weights[i]).normalize();
    }

    // Interpolate seam normals (with slerp)
    updateXSeams(this.m_Pattern.xSeams, normals, nX, nZ, true);
    updateZSeams(this.m_Pattern.zSeams, normals, nX, nZ, true);

    // Apply thickness offset: front = base + normal * halfThickness,
    //                          back  = base - normal * halfThickness
    const halfThickness = this.m_Pattern.thickness / 2;
    for (let i = 0; i < baseVertexCount; i++) {
      const normal = normals[i];
      normals[i + baseVertexCount].copy(normal).negate();
      const vertex = baseVertices[i];
      vertices[i].copy(vertex).addScaledVector(normal, halfThickness);
      vertices[i + baseVertexCount].copy(vertex).addScaledVector(normal, -halfThickness);
    }

    // Update borders
    updateBorders(this.m_Pattern.borders, vertices, normals, nX, nZ);

    // Push updated data into the BufferGeometry
    const posAttr = this.m_Geometry.getAttribute(
      'position',
    ) as THREE.BufferAttribute;
    const nrmAttr = this.m_Geometry.getAttribute(
      'normal',
    ) as THREE.BufferAttribute;

    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i];
      posAttr.setXYZ(i, v.x, v.y, v.z);
      const n = normals[i];
      nrmAttr.setXYZ(i, n.x, n.y, n.z);
    }

    posAttr.needsUpdate = true;
    nrmAttr.needsUpdate = true;

    this.m_Geometry.computeBoundingBox();
    this.m_Geometry.computeBoundingSphere();
  }

  // ── DrawWireframe (debug) ──────────────────────────────────────────────

  /**
   * Returns wireframe quad data for debug visualisation.
   *
   * Ported from lines ~2257-2262.
   */
  public drawWireframe(
    matrix: THREE.Matrix4,
  ): Array<[THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3]> {
    const nX = this.m_Pattern.baseXArray.length;
    const nZ = this.m_Pattern.baseZArray.length;
    return drawWireframe(this.m_Vertices, nX, nZ, matrix);
  }
}

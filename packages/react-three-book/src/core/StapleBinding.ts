import * as THREE from 'three';
import { evaluate as bezierEvaluate } from './utils/BezierUtility';
import {
  nextIndex as loopNextIndex,
  prevIndex as loopPrevIndex,
} from './utils/LoopUtility';
import { PaperPattern } from './PaperPattern';
import { PaperNode } from './PaperNode';
import { PaperNodeMargin, PaperBorder } from './PaperStructs';
import { PaperUVMargin } from './PaperUVMargin';
import {
  seamNodesToSeams,
  addFrontAndBackFaces,
  addBorders,
  addFrontAndBackTexcoords,
} from './PaperMeshUtility';
import { BookBinding, BookBound } from './BookBinding';
import { BookHeightException } from './Book';
import type { Book } from './Book';
import type { Paper } from './Paper';
import type { RendererFactory, MeshFactory } from './Renderer';
import type { BookDirection } from './BookDirection';
import { clamp, clamp01, lerp, inverseLerp, DEG2RAD, RAD2DEG } from './mathUtils';

// ─────────────────────────────────────────────────────────────────────────────
// StapleSetup  (ported from StapleBookBinding.cs lines ~799-888)
// ─────────────────────────────────────────────────────────────────────────────

const kMinThickness = 0.01;
const kMaxThickness = 0.1;
const kMinCrown = 0.04;
const kMaxCrown = 0.4;
const kMinCount = 2;
const kMaxCount = 10;
const kMinQuality = 0;
const kMaxQuality = 5;

// Unity Quaternion.LookRotation(forward, up):
// +Z points to `forward`, +Y aligns with `up`.
function lookRotation(forward: THREE.Vector3, up: THREE.Vector3): THREE.Quaternion {
  const z = forward.clone().normalize();
  if (z.lengthSq() === 0) return new THREE.Quaternion();

  let x = new THREE.Vector3().crossVectors(up, z);
  if (x.lengthSq() === 0) {
    const fallbackUp = Math.abs(z.y) < 0.999
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
    x = new THREE.Vector3().crossVectors(fallbackUp, z);
  }
  x.normalize();

  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

export class StapleSetup {
  private _material: THREE.Material | null = null;
  private _color: THREE.Color = new THREE.Color(1, 1, 1);
  private _thickness: number = 0.05;
  private _crown: number = 0.2;
  private _margin: number = 0.1;
  private _count: number = 4;
  private _quality: number = 3;

  get material(): THREE.Material | null {
    return this._material;
  }
  set material(value: THREE.Material | null) {
    this._material = value;
  }

  get color(): THREE.Color {
    return this._color;
  }
  set color(value: THREE.Color) {
    this._color = value;
  }

  get thickness(): number {
    return this._thickness;
  }
  set thickness(value: number) {
    this._thickness = clamp(value, kMinThickness, kMaxThickness);
  }

  get margin(): number {
    return this._margin;
  }
  set margin(value: number) {
    this._margin = clamp01(value);
  }

  get crown(): number {
    return this._crown;
  }
  set crown(value: number) {
    this._crown = clamp(value, kMinCrown, kMaxCrown);
  }

  get count(): number {
    return this._count;
  }
  set count(value: number) {
    this._count = clamp(value, kMinCount, kMaxCount);
  }

  get quality(): number {
    return this._quality;
  }
  set quality(value: number) {
    this._quality = clamp(value, kMinQuality, kMaxQuality);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// StapleBookBound  (ported from StapleBookBinding.cs class StapleBookBound)
// ─────────────────────────────────────────────────────────────────────────────

export class StapleBookBound extends BookBound {
  /** Discriminant property for runtime type checks (avoids constructor.name). */
  override readonly bindingType = 'staple' as const;

  /** The Three.js Mesh for the staple geometry. */
  public stapleMesh: THREE.Mesh;

  private m_StapleMargin: number = 0;
  private m_StapleThickness: number = 0;

  private m_BindingRadius: number = 0;
  private m_BindingMidSpace: number = 0;
  private m_StackHeight: number = 0;
  private m_BindingVertexCount: number = 0;

  private m_Quality: number;

  // ── Properties matching C# abstract overrides ─────────────────────────

  /** C#: `useSharedMeshDataForLowpoly => false` */
  public readonly useSharedMeshDataForLowpoly: boolean = false;

  /** Adapter that wraps the THREE.Mesh in a BookRenderer-compatible shape. */
  private _binderRendererAdapter: StapleRendererAdapter | null = null;

  get binderRenderer(): StapleRendererAdapter {
    if (!this._binderRendererAdapter) {
      this._binderRendererAdapter = new StapleRendererAdapter(this.stapleMesh);
    }
    return this._binderRendererAdapter;
  }

  // ── Constructor ────────────────────────────────────────────────────────

  constructor(
    quality: number,
    stapleSetup: StapleSetup,
    book: Book,
    root: THREE.Object3D,
    stapleMaterial?: THREE.Material,
  ) {
    super(book, root);
    this.m_Quality = quality;

    if (book.totalThickness * 1.25 > book.minPaperWidth) {
      throw new BookHeightException();
    }

    const coverSetup = this.m_Book.coverPaperSetup;
    const paperSetup = this.m_Book.pagePaperSetup;

    // Build staple mesh
    const stapleGeometry = new THREE.BufferGeometry();
    this.updateStapleMesh(stapleSetup, stapleGeometry);

    // Material — use provided or a default metallic material
    const mat =
      stapleMaterial ??
      new THREE.MeshStandardMaterial({
        color: stapleSetup.color,
        metalness: 0.9,
        roughness: 0.3,
      });

    this.stapleMesh = new THREE.Mesh(stapleGeometry, mat);
    this.stapleMesh.name = 'Staple';
    this.stapleMesh.castShadow = this.m_Book.castShadows;
    root.add(this.stapleMesh);
    this.stapleMesh.position.set(
      0,
      0,
      this.m_StapleMargin + paperSetup.margin + coverSetup.margin,
    );

    let minTurningRadius = coverSetup.thickness;
    minTurningRadius = Math.max(this.m_BindingRadius, minTurningRadius);

    for (const paper of this.m_Book.papers) {
      const size = paper.size.clone();
      size.x -= this.m_BindingRadius;
      paper.sizeXOffset = this.m_BindingRadius;
      paper.size = size;
      paper.setMinTurningRadius(minTurningRadius);
      paper.updateTurningRadius();
      this.updatePaperPosition(paper);
    }

    this.updateRootPosition();
  }

  // ── updateStapleMesh ──────────────────────────────────────────────────

  private updateStapleMesh(
    stapleSetup: StapleSetup,
    geometry: THREE.BufferGeometry,
  ): void {
    this.m_StapleThickness = stapleSetup.thickness;

    this.m_StackHeight = this.m_Book.totalThickness;

    this.m_BindingMidSpace = this.m_StapleThickness * 1.75;

    this.m_BindingRadius =
      ((this.m_StackHeight + this.m_BindingMidSpace) / 2) /
      Math.sin(45 * DEG2RAD);
    this.m_StackHeight += this.m_BindingMidSpace;

    let crown = stapleSetup.crown;
    crown = Math.max(crown, this.m_StapleThickness * 4);

    const minMargin = this.m_StapleThickness * 0.5;
    const maxMargin = Math.max(
      this.m_Book.minPaperHeight / 2 - crown - minMargin,
      minMargin,
    );

    this.m_StapleMargin = lerp(minMargin, maxMargin, stapleSetup.margin);

    const length = this.m_Book.minPaperHeight - this.m_StapleMargin * 2;
    let stapleCount = stapleSetup.count;
    let space = (length - crown * stapleCount) / (stapleCount - 1);
    space = Math.max(space, 0);
    while (space < this.m_StapleThickness * 2 && stapleCount > 2) {
      stapleCount--;
      space = (length - crown * stapleCount) / (stapleCount - 1);
      space = Math.max(space, 0);
    }

    const qualityTime = stapleSetup.quality / 5;
    const basePointCount = Math.floor(lerp(4, 20, qualityTime));
    const cornerPointCount0 = Math.floor(lerp(4, 10, qualityTime));
    const cornerPointCount1 = Math.floor(lerp(3, 10, qualityTime));
    const baseRadius = this.m_StapleThickness / 2;
    const teethH = baseRadius * 2.5;
    const teethT = 0.9;
    const cornerRadius0 = baseRadius * 1.0;
    let cornerRadius1 = (crown / 2) * teethT;
    cornerRadius1 = Math.max(cornerRadius1, cornerRadius0 * 2);
    let leg = 0;
    leg += this.m_Book.totalThickness / 2;
    leg += baseRadius;
    const xOffset = -(this.m_Book.papers[0].thickness / 2 + baseRadius);

    // Build the base tube points (one half of the staple profile)
    const baseTubePoints: THREE.Vector3[] = [];
    {
      for (let i = 0; i < cornerPointCount0; i++) {
        const t = i / (cornerPointCount0 - 1);
        const zAngle = lerp(-90, -180, t);
        // Quaternion.Euler(0, z, 0) * new Vector3(0, 0, cornerRadius0)
        // Y-axis rotation of (0,0,cornerRadius0):
        //   x = cornerRadius0 * sin(z*DEG2RAD) [actually -sin for Unity convention]
        //   but let's match Unity exactly:
        //   Quaternion.Euler(0, yDeg, 0) applied to (0,0,r) gives:
        //     x = r * sin(yDeg * DEG2RAD)
        //     y = 0
        //     z = r * cos(yDeg * DEG2RAD)
        const yRad = zAngle * DEG2RAD;
        const p = new THREE.Vector3(
          cornerRadius0 * Math.sin(yRad),
          0,
          cornerRadius0 * Math.cos(yRad),
        );
        p.x += cornerRadius0;
        p.z += cornerRadius0;
        p.x += xOffset;
        baseTubePoints.push(p);
      }

      const a = new THREE.Vector3(leg, 0, 0);
      const b = new THREE.Vector3(leg + teethH * 0.75, 0, 0);
      const c = new THREE.Vector3(leg - baseRadius * 0.5, 0, cornerRadius1);

      for (let i = 0; i < cornerPointCount1; i++) {
        const t = i / (cornerPointCount1 - 1);
        const p = bezierEvaluate(a, b, c, t);
        p.x += xOffset;
        baseTubePoints.push(p);
      }

      baseTubePoints.reverse();
    }

    // Build base circle cross-section
    const baseCircle: THREE.Vector3[] = new Array(basePointCount);
    for (let i = 0; i < basePointCount; i++) {
      const zAngle = 90 - i * (360 / basePointCount);
      // Quaternion.Euler(0, 0, z) * Vector3.right
      // Z-axis rotation of (1,0,0):
      //   x = cos(z*DEG2RAD), y = sin(z*DEG2RAD), z = 0
      const rad = zAngle * DEG2RAD;
      baseCircle[i] = new THREE.Vector3(Math.cos(rad), Math.sin(rad), 0);
      baseCircle[i].x *= 0.75;
    }

    const n = baseTubePoints.length;
    const n3 = n * basePointCount;
    const baseVertices: THREE.Vector3[] = new Array(n3 * 2);
    const baseNormals: THREE.Vector3[] = new Array(n3 * 2);
    const baseTriangles: number[] = new Array(
      (n3 * 2 - 1) * basePointCount * 2 * 3,
    );
    // Initialise vertex/normal arrays with zero vectors
    for (let i = 0; i < n3 * 2; i++) {
      baseVertices[i] = new THREE.Vector3();
      baseNormals[i] = new THREE.Vector3();
    }
    let w = 0;

    for (let i = 0; i < n; i++) {
      const prev = baseTubePoints[loopPrevIndex(i, n)];
      const current = baseTubePoints[i];
      const next = baseTubePoints[loopNextIndex(i, n)];

      let forward: THREE.Vector3;

      if (i === 0) {
        // forward = new Vector3(1, 0, -2.0f).normalized;
        forward = new THREE.Vector3(1, 0, -2.0).normalize();
      } else if (i === n - 1) {
        // forward = Vector3.forward;  — Unity (0,0,1)
        forward = new THREE.Vector3(0, 0, 1);
      } else {
        const d1 = current.clone().sub(prev).normalize();
        const d2 = next.clone().sub(current).normalize();
        forward = d1.add(d2).multiplyScalar(0.5);
      }

      const upward = new THREE.Vector3(0, 1, 0); // Vector3.up

      const q = lookRotation(forward, upward);

      const w2 = w;

      let t2 = inverseLerp(0, cornerPointCount1 / 4, i);
      t2 = lerp(0.1, 1, t2);
      t2 = Math.sqrt(t2);

      for (let j = 0; j < basePointCount; j++) {
        const normal = baseCircle[j]
          .clone()
          .applyQuaternion(q)
          .multiplyScalar(t2);
        const vertex = current.clone().add(normal.clone().multiplyScalar(baseRadius));

        baseVertices[w] = vertex;
        baseNormals[w] = normal.clone();

        // Mirrored side: vertex2 = current + normal * baseRadius; vertex2.z = crown - vertex2.z
        const vertex2 = current.clone().add(normal.clone().multiplyScalar(baseRadius));
        vertex2.z = crown - vertex2.z;

        const jj = w2 + basePointCount - j - 1;
        const ii = n3 * 2 - jj - 1;

        baseVertices[ii] = vertex2;
        baseNormals[ii] = normal.clone();

        w++;
      }
    }

    // Build triangle indices for the tube
    let jjj = 0;
    const n2 = baseTubePoints.length * 2;
    for (let i = 0; i < n2 - 1; i++) {
      const iCurrent = i * basePointCount;
      const iNext = (i + 1) * basePointCount;
      for (let j = 0; j < basePointCount; j++) {
        const jNext = loopNextIndex(j, basePointCount);

        const a = iCurrent + j;
        const b = iCurrent + jNext;
        const c = iNext + jNext;
        const d = iNext + j;

        baseTriangles[jjj++] = a;
        baseTriangles[jjj++] = d;
        baseTriangles[jjj++] = b;
        baseTriangles[jjj++] = b;
        baseTriangles[jjj++] = d;
        baseTriangles[jjj++] = c;
      }
    }

    // Combine all staple copies
    const vertices: THREE.Vector3[] = [...baseVertices];
    const normals: THREE.Vector3[] = [...baseNormals];
    const triangles: number[] = [...baseTriangles];

    // Clone baseVertices/baseTriangles arrays for mutation during copies
    const bvCopy = baseVertices.map((v) => v.clone());
    const btCopy = [...baseTriangles];

    for (let i = 0; i < stapleCount - 1; i++) {
      const vc = bvCopy.length;
      for (let j = 0; j < btCopy.length; j++) {
        btCopy[j] += vc;
      }

      for (let j = 0; j < bvCopy.length; j++) {
        bvCopy[j].z += space + crown;
      }

      vertices.push(...bvCopy.map((v) => v.clone()));
      normals.push(...baseNormals.map((v) => v.clone()));
      triangles.push(...btCopy);
    }

    // Convert to BufferGeometry
    const posAttr = new Float32Array(vertices.length * 3);
    const normAttr = new Float32Array(normals.length * 3);
    for (let i = 0; i < vertices.length; i++) {
      posAttr[i * 3] = vertices[i].x;
      posAttr[i * 3 + 1] = vertices[i].y;
      posAttr[i * 3 + 2] = vertices[i].z;
      normAttr[i * 3] = normals[i].x;
      normAttr[i * 3 + 1] = normals[i].y;
      normAttr[i * 3 + 2] = normals[i].z;
    }

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(posAttr, 3),
    );
    geometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(normAttr, 3),
    );
    geometry.setIndex(triangles);
  }

  // ── createPaperPattern ────────────────────────────────────────────────

  public createPaperPattern(
    quality: number,
    size: THREE.Vector2,
    thickness: number,
    uvMargin: PaperUVMargin,
    reduceOverdraw: boolean,
    reduceSubMeshes: boolean,
  ): PaperPattern {
    const pattern = new PaperPattern();
    pattern.size = size;
    pattern.thickness = thickness;

    const bindingRadius = this.m_BindingRadius;
    pattern.baseXOffset = -bindingRadius;

    const subdivideBindingAreaX = this.m_Quality + 1;
    this.m_BindingVertexCount = subdivideBindingAreaX;

    const qualityTime = quality / 5;
    const s = Math.min(size.x, size.y) / 60;
    const subdivideMainAreaX = Math.floor(
      lerp(0, (size.x - bindingRadius) / s, qualityTime),
    );
    const subdivideZ = Math.floor(lerp(0, size.y / s, qualityTime));

    let nX = 2 + subdivideMainAreaX + 1 + subdivideBindingAreaX;
    let nZ = 2 + subdivideZ;

    // Build X node chain
    const xRootNode = new PaperNode(0);
    let xCurrentNode = xRootNode;
    const xStep1 = bindingRadius / subdivideBindingAreaX;
    let xValue = 0;
    for (let i = 1; i < subdivideBindingAreaX + 1; i++) {
      xCurrentNode = xCurrentNode.createNext(xValue);
      xValue += xStep1;
    }
    const xStep2 = (size.x - bindingRadius) / (subdivideMainAreaX + 1);
    for (let i = subdivideBindingAreaX + 1; i < nX; i++) {
      xCurrentNode = xCurrentNode.createNext(xValue);
      xValue += xStep2;
    }

    // Build Z node chain
    const zRootNode = new PaperNode(0);
    let zCurrentNode = zRootNode;
    const zStep = size.y / (nZ - 1);
    let zValue = 0;
    for (let i = 0; i < nZ - 1; i++) {
      zValue += zStep;
      zCurrentNode = zCurrentNode.createNext(zValue);
    }

    const xSeamNodes: PaperNode[] = [];
    const zSeamNodes: PaperNode[] = [];

    const margin = uvMargin.clone();

    if (reduceOverdraw) {
      let ci = 0;
      if (this.m_Book.hasCover) {
        ci = Math.floor(this.m_Book.coverPaperCount / 2);
      }

      const w = Math.max(0.01, thickness);

      margin.left = 0;
      margin.right =
        (this.getPX(ci + 1, thickness) - this.getPX(ci, thickness) + w) /
        size.x;

      margin.down = w / size.y;
      margin.up = w / size.y;
    }

    const uvNodeMargin = new PaperNodeMargin(pattern, margin, false);
    uvNodeMargin.insert(xRootNode, zRootNode, xSeamNodes, zSeamNodes);

    xRootNode.updateIndex(0);
    zRootNode.updateIndex(0);

    seamNodesToSeams(xSeamNodes, pattern.xSeams);
    seamNodesToSeams(zSeamNodes, pattern.zSeams);

    const n = this.m_BindingVertexCount + 2;
    const xNoneSeamIndexes: number[] = new Array(n);
    pattern.xNoneSeamIndexes = xNoneSeamIndexes;
    xCurrentNode = xRootNode;
    for (let i = 0; i < n; i++) {
      xNoneSeamIndexes[i] = xCurrentNode.index;
      do {
        xCurrentNode = xCurrentNode.next!;
      } while (xCurrentNode.seam);
    }

    const xList = xRootNode.getValues();
    const zList = zRootNode.getValues();

    nX = xList.length;
    nZ = zList.length;

    const baseVertexCount = nX * nZ;

    const texcoords: THREE.Vector2[] = [];
    const weights: number[] = new Array(baseVertexCount).fill(0);
    const frontTriangles: number[] = [];
    const backTriangles: number[] = [];
    const borderTriangles: number[] = [];
    const borders: PaperBorder[] = [];

    addFrontAndBackTexcoords(
      texcoords,
      xList,
      zList,
      size,
      uvMargin,
      this.m_Book.direction as BookDirection,
    );

    const xHoleStart = uvNodeMargin.leftNode.index;
    const zHoleStart = uvNodeMargin.downNode.index;

    let xHoleEnd = uvNodeMargin.rightNode.index;
    let zHoleEnd = uvNodeMargin.upNode.index;

    if (xHoleEnd === 0) xHoleEnd = nX - 1;
    if (zHoleEnd === 0) zHoleEnd = nZ - 1;

    for (let z = 0; z < nZ - 1; z++) {
      for (let x = 0; x < nX - 1; x++) {
        if (reduceOverdraw) {
          if (
            z >= zHoleStart &&
            z < zHoleEnd &&
            x >= xHoleStart &&
            x < xHoleEnd
          )
            continue;
        }

        const a = z * nX + x;
        const b = z * nX + (x + 1);
        const c = (z + 1) * nX + x;
        const d = (z + 1) * nX + (x + 1);

        weights[a] += 2;
        weights[b] += 2;
        weights[c] += 2;
        weights[d] += 2;

        addFrontAndBackFaces(
          frontTriangles,
          backTriangles,
          a,
          b,
          c,
          d,
          baseVertexCount,
        );
      }
    }

    borders.push(new PaperBorder(0, 0, nX - 1, nZ - 1, false, false));

    addBorders(borders, borderTriangles, texcoords, nX, nZ);

    pattern.baseXArray = xList;
    pattern.baseZArray = zList;
    pattern.baseVertexCount = baseVertexCount;
    pattern.vertexCount = texcoords.length;
    pattern.texcoords = texcoords;
    pattern.weights = weights;

    if (reduceSubMeshes) {
      pattern.subMeshCount = 1;
      const triangles: number[] = [];
      triangles.push(...frontTriangles);
      triangles.push(...borderTriangles);
      triangles.push(...backTriangles);
      pattern.triangles = triangles;
    } else {
      pattern.subMeshCount = 3;
      pattern.frontTriangles = frontTriangles;
      pattern.backTriangles = backTriangles;
      pattern.borderTriangles = borderTriangles;
    }
    pattern.borders = borders;

    return pattern;
  }

  // ── updateRootPosition ────────────────────────────────────────────────

  private updateRootPosition(): void {
    const papers = this.m_Book.papers;
    const y0 = papers[0].transform.position.y;
    const y1 = papers[papers.length - 1].transform.position.y;
    let h = -Math.min(y0, y1);
    h += papers[0].thickness / 2;
    this.m_Root.position.set(0, h, this.m_Root.position.z);
  }

  // ── resetPaperPosition ────────────────────────────────────────────────

  public resetPaperPosition(paper: Paper): void {
    const papers = this.m_Book.papers;
    const paperCount = papers.length;
    let th = 0;
    const midIndex0 = papers.length / 2 - 1;
    const midIndex1 = papers.length / 2;
    for (let j = 0; j < paperCount; j++) {
      const paper2 = papers[j];
      paper2.updateTime();
      const zTime = paper2.zTime;
      const thickness = paper2.thickness;
      th += zTime * thickness;

      if (j === midIndex0) {
        th += zTime * this.m_BindingMidSpace / 2;
      }

      if (j === midIndex1) {
        th += zTime * this.m_BindingMidSpace / 2;
      }
    }

    let h = this.getStackHeight(paper.index) - paper.thickness / 2;
    const rightStackZ = this.getStackZ(h);
    const leftStackZ = 180 + rightStackZ;
    let t = paper.isFlipped ? 1 : 0;
    let z = lerp(rightStackZ, leftStackZ, t);
    // Quaternion.Euler(0, 0, z) * Vector3.right * m_BindingRadius
    const zRad = z * DEG2RAD;
    const p = new THREE.Vector3(
      Math.cos(zRad) * this.m_BindingRadius,
      Math.sin(zRad) * this.m_BindingRadius,
      0,
    );
    p.z = paper.margin;

    let w = papers[Math.floor(paperCount / 2)].size.x;
    let h2 = this.m_BindingMidSpace;
    let b = Math.sqrt(w * w - h2 * h2);
    let z2 = Math.asin(b / w) * RAD2DEG - 90;
    const i = paper.index;

    if (i < Math.floor(paperCount / 2)) {
      let z3 = 0;
      if (this.m_Book.alignToGround) {
        w = papers[0].size.x;
        const midH = this.m_StackHeight / 2;
        h2 = clamp(th, 0, midH) - midH;
        b = Math.sqrt(w * w - h2 * h2);
        z3 = (Math.asin(b / w) * RAD2DEG - 90) * 2;
      }
      z = lerp(z2, -z3, t);
    } else {
      let z3 = 0;
      if (this.m_Book.alignToGround) {
        w = papers[0].size.x;
        const midH = this.m_StackHeight / 2;
        h2 = midH - clamp(th, midH, midH * 2);
        b = Math.sqrt(w * w - h2 * h2);
        z3 = (Math.asin(b / w) * RAD2DEG - 90) * 2;
      }
      z = lerp(z3, -z2, t);
    }

    paper.transform.position.copy(p);
    // Quaternion.Euler(0, 0, z)
    paper.transform.quaternion.setFromEuler(
      new THREE.Euler(0, 0, z * DEG2RAD),
    );
  }

  // ── getPX  (private helper) ───────────────────────────────────────────

  private getPX(index: number, thickness: number): number {
    // zTime is always 0, so th is always 0 — the loop was dead computation.
    const h = this.getStackHeight(index) - thickness / 2;
    const rightStackZ = this.getStackZ(h);
    // t=0 so z = rightStackZ
    const zRad = rightStackZ * DEG2RAD;
    return Math.cos(zRad) * this.m_BindingRadius;
  }

  // ── updatePaperPosition ───────────────────────────────────────────────

  public updatePaperPosition(paper: Paper): void {
    this.updatePaperPositionWithTh(paper, this.computeTh());
  }

  private updatePaperPositionWithTh(paper: Paper, th: number): void {
    const papers = this.m_Book.papers;
    const paperCount = papers.length;

    const h = this.getStackHeight(paper.index) - paper.thickness / 2;
    const rightStackZ = this.getStackZ(h + th);
    const leftStackZ = 180 + this.getStackZ(h + th - this.m_StackHeight);

    let t = paper.zTime;
    let z = lerp(rightStackZ, leftStackZ, t);
    // Quaternion.Euler(0, 0, z) * Vector3.right * m_BindingRadius
    const zRad = z * DEG2RAD;
    const p = new THREE.Vector3(
      Math.cos(zRad) * this.m_BindingRadius,
      Math.sin(zRad) * this.m_BindingRadius,
      0,
    );
    p.z = paper.margin;

    let w = papers[Math.floor(paperCount / 2)].size.x;
    let h2 = this.m_BindingMidSpace;
    let b = Math.sqrt(w * w - h2 * h2);
    let z2 = Math.asin(b / w) * RAD2DEG - 90;
    const i = paper.index;

    if (i < Math.floor(paperCount / 2)) {
      let z3 = 0;
      if (this.m_Book.alignToGround) {
        w = papers[0].size.x;
        const midH = this.m_StackHeight / 2;
        h2 = clamp(th, 0, midH) - midH;
        b = Math.sqrt(w * w - h2 * h2);
        z3 = (Math.asin(b / w) * RAD2DEG - 90) * 2;
      }
      z = lerp(z2, -z3, t);
    } else {
      let z3 = 0;
      if (this.m_Book.alignToGround) {
        w = papers[0].size.x;
        const midH = this.m_StackHeight / 2;
        h2 = midH - clamp(th, midH, midH * 2);
        b = Math.sqrt(w * w - h2 * h2);
        z3 = (Math.asin(b / w) * RAD2DEG - 90) * 2;
      }
      z = lerp(z3, -z2, t);
    }

    paper.transform.position.copy(p);
    // Quaternion.Euler(0, 0, z)
    paper.transform.quaternion.setFromEuler(
      new THREE.Euler(0, 0, z * DEG2RAD),
    );
  }

  // ── getStackHeight ────────────────────────────────────────────────────

  private getStackHeight(startIndex: number): number {
    const papers = this.m_Book.papers;
    let h = 0;
    const n = papers.length;
    for (let i = startIndex; i < n; i++) {
      h += papers[i].thickness;
    }
    if (startIndex < Math.floor(n / 2)) h += this.m_BindingMidSpace;
    return h;
  }

  // ── getStackZ ─────────────────────────────────────────────────────────

  private getStackZ(stackHeight: number): number {
    stackHeight = clamp(stackHeight, 0, this.m_StackHeight);
    const h = stackHeight - this.m_StackHeight * 0.5;
    return Math.asin(h / this.m_BindingRadius) * RAD2DEG;
  }

  // ── onLateUpdate ──────────────────────────────────────────────────────

  /** Precompute cumulative th once instead of per-paper (O(n) instead of O(n^2)). */
  private computeTh(): number {
    const papers = this.m_Book.papers;
    const midIndex0 = papers.length / 2 - 1;
    const midIndex1 = papers.length / 2;
    let th = 0;
    for (let j = 0; j < papers.length; j++) {
      const p = papers[j];
      p.updateTime();
      const zTime = p.zTime;
      th += zTime * p.thickness;
      if (j === midIndex0) th += zTime * this.m_BindingMidSpace / 2;
      if (j === midIndex1) th += zTime * this.m_BindingMidSpace / 2;
    }
    return th;
  }

  public onLateUpdate(): void {
    const papers = this.m_Book.papers;
    const th = this.computeTh();
    for (const paper of papers) {
      this.updatePaperPositionWithTh(paper, th);
    }

    // Force world-matrix recomputation after position/rotation changes
    // (Unity does this implicitly; Three.js defers until render).
    this.m_Root.updateMatrixWorld(true);

    this.updateBindingVertices();

    for (const paper of papers) {
      paper.updateMesh();
    }

    this.updateRootPosition();
  }

  // ── updateBindingVertices ─────────────────────────────────────────────

  private updateBindingVertices(): void {
    const papers = this.m_Book.papers;
    let stapleDirection = new THREE.Vector3(0, 0, 0);
    let bindingNormal = new THREE.Vector3(0, 0, 0);

    let bindingRadius = this.m_BindingRadius * 0.6;
    const stapleThickness = this.m_StapleThickness * 0.5;
    const coverThickness = papers[0].thickness;

    const rootLocalToWorldMatrix = this.m_Root.matrixWorld.clone();

    const paperCount = papers.length;

    for (let i = 0; i < paperCount; i++) {
      const paper = papers[i];
      const transform = paper.transform;
      const pattern = paper.meshData.pattern;
      const baseVertices = paper.meshData.baseVertices;
      const baseXArray = pattern.baseXArray;
      const baseZArray = pattern.baseZArray;
      const nX = baseXArray.length;
      const nZ = baseZArray.length;
      const lastXIndex = this.m_BindingVertexCount + 1;
      const thickness = paper.thickness;
      const xNoneSeamIndexes = pattern.xNoneSeamIndexes;
      const localPosition = transform.position.clone();
      let sheetIndex = i;
      let bindingNormalMul = stapleThickness;
      if (i >= Math.floor(paperCount / 2)) {
        sheetIndex = paperCount - i - 1;
        bindingNormalMul *= -1;
      }
      const stapleDirectionMul =
        (coverThickness + thickness) * 0.5 + thickness * (sheetIndex - 1);

      // rootLocal2PaperLocalMatrix = transform.worldToLocalMatrix * rootLocalToWorldMatrix
      const rootLocal2PaperLocalMatrix = transform.matrixWorld
        .clone()
        .invert()
        .multiply(rootLocalToWorldMatrix);

      const sheetTime = sheetIndex / (paperCount / 2);
      bindingRadius =
        this.m_BindingRadius * lerp(0.45, 0.65, 1 - sheetTime);

      for (let iz = 0; iz < nZ; iz++) {
        const z = baseZArray[iz];

        const a = new THREE.Vector3(0, 0, localPosition.z + z);
        const c = localPosition.clone();
        c.z += z;
        const bVec = paper
          .getDirection(z)
          .multiplyScalar(bindingRadius)
          .add(c.clone());

        if (i === 0 && iz === 0) {
          const paper2 = papers[paperCount - 1];
          const localPosition2 = paper2.transform.position.clone();
          const c2 = localPosition2.clone();
          c2.z += z;
          const b2 = paper2
            .getDirection(z)
            .multiplyScalar(bindingRadius)
            .add(c2);
          bindingNormal = bVec.clone().sub(b2).normalize();
          stapleDirection = new THREE.Vector3(
            -bindingNormal.y,
            bindingNormal.x,
            0,
          )
            .normalize()
            .negate();
          const qz =
            Math.atan2(stapleDirection.y, stapleDirection.x) * RAD2DEG;
          this.stapleMesh.rotation.set(0, 0, qz * DEG2RAD);
        }

        if (sheetIndex > 0) {
          a.add(stapleDirection.clone().multiplyScalar(stapleDirectionMul));
        }

        const jz = iz * nX;

        // baseVertices[jz] = rootLocal2PaperLocalMatrix.MultiplyPoint3x4(a)
        baseVertices[jz] = a
          .clone()
          .applyMatrix4(rootLocal2PaperLocalMatrix);

        a.add(bindingNormal.clone().multiplyScalar(bindingNormalMul));

        const aTransformed = a
          .clone()
          .applyMatrix4(rootLocal2PaperLocalMatrix);
        const bTransformed = bVec
          .clone()
          .applyMatrix4(rootLocal2PaperLocalMatrix);
        const cTransformed = c
          .clone()
          .applyMatrix4(rootLocal2PaperLocalMatrix);

        baseVertices[jz + xNoneSeamIndexes[1]] = aTransformed;

        for (let ix = 2; ix < lastXIndex; ix++) {
          const t = inverseLerp(1, lastXIndex, ix);
          baseVertices[jz + xNoneSeamIndexes[ix]] = bezierEvaluate(
            aTransformed,
            bTransformed,
            cTransformed,
            t,
          );
        }
      }
    }
  }

  // ── Getters for binding parameters (useful for external code) ─────────

  get bindingRadius(): number {
    return this.m_BindingRadius;
  }

  get bindingMidSpace(): number {
    return this.m_BindingMidSpace;
  }

  get stackHeight(): number {
    return this.m_StackHeight;
  }

  get bindingVertexCount(): number {
    return this.m_BindingVertexCount;
  }

  get quality(): number {
    return this.m_Quality;
  }

  get stapleMargin(): number {
    return this.m_StapleMargin;
  }

  get stapleThickness(): number {
    return this.m_StapleThickness;
  }

  /** Releases GPU resources held by the staple mesh. */
  dispose(): void {
    this.stapleMesh.geometry.dispose();
    if (this.stapleMesh.material instanceof THREE.Material) {
      this.stapleMesh.material.dispose();
    }
    if (this.stapleMesh.parent) {
      this.stapleMesh.parent.remove(this.stapleMesh);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// StapleRendererAdapter — lightweight adapter wrapping a THREE.Mesh to match
// the interface expected by Book.ts (binderRenderer).
// ─────────────────────────────────────────────────────────────────────────────

export class StapleRendererAdapter {
  private mesh: THREE.Mesh;

  constructor(mesh: THREE.Mesh) {
    this.mesh = mesh;
  }

  setVisibility(visible: boolean): void {
    this.mesh.visible = visible;
  }

  get castShadows(): boolean {
    return this.mesh.castShadow;
  }

  set castShadows(value: boolean) {
    this.mesh.castShadow = value;
  }

  get bounds(): THREE.Box3 {
    const box = new THREE.Box3();
    if (this.mesh.geometry) {
      this.mesh.geometry.computeBoundingBox();
      if (this.mesh.geometry.boundingBox) {
        box.copy(this.mesh.geometry.boundingBox);
        box.applyMatrix4(this.mesh.matrixWorld);
      }
    }
    return box;
  }

  get transform(): THREE.Object3D {
    return this.mesh;
  }

  get meshObject(): THREE.Mesh {
    return this.mesh;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// StapleBookBinding  (ported from StapleBookBinding.cs lines 7-21)
// Simple wrapper extending BookBinding that creates a StapleBookBound.
// ─────────────────────────────────────────────────────────────────────────────

export class StapleBookBinding extends BookBinding {
  public quality: number = 3;
  public stapleSetup: StapleSetup = new StapleSetup();

  createBound(
    book: Book,
    root: THREE.Object3D,
    _rendererFactory: RendererFactory,
    _meshFactory: MeshFactory,
  ): BookBound {
    return new StapleBookBound(
      this.quality,
      this.stapleSetup,
      book,
      root,
    );
  }
}

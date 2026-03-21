/**
 * Faithful port of the Unity C# Paper class (Book.cs lines ~2919-3803).
 *
 * This is the core page-turning class. It handles:
 *   - Page turning physics
 *   - Handle clamping via dual ellipse constraints
 *   - Cylinder binary search (UpdateCylinder — 100 iterations)
 *   - Falling physics (auto-turning with double SmoothStep, manual with SmoothDamp)
 *   - Mesh LOD switching (Highpoly / Lowpoly / LowpolyHole)
 *   - Material/uniform updates
 *   - Base vertex updates with Cylinder.RollPoint()
 *   - Raycast hit detection
 *   - Auto-turning (StartAutoTurning, UpdateAutoTurning)
 *   - StartTurning, StopTurning, UpdateTurning
 */

import * as THREE from 'three';
import { Cylinder } from './Cylinder';
import { PaperMeshData } from './PaperMeshData';
import { PaperSetup } from './PaperSetup';
import { PaperMaterialData } from './PaperMaterialData';
import * as VectorUtility from './utils/VectorUtility';
import * as EllipseUtility from './utils/EllipseUtility';
import * as MatrixUtility from './utils/MatrixUtility';
import * as TextureUtility from './utils/TextureUtility';
import { PaperUVMargin } from './PaperUVMargin';
import { PaperMeshDataPool } from './Renderer';
import { BookDirection } from './BookDirection';
import { clamp, clamp01, lerp, lerpUnclamped, inverseLerp, DEG2RAD, RAD2DEG } from './mathUtils';
import type { IPageContent, IBookOwner, IPaperRenderer, BookRaycastHit } from './types';
import { AutoTurnMode } from './types';

// Re-export types that were previously exported from this file
export type { IPageContent, IBookOwner, IPaperRenderer, BookRaycastHit };
export { AutoTurnMode };

// Also re-export IBookBound from types for any consumers
export type { IBookBound } from './types';

// ---------------------------------------------------------------------------
// Internal enum (matches C# MeshDataType)
// ---------------------------------------------------------------------------

enum MeshDataType {
  Highpoly,
  Lowpoly,
  LowpolyHole,
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// C# float.Epsilon (32-bit); JS uses 64-bit doubles. Used as "essentially zero" threshold.
const EPSILON = 1.192093e-7;

/** Unity's exact SmoothStep: clamp01((t-from)/(to-from)); t*t*(3-2*t) */
function smoothStep(from: number, to: number, t: number): number {
  t = clamp01((t - from) / (to - from));
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------------
// Paper class
// ---------------------------------------------------------------------------

export class Paper {
  // ---- Fields (mirrors C# field order) ----

  private m_Index: number;
  private m_Transform: THREE.Object3D;
  private m_FrontContent!: IPageContent;
  private m_BackContent!: IPageContent;
  private m_UseBackContentForSides: boolean = false;

  private m_Book: IBookOwner;
  private m_Prev: Paper | null = null;
  private m_Next: Paper | null = null;
  private m_NoHole: boolean = false;

  private m_MaterialData!: PaperMaterialData;

  private m_Renderer: IPaperRenderer;

  private m_Size: THREE.Vector2 = new THREE.Vector2();
  private m_Thickness: number = 0;
  private m_Stiffness: number = 0;
  private m_Margin: number = 0;

  private m_IsCover: boolean;

  private m_UVMargin!: PaperUVMargin;

  private m_MeshData!: PaperMeshData;
  private m_LowpolyMeshData!: PaperMeshData;
  private m_LowpolyHoleMeshData!: PaperMeshData | null;
  private m_HighpolyMeshDataPool!: PaperMeshDataPool;
  private m_MeshDataType: MeshDataType = MeshDataType.Lowpoly;

  private m_Cylinder: Cylinder = new Cylinder();
  private m_IsRolling: boolean = false;

  private m_IsAutoTurning: boolean = false;

  private m_WorldPlane: THREE.Plane = new THREE.Plane();

  private m_StartHandle: THREE.Vector3 = new THREE.Vector3();
  private m_CurrentHandle: THREE.Vector3 = new THREE.Vector3();
  private m_EndHandle: THREE.Vector3 = new THREE.Vector3();
  private m_PrevHandle: THREE.Vector3 = new THREE.Vector3();
  private m_HandleOffset: THREE.Vector3 = new THREE.Vector3();
  private m_HandleVelocity: THREE.Vector3 = new THREE.Vector3();
  private m_HandleVelocities: THREE.Vector3[] = []; // capacity 5

  private m_SubMeshCount: number = -1;
  private m_MinTurningRadius: number = 0;
  private m_TurningRadius: number = 0;
  private m_FallDuration: number = 0;
  private m_FallTime: number = 0.2;

  private m_XTime: number = 0;
  private m_ZTime: number = 0;

  private m_IsTurning: boolean = false;
  private m_IsFalling: boolean = false;
  private m_IsFallingLeft: boolean = false;

  private m_isMeshChanged: boolean = false;

  // Auto-set property
  public sizeXOffset: number = 0;

  // Pre-allocated scratch vectors for updateCylinder/updateTime/clampHandle
  // to avoid per-frame GC pressure.
  //
  // Allocation map:
  //   updateCylinder: _ucStartHandle, _ucCurrentHandle, _ucHandleDir, _ucA, _ucB, _ucMid, _ucRollResult
  //   updateTime:     _utV1, _utV2, _utV3, _utV4, _utAB, _utCD
  //   clampHandle:    _chP, _chA, _chC
  private readonly _ucStartHandle = new THREE.Vector3();
  private readonly _ucCurrentHandle = new THREE.Vector3();
  private readonly _ucHandleDir = new THREE.Vector3();
  private readonly _ucA = new THREE.Vector3();
  private readonly _ucB = new THREE.Vector3();
  private readonly _ucMid = new THREE.Vector3();
  private readonly _ucRollResult = new THREE.Vector3();
  private readonly _ucCylDir = new THREE.Vector3();

  private readonly _utV1 = new THREE.Vector3();
  private readonly _utV2 = new THREE.Vector3();
  private readonly _utV3 = new THREE.Vector3();
  private readonly _utV4 = new THREE.Vector3();

  private readonly _chP = new THREE.Vector3();
  private readonly _chA = new THREE.Vector3();
  private readonly _chC = new THREE.Vector3();
  private readonly _chEllipseCenter1 = new THREE.Vector2();
  private readonly _chEllipseCenter2 = new THREE.Vector2();
  private readonly _chEllipseSize1 = new THREE.Vector2();
  private readonly _chEllipseSize2 = new THREE.Vector2();

  // ---- Properties (mirrors C#) ----

  public get isMeshChanged(): boolean {
    return this.m_isMeshChanged;
  }
  public set isMeshChanged(value: boolean) {
    this.m_isMeshChanged = value;
  }

  public get isCover(): boolean {
    return this.m_IsCover;
  }

  public get index(): number {
    return this.m_Index;
  }

  public get transform(): THREE.Object3D {
    return this.m_Transform;
  }

  public get renderer(): IPaperRenderer {
    return this.m_Renderer;
  }

  public get meshData(): PaperMeshData {
    return this.m_MeshData;
  }

  public get size(): THREE.Vector2 {
    return this.m_Size;
  }
  public set size(value: THREE.Vector2) {
    this.m_Size.copy(value);
  }

  public get thickness(): number {
    return this.m_Thickness;
  }

  public get margin(): number {
    return this.m_Margin;
  }

  public get zTime(): number {
    if (this.m_IsFalling || this.m_IsTurning) {
      if (this.m_Transform.scale.x === -1) {
        return 1 - this.m_ZTime;
      } else {
        return this.m_ZTime;
      }
    }

    return this.m_Transform.scale.x === -1 ? 1 : 0;
  }

  public get direction(): THREE.Vector3 {
    const z = this.zTime * 180;
    // Quaternion.Euler(0, 0, z) * Vector3.left  →  rotate (-1, 0, 0) by z degrees around Z
    const rad = z * DEG2RAD;
    const cosZ = Math.cos(rad);
    const sinZ = Math.sin(rad);
    // Rotating Vector3.left = (-1, 0, 0) around Z axis:
    //   x' = cos(z)*(-1) - sin(z)*0 = -cos(z)
    //   y' = sin(z)*(-1) + cos(z)*0 = -sin(z)
    //   z' = 0
    return new THREE.Vector3(-cosZ, -sinZ, 0);
  }

  public get isTurning(): boolean {
    return this.m_IsTurning;
  }

  public get isFalling(): boolean {
    return this.m_IsFalling;
  }

  public get isFlipped(): boolean {
    return this.m_Transform.scale.x === -1;
  }

  public get isOnRightStack(): boolean {
    if (this.m_IsFalling) {
      if (this.m_Transform.scale.x === -1) {
        return this.m_IsFallingLeft;
      } else {
        return !this.m_IsFallingLeft;
      }
    }

    return this.m_Transform.scale.x === -1 ? false : true;
  }

  public get frontContent(): IPageContent {
    return this.m_FrontContent;
  }

  public get backContent(): IPageContent {
    return this.m_BackContent;
  }

  public get currentContent(): IPageContent {
    return this.isOnRightStack ? this.m_FrontContent : this.m_BackContent;
  }

  private get needHole(): boolean {
    if (this.m_NoHole) return false;
    if (this.m_Prev === null) return false;
    if (this.m_Next === null) return false;

    if (this.m_IsTurning || this.m_IsAutoTurning || this.m_IsFalling) return false;

    if (this.m_Prev.isCover) return false;
    if (this.m_Next.isCover) return false;

    const a = this.m_Prev.isOnRightStack;
    const b = this.isOnRightStack;
    const c = this.m_Next.isOnRightStack;

    return a === b && b === c;
  }

  public set prev(value: Paper | null) {
    this.m_Prev = value;
  }

  public set next(value: Paper | null) {
    this.m_Next = value;
  }

  public set noHole(value: boolean) {
    this.m_NoHole = value;
  }

  private get isIdle(): boolean {
    return !this.m_IsFalling && !this.m_IsTurning;
  }

  // ---- Constructor ----

  constructor(isCover: boolean, index: number, book: IBookOwner, renderer: IPaperRenderer) {
    this.m_IsCover = isCover;
    this.m_Book = book;
    this.m_Index = index;
    this.m_Renderer = renderer;
    this.m_Transform = renderer.transform;
  }

  // ---- Methods (faithful port, same order as C#) ----

  public setTime(time: number): void {
    this.m_XTime = time;
    this.m_ZTime = time;
  }

  public setMeshData(
    lowpolyMeshData: PaperMeshData,
    lowpolyHoleMeshData: PaperMeshData | null,
    highpolyMeshDataPool: PaperMeshDataPool,
  ): void {
    this.m_MeshDataType =
      this.needHole && lowpolyHoleMeshData != null
        ? MeshDataType.LowpolyHole
        : MeshDataType.Lowpoly;
    this.m_MeshData =
      this.m_MeshDataType === MeshDataType.LowpolyHole
        ? lowpolyHoleMeshData!
        : lowpolyMeshData;
    this.m_LowpolyMeshData = lowpolyMeshData;
    this.m_LowpolyHoleMeshData = lowpolyHoleMeshData;
    this.m_HighpolyMeshDataPool = highpolyMeshDataPool;
    this.m_Renderer.mesh = this.m_MeshData.geometry;
    this.m_Renderer.castShadows =
      this.m_Book.castShadows && !this.m_Book.reduceShadows;
    this.updateMaterials();
    this.m_isMeshChanged = true;
  }

  public restState(rightStack: boolean): void {
    this.m_IsTurning = false;
    this.m_IsFalling = false;
    this.m_IsAutoTurning = false;
    this.m_Transform.scale.set(rightStack ? 1 : -1, 1, 1);
    this.m_Book.bound!.resetPaperPosition(this);
  }

  public restMesh(): void {
    this.switchMeshData(
      this.needHole ? MeshDataType.LowpolyHole : MeshDataType.Lowpoly,
    );
    this.updateMaterials();
  }

  public setMaterialData(data: PaperMaterialData): void {
    this.m_MaterialData = data;
  }

  public setPaperSetup(settings: PaperSetup): void {
    this.m_Size.set(settings.size.x, settings.size.y);
    this.m_Thickness = settings.thickness;
    this.m_Stiffness = settings.stiffness;
    this.m_Margin = settings.margin;
    this.m_UVMargin = settings.uvMargin;
  }

  public setContentData(
    frontContent: IPageContent,
    backContent: IPageContent,
    useBackContentForSides: boolean = false,
  ): void {
    this.m_FrontContent = frontContent;
    this.m_BackContent = backContent;
    this.m_UseBackContentForSides = useBackContentForSides;
  }

  public setMinTurningRadius(min: number): void {
    this.m_MinTurningRadius = min;
  }

  public updateTurningRadius(bend: number = 1): void {
    let h = Math.max(this.m_Stiffness, 1 - clamp01(bend));
    if (h <= 0.5) {
      this.m_TurningRadius =
        inverseLerp(0, 0.5, h) * this.m_Size.x / Math.PI;
    } else {
      this.m_TurningRadius =
        this.m_Size.x /
        (Math.max(180 * (1 - inverseLerp(0.5, 1, h)), 5) * DEG2RAD);
    }

    this.m_TurningRadius = Math.max(
      this.m_TurningRadius,
      this.m_MinTurningRadius,
    );
  }

  public startTurning(ray: THREE.Ray): boolean {
    const oldRay = ray.clone();
    ray = MatrixUtility.transformRay(
      ray,
      this.m_Transform.matrixWorld.clone().invert(),
    );
    this.m_WorldPlane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0).applyQuaternion(this.m_Transform.quaternion),
      this.m_Transform.position,
    );
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    if (ray.intersectPlane(plane, target) !== null) {
      const hit = target;
      if (
        hit.x > 0 &&
        hit.x < this.m_Size.x &&
        hit.z > 0 &&
        hit.z < this.m_Size.y
      ) {
        this.m_IsRolling = true;
        this.m_IsTurning = true;
        this.m_IsFalling = false;
        this.m_HandleOffset.set(0, 0, 0);

        this.m_StartHandle.copy(hit);
        this.m_StartHandle.x = this.m_Size.x;
        this.m_CurrentHandle.copy(this.m_StartHandle);

        if (hit.x < this.m_Size.x * 0.9) {
          this.m_HandleOffset.set(hit.x - this.m_Size.x, 0, 0);
          const scale = this.m_Transform.scale;
          scale.x *= -1;
        }

        this.m_HandleVelocity.set(0, 0, 0);
        this.m_PrevHandle.copy(this.m_CurrentHandle);
        this.m_HandleVelocities.length = 0;

        this.switchMeshData(MeshDataType.Highpoly);
        this.m_Prev?.trySwitchMeshData(MeshDataType.Lowpoly);
        this.m_Next?.trySwitchMeshData(MeshDataType.Lowpoly);

        this.updateTurning(oldRay);
        this.clampHandle();
        this.updateCylinder();
        return true;
      }
    }
    return false;
  }

  public stopTurning(): void {
    this.clampHandle();

    this.m_IsTurning = false;
    this.m_IsFalling = true;

    const velocity = new THREE.Vector3(0, 0, 0);
    for (const v of this.m_HandleVelocities) {
      velocity.add(v);
    }
    velocity.divideScalar(this.m_HandleVelocities.length);

    if (velocity.length() > 0.1) {
      this.m_IsFallingLeft = velocity.x < 0;
    } else {
      this.m_IsFallingLeft = this.m_XTime > 0.5 && this.m_ZTime > 0.1;
    }

    if (this.m_IsFallingLeft) {
      this.m_FallTime = 1 - this.m_XTime;
    } else {
      this.m_FallTime = this.m_XTime;
    }

    this.m_FallTime = lerp(0.1, 0.2, this.m_FallTime);

    this.m_EndHandle.copy(this.m_StartHandle);
    if (this.m_IsFallingLeft) {
      this.m_EndHandle.x = -this.m_Size.x;
    }
  }

  /**
   * Called each frame while the user is dragging.
   * `dt` replaces Time.deltaTime.
   */
  public updateTurning(ray: THREE.Ray, dt: number = 1 / 60): void {
    const target = new THREE.Vector3();
    if (ray.intersectPlane(this.m_WorldPlane, target) !== null) {
      const hit = target;

      this.m_Book.bound!.resetPaperPosition(this);

      // transform.InverseTransformPoint(hit)
      this.m_CurrentHandle.copy(
        this.m_Transform.worldToLocal(hit.clone()),
      );
      this.m_CurrentHandle.y = 0;

      this.m_CurrentHandle.add(this.m_HandleOffset);

      // m_HandleVelocity = (m_CurrentHandle - m_PrevHandle) / Time.deltaTime
      this.m_HandleVelocity
        .copy(this.m_CurrentHandle)
        .sub(this.m_PrevHandle)
        .divideScalar(dt);

      // Capacity-5 ring buffer
      if (this.m_HandleVelocities.length === 5) {
        this.m_HandleVelocities.shift();
      }
      this.m_HandleVelocities.push(this.m_HandleVelocity.clone());

      this.m_PrevHandle.copy(this.m_CurrentHandle);

      // Debug.DrawLine omitted (editor-only)
    }

    this.updateBaseVertices();
  }

  /**
   * Called each frame while the page is falling back into place.
   * `dt` replaces Time.deltaTime.
   */
  public updateFalling(dt: number = 1 / 60): void {
    let end = false;

    if (this.m_IsAutoTurning) {
      let t = clamp01(this.m_FallTime / this.m_FallDuration);
      t = smoothStep(0, 1, t);
      t = smoothStep(0, 1, t);
      // Vector3.Lerp(startHandle, endHandle, isFallingLeft ? t : 1 - t)
      this.m_CurrentHandle.lerpVectors(
        this.m_StartHandle,
        this.m_EndHandle,
        this.m_IsFallingLeft ? t : 1 - t,
      );
      this.m_FallTime += dt;
      end = Math.abs(t - 1) < EPSILON;
    } else {
      const smoothTime = new THREE.Vector3(
        this.m_FallTime,
        0,
        this.m_FallTime * 0.75,
      );
      this.m_CurrentHandle = VectorUtility.smoothDamp(
        this.m_CurrentHandle,
        this.m_EndHandle,
        this.m_HandleVelocity,
        smoothTime,
        Infinity,
        dt,
      );
      end =
        Math.abs(this.m_EndHandle.x - this.m_CurrentHandle.x) < 0.0001;
    }

    if (end) {
      if (this.m_IsFallingLeft) {
        const scale = this.m_Transform.scale;
        scale.x *= -1;
        this.m_IsRolling = false;
        this.m_IsFallingLeft = false;
        this.m_IsFalling = false;
        this.switchMeshData(MeshDataType.Lowpoly);
        this.m_ZTime = this.m_Transform.scale.x === -1 ? 1 : 0;
        this.m_Book.bound!.updatePaperPosition(this);
        this.updateMaterials();
      } else {
        this.m_ZTime = this.m_Transform.scale.x === -1 ? 1 : 0;
        this.m_IsRolling = false;
        this.m_IsFallingLeft = false;
        this.m_IsFalling = false;
        this.switchMeshData(MeshDataType.Lowpoly);
        this.updateMaterials();
      }

      if (this.isOnRightStack) {
        this.m_Next?.trySwitchMeshData(MeshDataType.LowpolyHole);
      } else {
        this.m_Prev?.trySwitchMeshData(MeshDataType.LowpolyHole);
      }

      if (this.m_IsAutoTurning) {
        this.updateTurningRadius();
      }

      this.m_IsAutoTurning = false;
      return;
    }

    this.updateBaseVertices();
  }

  public getTextureCoordinate(ray: THREE.Ray): THREE.Vector2 {
    const hitResult = this.raycastLocal(ray, true);
    if (hitResult !== null) {
      return this.hit2UV(hitResult);
    }
    return new THREE.Vector2(0, 0);
  }

  public raycast(ray: THREE.Ray): { hit: boolean; hitInfo: BookRaycastHit } {
    const hitInfo: BookRaycastHit = {
      point: new THREE.Vector3(),
      textureCoordinate: new THREE.Vector2(),
      pageContent: null,
      paperIndex: 0,
      pageIndex: 0,
    };

    if (!this.isFalling && !this.isTurning) {
      const localHit = this.raycastLocal(ray);
      if (localHit !== null) {
        hitInfo.pageContent = this.isOnRightStack
          ? this.m_FrontContent
          : this.m_BackContent;
        hitInfo.point = this.m_Transform.localToWorld(localHit.clone());
        hitInfo.textureCoordinate = this.hit2UV(localHit);
        hitInfo.paperIndex = this.index;
        return { hit: true, hitInfo };
      }
    }

    return { hit: false, hitInfo };
  }

  private hit2UV(hit: THREE.Vector3): THREE.Vector2 {
    const uv = new THREE.Vector2(
      inverseLerp(-this.sizeXOffset, this.m_Size.x, hit.x),
      hit.z / this.m_Size.y,
    );

    this.m_UVMargin.fixUV(uv);

    const dir = this.m_Book.direction;
    if (
      dir === BookDirection.UpToDown ||
      dir === BookDirection.DownToUp
    ) {
      const tmp = uv.x;
      uv.x = uv.y;
      uv.y = tmp;

      if (this.isOnRightStack) uv.y = 1 - uv.y;
    } else {
      if (!this.isOnRightStack) uv.x = 1 - uv.x;
    }

    return uv;
  }

  /**
   * Internal raycast against the paper plane in local space.
   * Returns the local-space hit point, or null if no hit / out of bounds.
   */
  public raycastLocal(
    ray: THREE.Ray,
    noBoundsCheck: boolean = false,
  ): THREE.Vector3 | null {
    ray = MatrixUtility.transformRay(
      ray,
      this.m_Transform.matrixWorld.clone().invert(),
    );

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();

    if (ray.intersectPlane(plane, target) !== null) {
      const hit = target;
      if (
        (hit.x > 0 &&
          hit.x < this.m_Size.x &&
          hit.z > 0 &&
          hit.z < this.m_Size.y) ||
        noBoundsCheck
      ) {
        return hit;
      }
    }

    return null;
  }

  private trySwitchMeshData(meshDataType: MeshDataType): void {
    if (this.m_IsFalling || this.m_IsTurning) return;

    this.switchMeshData(meshDataType);

    this.updateMaterials();
  }

  private switchMeshData(meshDataType: MeshDataType): void {
    if (meshDataType === MeshDataType.LowpolyHole) {
      if (this.m_LowpolyHoleMeshData == null || this.m_NoHole) {
        meshDataType = MeshDataType.Lowpoly;
      }
    }

    if (this.m_MeshDataType === meshDataType) return;

    if (this.m_MeshDataType === MeshDataType.Highpoly) {
      this.m_HighpolyMeshDataPool.free(this.m_MeshData);
    }

    let castShadows = this.m_Book.castShadows;

    if (
      this.m_Book.reduceShadows &&
      meshDataType !== MeshDataType.Highpoly
    ) {
      castShadows = false;
    }

    this.m_Renderer.castShadows = castShadows;

    this.m_MeshDataType = meshDataType;

    switch (meshDataType) {
      case MeshDataType.Highpoly:
        this.m_MeshData = this.m_HighpolyMeshDataPool.get();
        break;
      case MeshDataType.Lowpoly:
        this.m_MeshData = this.m_LowpolyMeshData;
        break;
      case MeshDataType.LowpolyHole:
        this.m_MeshData = this.m_LowpolyHoleMeshData!;
        break;
      default:
        break;
    }

    this.m_Renderer.mesh = this.m_MeshData.geometry;

    this.m_isMeshChanged = true;
  }

  public updateMaterials(): void {
    const subMeshCount = this.m_MeshData.pattern.subMeshCount;

    if (this.m_SubMeshCount !== subMeshCount) {
      this.m_Renderer.setMaterials(
        subMeshCount === 1
          ? this.m_MaterialData.materials1
          : this.m_MaterialData.materials3,
      );

      this.m_SubMeshCount = subMeshCount;
    }

    const frontST = this.m_FrontContent.textureST.clone();
    let backST = this.m_BackContent.textureST.clone();

    if ((this.m_Book.direction as number) > 1) {
      backST = TextureUtility.yFlipST(backST);
    } else {
      backST = TextureUtility.xFlipST(backST);
    }

    const frontTexture = this.m_FrontContent.texture;
    const backTexture = this.m_BackContent.texture;

    if (subMeshCount === 3) {
      let a = 0;
      let b = 1;

      if (this.m_Transform.scale.x === -1) {
        a = 1;
        b = 0;
      }

      this.m_MaterialData.updatePropertyBlock(frontTexture, frontST);
      this.m_Renderer.setPropertyBlock(
        this.m_MaterialData.propertyBlock,
        a,
      );

      if (!this.m_UseBackContentForSides)
        this.m_Renderer.setPropertyBlock(
          this.m_MaterialData.propertyBlock,
          2,
        );

      this.m_MaterialData.updatePropertyBlock(backTexture, backST);
      this.m_Renderer.setPropertyBlock(
        this.m_MaterialData.propertyBlock,
        b,
      );

      if (this.m_UseBackContentForSides)
        this.m_Renderer.setPropertyBlock(
          this.m_MaterialData.propertyBlock,
          2,
        );
    } else {
      if (this.m_Transform.scale.x === -1) {
        this.m_MaterialData.updatePropertyBlock(backTexture, backST);
      } else {
        this.m_MaterialData.updatePropertyBlock(frontTexture, frontST);
      }

      this.m_Renderer.setPropertyBlock(
        this.m_MaterialData.propertyBlock,
        0,
      );
    }
  }

  public updateBaseVertices(): void {
    this.clampHandle();
    this.updateCylinder();
    this.updateTime();

    if (!this.m_IsRolling) return;

    this.m_MeshData.updateBaseVertices();
    const baseVertices = this.m_MeshData.baseVertices;
    const cylinder = this.m_Cylinder;
    const n = baseVertices.length;
    for (let i = 0; i < n; i++) {
      baseVertices[i] = cylinder.rollPoint(baseVertices[i]);
    }
  }

  public updateMesh(): void {
    this.updateMaterials();
    this.m_MeshData.updateMesh();
    this.m_isMeshChanged = true;
  }

  public getDirection(z: number): THREE.Vector3 {
    let a = new THREE.Vector3(0, 0, z);
    let b = new THREE.Vector3(0.1, 0, z);
    a = this.rollPoint(a);
    b = this.rollPoint(b);
    a = this.m_Transform.localToWorld(a);
    b = this.m_Transform.localToWorld(b);
    // parent.InverseTransformPoint
    if (this.m_Transform.parent) {
      a = this.m_Transform.parent.worldToLocal(a);
      b = this.m_Transform.parent.worldToLocal(b);
    }
    return a.sub(b).normalize();
  }

  public updateTime(): void {
    if (this.isTurning || this.isFalling) {
      // Reuse scratch vectors instead of allocating new ones
      this._utV1.set(this.m_Size.x, 0, 0);
      const t0 = this.findTime(this._utV1);

      this._utV2.set(this.m_Size.x, 0, this.m_Size.y);
      const t1 = this.findTime(this._utV2);

      this.m_XTime = lerp(
        Math.min(t0, t1),
        Math.max(t0, t1),
        0.9,
      );

      const xs = this.m_MeshData.pattern.baseXArray;
      const zs = this.m_MeshData.pattern.baseZArray;

      this._utV1.set(xs[1], 0, 0);
      const a = this.rollPoint(this._utV1);
      this._utV2.set(xs[2], 0, 0);
      const b = this.rollPoint(this._utV2);

      this._utV3.set(xs[1], 0, zs[zs.length - 1]);
      const c = this.rollPoint(this._utV3);
      this._utV4.set(xs[2], 0, zs[zs.length - 1]);
      const d = this.rollPoint(this._utV4);

      // ab = (b - a).normalize()  — compute inline without clone
      const abx = b.x - a.x, aby = b.y - a.y;
      const cdx = d.x - c.x, cdy = d.y - c.y;
      const abLen = Math.sqrt(abx * abx + aby * aby) || 1;
      const cdLen = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
      const z0 = RAD2DEG * Math.atan2(aby / abLen, abx / abLen);
      const z1 = RAD2DEG * Math.atan2(cdy / cdLen, cdx / cdLen);
      const zAvg = (z0 + z1) / 2;

      this.m_ZTime = zAvg / 180;
    } else {
      this.m_XTime = 0;
      this.m_ZTime = 0;
    }
  }

  private findTime(vertex: THREE.Vector3): number {
    vertex = this.rollPoint(vertex);
    return inverseLerp(this.m_Size.x, -this.m_Size.x, vertex.x);
  }

  private clampHandle(): void {
    this.m_StartHandle.y = 0;
    this.m_CurrentHandle.y = 0;

    const p = this._chP.copy(this.m_CurrentHandle);

    //c    c   d
    //     |  start
    //end  |
    //a    a   b
    const a = this._chA.set(0, 0, 0);
    const c = this._chC.set(0, 0, this.m_Size.y);

    const ra = a.distanceTo(this.m_StartHandle);
    const rc = c.distanceTo(this.m_StartHandle);

    const raz = Math.max(ra - this.m_TurningRadius, 0.01);
    const rcz = Math.max(rc - this.m_TurningRadius, 0.01);
    const z0 = this.m_StartHandle.z;

    const aEllipseCenter = this._chEllipseCenter1.set(
      0,
      z0 + (a.z - z0) * (raz / ra),
    );
    const cEllipseCenter = this._chEllipseCenter2.set(
      0,
      z0 + (c.z - z0) * (rcz / rc),
    );
    const aEllipseSize = this._chEllipseSize1.set(ra, raz);
    const cEllipseSize = this._chEllipseSize2.set(rc, rcz);

    p.x = clamp(p.x, -this.m_Size.x, this.m_Size.x);

    // p = VectorUtility.XZ2XY(p)  →  (x, z, 0)
    const p2v3 = VectorUtility.xz2xy(p);
    const p2 = EllipseUtility.clamp(
      new THREE.Vector2(p2v3.x, p2v3.y),
      aEllipseCenter,
      aEllipseSize,
    );
    const p3 = EllipseUtility.clamp(
      new THREE.Vector2(p2.x, p2.y),
      cEllipseCenter,
      cEllipseSize,
    );
    // p = VectorUtility.XY2XZ(p)  →  (x, 0, y)
    const pFinal = VectorUtility.xy2xz(
      new THREE.Vector3(p3.x, p3.y, 0),
    );

    this.m_CurrentHandle.copy(pFinal);
  }

  private updateCylinder(): void {
    const startHandle = this._ucStartHandle.copy(this.m_StartHandle);
    const currentHandle = this._ucCurrentHandle.copy(this.m_CurrentHandle);

    const handleDirection = this._ucHandleDir
      .copy(startHandle)
      .sub(currentHandle)
      .normalize();
    if (handleDirection.length() === 0) handleDirection.set(1, 0, 0);

    // a = startHandle - handleDirection * (size.x * 2 + turningRadius * PI)
    const offset = this.m_Size.x * 2 + this.m_TurningRadius * Math.PI;
    const a = this._ucA.copy(startHandle).sub(
      this._ucCylDir.copy(handleDirection).multiplyScalar(offset),
    );
    const b = this._ucB.copy(startHandle);

    const cylinder = new Cylinder();
    cylinder.radius = this.m_TurningRadius;
    this._ucCylDir.set(-handleDirection.z, 0, handleDirection.x);
    cylinder.direction = this._ucCylDir;

    for (let i = 0; i < 100; i++) {
      // cylinder.position = (a + b) * 0.5
      this._ucMid.copy(a).add(b).multiplyScalar(0.5);
      cylinder.position = this._ucMid;
      this.m_Cylinder = cylinder;
      this.m_Book.bound!.updatePaperPosition(this);
      // rollPoint mutates its argument in the new Cylinder implementation,
      // so pass a copy via scratch vector
      this._ucRollResult.copy(startHandle);
      const v = cylinder.rollPoint(this._ucRollResult);
      if (Math.abs(currentHandle.x - v.x) < 0.0001) break;

      if (v.x > currentHandle.x) {
        b.copy(cylinder.position);
      } else {
        a.copy(cylinder.position);
      }
    }
  }

  private rollPoint(point: THREE.Vector3): THREE.Vector3 {
    if (this.m_IsRolling) return this.m_Cylinder.rollPoint(point);

    return point;
  }

  public startAutoTurning(
    mode: AutoTurnMode,
    twist: number,
    bend: number,
    duration: number,
  ): void {
    this.updateTurningRadius(bend);

    this.m_PrevHandle.copy(this.m_CurrentHandle);
    this.m_IsRolling = true;
    this.m_HandleOffset.set(0, 0, 0);

    if (mode === AutoTurnMode.Surface) {
      const scale = this.m_Transform.scale;
      scale.x *= -1;
    }

    this.switchMeshData(MeshDataType.Highpoly);
    this.m_Prev?.trySwitchMeshData(MeshDataType.Lowpoly);
    this.m_Next?.trySwitchMeshData(MeshDataType.Lowpoly);

    this.m_IsFallingLeft = mode === AutoTurnMode.Edge;
    this.m_IsTurning = false;
    this.m_IsFalling = true;
    this.m_FallTime = 0;
    this.m_FallDuration = duration;

    const x = this.m_Size.x;
    const z = this.m_Size.y;

    twist = clamp(twist, -0.99, 0.99);
    const turnStartZ = lerpUnclamped(0.5, 1, twist);
    const turnEndZ = lerpUnclamped(0.5, 0, twist);

    this.m_StartHandle.set(x, 0, z * turnStartZ);
    this.m_EndHandle.set(-x, 0, z * turnEndZ);

    this.m_IsAutoTurning = true;
  }

  // ---- Public getter for the cylinder (used by BookBound etc.) ----

  public get cylinder(): Cylinder {
    return this.m_Cylinder;
  }
}

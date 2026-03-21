/**
 * Ported from Book.cs lines ~14-1080 — Book class (master controller).
 *
 * Unity MonoBehaviour → THREE.Group with manual init/update/dispose lifecycle.
 * Faithfully ports StartTurning, UpdateTurning, StopTurning, SetOpenProgress,
 * Build, Clear, AutoTurning, GetFrontPapers, etc.
 */

import * as THREE from 'three';
import { Paper } from './Paper';
import { PaperSetup } from './PaperSetup';
import { PaperMaterialData } from './PaperMaterialData';
import { BookContent } from './BookContent';
import { BookDirection } from './BookDirection';
import { BookBinding, BookBound } from './BookBinding';
import { MeshFactory, RendererFactory, PaperMeshDataPool } from './Renderer';
import type { IPageContent, IBookOwner, IPaperRenderer, BookRaycastHit } from './types';
import {
  AutoTurnDirection,
  AutoTurnMode,
  AutoTurnSettings,
  AutoTurnSetting,
} from './AutoTurn';

// Re-export BookRaycastHit for consumers that import from './Book'
export type { BookRaycastHit };

// ─────────────────────────────────────────────────────────────────────────────
// BookHeightException (Book.cs lines 1076-1079)
// ─────────────────────────────────────────────────────────────────────────────

export class BookHeightException extends Error {
  constructor() {
    super(
      "The book's height exceeds the maximum limit. Please consider using thinner paper, increasing the width of the paper, or reducing the number of pages.",
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Book (Book.cs lines 14-1074)
// ─────────────────────────────────────────────────────────────────────────────

export interface BookOptions {
  content?: BookContent;
  binding?: BookBinding;
  initialOpenProgress?: number;
  buildOnAwake?: boolean;
  castShadows?: boolean;
  alignToGround?: boolean;
  hideBinder?: boolean;
  reduceShadows?: boolean;
  reduceSubMeshes?: boolean;
  reduceOverdraw?: boolean;
  coverPaperSetup?: Partial<PaperSetupInit>;
  pagePaperSetup?: Partial<PaperSetupInit>;
}

export interface PaperSetupInit {
  color: THREE.Color;
  width: number;
  height: number;
  thickness: number;
  stiffness: number;
  material: THREE.Material | null;
}

export class Book extends THREE.Group implements IBookOwner {
  // Static instances tracking (mirrors C# static HashSet<Book>)
  private static s_Instances: Set<Book> = new Set();
  private static s_InstancesArray: Book[] | null = null;

  static get instances(): Book[] {
    if (Book.s_InstancesArray === null) {
      Book.s_InstancesArray = [...Book.s_Instances];
    }
    return Book.s_InstancesArray;
  }

  // Serialized fields
  private m_Content: BookContent | null = null;
  private m_Binding: BookBinding | null = null;
  private m_InitialOpenProgress: number = 0;
  private m_BuildOnAwake: boolean = true;
  private m_CastShadows: boolean = true;
  private m_AlignToGround: boolean = false;
  private m_HideBinder: boolean = false;
  private m_ReduceShadows: boolean = false;
  private m_ReduceSubMeshes: boolean = false;
  private m_ReduceOverdraw: boolean = false;

  private m_CoverPaperSetup: PaperSetup = new PaperSetup({
    color: new THREE.Color(1, 0, 0),
    width: 2.1,
    height: 3.1,
    thickness: 0.04,
    stiffness: 0.5,
  });

  private m_PagePaperSetup: PaperSetup = new PaperSetup({
    color: new THREE.Color(1, 1, 1),
    width: 2,
    height: 3,
    thickness: 0.02,
    stiffness: 0.2,
  });

  // Runtime state
  private m_Root: THREE.Object3D | null = null;
  private m_IsBuilt: boolean = false;
  private m_HasCover: boolean = false;
  private m_RendererFactory: RendererFactory | null = null;
  private m_MeshFactory: MeshFactory | null = null;
  private m_Bound: BookBound | null = null;
  private m_Papers: Paper[] = [];
  private m_SelectedPaper: Paper | null = null;
  private m_Direction: BookDirection = BookDirection.LeftToRight;

  // Auto turning
  private m_AutoTurnQueue: Array<{
    direction: AutoTurnDirection;
    mode: AutoTurnMode;
    twist: number;
    bend: number;
    duration: number;
    delay: number;
  }> = [];
  private m_AutoTurnTimer: number = 0;
  private m_AutoTurningEndTime: number = -1;
  private m_CurrentTime: number = 0;

  private m_CoverPaperCount: number = 0;
  private m_PagePaperCount: number = 0;
  private m_TotalThickness: number = 0;
  private m_MinPaperWidth: number = 0;
  private m_MinPaperHeight: number = 0;
  private m_MinPaperThickness: number = 0;
  private m_MaxPaperThickness: number = 0;
  private m_RendererIds: number[] = [];
  private m_WasIdle: boolean = false;

  // Deferred update flags
  private m_ContentDirty = false;
  private m_StructuralDirty = false;
  private m_AppliedDirection: BookDirection | undefined = undefined;

  // Front papers cache — invalidated when paper state changes
  private _frontPapersCache: Paper[] | null = null;

  // ── Internal accessors ─────────────────────────────────────────────────

  get minPaperWidth(): number { return this.m_MinPaperWidth; }
  get minPaperHeight(): number { return this.m_MinPaperHeight; }
  get minPaperThickness(): number { return this.m_MinPaperThickness; }
  get maxPaperThickness(): number { return this.m_MaxPaperThickness; }
  get totalThickness(): number { return this.m_TotalThickness; }
  get hasCover(): boolean { return this.m_HasCover; }
  get castShadowsFlag(): boolean { return this.m_CastShadows; }
  /** Alias matching IBookOwner interface expected by Paper.ts */
  get castShadows(): boolean { return this.m_CastShadows; }
  set castShadows(value: boolean) {
    if (this.m_CastShadows === value) return;
    this.m_CastShadows = value;
    this.m_StructuralDirty = true;
  }

  get alignToGround(): boolean { return this.m_AlignToGround; }
  set alignToGround(value: boolean) {
    if (this.m_AlignToGround === value) return;
    this.m_AlignToGround = value;
    this.m_StructuralDirty = true;
  }

  get hideBinder(): boolean { return this.m_HideBinder; }
  set hideBinder(value: boolean) {
    if (this.m_HideBinder === value) return;
    this.m_HideBinder = value;
    this.m_StructuralDirty = true;
  }

  get reduceShadows(): boolean { return this.m_ReduceShadows; }
  set reduceShadows(value: boolean) {
    if (this.m_ReduceShadows === value) return;
    this.m_ReduceShadows = value;
    this.m_StructuralDirty = true;
  }

  get reduceSubMeshes(): boolean { return this.m_ReduceSubMeshes; }
  set reduceSubMeshes(value: boolean) {
    if (this.m_ReduceSubMeshes === value) return;
    this.m_ReduceSubMeshes = value;
    this.m_StructuralDirty = true;
  }

  get reduceOverdraw(): boolean { return this.m_ReduceOverdraw; }
  set reduceOverdraw(value: boolean) {
    if (this.m_ReduceOverdraw === value) return;
    this.m_ReduceOverdraw = value;
    this.m_StructuralDirty = true;
  }

  get coverPaperSetup(): PaperSetup { return this.m_CoverPaperSetup; }
  set coverPaperSetup(value: Partial<PaperSetupInit>) {
    const old = this.m_CoverPaperSetup;
    const w = value.width ?? old.width;
    const h = value.height ?? old.height;
    const t = value.thickness ?? old.thickness;
    const s = value.stiffness ?? old.stiffness;
    if (old.width === w && old.height === h && old.thickness === t && old.stiffness === s) return;
    this.m_CoverPaperSetup = new PaperSetup({
      color: value.color ?? old.color,
      width: w, height: h, thickness: t, stiffness: s,
      material: value.material !== undefined ? value.material : old.material,
    });
    this.m_StructuralDirty = true;
  }

  get pagePaperSetup(): PaperSetup { return this.m_PagePaperSetup; }
  set pagePaperSetup(value: Partial<PaperSetupInit>) {
    const old = this.m_PagePaperSetup;
    const w = value.width ?? old.width;
    const h = value.height ?? old.height;
    const t = value.thickness ?? old.thickness;
    const s = value.stiffness ?? old.stiffness;
    if (old.width === w && old.height === h && old.thickness === t && old.stiffness === s) return;
    this.m_PagePaperSetup = new PaperSetup({
      color: value.color ?? old.color,
      width: w, height: h, thickness: t, stiffness: s,
      material: value.material !== undefined ? value.material : old.material,
    });
    this.m_StructuralDirty = true;
  }
  get bound(): BookBound | null { return this.m_Bound; }
  get papers(): Paper[] { return this.m_Papers; }
  get rendererIds(): number[] { return this.m_RendererIds; }
  get direction(): BookDirection { return this.m_Direction; }

  // ── Public API (properties) ────────────────────────────────────────────

  get binding(): BookBinding | null { return this.m_Binding; }
  set binding(value: BookBinding | null) {
    if (this.m_Binding === value) return;
    this.m_Binding = value;
    this.m_StructuralDirty = true;
  }

  get content(): BookContent | null { return this.m_Content; }
  set content(value: BookContent | null) {
    if (this.m_Content === value) return;
    this.m_Content = value;
    this.m_ContentDirty = true;
  }

  get initialOpenProgress(): number { return this.m_InitialOpenProgress; }
  set initialOpenProgress(value: number) {
    this.m_InitialOpenProgress = THREE.MathUtils.clamp(value, 0, 1);
  }

  get isBuilt(): boolean { return this.m_IsBuilt; }

  get paperCount(): number { return this.m_CoverPaperCount + this.m_PagePaperCount; }
  get coverPaperCount(): number { return this.m_CoverPaperCount; }
  get pagePaperCount(): number { return this.m_PagePaperCount; }

  get isTurning(): boolean {
    return this.m_SelectedPaper !== null && this.m_SelectedPaper.isTurning;
  }

  get isFalling(): boolean {
    for (const paper of this.m_Papers) {
      if (paper.isFalling) return true;
    }
    return false;
  }

  get isIdle(): boolean {
    return !this.isTurning && !this.isFalling && !this.isAutoTurning;
  }

  get isAutoTurning(): boolean {
    return this.m_AutoTurningEndTime > this.m_CurrentTime;
  }

  get hasPendingAutoTurns(): boolean {
    return this.m_AutoTurnQueue.length > 0;
  }

  get autoTurningEndTime(): number {
    return this.m_AutoTurningEndTime;
  }

  /** Current open progress (0-1), read from actual paper positions. */
  get openProgress(): number {
    return this.getCurrentOpenProgress();
  }

  // ── Constructor ────────────────────────────────────────────────────────

  constructor(options?: BookOptions) {
    super();

    if (options) {
      if (options.content) this.m_Content = options.content;
      if (options.binding) this.m_Binding = options.binding;
      if (options.initialOpenProgress !== undefined) this.m_InitialOpenProgress = THREE.MathUtils.clamp(options.initialOpenProgress, 0, 1);
      if (options.buildOnAwake !== undefined) this.m_BuildOnAwake = options.buildOnAwake;
      if (options.castShadows !== undefined) this.m_CastShadows = options.castShadows;
      if (options.alignToGround !== undefined) this.m_AlignToGround = options.alignToGround;
      if (options.hideBinder !== undefined) this.m_HideBinder = options.hideBinder;
      if (options.reduceShadows !== undefined) this.m_ReduceShadows = options.reduceShadows;
      if (options.reduceSubMeshes !== undefined) this.m_ReduceSubMeshes = options.reduceSubMeshes;
      if (options.reduceOverdraw !== undefined) this.m_ReduceOverdraw = options.reduceOverdraw;

      if (options.coverPaperSetup) {
        this.m_CoverPaperSetup = new PaperSetup({
          color: options.coverPaperSetup.color ?? new THREE.Color(1, 0, 0),
          width: options.coverPaperSetup.width ?? 2.1,
          height: options.coverPaperSetup.height ?? 3.1,
          thickness: options.coverPaperSetup.thickness ?? 0.04,
          stiffness: options.coverPaperSetup.stiffness ?? 0.5,
          material: options.coverPaperSetup.material ?? null,
        });
      }

      if (options.pagePaperSetup) {
        this.m_PagePaperSetup = new PaperSetup({
          color: options.pagePaperSetup.color ?? new THREE.Color(1, 1, 1),
          width: options.pagePaperSetup.width ?? 2,
          height: options.pagePaperSetup.height ?? 3,
          thickness: options.pagePaperSetup.thickness ?? 0.02,
          stiffness: options.pagePaperSetup.stiffness ?? 0.2,
          material: options.pagePaperSetup.material ?? null,
        });
      }
    }

    Book.s_Instances.add(this);
    Book.s_InstancesArray = null;
  }

  // ── Public API (methods) ───────────────────────────────────────────────

  startTurning(ray: THREE.Ray): boolean {
    if (!this.m_IsBuilt) return false;
    if (this.isTurning) return false;

    const frontPapers = this.getFrontPapers();

    for (const paper of frontPapers) {
      const result = paper.raycast(ray);
      if (result.hit) {
        if (result.hitInfo.pageContent!.isPointOverUI(result.hitInfo.textureCoordinate)) return false;
      }
    }

    for (const paper of frontPapers) {
      if (!paper.isFalling && paper.startTurning(ray)) {
        this.m_SelectedPaper = paper;
        // Invalidate front papers cache since turning state changed
        this._frontPapersCache = null;
        return true;
      }
    }

    return false;
  }

  updateTurning(ray: THREE.Ray): void {
    if (!this.m_IsBuilt) return;
    if (this.m_SelectedPaper === null) return;
    this.m_SelectedPaper.updateTurning(ray);
  }

  stopTurning(): void {
    if (!this.m_IsBuilt) return;
    if (this.m_SelectedPaper === null) return;
    this.m_SelectedPaper.stopTurning();
    this.m_SelectedPaper = null;
    // Invalidate front papers cache since turning state changed
    this._frontPapersCache = null;
  }

  getActivePaperSideIndices(indices: Set<number>): void {
    indices.clear();

    if (!this.m_IsBuilt) return;

    const reverse = this.m_Content!.direction === BookDirection.RightToLeft;
    const n = this.m_Papers.length;

    const add = (paperIndex: number, isBackPage: boolean): void => {
      let pageIndex = paperIndex * 2;
      if (isBackPage) pageIndex++;
      if (reverse) pageIndex = n * 2 - pageIndex - 1;
      indices.add(pageIndex);
    };

    for (let i = 0; i < n; i++) {
      const paper = this.m_Papers[i];
      if (paper.isFalling || paper.isTurning) {
        if (i > 0) add(i - 1, true);
        add(i, false);
        add(i, true);
        if (i < n - 1) add(i + 1, false);
      } else if (paper.isOnRightStack) {
        if (i > 0) add(i - 1, true);
        add(i, false);
        break;
      }
    }

    if (indices.size === 0) {
      add(this.m_Papers.length - 1, true);
    }

    // Note: Set iteration order matches insertion order, which is already
    // correct for the non-reverse case. For reverse, the caller should
    // not depend on iteration order.
  }

  /**
   * Sets the book's open progress to a value between 0 (fully closed) and 1 (fully open).
   * This cancels any pending auto turns and immediately moves all papers to match
   * the requested progress.
   */
  setOpenProgress(openProgress: number): void {
    this.cancelPendingAutoTurns();

    if (this.m_Content!.direction % 2 !== 0) {
      openProgress = 1 - openProgress;
    }

    const pc = this.m_Papers.length;
    const j = Math.round(THREE.MathUtils.lerp(0, pc, openProgress));
    for (let i = 0; i < pc; i++) {
      const rightStack = i >= j;
      this.m_Papers[i].restState(rightStack);
    }

    for (let i = 0; i < pc; i++) {
      this.m_Papers[i].restMesh();
    }

    this.m_WasIdle = false;
    // Invalidate front papers cache since paper states changed
    this._frontPapersCache = null;
  }

  setOpenProgressByIndex(paperSideIndex: number): void {
    const openProgress = this.m_Content!.convertPaperSideIndexToOpenProgress(paperSideIndex);
    this.setOpenProgress(openProgress);
  }

  // ── Auto Turning ──────────────────────────────────────────────────────

  /**
   * Starts auto-turning pages in the given direction.
   * @param direction - Which direction to turn (Next or Back)
   * @param settings - Turn animation settings (twist, bend, duration)
   * @param turnCount - Number of pages to turn
   * @param delayPerTurn - Delay between consecutive turns (number in seconds, or AutoTurnSetting)
   * @returns true if at least one turn was queued
   */
  startAutoTurning(
    direction: AutoTurnDirection,
    settings: AutoTurnSettings,
    turnCount: number = 1,
    delayPerTurn: number | AutoTurnSetting = 0,
  ): boolean {
    if (!this.m_IsBuilt) return false;

    this.cancelPendingAutoTurns();

    const delaySetting = typeof delayPerTurn === 'number'
      ? new AutoTurnSetting(delayPerTurn)
      : delayPerTurn;

    turnCount = Math.min(turnCount, this.getMaxAutoTurnCount(direction));
    if (turnCount === 0) return false;

    // Queue all turns (replaces coroutine)
    for (let i = 0; i < turnCount; i++) {
      if (!this.canAutoTurn(direction)) break;
      const turnIndexTime = i / (turnCount - 1 || 1);
      const paperIndexTime = this.getAutoTurnPaperIndexTime(direction);
      const delay = i > 0 ? delaySetting.getValue(paperIndexTime, turnIndexTime) : 0;
      const mode = settings.getModeValue();
      const twist = settings.getTwistValue(paperIndexTime, turnIndexTime);
      const bend = settings.getBendValue(paperIndexTime, turnIndexTime);
      const duration = settings.getDurationValue(paperIndexTime, turnIndexTime);

      this.m_AutoTurnQueue.push({ direction, mode, twist, bend, duration, delay });
    }

    this.m_AutoTurnTimer = 0;
    // Invalidate front papers cache since auto-turning will change paper states
    this._frontPapersCache = null;
    return true;
  }

  cancelPendingAutoTurns(): void {
    this.m_AutoTurnQueue.length = 0;
  }

  private processAutoTurnQueue(dt: number): void {
    if (this.m_AutoTurnQueue.length === 0) return;

    this.m_AutoTurnTimer -= dt;
    if (this.m_AutoTurnTimer > 0) return;

    const turn = this.m_AutoTurnQueue[0];
    if (!this.canAutoTurn(turn.direction)) {
      this.m_AutoTurnQueue.length = 0;
      return;
    }

    const paper = this.getAutoTurnPaper(turn.direction);
    if (paper === null) {
      this.m_AutoTurnQueue.length = 0;
      return;
    }

    paper.startAutoTurning(turn.mode, turn.twist, turn.bend, turn.duration);
    this.m_AutoTurningEndTime = Math.max(
      this.m_AutoTurningEndTime,
      this.m_CurrentTime + turn.duration,
    );

    this.m_AutoTurnQueue.shift();
    // Invalidate front papers cache since a paper started auto-turning
    this._frontPapersCache = null;

    if (this.m_AutoTurnQueue.length > 0) {
      this.m_AutoTurnTimer = this.m_AutoTurnQueue[0].delay;
    }
  }

  private getAutoTurnPaper(direction: AutoTurnDirection): Paper | null {
    if (this.isTurning) return null;

    const papers = this.getFrontPapers();
    if (papers.length > 0) {
      const next = direction === AutoTurnDirection.Next;
      const paper = papers[next ? papers.length - 1 : 0];
      if (!paper.isTurning && !paper.isFalling && next === paper.isOnRightStack) {
        return paper;
      }
    }

    return null;
  }

  private getMaxAutoTurnCount(direction: AutoTurnDirection): number {
    const paper = this.getAutoTurnPaper(direction);
    if (paper === null) return 0;

    let count = 1;
    if (direction === AutoTurnDirection.Next) {
      count += this.m_Papers.length - paper.index - 1;
    } else {
      count += paper.index;
    }
    return count;
  }

  private canAutoTurn(direction: AutoTurnDirection): boolean {
    return this.getAutoTurnPaper(direction) !== null;
  }

  private getAutoTurnPaperIndexTime(direction: AutoTurnDirection): number {
    const paper = this.getAutoTurnPaper(direction);
    if (paper === null) return 0;
    return paper.index / (this.m_Papers.length - 1 || 1);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  /**
   * Initialize the book. Call this after adding to scene.
   * Equivalent to Unity's Start/Awake.
   */
  init(): void {
    Book.s_Instances.add(this);
    Book.s_InstancesArray = null;
    this.hardClear();

    if (this.m_BuildOnAwake) {
      this.build();
      this.m_ContentDirty = false;
      this.m_StructuralDirty = false;
      this.m_AppliedDirection = this.m_Content?.direction;
    }
  }

  /**
   * Call every frame with delta time in seconds.
   * Equivalent to Unity's LateUpdate.
   * @param dt - Delta time in seconds since the last frame
   */
  update(dt: number): void {
    this.m_CurrentTime += dt;

    // Apply deferred property changes
    if (this.m_IsBuilt) {
      if (this.m_StructuralDirty) {
        this.m_StructuralDirty = false;
        this.m_ContentDirty = false;
        const progress = this.getCurrentOpenProgress();
        this.build();
        this.setOpenProgress(progress);
        this.m_AppliedDirection = this.m_Content?.direction;
      } else if (this.m_ContentDirty) {
        this.m_ContentDirty = false;
        if (this.m_Content) {
          this.m_Content.init(this);
          const directionChanged = this.m_Content.direction !== this.m_AppliedDirection;
          this.m_AppliedDirection = this.m_Content.direction;
          if (directionChanged || !this.refreshContent()) {
            const progress = this.getCurrentOpenProgress();
            this.build();
            this.setOpenProgress(progress);
          }
        }
      }
    }

    if (!this.m_IsBuilt) return;
    if (this.m_Papers.length === 0) return;
    if (this.m_Bound === null) return;

    // Process auto turn queue
    this.processAutoTurnQueue(dt);

    if (!(this.m_WasIdle && this.isIdle)) {
      this.m_WasIdle = this.isIdle;

      for (const paper of this.m_Papers) {
        if (paper.isFalling) {
          paper.updateFalling(dt);
        }
      }

      // Invalidate front papers cache after falling updates (paper states may have changed)
      this._frontPapersCache = null;

      this.updateLivePages();
      this.m_Bound.onLateUpdate();
    }
  }

  /**
   * Dispose the book and release all resources.
   * MANDATORY: You must call dispose() when removing a Book to prevent memory leaks.
   * The Book holds a reference in the static `s_Instances` set; without dispose(),
   * it will never be garbage collected.
   */
  dispose(): void {
    Book.s_Instances.delete(this);
    Book.s_InstancesArray = null;
    this.hardClear();
  }

  // ── Build ─────────────────────────────────────────────────────────────

  private build(): void {
    this.clear();
    if (this.m_Content === null || this.m_Content.isEmpty) return;
    if (this.m_Binding === null) return;
    if (this.m_MeshFactory === null) this.m_MeshFactory = new MeshFactory();

    if (this.m_RendererFactory === null) {
      const root = new THREE.Object3D();
      root.name = 'Root';
      this.add(root);
      this.m_Root = root;
      this.m_RendererFactory = new RendererFactory(this.m_Root);
    }

    this.m_Direction = this.m_Content.direction;

    const y = this.m_Direction > 1 ? (Math.PI / 2) : 0;
    this.m_Root!.rotation.set(0, y, 0);

    this.m_CoverPaperSetup.bookDirection = this.m_Content.direction;
    this.m_PagePaperSetup.bookDirection = this.m_Content.direction;

    if (this.m_PagePaperSetup.height < this.m_CoverPaperSetup.height) {
      this.m_CoverPaperSetup.margin = 0;
      this.m_PagePaperSetup.margin = (this.m_CoverPaperSetup.height - this.m_PagePaperSetup.height) / 2;
    } else {
      this.m_CoverPaperSetup.margin = (this.m_PagePaperSetup.height - this.m_CoverPaperSetup.height) / 2;
      this.m_PagePaperSetup.margin = 0;
    }

    const coverMaterialData = new PaperMaterialData(this.m_CoverPaperSetup);
    const paperMaterialData = new PaperMaterialData(this.m_PagePaperSetup);

    this.m_Content.init(this);

    let covers = this.m_Content.coverContents;
    let pages = this.m_Content.pageContents;

    let openState = this.m_InitialOpenProgress;

    if (this.m_Content.direction % 2 !== 0) {
      covers = [...covers].reverse();
      pages = [...pages].reverse();
      openState = 1 - openState;
    }

    this.m_HasCover = covers.length > 0;

    this.m_CoverPaperCount = Math.floor(covers.length / 2);
    this.m_PagePaperCount = Math.floor(pages.length / 2);

    const pc = this.m_CoverPaperCount + this.m_PagePaperCount;
    const halfCoverPaperCount = Math.floor(covers.length / 4);

    let pageIndex = 0;
    let coverIndex = 0;
    let totalThickness = 0;
    this.m_Papers = new Array(pc);

    for (let i = 0; i < pc; i++) {
      const isCover = this.m_HasCover && (i < halfCoverPaperCount || i >= pc - halfCoverPaperCount);

      const bookRenderer = this.m_RendererFactory!.get('Paper');
      const paper = (this.m_Papers[i] = new Paper(isCover, i, this, bookRenderer));
      paper.renderer.castShadows = this.m_CastShadows;

      if (i < Math.round(THREE.MathUtils.lerp(0, pc, openState))) {
        paper.transform.scale.set(-1, 1, 1);
        paper.setTime(1);
      }

      if (isCover) {
        paper.setContentData(covers[coverIndex++], covers[coverIndex++], i > halfCoverPaperCount);
        paper.setMaterialData(coverMaterialData);
        paper.setPaperSetup(this.m_CoverPaperSetup);
      } else {
        paper.setContentData(pages[pageIndex++], pages[pageIndex++]);
        paper.setMaterialData(paperMaterialData);
        paper.setPaperSetup(this.m_PagePaperSetup);
      }

      totalThickness += paper.thickness;
    }

    this.m_TotalThickness = totalThickness;

    const thickness0 = this.m_Papers[0].thickness;
    const thickness1 = this.m_Papers[Math.floor(pc / 2)].thickness;
    this.m_MinPaperThickness = Math.min(thickness0, thickness1);
    this.m_MaxPaperThickness = Math.max(thickness0, thickness1);
    const width0 = this.m_Papers[0].size.x;
    const width1 = this.m_Papers[Math.floor(pc / 2)].size.x;
    this.m_MinPaperWidth = Math.min(width0, width1);
    const height0 = this.m_Papers[0].size.y;
    const height1 = this.m_Papers[Math.floor(pc / 2)].size.y;
    this.m_MinPaperHeight = Math.min(height0, height1);

    this.m_Bound = this.m_Binding.createBound(
      this,
      this.m_Root!,
      this.m_RendererFactory!,
      this.m_MeshFactory!,
    );
    this.m_Bound.binderRenderer.setVisibility(!this.m_HideBinder);

    const reduceOverdraw = this.m_ReduceOverdraw && pages.length > 0;
    const reduceSubMeshes = this.m_ReduceSubMeshes;

    const paperLowpolyMeshDataPool = this.createPaperMeshDataPool(this.m_PagePaperSetup, true, reduceSubMeshes);
    const paperLowpolyHoleMeshDataPool = reduceOverdraw
      ? this.createPaperMeshDataPool(this.m_PagePaperSetup, true, reduceSubMeshes, true)
      : null;
    const paperHighpolyMeshDataPool = this.createPaperMeshDataPool(this.m_PagePaperSetup, false);

    const coverLowpolyMeshDataPool = this.createPaperMeshDataPool(this.m_CoverPaperSetup, true);
    const coverHighpolyMeshDataPool = this.createPaperMeshDataPool(this.m_CoverPaperSetup, false);

    const midIndexA = Math.floor(pc / 2) - 1;
    const midIndexB = midIndexA + 1;

    // StapleBookBinding detection — use discriminant property instead of constructor name
    const isStapleBookBinding = this.m_Bound?.bindingType === 'staple';

    for (let i = 0; i < pc; i++) {
      const paper = this.m_Papers[i];

      if (i !== 0) paper.prev = this.m_Papers[i - 1];
      if (i !== pc - 1) paper.next = this.m_Papers[i + 1];
      paper.noHole = isStapleBookBinding && (i === midIndexA || i === midIndexB);

      if (paper.isCover) {
        paper.setMeshData(coverLowpolyMeshDataPool.get(), null, coverHighpolyMeshDataPool);
      } else {
        paper.setMeshData(
          paperLowpolyMeshDataPool.get(),
          paperLowpolyHoleMeshDataPool?.get() ?? null,
          paperHighpolyMeshDataPool,
        );
      }
    }

    this.m_IsBuilt = true;
    this.m_RendererIds = this.m_RendererFactory!.ids;
    // Invalidate front papers cache after rebuild
    this._frontPapersCache = null;

    // Skip GPU instancing (Unity-specific)

    this.update(0);

    this.m_CoverPaperSetup.bookDirection = BookDirection.LeftToRight;
    this.m_PagePaperSetup.bookDirection = BookDirection.LeftToRight;
  }

  /**
   * Clears the built state of the book.
   * NOTE: This does NOT call super.clear() — it has different semantics from
   * THREE.Group.clear(). It resets internal book state (papers, bound, flags)
   * without removing children from the Three.js scene graph.
   */
  override clear(): this {
    this.m_CoverPaperCount = this.m_PagePaperCount = 0;
    this.m_IsBuilt = false;
    this.m_WasIdle = false;
    this.m_Bound?.dispose();
    this.m_Bound = null;
    this._frontPapersCache = null;

    if (this.m_MeshFactory !== null) this.m_MeshFactory.recycle();
    if (this.m_RendererFactory !== null) this.m_RendererFactory.recycle();
    return this;
  }

  private hardClear(): void {
    this.m_CoverPaperCount = this.m_PagePaperCount = 0;
    this.m_IsBuilt = false;
    this.m_WasIdle = false;
    this.m_Bound?.dispose();
    this.m_Bound = null;
    this._frontPapersCache = null;

    // Remove root child
    if (this.m_Root !== null) {
      this.remove(this.m_Root);
      this.m_Root = null;
    }

    if (this.m_MeshFactory !== null) {
      this.m_MeshFactory.destroy();
      this.m_MeshFactory = null;
    }

    if (this.m_RendererFactory !== null) {
      this.m_RendererFactory.destroy();
      this.m_RendererFactory = null;
    }
  }

  private createPaperMeshDataPool(
    setup: PaperSetup,
    lowpoly: boolean,
    reduceSubMeshes: boolean = false,
    reduceOverdraw: boolean = false,
  ): PaperMeshDataPool {
    const quality = lowpoly ? 0 : setup.quality;
    const pattern = this.m_Bound!.createPaperPattern(
      quality,
      setup.size,
      setup.thickness,
      setup.uvMargin,
      reduceOverdraw,
      reduceSubMeshes,
    );
    const pool = new PaperMeshDataPool(
      this.m_MeshFactory!,
      pattern,
      lowpoly && this.m_Bound!.useSharedMeshDataForLowpoly,
    );
    return pool;
  }

  // ── Query methods ─────────────────────────────────────────────────────

  private getFrontPapers(): Paper[] {
    if (this._frontPapersCache !== null) {
      return this._frontPapersCache;
    }

    const frontPapers: Paper[] = [];

    if (this.m_SelectedPaper !== null) {
      const i = this.m_SelectedPaper.index;
      if (i > 0) frontPapers.push(this.m_Papers[i - 1]);
      frontPapers.push(this.m_SelectedPaper);
      if (i < this.m_Papers.length - 1) frontPapers.push(this.m_Papers[i + 1]);
    } else {
      for (let i = 0; i < this.m_Papers.length; i++) {
        if (this.m_Papers[i].isOnRightStack) {
          if (i > 0) frontPapers.push(this.m_Papers[i - 1]);
          frontPapers.push(this.m_Papers[i]);
          break;
        }
      }

      if (frontPapers.length === 0) {
        frontPapers.push(this.m_Papers[this.m_Papers.length - 1]);
      }
    }

    this._frontPapersCache = frontPapers;
    return frontPapers;
  }

  getAverageTime(): number {
    const pc = this.m_Papers.length;
    let time = 0;
    for (const pp of this.m_Papers) {
      pp.updateTime();
      time += pp.zTime;
    }
    time /= pc;
    return time;
  }

  bookRaycast(ray: THREE.Ray): BookRaycastHit | null {
    const frontPapers = this.getFrontPapers();
    for (const paper of frontPapers) {
      const result = paper.raycast(ray);
      if (result.hit) return result.hitInfo;
    }
    return null;
  }

  /**
   * Re-apply all page/cover textures from the current BookContent
   * to existing papers without rebuilding geometry.
   * Returns false if a structural rebuild is needed (page count changed).
   */
  private refreshContent(): boolean {
    if (!this.m_IsBuilt || !this.m_Content) return false;

    let covers = this.m_Content.coverContents;
    let pages = this.m_Content.pageContents;

    const newCoverPaperCount = Math.floor(covers.length / 2);
    const newPagePaperCount = Math.floor(pages.length / 2);

    if (
      newCoverPaperCount !== this.m_CoverPaperCount ||
      newPagePaperCount !== this.m_PagePaperCount
    ) {
      return false;
    }

    if (this.m_Content.direction % 2 !== 0) {
      covers = [...covers].reverse();
      pages = [...pages].reverse();
    }

    const pc = this.m_Papers.length;
    const halfCoverPaperCount = Math.floor(covers.length / 4);

    let pageIndex = 0;
    let coverIndex = 0;

    for (let i = 0; i < pc; i++) {
      const paper = this.m_Papers[i];
      const isCover =
        this.m_HasCover &&
        (i < halfCoverPaperCount || i >= pc - halfCoverPaperCount);

      if (isCover) {
        paper.setContentData(
          covers[coverIndex++],
          covers[coverIndex++],
          i > halfCoverPaperCount,
        );
      } else {
        paper.setContentData(pages[pageIndex++], pages[pageIndex++]);
      }

      paper.updateMaterials();
    }

    this.m_WasIdle = false;
    return true;
  }

  private getCurrentOpenProgress(): number {
    const pc = this.m_Papers.length;
    if (pc === 0) return this.m_InitialOpenProgress;

    let leftCount = 0;
    for (const paper of this.m_Papers) {
      if (!paper.isOnRightStack) leftCount++;
    }

    let progress = leftCount / pc;

    if (this.m_Content && this.m_Content.direction % 2 !== 0) {
      progress = 1 - progress;
    }

    return progress;
  }

  // ── Live Pages ────────────────────────────────────────────────────────

  private updateLivePages(): void {
    const activePages = new Set<IPageContent>();

    const n = this.m_Papers.length;
    for (let i = 0; i < n; i++) {
      const paper = this.m_Papers[i];
      if (paper.isFalling || paper.isTurning) {
        if (i > 0) activePages.add(this.m_Papers[i - 1].backContent);
        activePages.add(paper.frontContent);
        activePages.add(paper.backContent);
        if (i < n - 1) activePages.add(this.m_Papers[i + 1].frontContent);
      } else if (paper.isOnRightStack) {
        if (i > 0) activePages.add(this.m_Papers[i - 1].backContent);
        activePages.add(paper.frontContent);
        break;
      }
    }

    if (activePages.size === 0) {
      activePages.add(this.m_Papers[this.m_Papers.length - 1].backContent);
    }

    for (const paper of this.m_Papers) {
      paper.frontContent.setActive(activePages.has(paper.frontContent));
      paper.backContent.setActive(activePages.has(paper.backContent));
    }
  }
}

import * as THREE from 'three';
import { PaperPattern } from './PaperPattern';
import { PaperUVMargin } from './PaperUVMargin';
import { PaperNode } from './PaperNode';

// ─────────────────────────────────────────────────────────────────────────────
// PaperSeam  (ported from Book.cs lines ~2432-2449)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Describes a seam (extra split) in the paper mesh along one axis.
 * C# struct — emulated with clone().
 */
export class PaperSeam {
  public active: boolean;
  public prevIndex: number;
  public index: number;
  public nextIndex: number;
  public time: number;

  constructor(
    prevIndex: number,
    index: number,
    nextIndex: number,
    time: number,
  ) {
    this.active = true;
    this.prevIndex = prevIndex;
    this.index = index;
    this.nextIndex = nextIndex;
    this.time = time;
  }

  public clone(): PaperSeam {
    const s = new PaperSeam(this.prevIndex, this.index, this.nextIndex, this.time);
    s.active = this.active;
    return s;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PaperBorder  (ported from Book.cs lines ~2451-2469)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rectangle defined by two corner indices (startX/Z, endX/Z) plus flip/left flags.
 * C# struct — emulated with clone().
 */
export class PaperBorder {
  public startX: number;
  public startZ: number;
  public endX: number;
  public endZ: number;
  public flip: boolean;
  public left: boolean;

  constructor(
    startX: number,
    startZ: number,
    endX: number,
    endZ: number,
    flip: boolean,
    left: boolean = true,
  ) {
    this.startX = startX;
    this.startZ = startZ;
    this.endX = endX;
    this.endZ = endZ;
    this.flip = flip;
    this.left = left;
  }

  public clone(): PaperBorder {
    return new PaperBorder(
      this.startX,
      this.startZ,
      this.endX,
      this.endZ,
      this.flip,
      this.left,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PaperNodeMargin  (ported from Book.cs lines ~2471-2509)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates four seam nodes (left, right, down, up) from a UV margin and
 * inserts them into the existing X / Z linked-lists.
 */
export class PaperNodeMargin {
  public leftNode: PaperNode;
  public rightNode: PaperNode;
  public downNode: PaperNode;
  public upNode: PaperNode;

  constructor(pattern: PaperPattern, margin: PaperUVMargin, hole: boolean) {
    const size: THREE.Vector2 = pattern.size;
    this.leftNode = new PaperNode(margin.left * size.x, hole, true);
    this.rightNode = new PaperNode((1 - margin.right) * size.x, hole, true);
    this.downNode = new PaperNode(margin.down * size.y, hole, true);
    this.upNode = new PaperNode((1 - margin.up) * size.y, hole, true);
  }

  public insert(
    xRootNode: PaperNode,
    zRootNode: PaperNode,
    xSeamNodes: PaperNode[],
    zSeamNodes: PaperNode[],
  ): void {
    if (xRootNode.insert(this.leftNode)) {
      xSeamNodes.push(this.leftNode);
    }

    if (xRootNode.insert(this.rightNode)) {
      xSeamNodes.push(this.rightNode);
    }

    if (zRootNode.insert(this.downNode)) {
      zSeamNodes.push(this.downNode);
    }

    if (zRootNode.insert(this.upNode)) {
      zSeamNodes.push(this.upNode);
    }
  }
}

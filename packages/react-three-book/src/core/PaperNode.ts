/**
 * Ported from Book.cs — PaperNode class (lines ~2292-2430).
 *
 * Doubly-linked-list node used during paper mesh tessellation.
 * Each node stores a 1-D position `value` along an axis, plus flags
 * that mark whether it sits on a hole or a seam.
 */
export class PaperNode {
  public prev: PaperNode | null = null;
  public next: PaperNode | null = null;
  public value: number;
  public index: number = 0;
  public hole: boolean;
  public seam: boolean;

  constructor(value: number, hole: boolean = false, seam: boolean = false) {
    this.value = value;
    this.hole = hole;
    this.seam = seam;
  }

  // ── Navigation properties ─────────────────────────────────────────────

  get prevNoneSeam(): PaperNode {
    if (this.prev!.seam) return this.prev!.prevNoneSeam;
    return this.prev!;
  }

  get nextNoneSeam(): PaperNode {
    if (this.next!.seam) return this.next!.nextNoneSeam;
    return this.next!;
  }

  get prevNoneHole(): PaperNode {
    if (this.prev!.hole) return this.prev!.prevNoneHole;
    return this.prev!;
  }

  get nextNoneHole(): PaperNode {
    if (this.next!.hole) return this.next!.nextNoneHole;
    return this.next!;
  }

  // ── Factory helpers ───────────────────────────────────────────────────

  public createNext(
    value: number,
    hole: boolean = false,
    seam: boolean = false,
  ): PaperNode {
    const node = new PaperNode(value, hole, seam);
    node.prev = this;
    this.next = node;
    return node;
  }

  // C# had a double overload — in TS numbers are already IEEE 754 doubles.
  // Keeping a separate method for parity; it simply casts to number.
  public createNextFromDouble(
    value: number,
    hole: boolean = false,
    seam: boolean = false,
  ): PaperNode {
    const node = new PaperNode(value, hole, seam);
    node.prev = this;
    this.next = node;
    return node;
  }

  // ── Insertion (sorted linked-list insert) ─────────────────────────────

  public insert(node: PaperNode): boolean {
    if (this.value >= node.value) return false;

    if (this.next === null) {
      /*
      // Debug.Log($"value:{value} node.value:{ node.value}");
      // next = node;
      // node.prev = this;
      */
      return false;
    }

    if (this.next.value > node.value) {
      if (Math.abs(this.value - node.value) < 0.0001) return false;
      if (Math.abs(this.next.value - node.value) < 0.0001) return false;

      this.next.prev = node;
      node.next = this.next;
      node.prev = this;
      this.next = node;
      node.hole = this.hole;
      return true;
    }

    return this.next.insert(node);
  }

  // ── Index assignment (recursive) ──────────────────────────────────────

  public updateIndex(index: number): void {
    this.index = index;
    if (this.next === null) return;
    this.next.updateIndex(index + 1);
  }

  // ── Value collection ──────────────────────────────────────────────────

  public getValues(): number[];
  public getValues(values: number[]): void;
  public getValues(values?: number[]): number[] | void {
    if (values === undefined) {
      const result: number[] = [];
      this._getValuesRecursive(result);
      return result;
    }
    this._getValuesRecursive(values);
  }

  private _getValuesRecursive(values: number[]): void {
    values.push(this.value);
    if (this.next === null) return;
    this.next._getValuesRecursive(values);
  }

  // ── Hole collection ───────────────────────────────────────────────────

  public getHoles(): boolean[];
  public getHoles(holes: boolean[]): void;
  public getHoles(holes?: boolean[]): boolean[] | void {
    if (holes === undefined) {
      const result: boolean[] = [];
      this._getHolesRecursive(result);
      return result;
    }
    this._getHolesRecursive(holes);
  }

  private _getHolesRecursive(holes: boolean[]): void {
    holes.push(this.hole);
    if (this.next === null) return;
    this.next._getHolesRecursive(holes);
  }
}

import * as THREE from 'three';
import { BookDirection } from './BookDirection';

/**
 * Ported from Book.cs — PaperUVMargin struct (lines ~1714-1796).
 *
 * Defines the blank space around content on each of the four sides.
 * C# struct — emulated with clone().
 */
export class PaperUVMargin {
  /** @internal */ private static readonly kMin: number = 0;
  /** @internal */ private static readonly kMax: number = 0.25;

  // Range(kMin, kMax) for each field
  private m_Left: number = 0;
  private m_Right: number = 0;
  private m_Down: number = 0;
  private m_Up: number = 0;

  // ── Properties ────────────────────────────────────────────────────────

  get left(): number {
    return this.m_Left;
  }
  set left(value: number) {
    this.m_Left = this.clamp(value);
  }

  get right(): number {
    return this.m_Right;
  }
  set right(value: number) {
    this.m_Right = this.clamp(value);
  }

  get down(): number {
    return this.m_Down;
  }
  set down(value: number) {
    this.m_Down = this.clamp(value);
  }

  get up(): number {
    return this.m_Up;
  }
  set up(value: number) {
    this.m_Up = this.clamp(value);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private clamp(value: number): number {
    return Math.max(PaperUVMargin.kMin, Math.min(value, PaperUVMargin.kMax));
  }

  // ── Transform ─────────────────────────────────────────────────────────

  /**
   * Returns a new PaperUVMargin with margins remapped according to the
   * book direction.
   */
  public transform(direction: BookDirection): PaperUVMargin {
    const margin = new PaperUVMargin();
    switch (direction) {
      case BookDirection.LeftToRight:
        margin.m_Left = this.m_Left;
        margin.m_Right = this.m_Right;
        margin.m_Down = this.m_Down;
        margin.m_Up = this.m_Up;
        break;
      case BookDirection.RightToLeft:
        margin.m_Left = this.m_Right;
        margin.m_Right = this.m_Left;
        margin.m_Down = this.m_Down;
        margin.m_Up = this.m_Up;
        break;
      case BookDirection.UpToDown:
        margin.m_Left = this.m_Up;
        margin.m_Right = this.m_Down;
        margin.m_Down = this.m_Left;
        margin.m_Up = this.m_Right;
        break;
      case BookDirection.DownToUp:
      default:
        margin.m_Left = this.m_Down;
        margin.m_Right = this.m_Up;
        margin.m_Down = this.m_Left;
        margin.m_Up = this.m_Right;
        break;
    }
    return margin;
  }

  // ── FixUV ─────────────────────────────────────────────────────────────

  /**
   * Remap a UV coordinate so that (0,0) and (1,1) correspond to the
   * content area inside the margins.
   *
   * Unity's `Mathf.InverseLerp(a, b, v)` = `(v - a) / (b - a)` clamped to [0,1].
   */
  public fixUV(uv: THREE.Vector2): THREE.Vector2 {
    uv.x = PaperUVMargin.inverseLerp(this.m_Left, 1 - this.m_Right, uv.x);
    uv.y = PaperUVMargin.inverseLerp(this.m_Down, 1 - this.m_Up, uv.y);
    return uv;
  }

  private static inverseLerp(a: number, b: number, v: number): number {
    if (a === b) return 0;
    const t = (v - a) / (b - a);
    return Math.max(0, Math.min(1, t));
  }

  // ── Value-type clone ──────────────────────────────────────────────────

  public clone(): PaperUVMargin {
    const m = new PaperUVMargin();
    m.m_Left = this.m_Left;
    m.m_Right = this.m_Right;
    m.m_Down = this.m_Down;
    m.m_Up = this.m_Up;
    return m;
  }
}

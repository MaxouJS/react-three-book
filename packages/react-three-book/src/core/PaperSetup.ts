import * as THREE from 'three';
import { BookDirection } from './BookDirection';
import { PaperUVMargin } from './PaperUVMargin';

/**
 * Ported from Book.cs — PaperSetup class (lines ~1617-1712).
 *
 * Holds the serialised configuration for a single paper sheet: material,
 * colour, dimensions, stiffness, quality and UV margin.
 */
export class PaperSetup {
  private static readonly kMinSize: number = 1;
  private static readonly kMinThickness: number = 0.0001;
  private static readonly kMinQuality: number = 1;
  private static readonly kMaxQuality: number = 5;

  // [SerializeField] fields
  private m_Material: THREE.Material | null = null;
  private m_Color: THREE.Color = new THREE.Color(1, 1, 1); // Color.white
  private m_Width: number = 0;
  private m_Height: number = 0;
  private m_Thickness: number = 0;
  // Range(0, 1) — formerly m_Hardness
  private m_Stiffness: number = 0;
  // Range(kMinQuality, kMaxQuality)
  private m_Quality: number = 0;
  private m_UVMargin: PaperUVMargin = new PaperUVMargin();

  // internal fields
  public margin: number = 0;
  public bookDirection: BookDirection = BookDirection.LeftToRight;

  constructor(opts?: {
    color?: THREE.Color;
    width?: number;
    height?: number;
    thickness?: number;
    stiffness?: number;
    quality?: number;
    material?: THREE.Material | null;
  }) {
    this.color = opts?.color ?? new THREE.Color(1, 1, 1);
    this.width = opts?.width ?? PaperSetup.kMinSize * 2;
    this.height = opts?.height ?? PaperSetup.kMinSize * 2;
    this.thickness = opts?.thickness ?? PaperSetup.kMinThickness * 2;
    this.stiffness = opts?.stiffness ?? 0.1;
    this.quality = opts?.quality ?? 3;
    if (opts?.material !== undefined) this.m_Material = opts.material;
  }

  // ── Properties ────────────────────────────────────────────────────────

  get material(): THREE.Material | null {
    return this.m_Material;
  }
  set material(value: THREE.Material | null) {
    this.m_Material = value;
  }

  get color(): THREE.Color {
    return this.m_Color;
  }
  set color(value: THREE.Color) {
    this.m_Color = value;
  }

  get width(): number {
    return (this.bookDirection as number) > 1 ? this.m_Height : this.m_Width;
  }
  set width(value: number) {
    this.m_Width = Math.max(value, PaperSetup.kMinSize);
  }

  get height(): number {
    return (this.bookDirection as number) > 1 ? this.m_Width : this.m_Height;
  }
  set height(value: number) {
    this.m_Height = Math.max(value, PaperSetup.kMinSize);
  }

  get thickness(): number {
    return this.m_Thickness;
  }
  set thickness(value: number) {
    this.m_Thickness = Math.max(value, PaperSetup.kMinThickness);
  }

  get stiffness(): number {
    return this.m_Stiffness;
  }
  set stiffness(value: number) {
    this.m_Stiffness = Math.max(0, Math.min(1, value)); // Clamp01
  }

  get quality(): number {
    return this.m_Quality;
  }
  set quality(value: number) {
    this.m_Quality = Math.max(
      PaperSetup.kMinQuality,
      Math.min(value, PaperSetup.kMaxQuality),
    );
  }

  get uvMargin(): PaperUVMargin {
    return this.m_UVMargin.transform(this.bookDirection);
  }
  set uvMargin(value: PaperUVMargin) {
    this.m_UVMargin = value;
  }

  get size(): THREE.Vector2 {
    return new THREE.Vector2(this.width, this.height);
  }
}

/**
 * Shared math utilities extracted from Paper.ts, StapleBinding.ts,
 * AutoTurn.ts, and PaperMeshUtility.ts to eliminate duplication.
 *
 * This file has NO imports from implementation files to avoid circular deps.
 */

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Linear interpolation with `t` clamped to [0, 1]. */
export function lerp(a: number, b: number, t: number): number {
  t = clamp01(t);
  return a + (b - a) * t;
}

/** Linear interpolation without clamping `t`. */
export function lerpUnclamped(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function inverseLerp(a: number, b: number, value: number): number {
  if (a !== b) return clamp01((value - a) / (b - a));
  return 0;
}

/** Unity's exact SmoothStep: clamp01((t-from)/(to-from)); t*t*(3-2*t) */
export function smoothStep(from: number, to: number, t: number): number {
  t = clamp01((t - from) / (to - from));
  return t * t * (3 - 2 * t);
}

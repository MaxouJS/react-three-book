import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Unity Mathf helpers (local, not exported)
// ---------------------------------------------------------------------------

/**
 * Port of Unity's Mathf.SmoothStep:
 *   t = Clamp01((t - from) / (to - from));
 *   return t * t * (3 - 2 * t);
 */
function mathfSmoothStep(from: number, to: number, t: number): number {
  t = THREE.MathUtils.clamp((t - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Port of Unity's Mathf.MoveTowards:
 *   Moves `current` towards `target` by at most `maxDelta`.
 */
function mathfMoveTowards(
  current: number,
  target: number,
  maxDelta: number,
): number {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

/**
 * Port of Unity's Mathf.SmoothDamp (spring-damper, exact algorithm).
 *
 * Unity signature:
 *   float SmoothDamp(float current, float target,
 *                    ref float currentVelocity,
 *                    float smoothTime,
 *                    float maxSpeed = Infinity,
 *                    float deltaTime = Time.deltaTime)
 *
 * Because TypeScript has no `ref`, this returns both the new value and the
 * mutated velocity via a result object.
 */
function mathfSmoothDamp(
  current: number,
  target: number,
  currentVelocity: number,
  smoothTime: number,
  maxSpeed: number = Infinity,
  deltaTime: number = 1 / 60, // fallback; callers should provide actual dt
): { value: number; velocity: number } {
  // Unity clamps smoothTime to a minimum of 0.0001
  smoothTime = Math.max(smoothTime, 0.0001);

  const omega = 2.0 / smoothTime;
  const x = omega * deltaTime;
  // Pade approximation of exp(-x)
  const exp = 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x);

  let change = current - target;
  const originalTo = target;

  // Clamp maximum speed
  const maxChange = maxSpeed * smoothTime;
  change = THREE.MathUtils.clamp(change, -maxChange, maxChange);
  target = current - change;

  const temp = (currentVelocity + omega * change) * deltaTime;
  currentVelocity = (currentVelocity - omega * temp) * exp;
  let output = target + (change + temp) * exp;

  // Prevent overshooting
  if (originalTo - current > 0.0 === output > originalTo) {
    output = originalTo;
    currentVelocity = (output - originalTo) / deltaTime;
  }

  return { value: output, velocity: currentVelocity };
}

// ---------------------------------------------------------------------------
// VectorUtility (faithful port of Unity C# VectorUtility)
// ---------------------------------------------------------------------------

/**
 * Per-component SmoothDamp for Vector3 using per-component smooth times.
 *
 * `currentVelocity` is mutated in-place (mirrors the C# `ref` semantics).
 * Returns the new smoothed position.
 */
export function smoothDamp(
  current: THREE.Vector3,
  target: THREE.Vector3,
  currentVelocity: THREE.Vector3,
  smoothTime: THREE.Vector3,
  maxSpeed: number = Infinity,
  deltaTime: number = 1 / 60,
): THREE.Vector3 {
  const rx = mathfSmoothDamp(
    current.x,
    target.x,
    currentVelocity.x,
    smoothTime.x,
    maxSpeed,
    deltaTime,
  );
  const ry = mathfSmoothDamp(
    current.y,
    target.y,
    currentVelocity.y,
    smoothTime.y,
    maxSpeed,
    deltaTime,
  );
  const rz = mathfSmoothDamp(
    current.z,
    target.z,
    currentVelocity.z,
    smoothTime.z,
    maxSpeed,
    deltaTime,
  );

  // Mutate velocity ref (mirrors C# ref behaviour)
  currentVelocity.set(rx.velocity, ry.velocity, rz.velocity);

  return new THREE.Vector3(rx.value, ry.value, rz.value);
}

/**
 * Per-component SmoothStep for Vector3.
 */
export function smoothStep(
  from: THREE.Vector3,
  to: THREE.Vector3,
  smoothStepT: THREE.Vector3,
): THREE.Vector3 {
  return new THREE.Vector3(
    mathfSmoothStep(from.x, to.x, smoothStepT.x),
    mathfSmoothStep(from.y, to.y, smoothStepT.y),
    mathfSmoothStep(from.z, to.z, smoothStepT.z),
  );
}

/**
 * Per-component MoveTowards for Vector3.
 */
export function moveTowards(
  current: THREE.Vector3,
  target: THREE.Vector3,
  maxDistanceDelta: THREE.Vector3,
): THREE.Vector3 {
  return new THREE.Vector3(
    mathfMoveTowards(current.x, target.x, maxDistanceDelta.x),
    mathfMoveTowards(current.y, target.y, maxDistanceDelta.y),
    mathfMoveTowards(current.z, target.z, maxDistanceDelta.z),
  );
}

/**
 * Returns a perpendicular vector in the XZ plane (swaps x and z, negates z).
 */
export function getPerpendicularXZ2(vector: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(-vector.z, vector.y, vector.x);
}

/**
 * Converts an XY vector to XZ (y -> z, y set to 0).
 */
export function xy2xz(v: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(v.x, 0, v.y);
}

/**
 * Converts an XZ vector to XY (z -> y, z set to 0).
 */
export function xz2xy(v: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.z, 0);
}

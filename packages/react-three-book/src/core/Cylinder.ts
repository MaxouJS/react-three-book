import * as THREE from 'three';

/**
 * Ported from Book.cs — Cylinder struct (lines ~3805-3902).
 *
 * Rolling-deformation core used to curl paper around a cylindrical axis.
 *
 * C# value-type (struct) semantics are emulated with a clone() method.
 *
 * Unity's `Quaternion.Euler(0, eulerY, z) * Vector3(x, 0, 0)` is replaced
 * with manual trig: first rotate by Z around the Z-axis, then rotate by Y
 * around the Y-axis.
 */
export class Cylinder {
  private m_PositionX: number = 0;
  private m_PositionZ: number = 0;
  private m_DirectionX: number = 0;
  private m_DirectionZ: number = 0;
  private m_EulerY: number = 0;
  private m_Radius: number = 0;

  // Pre-allocated scratch vectors to avoid per-frame allocations.
  //
  // Allocation map (each method owns its scratch vectors exclusively):
  //   rollPoint: _scratchRP1, _scratchRP2
  //   roll:      _scratchRollClosest, _scratchRollEuler (via eulerRotateVector)
  //   getOffset: _scratchOffsetRoll (passed to roll as the point)
  //              roll's own scratches (_scratchRollClosest, _scratchRollEuler) are reused
  //   position:  _positionOut
  private readonly _positionOut = new THREE.Vector3();
  private readonly _scratchRP1 = new THREE.Vector3();
  private readonly _scratchRP2 = new THREE.Vector3();
  private readonly _scratchRollClosest = new THREE.Vector3();
  private readonly _scratchRollEuler = new THREE.Vector3();
  private readonly _scratchOffsetRoll = new THREE.Vector3();

  // ── Properties ────────────────────────────────────────────────────────

  /** Returns internal vector — do NOT mutate. Copy if you need to store it. */
  get position(): THREE.Vector3 {
    return this._positionOut.set(this.m_PositionX, 0, this.m_PositionZ);
  }

  set position(value: THREE.Vector3) {
    this.m_PositionX = value.x;
    this.m_PositionZ = value.z;
  }

  set direction(value: THREE.Vector3) {
    this.m_DirectionX = value.x;
    this.m_DirectionZ = value.z;
    this.m_EulerY =
      Math.atan2(this.m_DirectionX, this.m_DirectionZ) * (180 / Math.PI);
  }

  set radius(value: number) {
    this.m_Radius = value;
  }

  // ── Public API ────────────────────────────────────────────────────────

  public rollPoint(point: THREE.Vector3): THREE.Vector3 {
    // Compute rolled = roll(point.clone()) and offset = getOffset(point.clone())
    // then return rolled - offset.
    //
    // _scratchRP1 holds the rolled result, _scratchRP2 holds the offset result.
    // roll() and getOffset() share _scratchRollClosest/_scratchRollEuler internally,
    // but each call completes before the next starts, so no aliasing issue.
    this._scratchRP1.copy(point);
    this.roll(this._scratchRP1);

    this._scratchRP2.copy(point);
    this.getOffset(this._scratchRP2);

    // Write result back into point
    point.copy(this._scratchRP1).sub(this._scratchRP2);
    return point;
  }

  // ── Private helpers ───────────────────────────────────────────────────

  /**
   * Apply Quaternion.Euler(0, eulerY, z) * Vector3(x, 0, 0) manually.
   *
   * Unity Euler convention (ZXY intrinsic, i.e. applied Z then X then Y):
   *   1. Rotate (x, 0, 0) by Z degrees around Z-axis.
   *   2. Rotate by X degrees around X-axis (X = 0 here, so skip).
   *   3. Rotate by Y degrees around Y-axis.
   *
   * Writes result into `out` and returns it.
   */
  private eulerRotateVector(
    x: number,
    eulerY: number,
    eulerZ: number,
    out: THREE.Vector3,
  ): THREE.Vector3 {
    const zRad = (eulerZ * Math.PI) / 180;
    const yRad = (eulerY * Math.PI) / 180;

    // Step 1 — rotate (x, 0, 0) by Z around Z-axis
    const cosZ = Math.cos(zRad);
    const sinZ = Math.sin(zRad);
    const rx = x * cosZ;
    const ry = x * sinZ;
    const rz = 0;

    // Step 2 — rotate by Y around Y-axis
    const cosY = Math.cos(yRad);
    const sinY = Math.sin(yRad);
    const fx = rx * cosY + rz * sinY;
    const fy = ry;
    const fz = -rx * sinY + rz * cosY;

    return out.set(fx, fy, fz);
  }

  /**
   * Rolls `point` in place around the cylinder. Mutates and returns `point`.
   * Uses _scratchRollClosest for closest-point calculation and
   * _scratchRollEuler for euler rotation result.
   */
  private roll(point: THREE.Vector3): THREE.Vector3 {
    if (this.getSide(point) >= 0) return point;

    // Compute closest point on the cylinder axis in a separate scratch
    // so we can measure distance from `point` to it.
    this._scratchRollClosest.copy(point);
    this.getClosestPointInto(this._scratchRollClosest);
    const closestPoint = this._scratchRollClosest;
    let dis = point.distanceTo(closestPoint);

    if (dis > Math.PI * this.m_Radius) {
      dis = dis - Math.PI * this.m_Radius;
      this.eulerRotateVector(-dis, this.m_EulerY, 0, this._scratchRollEuler);
      point.copy(this._scratchRollEuler.add(closestPoint));
      point.y += this.m_Radius * 2;
    } else {
      const z = (180 / Math.PI) * (dis / this.m_Radius) - 90;
      this.eulerRotateVector(this.m_Radius, this.m_EulerY, z, this._scratchRollEuler);
      point.copy(this._scratchRollEuler.add(closestPoint));
      point.y += this.m_Radius;
    }

    return point;
  }

  /**
   * Computes offset for `point`. Mutates and returns `point`.
   * Offset = roll(point with x=0) with z adjusted.
   * Uses _scratchOffsetRoll to hold a copy for rolling (avoids aliasing
   * with `point` itself when roll() internally reads and writes).
   */
  private getOffset(point: THREE.Vector3): THREE.Vector3 {
    const origZ = point.z;
    // Create a copy with x=0 for rolling
    this._scratchOffsetRoll.set(0, point.y, point.z);
    this.roll(this._scratchOffsetRoll);
    point.copy(this._scratchOffsetRoll);
    point.z -= origZ;
    return point;
  }

  /**
   * Projects `point` onto the cylinder axis, writing the result into `point`.
   * Returns the mutated `point`.
   */
  private getClosestPointInto(point: THREE.Vector3): THREE.Vector3 {
    const dx = point.x - this.m_PositionX;
    const dz = point.z - this.m_PositionZ;
    const dot = dx * this.m_DirectionX + dz * this.m_DirectionZ;
    point.x = this.m_PositionX + this.m_DirectionX * dot;
    point.z = this.m_PositionZ + this.m_DirectionZ * dot;
    return point;
  }

  private getSide(point: THREE.Vector3): number {
    const dx = point.x - this.m_PositionX;
    const dz = point.z - this.m_PositionZ;
    return dz * this.m_DirectionX - dx * this.m_DirectionZ;
  }

  // ── Value-type clone ──────────────────────────────────────────────────

  public clone(): Cylinder {
    const c = new Cylinder();
    c.m_PositionX = this.m_PositionX;
    c.m_PositionZ = this.m_PositionZ;
    c.m_DirectionX = this.m_DirectionX;
    c.m_DirectionZ = this.m_DirectionZ;
    c.m_EulerY = this.m_EulerY;
    c.m_Radius = this.m_Radius;
    return c;
  }
}

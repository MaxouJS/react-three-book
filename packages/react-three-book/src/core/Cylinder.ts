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

  // ── Properties ────────────────────────────────────────────────────────

  get position(): THREE.Vector3 {
    return new THREE.Vector3(this.m_PositionX, 0, this.m_PositionZ);
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
    return this.roll(point.clone()).sub(this.getOffset(point.clone()));
  }

  // ── Private helpers ───────────────────────────────────────────────────

  /**
   * Apply Quaternion.Euler(0, eulerY, z) * Vector3(x, 0, 0) manually.
   *
   * Unity Euler convention (ZXY intrinsic, i.e. applied Z then X then Y):
   *   1. Rotate (x, 0, 0) by Z degrees around Z-axis.
   *   2. Rotate by X degrees around X-axis (X = 0 here, so skip).
   *   3. Rotate by Y degrees around Y-axis.
   */
  private eulerRotateVector(
    x: number,
    eulerY: number,
    eulerZ: number,
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

    return new THREE.Vector3(fx, fy, fz);
  }

  private roll(point: THREE.Vector3): THREE.Vector3 {
    if (this.getSide(point) >= 0) return point;

    const closestPoint = this.getClosestPoint(point.clone());
    let dis = point.distanceTo(closestPoint);

    if (dis > Math.PI * this.m_Radius) {
      dis = dis - Math.PI * this.m_Radius;
      const rotated = this.eulerRotateVector(-dis, this.m_EulerY, 0);
      point.copy(rotated.add(closestPoint));
      point.y += this.m_Radius * 2;
    } else {
      const z = (180 / Math.PI) * (dis / this.m_Radius) - 90;
      const rotated = this.eulerRotateVector(this.m_Radius, this.m_EulerY, z);
      point.copy(rotated.add(closestPoint));
      point.y += this.m_Radius;
    }

    return point;
  }

  private getOffset(point: THREE.Vector3): THREE.Vector3 {
    point.x = 0;
    const offset = this.roll(point.clone());
    offset.z -= point.z;
    return offset;
  }

  private getClosestPoint(point: THREE.Vector3): THREE.Vector3 {
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

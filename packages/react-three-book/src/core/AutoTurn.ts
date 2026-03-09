/**
 * Ported from Book.cs — AutoTurn enums, settings, and value types (lines ~1076-1418).
 *
 * Faithful line-by-line port of:
 *   - AutoTurnDirection enum
 *   - AutoTurnMode enum
 *   - AutoTurnSettings class
 *   - AutoTurnSetting struct (→ class with clone())
 *   - AutoTurnSettingMode enum
 *   - AutoTurnSettingCurveTimeMode enum
 *
 * Unity `AnimationCurve` is approximated by a simple keyframe array
 * with linear interpolation (evaluate).
 */

// ─────────────────────────────────────────────────────────────────────────────
// AutoTurnDirection  (Book.cs ~1084-1095)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Defines the direction for auto page turning.
 */
export enum AutoTurnDirection {
  /** Indicates the next page direction. */
  Next = 0,
  /** Indicates the previous page direction. */
  Back = 1,
}

// ─────────────────────────────────────────────────────────────────────────────
// AutoTurnMode  (Book.cs ~1100-1111)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Defines the mode for auto page turning.
 */
export enum AutoTurnMode {
  /** This mode simulates swiping the paper surface to turn it. */
  Surface = 0,
  /** This mode simulates holding the paper edge and turning it. */
  Edge = 1,
}

// ─────────────────────────────────────────────────────────────────────────────
// AutoTurnSettingMode  (Book.cs ~1362-1383)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Defines the mode of AutoTurnSetting.
 */
export enum AutoTurnSettingMode {
  /** Specifies a constant value for the auto turn setting. */
  Constant = 0,
  /** Specifies a random value generated between two constant values for the auto turn setting. */
  RandomBetweenTwoConstants = 1,
  /** Specifies a value based on a curve for the auto turn setting. */
  Curve = 2,
  /** Specifies a random value generated between two curves for the auto turn setting. */
  RandomBetweenTwoCurves = 3,
}

// ─────────────────────────────────────────────────────────────────────────────
// AutoTurnSettingCurveTimeMode  (Book.cs ~1389-1402)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Defines the curve time mode of AutoTurnSetting when AutoTurnSettingMode is
 * Curve or RandomBetweenTwoCurves.
 */
export enum AutoTurnSettingCurveTimeMode {
  /**
   * Evaluates the curve based on the current paper index divided by the
   * total paper count. This gives a time value proportional to the
   * progression through the papers.
   */
  PaperIndexTime = 0,
  /**
   * Evaluates the curve based on the current turn index divided by the
   * total turn count. This provides a time value proportional to the
   * progression through the turns.
   */
  TurnIndexTime = 1,
}

// ─────────────────────────────────────────────────────────────────────────────
// AnimationCurve replacement
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal replacement for Unity's AnimationCurve.
 * Stores an array of { time, value } keyframes and evaluates them
 * with linear interpolation (matches the most common Unity curve
 * usage; tangent / bezier evaluation is omitted since the C# plugin
 * only reads curve values via `Evaluate`).
 */
export interface Keyframe {
  time: number;
  value: number;
}

export class AnimationCurve {
  public keys: Keyframe[];

  constructor(keys?: Keyframe[]) {
    this.keys = keys ? keys.map((k) => ({ time: k.time, value: k.value })) : [];
  }

  /**
   * Evaluate the curve at parameter `t`.
   * Linear interpolation between keyframes (Unity default is cubic,
   * but the exact tangent data is not available here).
   */
  public evaluate(t: number): number {
    const keys = this.keys;
    const n = keys.length;
    if (n === 0) return 0;
    if (n === 1) return keys[0].value;

    if (t <= keys[0].time) return keys[0].value;
    if (t >= keys[n - 1].time) return keys[n - 1].value;

    for (let i = 0; i < n - 1; i++) {
      if (t >= keys[i].time && t <= keys[i + 1].time) {
        const segT =
          (t - keys[i].time) / (keys[i + 1].time - keys[i].time);
        return keys[i].value + (keys[i + 1].value - keys[i].value) * segT;
      }
    }

    return keys[n - 1].value;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function inverseLerp(a: number, b: number, v: number): number {
  if (a === b) return 0;
  return clamp((v - a) / (b - a), 0, 1);
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// ─────────────────────────────────────────────────────────────────────────────
// AutoTurnSetting  (Book.cs ~1183-1357)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents an individual setting for auto page turning.
 *
 * C# struct — emulated with clone().
 */
export class AutoTurnSetting {
  private m_Mode: AutoTurnSettingMode = AutoTurnSettingMode.Constant;
  private m_Constant: number = 0;
  private m_ConstantMin: number = 0;
  private m_ConstantMax: number = 0;
  private m_Curve: AnimationCurve | null = null;
  private m_CurveMin: AnimationCurve | null = null;
  private m_CurveMax: AnimationCurve | null = null;
  private m_CurveTimeMode: AutoTurnSettingCurveTimeMode =
    AutoTurnSettingCurveTimeMode.PaperIndexTime;

  // ── Properties ──────────────────────────────────────────────────────────

  get mode(): AutoTurnSettingMode {
    return this.m_Mode;
  }
  set mode(value: AutoTurnSettingMode) {
    this.m_Mode = value;
  }

  get constant(): number {
    return this.m_Constant;
  }
  set constant(value: number) {
    this.m_Constant = value;
  }

  get constantMin(): number {
    return this.m_ConstantMin;
  }
  set constantMin(value: number) {
    this.m_ConstantMin = value;
  }

  get constantMax(): number {
    return this.m_ConstantMax;
  }
  set constantMax(value: number) {
    this.m_ConstantMax = value;
  }

  get curve(): AnimationCurve | null {
    return this.m_Curve;
  }
  set curve(value: AnimationCurve | null) {
    this.m_Curve = value;
  }

  get curveMin(): AnimationCurve | null {
    return this.m_CurveMin;
  }
  set curveMin(value: AnimationCurve | null) {
    this.m_CurveMin = value;
  }

  get curveMax(): AnimationCurve | null {
    return this.m_CurveMax;
  }
  set curveMax(value: AnimationCurve | null) {
    this.m_CurveMax = value;
  }

  get curveTimeMode(): AutoTurnSettingCurveTimeMode {
    return this.m_CurveTimeMode;
  }
  set curveTimeMode(value: AutoTurnSettingCurveTimeMode) {
    this.m_CurveTimeMode = value;
  }

  // ── Constructors (static factories since TS has no overloaded ctors) ────

  constructor();
  /** A constant value. */
  constructor(constant: number);
  /** A random value generated between two constant values. */
  constructor(constantMin: number, constantMax: number);
  constructor(a?: number, b?: number) {
    if (a === undefined) {
      // Default: all zeros
      return;
    }
    if (b === undefined) {
      // AutoTurnSetting(float constant)
      this.m_Constant = a;
      this.m_ConstantMin = a;
      this.m_ConstantMax = a;
      this.m_Curve = null;
      this.m_CurveMin = null;
      this.m_CurveMax = null;
      this.m_Mode = AutoTurnSettingMode.Constant;
      this.m_CurveTimeMode = AutoTurnSettingCurveTimeMode.PaperIndexTime;
    } else {
      // AutoTurnSetting(float constantMin, float constantMax)
      this.m_Constant = 0;
      this.m_ConstantMin = a;
      this.m_ConstantMax = b;
      this.m_Curve = null;
      this.m_CurveMin = null;
      this.m_CurveMax = null;
      this.m_Mode = AutoTurnSettingMode.RandomBetweenTwoConstants;
      this.m_CurveTimeMode = AutoTurnSettingCurveTimeMode.PaperIndexTime;
    }
  }

  /** A value based on a curve. */
  static fromCurve(
    curve: AnimationCurve,
    curveTimeMode: AutoTurnSettingCurveTimeMode,
  ): AutoTurnSetting {
    const s = new AutoTurnSetting();
    s.m_Constant = 0;
    s.m_ConstantMin = 0;
    s.m_ConstantMax = 0;
    s.m_Curve = curve;
    s.m_CurveMin = null;
    s.m_CurveMax = null;
    s.m_Mode = AutoTurnSettingMode.Curve;
    s.m_CurveTimeMode = curveTimeMode;
    return s;
  }

  /** A random value generated between two curves. */
  static fromCurveRange(
    curveMin: AnimationCurve,
    curveMax: AnimationCurve,
    curveTimeMode: AutoTurnSettingCurveTimeMode,
  ): AutoTurnSetting {
    const s = new AutoTurnSetting();
    s.m_Constant = 0;
    s.m_ConstantMin = 0;
    s.m_ConstantMax = 0;
    s.m_Curve = null;
    s.m_CurveMin = curveMin;
    s.m_CurveMax = curveMax;
    s.m_Mode = AutoTurnSettingMode.RandomBetweenTwoCurves;
    s.m_CurveTimeMode = curveTimeMode;
    return s;
  }

  // ── Internal API ────────────────────────────────────────────────────────

  /** @internal */
  getValue(paperIndexTime: number, turnIndexTime: number): number {
    if (this.m_Mode === AutoTurnSettingMode.Constant) return this.m_Constant;
    if (this.m_Mode === AutoTurnSettingMode.RandomBetweenTwoConstants)
      return randomRange(this.m_ConstantMin, this.m_ConstantMax);

    const time =
      this.m_CurveTimeMode === AutoTurnSettingCurveTimeMode.PaperIndexTime
        ? paperIndexTime
        : turnIndexTime;

    if (this.m_Mode === AutoTurnSettingMode.Curve)
      return this.m_Curve!.evaluate(time);
    if (this.m_Mode === AutoTurnSettingMode.RandomBetweenTwoCurves)
      return randomRange(
        this.m_CurveMin!.evaluate(time),
        this.m_CurveMax!.evaluate(time),
      );

    throw new Error('AutoTurnSettingMode not implemented');
  }

  /** @internal */
  clampValues(min: number, max: number): AutoTurnSetting {
    this.m_Constant = clamp(this.m_Constant, min, max);
    this.m_ConstantMin = clamp(this.m_ConstantMin, min, max);
    this.m_ConstantMax = clamp(this.m_ConstantMax, min, max);
    this.m_Curve = this.clampCurve(this.m_Curve, min, max);
    this.m_CurveMin = this.clampCurve(this.m_CurveMin, min, max);
    this.m_CurveMax = this.clampCurve(this.m_CurveMax, min, max);
    return this;
  }

  private clampCurve(
    curveInput: AnimationCurve | null,
    min: number,
    max: number,
  ): AnimationCurve | null {
    // NOTE: Original C# checks `m_Curve == null` regardless of which curve
    // was passed — faithful reproduction of that behaviour.
    if (this.m_Curve === null) return null;
    if (curveInput === null) return null;

    const keys = curveInput.keys.map((k) => ({ time: k.time, value: k.value }));
    const n = keys.length;
    let minTime = Infinity;
    let maxTime = -Infinity;
    for (let i = 0; i < n; i++) {
      const time = keys[i].time;
      minTime = Math.min(minTime, time);
      maxTime = Math.max(maxTime, time);
    }

    for (let i = 0; i < n; i++) {
      let time = keys[i].time;
      let value = keys[i].value;

      time = inverseLerp(minTime, maxTime, time);
      value = clamp(value, min, max);

      keys[i].time = time;
      keys[i].value = value;
    }

    return new AnimationCurve(keys);
  }

  // ── Value-type clone ────────────────────────────────────────────────────

  public clone(): AutoTurnSetting {
    const s = new AutoTurnSetting();
    s.m_Mode = this.m_Mode;
    s.m_Constant = this.m_Constant;
    s.m_ConstantMin = this.m_ConstantMin;
    s.m_ConstantMax = this.m_ConstantMax;
    s.m_Curve = this.m_Curve;
    s.m_CurveMin = this.m_CurveMin;
    s.m_CurveMax = this.m_CurveMax;
    s.m_CurveTimeMode = this.m_CurveTimeMode;
    return s;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AutoTurnSettings  (Book.cs ~1117-1177)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents settings for auto page turning.
 */
export class AutoTurnSettings {
  /** @internal */ static readonly kMinTwist: number = -1;
  /** @internal */ static readonly kMaxTwist: number = 1;
  /** @internal */ static readonly kMinBend: number = 0;
  /** @internal */ static readonly kMaxBend: number = 1;
  /** @internal */ static readonly kMinDuration: number = 0;
  /** @internal */ static readonly kMaxDuration: number = 5;

  private m_Mode: AutoTurnMode = AutoTurnMode.Surface;
  private m_Twist: AutoTurnSetting = new AutoTurnSetting();
  private m_Bend: AutoTurnSetting = new AutoTurnSetting(1);
  private m_Duration: AutoTurnSetting = new AutoTurnSetting(0.5);

  // ── Properties ──────────────────────────────────────────────────────────

  get mode(): AutoTurnMode {
    return this.m_Mode;
  }
  set mode(value: AutoTurnMode) {
    this.m_Mode = value;
  }

  get twist(): AutoTurnSetting {
    return this.m_Twist;
  }
  set twist(value: AutoTurnSetting) {
    this.m_Twist = value.clampValues(
      AutoTurnSettings.kMinTwist,
      AutoTurnSettings.kMaxTwist,
    );
  }

  get bend(): AutoTurnSetting {
    return this.m_Bend;
  }
  set bend(value: AutoTurnSetting) {
    this.m_Bend = value.clampValues(
      AutoTurnSettings.kMinBend,
      AutoTurnSettings.kMaxBend,
    );
  }

  get duration(): AutoTurnSetting {
    return this.m_Duration;
  }
  set duration(value: AutoTurnSetting) {
    this.m_Duration = value.clampValues(
      AutoTurnSettings.kMinDuration,
      AutoTurnSettings.kMaxDuration,
    );
  }

  // ── Internal API ────────────────────────────────────────────────────────

  /** @internal */
  getModeValue(): AutoTurnMode {
    return this.m_Mode;
  }

  /** @internal */
  getBendValue(paperIndexTime: number, turnIndexTime: number): number {
    return clamp(
      this.m_Bend.getValue(paperIndexTime, turnIndexTime),
      AutoTurnSettings.kMinBend,
      AutoTurnSettings.kMaxBend,
    );
  }

  /** @internal */
  getDurationValue(paperIndexTime: number, turnIndexTime: number): number {
    return clamp(
      this.m_Duration.getValue(paperIndexTime, turnIndexTime),
      AutoTurnSettings.kMinDuration,
      AutoTurnSettings.kMaxDuration,
    );
  }

  /** @internal */
  getTwistValue(paperIndexTime: number, turnIndexTime: number): number {
    return clamp(
      this.m_Twist.getValue(paperIndexTime, turnIndexTime),
      AutoTurnSettings.kMinTwist,
      AutoTurnSettings.kMaxTwist,
    );
  }
}

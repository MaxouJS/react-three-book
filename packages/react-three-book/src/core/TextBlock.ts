/**
 * A styled text block rendered onto a 2D canvas.
 *
 * Positions and dimensions are in canvas pixels.  Word-wrapping is handled
 * manually via `ctx.measureText()` when `width` > 0.
 */

export interface TextBlockOptions {
  /** Left edge of the text box in canvas pixels. */
  x?: number;
  /** Top edge of the text box in canvas pixels. */
  y?: number;
  /** Maximum width before wrapping.  0 = no wrapping (default 0). */
  width?: number;
  /** Text content. */
  text?: string;
  /** Font family (default 'Georgia'). */
  fontFamily?: string;
  /** Font size in canvas pixels (default 24). */
  fontSize?: number;
  /** Font weight (default 'normal'). */
  fontWeight?: 'normal' | 'bold';
  /** Font style (default 'normal'). */
  fontStyle?: 'normal' | 'italic';
  /** CSS fill colour (default '#222'). */
  color?: string;
  /** Line height multiplier (default 1.4). */
  lineHeight?: number;
  /** Text alignment within the box (default 'left'). */
  textAlign?: 'left' | 'center' | 'right';
  /** Opacity 0–1 (default 1). */
  opacity?: number;
  /** Optional text shadow colour for readability. */
  shadowColor?: string;
  /** Shadow blur radius in pixels (default 0). */
  shadowBlur?: number;
}

export class TextBlock {
  x: number;
  y: number;
  width: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right';
  opacity: number;
  shadowColor: string;
  shadowBlur: number;

  constructor(options?: TextBlockOptions) {
    this.x          = options?.x          ?? 0;
    this.y          = options?.y          ?? 0;
    this.width      = options?.width      ?? 0;
    this.text       = options?.text       ?? '';
    this.fontFamily = options?.fontFamily ?? 'Georgia';
    this.fontSize   = options?.fontSize   ?? 24;
    this.fontWeight = options?.fontWeight ?? 'normal';
    this.fontStyle  = options?.fontStyle  ?? 'normal';
    this.color      = options?.color      ?? '#222';
    this.lineHeight = options?.lineHeight ?? 1.4;
    this.textAlign  = options?.textAlign  ?? 'left';
    this.opacity    = options?.opacity    ?? 1;
    this.shadowColor = options?.shadowColor ?? '';
    this.shadowBlur  = options?.shadowBlur  ?? 0;
  }

  private _font(): string {
    return `${this.fontStyle} ${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
  }

  /**
   * Word-wrap `text` into lines that fit within `width` pixels.
   * Respects explicit newlines.
   */
  wrapLines(ctx: CanvasRenderingContext2D): string[] {
    if (!this.text) return [];
    ctx.font = this._font();

    if (this.width <= 0) return this.text.split('\n');

    const result: string[] = [];
    for (const paragraph of this.text.split('\n')) {
      if (paragraph === '') { result.push(''); continue; }
      const words = paragraph.split(/\s+/);
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > this.width && line) {
          result.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) result.push(line);
    }
    return result;
  }

  /** Total rendered height in canvas pixels. */
  measureHeight(ctx: CanvasRenderingContext2D): number {
    const lines = this.wrapLines(ctx);
    return lines.length * this.fontSize * this.lineHeight;
  }

  /** Returns true if the point (px, py) is within the text bounding box. */
  hitTest(ctx: CanvasRenderingContext2D, px: number, py: number): boolean {
    const lines = this.wrapLines(ctx);
    if (lines.length === 0) return false;
    const h = lines.length * this.fontSize * this.lineHeight;
    const w = this.width > 0 ? this.width : this._maxLineWidth(ctx, lines);
    return px >= this.x && px <= this.x + w && py >= this.y && py <= this.y + h;
  }

  private _maxLineWidth(ctx: CanvasRenderingContext2D, lines: string[]): number {
    ctx.font = this._font();
    let max = 0;
    for (const line of lines) {
      const m = ctx.measureText(line).width;
      if (m > max) max = m;
    }
    return max;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.text || this.opacity <= 0) return;

    const lines = this.wrapLines(ctx);
    if (lines.length === 0) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.font = this._font();
    ctx.fillStyle = this.color;
    ctx.textBaseline = 'top';

    if (this.shadowColor && this.shadowBlur > 0) {
      ctx.shadowColor = this.shadowColor;
      ctx.shadowBlur = this.shadowBlur;
    }

    const leading = this.fontSize * this.lineHeight;
    const boxW = this.width > 0 ? this.width : this._maxLineWidth(ctx, lines);

    for (let i = 0; i < lines.length; i++) {
      let lx = this.x;
      if (this.textAlign === 'center') {
        lx = this.x + (boxW - ctx.measureText(lines[i]).width) / 2;
      } else if (this.textAlign === 'right') {
        lx = this.x + boxW - ctx.measureText(lines[i]).width;
      }
      ctx.fillText(lines[i], lx, this.y + i * leading);
    }

    ctx.restore();
  }
}

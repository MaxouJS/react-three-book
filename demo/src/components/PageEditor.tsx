/**
 * PageEditor — WYSIWYG text block editor for book pages.
 *
 * Uses the real TextOverlayContent canvas as the preview (pixel-accurate match
 * with the 3D page) and TextBlock.measureHeight() for selection outlines.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { TextBlock, TextOverlayContent, SpreadContent } from '@objectifthunes/react-three-book';
import type { DemoParams, PageTextBlock } from '../state';
import { FONT_OPTIONS, createDefaultTextBlock, PX_PER_UNIT } from '../state';

interface PageEditorProps {
  params: DemoParams;
  pageTextBlocks: PageTextBlock[][];
  spreadPages: Set<number>;
  overlaysRef: React.RefObject<(TextOverlayContent | null)[]>;
  spreadsRef: React.RefObject<Map<number, SpreadContent>>;
  onPageTextBlocksChange: (blocks: PageTextBlock[][]) => void;
}

const DISPLAY_MAX = 300;

const BTN: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 6,
  border: '1px solid rgba(236,242,255,0.22)',
  background: 'rgba(255,255,255,0.08)',
  color: '#eef4ff', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
};

const MINI_SELECT: React.CSSProperties = {
  padding: '3px 6px', borderRadius: 6,
  border: '1px solid rgba(236,242,255,0.22)',
  background: 'rgba(255,255,255,0.06)',
  color: '#eef4ff', fontSize: 11, fontFamily: 'inherit',
};

// Offscreen context for TextBlock measurement (font metrics only).
const _measureCanvas = document.createElement('canvas');
_measureCanvas.width = 1;
_measureCanvas.height = 1;
const measureCtx = _measureCanvas.getContext('2d')!;

export default function PageEditor({ params, pageTextBlocks, spreadPages, overlaysRef, spreadsRef, onPageTextBlocksChange }: PageEditorProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const dragRef = useRef<{ startX: number; startY: number; blockX: number; blockY: number } | null>(null);

  const page = Math.min(currentPage, params.pageCount - 1);
  const isSpread = spreadPages.has(page);
  const isRightOfSpread = spreadPages.has(page - 1);
  const effectivePage = isRightOfSpread ? page - 1 : page;
  const isSpreadMode = isSpread || isRightOfSpread;

  const blocks = pageTextBlocks[effectivePage] ?? [];
  const selected = selectedIdx >= 0 && selectedIdx < blocks.length ? blocks[selectedIdx] : null;

  const widthMultiplier = isSpreadMode ? 2 : 1;
  const canvasW = Math.round(params.pageWidth * PX_PER_UNIT) * widthMultiplier;
  const canvasH = Math.round(params.pageHeight * PX_PER_UNIT);
  const scale = DISPLAY_MAX / Math.max(canvasW, canvasH);
  const displayW = Math.round(canvasW * scale);
  const displayH = Math.round(canvasH * scale);

  /** Pixel-accurate height of a state text block using TextBlock measurement. */
  const blockHeight = useCallback((b: PageTextBlock): number => {
    const tb = new TextBlock({
      text: b.text, x: b.x, y: b.y, width: b.width,
      fontFamily: b.fontFamily || params.bookFont,
      fontSize: b.fontSize, fontWeight: b.fontWeight, fontStyle: b.fontStyle,
      lineHeight: 1.4,
    });
    return Math.max(tb.measureHeight(measureCtx), b.fontSize * 1.4);
  }, [params.bookFont]);

  // Immutable update helpers
  const updateBlocks = useCallback((pageIdx: number, updater: (b: PageTextBlock[]) => PageTextBlock[]) => {
    const next = [...pageTextBlocks];
    next[pageIdx] = updater([...(next[pageIdx] ?? [])]);
    onPageTextBlocksChange(next);
  }, [pageTextBlocks, onPageTextBlocksChange]);

  const updateSelected = useCallback((patch: Partial<PageTextBlock>) => {
    if (selectedIdx < 0) return;
    updateBlocks(effectivePage, (arr) => {
      const copy = [...arr];
      copy[selectedIdx] = { ...copy[selectedIdx], ...patch };
      return copy;
    });
  }, [effectivePage, selectedIdx, updateBlocks]);

  // ── rAF render loop — draws real overlay canvas + selection outlines ────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    function draw() {
      canvas!.width = displayW;
      canvas!.height = displayH;
      ctx.clearRect(0, 0, displayW, displayH);

      // Draw real overlay/spread canvas
      if (isSpreadMode) {
        const spread = spreadsRef.current?.get(effectivePage);
        if (spread) {
          ctx.drawImage(spread.canvas, 0, 0, displayW, displayH);
        } else {
          ctx.fillStyle = params.pageColor;
          ctx.fillRect(0, 0, displayW, displayH);
        }
        // Center fold line
        ctx.save();
        ctx.strokeStyle = 'rgba(236,242,255,0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(displayW / 2, 0);
        ctx.lineTo(displayW / 2, displayH);
        ctx.stroke();
        ctx.restore();
      } else {
        const overlays = overlaysRef.current;
        const overlay = overlays?.[page];
        if (overlay) {
          ctx.drawImage(overlay.canvas, 0, 0, displayW, displayH);
        } else {
          ctx.fillStyle = params.pageColor;
          ctx.fillRect(0, 0, displayW, displayH);
        }
      }

      // Draw selection outlines using accurate TextBlock measurement
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const bw = b.width > 0 ? b.width : 200;
        const bh = blockHeight(b);
        const sx = b.x * scale;
        const sy = b.y * scale;
        const sw = bw * scale;
        const sh = bh * scale;

        ctx.save();
        const active = i === selectedIdx;
        ctx.strokeStyle = active ? '#89d8b0' : 'rgba(236,242,255,0.4)';
        ctx.lineWidth = active ? 2 : 1;
        if (!active) ctx.setLineDash([3, 3]);
        ctx.strokeRect(sx, sy, sw, sh);
        ctx.restore();

        ctx.save();
        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = active ? '#89d8b0' : 'rgba(236,242,255,0.5)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`T${i + 1}`, sx + 3, sy + 2);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [blocks, selectedIdx, params.pageColor, params.bookFont, displayW, displayH, scale, page, effectivePage, isSpreadMode, overlaysRef, spreadsRef, blockHeight]);

  // ── Pointer events ─────────────────────────────────────────────────────

  const toCanvas = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  }, [scale]);

  const hitTest = useCallback((cx: number, cy: number): number => {
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i];
      const bw = b.width > 0 ? b.width : 200;
      const bh = blockHeight(b);
      if (cx >= b.x && cx <= b.x + bw && cy >= b.y && cy <= b.y + bh) return i;
    }
    return -1;
  }, [blocks, blockHeight]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const cv = toCanvas(e);
    const hit = hitTest(cv.x, cv.y);
    setSelectedIdx(hit);
    if (hit >= 0) {
      const b = blocks[hit];
      dragRef.current = { startX: cv.x, startY: cv.y, blockX: b.x, blockY: b.y };
      canvasRef.current?.setPointerCapture(e.pointerId);
    }
    e.stopPropagation();
  }, [toCanvas, hitTest, blocks]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || selectedIdx < 0) return;
    const cv = toCanvas(e);
    const dx = cv.x - dragRef.current.startX;
    const dy = cv.y - dragRef.current.startY;
    updateSelected({
      x: Math.max(0, Math.min(canvasW - 20, dragRef.current.blockX + dx)),
      y: Math.max(0, Math.min(canvasH - 20, dragRef.current.blockY + dy)),
    });
  }, [toCanvas, selectedIdx, canvasW, canvasH, updateSelected]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <div
      style={{
        position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)',
        padding: 10, borderRadius: 12, color: '#ecf2ff',
        fontFamily: "'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif",
        fontSize: 12, background: 'rgba(8, 10, 18, 0.82)',
        border: '1px solid rgba(214, 225, 255, 0.2)',
        boxShadow: '0 18px 42px rgba(0, 0, 0, 0.38)',
        backdropFilter: 'blur(8px)', userSelect: 'none', zIndex: 100,
        display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 460,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Page selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <button style={BTN} onClick={() => { if (page > 0) { setCurrentPage(page - 1); setSelectedIdx(-1); } }}>{'\u25C0'}</button>
        <span style={{ fontWeight: 600, fontSize: 12, minWidth: 120, textAlign: 'center' }}>
          {isSpreadMode ? `Spread ${effectivePage + 1}\u2013${effectivePage + 2}` : `Page ${page + 1}`} of {params.pageCount}
        </span>
        <button style={BTN} onClick={() => { if (page < params.pageCount - 1) { setCurrentPage(page + 1); setSelectedIdx(-1); } }}>{'\u25B6'}</button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8, width: '100%' }}>
        <select
          value={selected?.fontFamily ?? ''}
          style={{ ...MINI_SELECT, maxWidth: 120 }}
          onChange={(e) => updateSelected({ fontFamily: e.target.value })}
          disabled={!selected}
        >
          <option value="">Book default</option>
          {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>

        <input
          type="number" min={8} max={120}
          value={selected?.fontSize ?? 22}
          style={{ ...MINI_SELECT, width: 52 }}
          onChange={(e) => updateSelected({ fontSize: parseInt(e.target.value, 10) || 22 })}
          disabled={!selected}
        />

        <button
          style={{ ...BTN, fontWeight: 'bold', minWidth: 28, background: selected?.fontWeight === 'bold' ? 'rgba(137,216,176,0.3)' : undefined }}
          onClick={() => updateSelected({ fontWeight: selected?.fontWeight === 'bold' ? 'normal' : 'bold' })}
          disabled={!selected}
        >B</button>

        <button
          style={{ ...BTN, fontStyle: 'italic', minWidth: 28, background: selected?.fontStyle === 'italic' ? 'rgba(137,216,176,0.3)' : undefined }}
          onClick={() => updateSelected({ fontStyle: selected?.fontStyle === 'italic' ? 'normal' : 'italic' })}
          disabled={!selected}
        >I</button>

        <input
          type="color" value={selected?.color ?? '#1a1a1a'}
          style={{ width: 28, height: 24, border: 'none', background: 'none', cursor: 'pointer' }}
          onChange={(e) => updateSelected({ color: e.target.value })}
          disabled={!selected}
        />

        {(['left', 'center', 'right'] as const).map((a) => (
          <button
            key={a}
            style={{ ...BTN, minWidth: 28, background: selected?.textAlign === a ? 'rgba(137,216,176,0.3)' : undefined }}
            onClick={() => updateSelected({ textAlign: a })}
            disabled={!selected}
            title={a}
          >
            {a === 'left' ? '\u2190' : a === 'center' ? '\u2194' : '\u2192'}
          </button>
        ))}
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, width: '100%' }}>
        <button
          style={{ ...BTN, flex: 1 }}
          onClick={() => {
            const spreadW = isSpreadMode ? params.pageWidth * 2 : params.pageWidth;
            updateBlocks(effectivePage, (arr) => [...arr, createDefaultTextBlock(spreadW, params.pageHeight)]);
            setSelectedIdx(blocks.length);
          }}
        >+ Add Text</button>
        <button
          style={{ ...BTN, flex: 1 }}
          disabled={selectedIdx < 0}
          onClick={() => {
            updateBlocks(effectivePage, (arr) => arr.filter((_, j) => j !== selectedIdx));
            setSelectedIdx(-1);
          }}
        >{'\u2715'} Remove</button>
      </div>

      {/* Preview canvas */}
      <canvas
        ref={canvasRef}
        width={displayW}
        height={displayH}
        style={{
          display: 'block', borderRadius: 8, cursor: 'crosshair',
          border: '1px solid rgba(236,242,255,0.12)', marginBottom: 8,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />

      {/* Textarea */}
      <textarea
        rows={3}
        placeholder="Select a text block, then type here\u2026"
        value={selected?.text ?? ''}
        disabled={!selected}
        style={{
          width: '100%', boxSizing: 'border-box', padding: '6px 8px',
          borderRadius: 6, border: '1px solid rgba(236,242,255,0.18)',
          background: 'rgba(255,255,255,0.06)', color: '#eef4ff',
          fontFamily: 'inherit', fontSize: 12, resize: 'vertical',
        }}
        onChange={(e) => updateSelected({ text: e.target.value })}
      />
    </div>
  );
}

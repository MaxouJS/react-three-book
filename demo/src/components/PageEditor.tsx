/**
 * PageEditor — WYSIWYG text block editor for book pages.
 *
 * Floating bottom panel with page selector, toolbar, 2D preview canvas
 * (click-to-select, drag-to-move), and textarea for editing text content.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DemoParams, PageTextBlock } from '../state';
import { FONT_OPTIONS, createDefaultTextBlock, PX_PER_UNIT } from '../state';

interface PageEditorProps {
  params: DemoParams;
  pageTextBlocks: PageTextBlock[][];
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

export default function PageEditor({ params, pageTextBlocks, onPageTextBlocksChange }: PageEditorProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; blockX: number; blockY: number } | null>(null);

  // Clamp page
  const page = Math.min(currentPage, params.pageCount - 1);
  const blocks = pageTextBlocks[page] ?? [];
  const selected = selectedIdx >= 0 && selectedIdx < blocks.length ? blocks[selectedIdx] : null;

  const canvasW = Math.round(params.pageWidth * PX_PER_UNIT);
  const canvasH = Math.round(params.pageHeight * PX_PER_UNIT);
  const scale = DISPLAY_MAX / Math.max(canvasW, canvasH);
  const displayW = Math.round(canvasW * scale);
  const displayH = Math.round(canvasH * scale);

  // Immutable update helper
  const updateBlocks = useCallback((pageIdx: number, updater: (b: PageTextBlock[]) => PageTextBlock[]) => {
    const next = [...pageTextBlocks];
    next[pageIdx] = updater([...(next[pageIdx] ?? [])]);
    onPageTextBlocksChange(next);
  }, [pageTextBlocks, onPageTextBlocksChange]);

  const updateSelected = useCallback((patch: Partial<PageTextBlock>) => {
    if (selectedIdx < 0) return;
    updateBlocks(page, (arr) => {
      const copy = [...arr];
      copy[selectedIdx] = { ...copy[selectedIdx], ...patch };
      return copy;
    });
  }, [page, selectedIdx, updateBlocks]);

  // ── Canvas rendering ─────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = displayW;
    canvas.height = displayH;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = params.pageColor;
    ctx.fillRect(0, 0, displayW, displayH);

    // Draw text blocks preview
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const sx = b.x * scale;
      const sy = b.y * scale;
      const sw = (b.width > 0 ? b.width : 200) * scale;
      const sh = Math.max(b.fontSize * 1.4 * 3, 40) * scale;

      // Draw text (simplified preview)
      if (b.text) {
        ctx.save();
        const font = b.fontFamily || params.bookFont;
        const fs = Math.max(8, b.fontSize * scale);
        ctx.font = `${b.fontStyle} ${b.fontWeight} ${fs}px ${font}`;
        ctx.fillStyle = b.color;
        ctx.textBaseline = 'top';
        ctx.textAlign = b.textAlign;

        const lines = b.text.split('\n');
        const leading = fs * 1.4;
        const textX = b.textAlign === 'center' ? sx + sw / 2
                     : b.textAlign === 'right' ? sx + sw
                     : sx;
        for (let j = 0; j < lines.length; j++) {
          ctx.fillText(lines[j], textX, sy + j * leading, sw);
        }
        ctx.restore();
      }

      // Selection/hover outline
      ctx.save();
      const active = i === selectedIdx;
      ctx.strokeStyle = active ? '#89d8b0' : 'rgba(236,242,255,0.4)';
      ctx.lineWidth = active ? 2 : 1;
      if (!active) ctx.setLineDash([3, 3]);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.restore();

      // Badge
      ctx.save();
      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = active ? '#89d8b0' : 'rgba(236,242,255,0.5)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`T${i + 1}`, sx + 3, sy + 2);
      ctx.restore();
    }
  }, [blocks, selectedIdx, params.pageColor, params.bookFont, displayW, displayH, scale]);

  // ── Pointer events ─────────────────────────────────────────────────────

  const toCanvas = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  }, [scale]);

  const hitTest = useCallback((cx: number, cy: number): number => {
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i];
      const bw = b.width > 0 ? b.width : 200;
      const bh = Math.max(b.fontSize * 1.4 * 2, 40);
      if (cx >= b.x && cx <= b.x + bw && cy >= b.y && cy <= b.y + bh) return i;
    }
    return -1;
  }, [blocks]);

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
        <span style={{ fontWeight: 600, fontSize: 12, minWidth: 90, textAlign: 'center' }}>
          Page {page + 1} of {params.pageCount}
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
            updateBlocks(page, (arr) => [...arr, createDefaultTextBlock(params.pageWidth, params.pageHeight)]);
            setSelectedIdx(blocks.length);
          }}
        >+ Add Text</button>
        <button
          style={{ ...BTN, flex: 1 }}
          disabled={selectedIdx < 0}
          onClick={() => {
            updateBlocks(page, (arr) => arr.filter((_, j) => j !== selectedIdx));
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

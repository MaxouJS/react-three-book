/**
 * PageEditor — WYSIWYG text block editor for book pages and covers.
 * Renders bare content (no panel wrapper — parent provides the container).
 *
 * Unified surface navigation:
 *   Surface 0: Front Cover Outer
 *   Surface 1: Front Cover Inner
 *   Surface 2..N+1: Page 1..N
 *   Surface N+2: Back Cover Inner
 *   Surface N+3: Back Cover Outer
 *
 * Interaction model:
 *   - Background image is always the bottom layer — never "selected"
 *   - selectedIdx: -1 = nothing, 0+ = text block index
 *   - Click on text block → select + drag text
 *   - Click on empty space → deselect text, begin image pan (if image present)
 *   - Scroll wheel → cursor-centric zoom on image (no selection needed)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { TextBlock, drawImageWithFit } from '@objectifthunes/react-three-book';
import type { DemoParams, ImageSlot, ImageRect, PageTextBlock } from '../state';
import { FONT_OPTIONS, createDefaultTextBlock, PX_PER_UNIT } from '../state';

interface PageEditorProps {
  params: DemoParams;
  pageSlots: ImageSlot[];
  coverSlots: ImageSlot[];
  pageTextBlocks: PageTextBlock[][];
  spreadPages: Set<number>;
  onPageTextBlocksChange: (blocks: PageTextBlock[][]) => void;
  onPageSlotChange: (i: number, updater: (s: ImageSlot) => ImageSlot) => void;
  onCoverSlotChange: (i: number, updater: (s: ImageSlot) => ImageSlot) => void;
}

interface DragState {
  type: 'text' | 'image';
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

const DISPLAY_MAX = 360;

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

const COVER_LABELS = ['Front Cover Outer', 'Front Cover Inner', 'Back Cover Inner', 'Back Cover Outer'];

// Offscreen context for TextBlock measurement (font metrics only).
const _measureCanvas = document.createElement('canvas');
_measureCanvas.width = 1;
_measureCanvas.height = 1;
const measureCtx = _measureCanvas.getContext('2d')!;

export default function PageEditor({
  params, pageSlots, coverSlots, pageTextBlocks, spreadPages,
  onPageTextBlocksChange, onPageSlotChange, onCoverSlotChange,
}: PageEditorProps) {
  const [currentSurface, setCurrentSurface] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const dragRef = useRef<DragState | null>(null);

  const totalSurfaces = 4 + params.pageCount;
  const surface = Math.min(currentSurface, totalSurfaces - 1);

  // Surface classification helpers
  const isCover = surface === 0 || surface === 1 || surface === totalSurfaces - 2 || surface === totalSurfaces - 1;

  /** Maps a cover surface index to 0-3. Only valid when isCover is true. */
  const coverIdx = surface <= 1 ? surface : surface === totalSurfaces - 2 ? 2 : 3;

  /** Maps a page surface index to 0-based page index. Only valid when isCover is false. */
  const pageIdx = surface - 2;

  // Spread logic — only applies to pages
  const isSpread = !isCover && spreadPages.has(pageIdx);
  const isRightOfSpread = !isCover && spreadPages.has(pageIdx - 1);
  const effectivePageIdx = isRightOfSpread ? pageIdx - 1 : pageIdx;
  const isSpreadMode = isSpread || isRightOfSpread;

  // Text blocks — empty for covers
  const blocks = isCover ? [] : (pageTextBlocks[effectivePageIdx] ?? []);
  const selected = selectedIdx >= 0 && selectedIdx < blocks.length ? blocks[selectedIdx] : null;

  // Dimensions depend on cover vs page
  const surfaceWidth = isCover ? params.coverWidth : params.pageWidth;
  const surfaceHeight = isCover ? params.coverHeight : params.pageHeight;
  const widthMultiplier = isSpreadMode ? 2 : 1;
  const canvasW = Math.round(surfaceWidth * PX_PER_UNIT) * widthMultiplier;
  const canvasH = Math.round(surfaceHeight * PX_PER_UNIT);
  const scale = DISPLAY_MAX / Math.max(canvasW, canvasH);
  const displayW = Math.round(canvasW * scale);
  const displayH = Math.round(canvasH * scale);

  // Background color
  const bgColor = isCover ? params.coverColor : params.pageColor;

  // Current slot (cover or page)
  const currentSlot = isCover ? coverSlots[coverIdx] : pageSlots[effectivePageIdx];

  // Correct slot change callback
  const onCurrentSlotChange = useCallback((updater: (s: ImageSlot) => ImageSlot) => {
    if (isCover) {
      onCoverSlotChange(coverIdx, updater);
    } else {
      onPageSlotChange(effectivePageIdx, updater);
    }
  }, [isCover, coverIdx, effectivePageIdx, onCoverSlotChange, onPageSlotChange]);

  // Surface label
  const surfaceLabel = (() => {
    if (isCover) return COVER_LABELS[coverIdx];
    if (isSpreadMode) return `Spread ${effectivePageIdx + 1}\u2013${effectivePageIdx + 2}`;
    return `Page ${pageIdx + 1}`;
  })();

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
  const updateBlocks = useCallback((pIdx: number, updater: (b: PageTextBlock[]) => PageTextBlock[]) => {
    const next = [...pageTextBlocks];
    next[pIdx] = updater([...(next[pIdx] ?? [])]);
    onPageTextBlocksChange(next);
  }, [pageTextBlocks, onPageTextBlocksChange]);

  const updateSelected = useCallback((patch: Partial<PageTextBlock>) => {
    if (selectedIdx < 0 || isCover) return;
    updateBlocks(effectivePageIdx, (arr) => {
      const copy = [...arr];
      copy[selectedIdx] = { ...copy[selectedIdx], ...patch };
      return copy;
    });
  }, [effectivePageIdx, selectedIdx, updateBlocks, isCover]);

  // rAF render loop — draws surface preview with text blocks + selection outlines

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const isDraggingImage = () => dragRef.current?.type === 'image';

    function draw() {
      canvas!.width = displayW;
      canvas!.height = displayH;
      ctx.clearRect(0, 0, displayW, displayH);

      // Draw surface background + image
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, displayW, displayH);

      // Draw slot image if present
      const slot = currentSlot;
      if (slot?.useImage && slot.image) {
        ctx.save();
        ctx.scale(scale, scale);
        if (slot.imageRect) {
          ctx.drawImage(slot.image, slot.imageRect.x, slot.imageRect.y, slot.imageRect.width, slot.imageRect.height);
        } else {
          const imgW = canvasW;
          const imgH = canvasH;
          const margin = slot.fullBleed ? 0 : Math.round(Math.min(imgW, imgH) * 0.11);
          drawImageWithFit(ctx, slot.image, margin, margin, imgW - margin * 2, imgH - margin * 2, slot.fitMode);
        }
        ctx.restore();
      }

      // Subtle outline during image pan drag
      if (isDraggingImage() && currentSlot?.imageRect) {
        const ir = currentSlot.imageRect;
        ctx.save();
        ctx.strokeStyle = 'rgba(137,216,176,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
          ir.x * scale,
          ir.y * scale,
          ir.width * scale,
          ir.height * scale,
        );
        ctx.restore();
      }

      // Draw text blocks onto preview (pages only)
      if (!isCover) {
        ctx.save();
        ctx.scale(scale, scale);
        for (const b of blocks) {
          if (!b.text) continue;
          const tb = new TextBlock({
            text: b.text, x: b.x, y: b.y, width: b.width,
            fontFamily: b.fontFamily || params.bookFont,
            fontSize: b.fontSize, fontWeight: b.fontWeight, fontStyle: b.fontStyle,
            color: b.color, textAlign: b.textAlign, lineHeight: 1.4,
            shadowColor: 'rgba(255,255,255,0.6)', shadowBlur: 3,
          });
          tb.draw(ctx);
        }
        ctx.restore();
      }

      // Draw spread fold line
      if (isSpreadMode) {
        ctx.save();
        ctx.strokeStyle = 'rgba(236,242,255,0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(displayW / 2, 0);
        ctx.lineTo(displayW / 2, displayH);
        ctx.stroke();
        ctx.restore();
      }

      // Draw selection outlines (pages only)
      if (!isCover) {
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
          ctx.fillText(`T${i + 1}`, sx + 3, sy + 10);
          ctx.restore();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [blocks, selectedIdx, bgColor, params.bookFont, displayW, displayH, scale, surface, effectivePageIdx, isSpreadMode, isCover, blockHeight, pageSlots, coverSlots, currentSlot, canvasW, canvasH]);

  // Pointer events

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

    // Text block hit test (pages only)
    if (!isCover) {
      const hit = hitTest(cv.x, cv.y);
      if (hit >= 0) {
        setSelectedIdx(hit);
        const b = blocks[hit];
        dragRef.current = { type: 'text', startX: cv.x, startY: cv.y, originX: b.x, originY: b.y };
        canvasRef.current!.style.cursor = 'grabbing';
        canvasRef.current?.setPointerCapture(e.pointerId);
        e.stopPropagation();
        return;
      }
    }

    // No text hit — deselect any selected text block
    setSelectedIdx(-1);

    // If the current slot has an image with imageRect, begin image pan
    const slot = currentSlot;
    if (slot?.useImage && slot.image && slot.imageRect) {
      const ir = slot.imageRect;
      dragRef.current = { type: 'image', startX: cv.x, startY: cv.y, originX: ir.x, originY: ir.y };
      canvasRef.current!.style.cursor = 'grabbing';
      canvasRef.current?.setPointerCapture(e.pointerId);
    }

    e.stopPropagation();
  }, [toCanvas, hitTest, blocks, currentSlot, isCover]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (drag) {
      const cv = toCanvas(e);
      const dx = cv.x - drag.startX;
      const dy = cv.y - drag.startY;
      if (drag.type === 'image') {
        // Panning image — update imageRect x/y directly
        const newX = drag.originX + dx;
        const newY = drag.originY + dy;
        onCurrentSlotChange((s) => {
          if (!s.imageRect) return s;
          return { ...s, imageRect: { ...s.imageRect, x: newX, y: newY } };
        });
      } else if (drag.type === 'text' && selectedIdx >= 0 && !isCover) {
        updateSelected({
          x: Math.max(-canvasW + 40, Math.min(canvasW - 40, drag.originX + dx)),
          y: Math.max(-canvasH + 40, Math.min(canvasH - 40, drag.originY + dy)),
        });
      }
    } else {
      // Hover feedback — no drag in progress
      const cv = toCanvas(e);
      if (!isCover) {
        const hit = hitTest(cv.x, cv.y);
        if (hit >= 0) {
          canvasRef.current!.style.cursor = 'grab';
          return;
        }
      }
      // Empty space — show move cursor if image is pannable
      if (currentSlot?.useImage && currentSlot.image && currentSlot.imageRect) {
        canvasRef.current!.style.cursor = 'move';
        return;
      }
      canvasRef.current!.style.cursor = 'default';
    }
  }, [toCanvas, selectedIdx, canvasW, canvasH, updateSelected, onCurrentSlotChange, isCover, hitTest, currentSlot]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  }, []);

  // Wheel-to-zoom — cursor-centric, no selection needed (native listener with passive: false)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function onWheel(e: WheelEvent) {
      const slot = currentSlot;
      if (!slot?.useImage || !slot.image || !slot.imageRect) return;
      e.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      const cursorX = (e.clientX - rect.left) / scale;
      const cursorY = (e.clientY - rect.top) / scale;
      const factor = e.deltaY > 0 ? 0.90 : 1.10;
      onCurrentSlotChange((s) => {
        if (!s.imageRect) return s;
        const ir = s.imageRect;
        const newW = ir.width * factor;
        const newH = ir.height * factor;
        const newX = cursorX - (cursorX - ir.x) * factor;
        const newY = cursorY - (cursorY - ir.y) * factor;
        return { ...s, imageRect: { x: newX, y: newY, width: newW, height: newH } };
      });
    }
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [currentSlot, onCurrentSlotChange, scale]);

  // Reset selection when changing surfaces
  useEffect(() => {
    setSelectedIdx(-1);
  }, [surface]);

  return (
    <>
      {/* Surface selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <button style={BTN} onClick={() => { if (surface > 0) setCurrentSurface(surface - 1); }}>{'\u25C0'}</button>
        <span style={{ fontWeight: 600, fontSize: 12, minWidth: 160, textAlign: 'center' }}>
          {surfaceLabel} <span style={{ opacity: 0.5, fontWeight: 400 }}>({surface + 1}/{totalSurfaces})</span>
        </span>
        <button style={BTN} onClick={() => { if (surface < totalSurfaces - 1) setCurrentSurface(surface + 1); }}>{'\u25B6'}</button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8, width: '100%' }}>
        <select
          value={selected?.fontFamily ?? ''}
          style={{ ...MINI_SELECT, maxWidth: 120 }}
          onChange={(e) => updateSelected({ fontFamily: e.target.value })}
          disabled={!selected || isCover}
        >
          <option value="">Book default</option>
          {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>

        <input
          type="number" min={8} max={120}
          value={selected?.fontSize ?? 22}
          style={{ ...MINI_SELECT, width: 52 }}
          onChange={(e) => updateSelected({ fontSize: parseInt(e.target.value, 10) || 22 })}
          disabled={!selected || isCover}
        />

        <button
          style={{ ...BTN, fontWeight: 'bold', minWidth: 28, background: selected?.fontWeight === 'bold' ? 'rgba(137,216,176,0.3)' : undefined }}
          onClick={() => updateSelected({ fontWeight: selected?.fontWeight === 'bold' ? 'normal' : 'bold' })}
          disabled={!selected || isCover}
        >B</button>

        <button
          style={{ ...BTN, fontStyle: 'italic', minWidth: 28, background: selected?.fontStyle === 'italic' ? 'rgba(137,216,176,0.3)' : undefined }}
          onClick={() => updateSelected({ fontStyle: selected?.fontStyle === 'italic' ? 'normal' : 'italic' })}
          disabled={!selected || isCover}
        >I</button>

        <input
          type="color" value={selected?.color ?? '#1a1a1a'}
          style={{ width: 28, height: 24, border: 'none', background: 'none', cursor: 'pointer' }}
          onChange={(e) => updateSelected({ color: e.target.value })}
          disabled={!selected || isCover}
        />

        {(['left', 'center', 'right'] as const).map((a) => (
          <button
            key={a}
            style={{ ...BTN, minWidth: 28, background: selected?.textAlign === a ? 'rgba(137,216,176,0.3)' : undefined }}
            onClick={() => updateSelected({ textAlign: a })}
            disabled={!selected || isCover}
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
          disabled={isCover}
          onClick={() => {
            if (isCover) return;
            const spreadW = isSpreadMode ? params.pageWidth * 2 : params.pageWidth;
            updateBlocks(effectivePageIdx, (arr) => [...arr, createDefaultTextBlock(spreadW, params.pageHeight)]);
            setSelectedIdx(blocks.length);
          }}
        >+ Add Text</button>
        <button
          style={{ ...BTN, flex: 1 }}
          disabled={selectedIdx < 0 || isCover}
          onClick={() => {
            if (isCover) return;
            updateBlocks(effectivePageIdx, (arr) => arr.filter((_, j) => j !== selectedIdx));
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
          display: 'block', borderRadius: 8, cursor: 'default',
          border: '1px solid rgba(236,242,255,0.12)', marginBottom: 8,
          maxWidth: '100%',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />

      {/* Textarea */}
      <textarea
        rows={3}
        placeholder={isCover ? 'Text editing not available on covers' : 'Select a text block, then type here\u2026'}
        value={selected?.text ?? ''}
        disabled={!selected || isCover}
        style={{
          width: '100%', boxSizing: 'border-box', padding: '6px 8px',
          borderRadius: 6, border: '1px solid rgba(236,242,255,0.18)',
          background: 'rgba(255,255,255,0.06)', color: '#eef4ff',
          fontFamily: 'inherit', fontSize: 12, resize: 'vertical',
        }}
        onChange={(e) => updateSelected({ text: e.target.value })}
      />
    </>
  );
}

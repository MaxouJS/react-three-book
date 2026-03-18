import { useCallback } from 'react';
import { drawImageWithFit, loadImage, getSpreadPairs } from '@objectifthunes/react-three-book';
import type { ImageSlot, ImageFitMode, DemoParams } from '../state';
import { PANEL_STYLE, SectionTitle } from './UiHelpers';

interface RightPanelProps {
  params: DemoParams;
  coverSlots: ImageSlot[];
  pageSlots: ImageSlot[];
  spreadPages: Set<number>;
  onCoverSlotChange: (index: number, updater: (slot: ImageSlot) => ImageSlot) => void;
  onPageSlotChange: (index: number, updater: (slot: ImageSlot) => ImageSlot) => void;
  onSpreadPagesChange: (next: Set<number>) => void;
}

function renderThumbnail(slot: ImageSlot, color: string, aspectW: number, aspectH: number): string {
  const thumbH = 64;
  const thumbW = Math.round(thumbH * (aspectW / aspectH));
  const canvas = document.createElement('canvas');
  canvas.width = thumbW * 2;
  canvas.height = thumbH * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (slot.useImage && slot.image) {
    const m = slot.fullBleed ? 0 : Math.round(Math.min(canvas.width, canvas.height) * 0.11);
    drawImageWithFit(ctx, slot.image, m, m, canvas.width - m * 2, canvas.height - m * 2, slot.fitMode);
  }
  return canvas.toDataURL();
}

const CARD_STYLE: React.CSSProperties = { margin: '0 0 8px', padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(236,242,255,0.12)' };
const MINI_BTN: React.CSSProperties = { padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(236,242,255,0.22)', background: 'rgba(255,255,255,0.08)', color: '#eef4ff', fontFamily: 'inherit', fontSize: 11, cursor: 'pointer' };
const MINI_SELECT: React.CSSProperties = { padding: '3px 6px', borderRadius: 6, border: '1px solid rgba(236,242,255,0.22)', background: 'rgba(255,255,255,0.06)', color: '#eef4ff', fontSize: 11, fontFamily: 'inherit' };

interface TextureCardProps {
  label: string; slot: ImageSlot; bgColor: string;
  aspectW: number; aspectH: number;
  onFitModeChange: (mode: ImageFitMode) => void;
  onFullBleedChange: (v: boolean) => void;
  onClear: () => void;
  onFileChange: (file: File | null) => void;
}

function TextureCard({ label, slot, bgColor, aspectW, aspectH, onFitModeChange, onFullBleedChange, onClear, onFileChange }: TextureCardProps) {
  const thumbH = 64;
  const thumbW = Math.round(thumbH * (aspectW / aspectH));
  return (
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <img src={renderThumbnail(slot, bgColor, aspectW, aspectH)} alt={label} style={{ width: thumbW, height: thumbH, borderRadius: 6, objectFit: 'cover', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(236,242,255,0.15)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, color: 'rgba(236,242,255,0.92)' }}>{label}</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={slot.fitMode} style={MINI_SELECT} onChange={(e) => onFitModeChange(e.target.value as ImageFitMode)}>
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="fill">Fill</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'rgba(236,242,255,0.78)', cursor: 'pointer' }}>
              <input type="checkbox" checked={slot.fullBleed} style={{ width: 13, height: 13 }} onChange={(e) => onFullBleedChange(e.target.checked)} />
              Bleed
            </label>
            <button type="button" style={MINI_BTN} onClick={onClear}>Clear</button>
          </div>
          <div style={{ marginTop: 5 }}>
            <input type="file" accept="image/*" style={{ width: '100%', fontSize: 11, color: 'rgba(236,242,255,0.76)' }} onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RightPanel({ params, coverSlots, pageSlots, spreadPages, onCoverSlotChange, onPageSlotChange, onSpreadPagesChange }: RightPanelProps) {
  const coverLabels = ['Front Outer', 'Front Inner', 'Back Inner', 'Back Outer'];

  const makeHandlers = useCallback((index: number, onSlotChange: (i: number, u: (s: ImageSlot) => ImageSlot) => void, slot: ImageSlot) => ({
    onFitModeChange: (mode: ImageFitMode) => onSlotChange(index, (s) => ({ ...s, fitMode: mode })),
    onFullBleedChange: (fullBleed: boolean) => onSlotChange(index, (s) => ({ ...s, fullBleed })),
    onClear: () => {
      if (slot.objectUrl) URL.revokeObjectURL(slot.objectUrl);
      onSlotChange(index, () => ({ ...slot, image: null, objectUrl: null, useImage: false }));
    },
    onFileChange: async (file: File | null) => {
      const result = await loadImage(file);
      if (!result) return;
      if (slot.objectUrl) URL.revokeObjectURL(slot.objectUrl);
      onSlotChange(index, () => ({ ...slot, image: result.image, objectUrl: result.objectUrl, useImage: true }));
    },
  }), []);

  const eligibleSpreads = new Set(getSpreadPairs(params.pageCount));

  const pageCards: React.ReactNode[] = [];
  for (let i = 0; i < params.pageCount; i++) {
    const isSpread = spreadPages.has(i);
    const isRightOfSpread = spreadPages.has(i - 1);

    // Skip right half of spread (merged into left card)
    if (isRightOfSpread) continue;

    // Spread checkbox for eligible pairs
    if (eligibleSpreads.has(i)) {
      pageCards.push(
        <label key={`spread-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '6px 0 4px', fontSize: 11, color: 'rgba(236,242,255,0.82)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isSpread}
            style={{ width: 14, height: 14 }}
            onChange={(e) => {
              const next = new Set(spreadPages);
              if (e.target.checked) next.add(i); else next.delete(i);
              onSpreadPagesChange(next);
            }}
          />
          Double-page spread: Pages {i + 1}\u2013{i + 2}
        </label>,
      );
    }

    const slot = pageSlots[i];
    const label = isSpread ? `Spread ${i + 1}\u2013${i + 2}` : `Page ${i + 1}`;
    const aspectW = isSpread ? params.pageWidth * 2 : params.pageWidth;
    pageCards.push(
      <TextureCard
        key={`page-${i}`}
        label={label}
        slot={slot}
        bgColor={params.pageColor}
        aspectW={aspectW}
        aspectH={params.pageHeight}
        {...makeHandlers(i, onPageSlotChange, slot)}
      />,
    );
  }

  return (
    <div style={{ ...PANEL_STYLE, right: 10 }}>
      <h1 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700 }}>Textures</h1>
      <SectionTitle text="Cover Textures" />
      {coverSlots.map((slot, i) => <TextureCard key={i} label={coverLabels[i]} slot={slot} bgColor={params.coverColor} aspectW={params.coverWidth} aspectH={params.coverHeight} {...makeHandlers(i, onCoverSlotChange, slot)} />)}
      <SectionTitle text="Page Textures" />
      {pageCards}
    </div>
  );
}

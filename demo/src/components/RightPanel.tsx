/**
 * Right texture panel — React port of three-book/demo/src/right-panel.ts.
 * Same layout, same controls (fit mode, full bleed, clear, file input, thumbnail).
 */

import { useCallback } from 'react';
import type { ImageSlot, ImageFitMode, DemoParams } from '../state';
import { clearImageSlot } from '../state';
import { drawImageWithFit, loadImageFromFile } from '../textures';
import { PANEL_STYLE, SectionTitle } from './UiHelpers';

interface RightPanelProps {
  params: DemoParams;
  coverSlots: ImageSlot[];
  pageSlots: ImageSlot[];
  onCoverSlotChange: (index: number, updater: (slot: ImageSlot) => ImageSlot) => void;
  onPageSlotChange: (index: number, updater: (slot: ImageSlot) => ImageSlot) => void;
}

function renderThumbnail(slot: ImageSlot, color: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);
  if (slot.useImage && slot.image) {
    const margin = slot.fullBleed ? 0 : 14;
    drawImageWithFit(ctx, slot.image, margin, margin, 128 - margin * 2, 128 - margin * 2, slot.fitMode);
  }
  return canvas.toDataURL();
}

const THUMB_STYLE: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 6,
  objectFit: 'cover',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(236,242,255,0.15)',
  flexShrink: 0,
};

const CARD_STYLE: React.CSSProperties = {
  margin: '0 0 8px',
  padding: 10,
  borderRadius: 8,
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(236, 242, 255, 0.12)',
};

const MINI_BTN_STYLE: React.CSSProperties = {
  padding: '3px 8px',
  borderRadius: 6,
  border: '1px solid rgba(236,242,255,0.22)',
  background: 'rgba(255,255,255,0.08)',
  color: '#eef4ff',
  fontFamily: 'inherit',
  fontSize: 11,
  cursor: 'pointer',
};

const MINI_SELECT_STYLE: React.CSSProperties = {
  padding: '3px 6px',
  borderRadius: 6,
  border: '1px solid rgba(236,242,255,0.22)',
  background: 'rgba(255,255,255,0.06)',
  color: '#eef4ff',
  fontSize: 11,
  fontFamily: 'inherit',
};

interface TextureCardProps {
  label: string;
  slot: ImageSlot;
  bgColor: string;
  onFitModeChange: (mode: ImageFitMode) => void;
  onFullBleedChange: (fullBleed: boolean) => void;
  onClear: () => void;
  onFileChange: (file: File | null) => void;
}

function TextureCard({
  label,
  slot,
  bgColor,
  onFitModeChange,
  onFullBleedChange,
  onClear,
  onFileChange,
}: TextureCardProps) {
  const thumbSrc = renderThumbnail(slot, bgColor);

  return (
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <img src={thumbSrc} alt={label} style={THUMB_STYLE} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600,
            fontSize: 12,
            marginBottom: 6,
            color: 'rgba(236,242,255,0.92)',
          }}>
            {label}
          </div>

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Fit mode */}
            <select
              value={slot.fitMode}
              style={MINI_SELECT_STYLE}
              onChange={(e) => onFitModeChange(e.target.value as ImageFitMode)}
            >
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="fill">Fill</option>
            </select>

            {/* Full bleed */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 11,
              color: 'rgba(236,242,255,0.78)',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={slot.fullBleed}
                style={{ width: 13, height: 13 }}
                onChange={(e) => onFullBleedChange(e.target.checked)}
              />
              Bleed
            </label>

            {/* Clear */}
            <button type="button" style={MINI_BTN_STYLE} onClick={onClear}>
              Clear
            </button>
          </div>

          {/* File input */}
          <div style={{ marginTop: 5 }}>
            <input
              type="file"
              accept="image/*"
              style={{ width: '100%', fontSize: 11, color: 'rgba(236,242,255,0.76)' }}
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RightPanel({
  params,
  coverSlots,
  pageSlots,
  onCoverSlotChange,
  onPageSlotChange,
}: RightPanelProps) {
  const coverLabels = ['Front Outer', 'Front Inner', 'Back Inner', 'Back Outer'];

  const makeSlotHandlers = useCallback(
    (
      index: number,
      onSlotChange: (index: number, updater: (s: ImageSlot) => ImageSlot) => void,
      slot: ImageSlot,
    ) => ({
      onFitModeChange: (mode: ImageFitMode) =>
        onSlotChange(index, (s) => ({ ...s, fitMode: mode })),
      onFullBleedChange: (fullBleed: boolean) =>
        onSlotChange(index, (s) => ({ ...s, fullBleed })),
      onClear: () => {
        clearImageSlot(slot);
        onSlotChange(index, () => ({ ...slot, image: null, objectUrl: null, useImage: false }));
      },
      onFileChange: async (file: File | null) => {
        const slotCopy = { ...slot };
        await loadImageFromFile(slotCopy, file);
        onSlotChange(index, () => ({ ...slotCopy }));
      },
    }),
    [],
  );

  return (
    <div style={{ ...PANEL_STYLE, right: 10 }}>
      <h1 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700 }}>Textures</h1>

      <SectionTitle text="Cover Textures" />
      {coverSlots.map((slot, i) => {
        const handlers = makeSlotHandlers(i, onCoverSlotChange, slot);
        return (
          <TextureCard
            key={i}
            label={coverLabels[i]}
            slot={slot}
            bgColor={params.coverColor}
            {...handlers}
          />
        );
      })}

      <SectionTitle text="Page Textures" />
      {pageSlots.slice(0, params.pageCount).map((slot, i) => {
        const handlers = makeSlotHandlers(i, onPageSlotChange, slot);
        return (
          <TextureCard
            key={i}
            label={`Page ${i + 1}`}
            slot={slot}
            bgColor={params.pageColor}
            {...handlers}
          />
        );
      })}
    </div>
  );
}

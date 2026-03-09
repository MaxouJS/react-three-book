import * as React from 'react';
import {
  type ImageSlot,
  type ImageFitMode,
  drawImageWithFit,
  loadImageFromFile,
  revokeAndClear,
} from './textures';
import { SectionTitle } from './controls';

interface RightPanelProps {
  coverSlots: ImageSlot[];
  pageSlots: ImageSlot[];
  pageCount: number;
  coverColor: string;
  pageColor: string;
  onSlotUpdate: (type: 'cover' | 'page', index: number, slot: ImageSlot) => void;
}

const COVER_LABELS = ['Front Outer', 'Front Inner', 'Back Inner', 'Back Outer'];

function TextureCard({
  label,
  slot,
  bgColor,
  onUpdate,
}: {
  label: string;
  slot: ImageSlot;
  bgColor: string;
  onUpdate: (slot: ImageSlot) => void;
}): JSX.Element {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 128, 128);
    if (slot.useImage && slot.image) {
      const margin = slot.fullBleed ? 0 : 14;
      drawImageWithFit(
        ctx,
        slot.image,
        margin,
        margin,
        128 - margin * 2,
        128 - margin * 2,
        slot.fitMode,
      );
    }
  }, [slot, bgColor]);

  return (
    <div className="texture-card">
      <div className="texture-card-header">
        <canvas
          ref={canvasRef}
          width={128}
          height={128}
          className="texture-thumb"
        />
        <div className="texture-card-body">
          <div className="texture-card-label">{label}</div>
          <div className="texture-controls">
            <select
              className="mini-select"
              value={slot.fitMode}
              onChange={(e) =>
                onUpdate({ ...slot, fitMode: e.target.value as ImageFitMode })
              }
            >
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="fill">Fill</option>
            </select>
            <label className="bleed-label">
              <input
                type="checkbox"
                checked={slot.fullBleed}
                onChange={(e) =>
                  onUpdate({ ...slot, fullBleed: e.target.checked })
                }
              />
              Bleed
            </label>
            <button
              type="button"
              className="mini-btn"
              onClick={() => onUpdate(revokeAndClear(slot))}
            >
              Clear
            </button>
          </div>
          <div className="file-row">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const result = await loadImageFromFile(file);
                  if (slot.objectUrl) URL.revokeObjectURL(slot.objectUrl);
                  onUpdate({
                    ...slot,
                    image: result.image,
                    objectUrl: result.objectUrl,
                    useImage: true,
                  });
                } catch (err) {
                  console.error(err);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function RightPanel({
  coverSlots,
  pageSlots,
  pageCount,
  coverColor,
  pageColor,
  onSlotUpdate,
}: RightPanelProps): JSX.Element {
  return (
    <div className="panel panel-right">
      <h1>Textures</h1>

      <SectionTitle>Cover Textures</SectionTitle>
      {coverSlots.map((slot, i) => (
        <TextureCard
          key={`cover-${i}`}
          label={COVER_LABELS[i]}
          slot={slot}
          bgColor={coverColor}
          onUpdate={(s) => onSlotUpdate('cover', i, s)}
        />
      ))}

      <SectionTitle>Page Textures</SectionTitle>
      {pageSlots.slice(0, pageCount).map((slot, i) => (
        <TextureCard
          key={`page-${i}`}
          label={`Page ${i + 1}`}
          slot={slot}
          bgColor={pageColor}
          onUpdate={(s) => onSlotUpdate('page', i, s)}
        />
      ))}
    </div>
  );
}

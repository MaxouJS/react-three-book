import type { ImageFitMode } from '@objectifthunes/three-book/demo-kit';

export interface ImageSlotCardProps {
  label: string;
  thumbnailSrc: string;
  showFitControls?: boolean;
  fitMode: ImageFitMode;
  fullBleed: boolean;
  onFitModeChange: (mode: ImageFitMode) => void;
  onFullBleedChange: (v: boolean) => void;
  onClear: () => void;
  onFileChange: (file: File | null) => void;
}

export function ImageSlotCard({
  label,
  thumbnailSrc,
  showFitControls = true,
  fitMode,
  fullBleed,
  onFitModeChange,
  onFullBleedChange,
  onClear,
  onFileChange,
}: ImageSlotCardProps) {
  return (
    <div className="demo-card">
      <div className="demo-card-row">
        <img src={thumbnailSrc} alt={label} className="demo-thumb" />
        <div className="demo-card-body">
          <div className="demo-card-label">{label}</div>
          <div className="demo-card-controls">
            {showFitControls && (
              <>
                <select
                  value={fitMode}
                  className="demo-select demo-select--mini"
                  onChange={(e) => onFitModeChange(e.target.value as ImageFitMode)}
                >
                  <option value="contain">Contain</option>
                  <option value="cover">Cover</option>
                  <option value="fill">Fill</option>
                </select>
                <label className="demo-inline-label">
                  <input
                    type="checkbox"
                    checked={fullBleed}
                    className="demo-checkbox--sm"
                    onChange={(e) => onFullBleedChange(e.target.checked)}
                  />
                  Bleed
                </label>
              </>
            )}
            <button type="button" className="demo-btn" onClick={onClear}>Clear</button>
          </div>
          <input
            type="file"
            accept="image/*"
            className="demo-file-input"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
    </div>
  );
}

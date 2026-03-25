import { drawImageWithFit } from '@objectifthunes/three-book/demo-kit';

export function renderImageThumbnail(image: HTMLImageElement | null, color: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);
  if (image) drawImageWithFit(ctx, image, 0, 0, 128, 128, 'cover');
  return canvas.toDataURL();
}

export interface SimpleImageCardProps {
  label: string;
  image: HTMLImageElement | null;
  bgColor: string;
  onClear: () => void;
  onFileChange: (file: File | null) => void;
}

export function SimpleImageCard({ label, image, bgColor, onClear, onFileChange }: SimpleImageCardProps) {
  return (
    <div className="demo-card">
      <div className="demo-card-row">
        <img src={renderImageThumbnail(image, bgColor)} alt={label} className="demo-thumb" />
        <div className="demo-card-body">
          <div className="demo-card-label">{label}</div>
          <div className="demo-card-controls">
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

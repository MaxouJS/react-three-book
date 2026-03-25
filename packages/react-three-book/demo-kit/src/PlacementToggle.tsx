type SpritePlacement = 'ground' | 'sky';

export interface PlacementToggleProps {
  value: SpritePlacement;
  onChange: (p: SpritePlacement) => void;
}

export function PlacementToggle({ value, onChange }: PlacementToggleProps) {
  return (
    <div className="demo-placement-row">
      {(['ground', 'sky'] as SpritePlacement[]).map((p) => (
        <button
          key={p}
          type="button"
          className={value === p ? 'demo-btn demo-btn--active' : 'demo-btn'}
          onClick={() => onChange(p)}
        >
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </button>
      ))}
    </div>
  );
}

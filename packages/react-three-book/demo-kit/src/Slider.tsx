export interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}

export function Slider({ label, min, max, step, value, onChange }: SliderProps) {
  const digits = step < 0.01 ? 3 : step < 0.1 ? 2 : 1;
  return (
    <label className="demo-field">
      <div className="demo-field-row">
        <span>{label}</span>
        <span>{value.toFixed(digits)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className="demo-slider"
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

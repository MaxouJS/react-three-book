export interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <label className="demo-field">
      <div className="demo-field-row">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <input
        type="color"
        value={value}
        className="demo-color-input"
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

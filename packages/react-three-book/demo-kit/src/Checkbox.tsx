export interface CheckboxProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

export function Checkbox({ label, value, onChange }: CheckboxProps) {
  return (
    <label className="demo-checkbox-field">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={value}
        className="demo-checkbox"
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

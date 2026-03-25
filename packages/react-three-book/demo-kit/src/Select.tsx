export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
}

export function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <label className="demo-field">
      <div className="demo-field-row">
        {label}
      </div>
      <select
        value={value}
        className="demo-select"
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

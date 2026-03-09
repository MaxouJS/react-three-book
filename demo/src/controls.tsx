import * as React from 'react';

export function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return <div className="section-title">{children}</div>;
}

interface SliderControlProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

export function SliderControl({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: SliderControlProps): JSX.Element {
  const digits = step < 0.01 ? 3 : step < 0.1 ? 2 : 1;

  return (
    <label className="control-row">
      <div className="row-head">
        <span>{label}</span>
        <span>{value.toFixed(digits)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

interface ColorControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorControl({
  label,
  value,
  onChange,
}: ColorControlProps): JSX.Element {
  return (
    <label className="control-row">
      <div className="row-head">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

interface ToggleControlProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleControl({
  label,
  checked,
  onChange,
}: ToggleControlProps): JSX.Element {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

interface SelectControlProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

export function SelectControl({
  label,
  value,
  options,
  onChange,
}: SelectControlProps): JSX.Element {
  return (
    <label className="control-row">
      <div className="row-head">
        <span>{label}</span>
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

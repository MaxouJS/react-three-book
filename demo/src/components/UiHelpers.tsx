/**
 * React equivalents of the vanilla ui-helpers.ts from three-book/demo.
 * Same visual appearance, same control types.
 */

import type { CSSProperties } from 'react';

export const PANEL_STYLE: CSSProperties = {
  position: 'fixed',
  top: 10,
  bottom: 10,
  width: 'min(92vw, 320px)',
  overflowY: 'auto',
  userSelect: 'none',
  padding: 14,
  borderRadius: 12,
  color: '#ecf2ff',
  fontFamily: "'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif",
  fontSize: 13,
  background: 'rgba(8, 10, 18, 0.7)',
  border: '1px solid rgba(214, 225, 255, 0.2)',
  boxShadow: '0 18px 42px rgba(0, 0, 0, 0.32)',
  backdropFilter: 'blur(8px)',
  zIndex: 10,
};

export function SectionTitle({ text }: { text: string }) {
  return (
    <div style={{
      margin: '10px 0 8px',
      paddingTop: 8,
      borderTop: '1px solid rgba(236, 242, 255, 0.18)',
      fontSize: 11,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'rgba(236, 242, 255, 0.68)',
      fontWeight: 700,
    }}>
      {text}
    </div>
  );
}

interface SliderProps {
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
    <label style={{ display: 'block', margin: '0 0 8px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 3,
        color: 'rgba(236,242,255,0.92)',
      }}>
        <span>{label}</span>
        <span>{value.toFixed(digits)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ width: '100%', accentColor: '#89d8b0' }}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <label style={{ display: 'block', margin: '0 0 8px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 3,
        color: 'rgba(236,242,255,0.92)',
      }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <input
        type="color"
        value={value}
        style={{ width: '100%' }}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

interface CheckboxProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

export function Checkbox({ label, value, onChange }: CheckboxProps) {
  return (
    <label style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      margin: '0 0 7px',
      color: 'rgba(236,242,255,0.92)',
      cursor: 'pointer',
    }}>
      <span>{label}</span>
      <input
        type="checkbox"
        checked={value}
        style={{ width: 16, height: 16 }}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
}

export function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <label style={{ display: 'block', margin: '0 0 8px' }}>
      <div style={{ marginBottom: 3, color: 'rgba(236,242,255,0.92)' }}>
        {label}
      </div>
      <select
        value={value}
        style={{
          width: '100%',
          padding: '6px 8px',
          borderRadius: 8,
          border: '1px solid rgba(236,242,255,0.22)',
          background: 'rgba(255,255,255,0.06)',
          color: '#eef4ff',
          fontFamily: 'inherit',
          fontSize: 13,
        }}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

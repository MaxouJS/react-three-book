import * as React from 'react';
import type { DemoParams } from './App';
import {
  SectionTitle,
  SliderControl,
  ColorControl,
  ToggleControl,
  SelectControl,
} from './controls';

interface LeftPanelProps {
  params: DemoParams;
  updateParam: <K extends keyof DemoParams>(key: K, value: DemoParams[K]) => void;
  status: string;
  onForceRebuild: () => void;
}

export function LeftPanel({
  params,
  updateParam,
  status,
  onForceRebuild,
}: LeftPanelProps): JSX.Element {
  return (
    <div className="panel panel-left">
      <h1>react-three-book demo</h1>
      <p>Drag pages to turn. Orbit: right-click + wheel.</p>
      <div className="status">{status}</div>

      <SectionTitle>Page Paper</SectionTitle>
      <SliderControl label="Width" min={1} max={5} step={0.1} value={params.pageWidth} onChange={(v) => updateParam('pageWidth', v)} />
      <SliderControl label="Height" min={1} max={5} step={0.1} value={params.pageHeight} onChange={(v) => updateParam('pageHeight', v)} />
      <SliderControl label="Thickness" min={0.005} max={0.1} step={0.001} value={params.pageThickness} onChange={(v) => updateParam('pageThickness', v)} />
      <SliderControl label="Stiffness" min={0} max={1} step={0.01} value={params.pageStiffness} onChange={(v) => updateParam('pageStiffness', v)} />
      <SliderControl label="Count" min={2} max={40} step={1} value={params.pageCount} onChange={(v) => updateParam('pageCount', Math.max(2, Math.floor(v)))} />
      <ColorControl label="Page Color" value={params.pageColor} onChange={(v) => updateParam('pageColor', v)} />

      <SectionTitle>Cover Paper</SectionTitle>
      <SliderControl label="Width" min={1} max={5} step={0.1} value={params.coverWidth} onChange={(v) => updateParam('coverWidth', v)} />
      <SliderControl label="Height" min={1} max={5} step={0.1} value={params.coverHeight} onChange={(v) => updateParam('coverHeight', v)} />
      <SliderControl label="Thickness" min={0.005} max={0.15} step={0.001} value={params.coverThickness} onChange={(v) => updateParam('coverThickness', v)} />
      <SliderControl label="Stiffness" min={0} max={1} step={0.01} value={params.coverStiffness} onChange={(v) => updateParam('coverStiffness', v)} />
      <ColorControl label="Cover Color" value={params.coverColor} onChange={(v) => updateParam('coverColor', v)} />

      <SectionTitle>Book</SectionTitle>
      <SelectControl
        label="Direction"
        value={params.direction}
        options={[
          { value: 'left-to-right', label: 'Left to Right' },
          { value: 'right-to-left', label: 'Right to Left' },
          { value: 'up-to-down', label: 'Up to Down' },
          { value: 'down-to-up', label: 'Down to Up' },
        ]}
        onChange={(v) => updateParam('direction', v as DemoParams['direction'])}
      />
      <SliderControl label="Open Progress" min={0} max={1} step={0.01} value={params.openProgress} onChange={(v) => updateParam('openProgress', v)} />
      <ToggleControl label="Cast Shadows" checked={params.castShadows} onChange={(v) => updateParam('castShadows', v)} />
      <ToggleControl label="Align To Ground" checked={params.alignToGround} onChange={(v) => updateParam('alignToGround', v)} />
      <ToggleControl label="Hide Binder" checked={params.hideBinder} onChange={(v) => updateParam('hideBinder', v)} />
      <ToggleControl label="Reduce Shadows" checked={params.reduceShadows} onChange={(v) => updateParam('reduceShadows', v)} />
      <ToggleControl label="Reduce Sub Meshes" checked={params.reduceSubMeshes} onChange={(v) => updateParam('reduceSubMeshes', v)} />
      <ToggleControl label="Reduce Overdraw" checked={params.reduceOverdraw} onChange={(v) => updateParam('reduceOverdraw', v)} />
      <ToggleControl label="Interactive Turning" checked={params.interactive} onChange={(v) => updateParam('interactive', v)} />

      <button className="force-btn" type="button" onClick={onForceRebuild}>
        Force Rebuild
      </button>

      <SectionTitle>Lighting</SectionTitle>
      <SliderControl label="Sun Intensity" min={0} max={6} step={0.1} value={params.sunIntensity} onChange={(v) => updateParam('sunIntensity', v)} />
      <SliderControl label="Ambient Intensity" min={0} max={2} step={0.05} value={params.ambientIntensity} onChange={(v) => updateParam('ambientIntensity', v)} />
      <SliderControl label="Sun X" min={-12} max={12} step={0.1} value={params.sunX} onChange={(v) => updateParam('sunX', v)} />
      <SliderControl label="Sun Y" min={1} max={20} step={0.1} value={params.sunY} onChange={(v) => updateParam('sunY', v)} />
      <SliderControl label="Sun Z" min={-12} max={12} step={0.1} value={params.sunZ} onChange={(v) => updateParam('sunZ', v)} />
    </div>
  );
}

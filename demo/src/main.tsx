import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Book3D, type BookContentInput, type BookHandle } from '@objectifthunes/react-three-book';
import './style.css';

type DirectionValue = NonNullable<BookContentInput['direction']>;

function makeLabelTexture(label: string, bg: string, fg: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create canvas context for texture');
  }

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 26;
  ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

  ctx.fillStyle = fg;
  ctx.font = '700 82px "Avenir Next", Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

interface SliderControlProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

function SliderControl({ label, min, max, step, value, onChange }: SliderControlProps): JSX.Element {
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
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

interface ToggleControlProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleControl({ label, checked, onChange }: ToggleControlProps): JSX.Element {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function DemoScene(): JSX.Element {
  const bookRef = React.useRef<BookHandle>(null);
  const orbitControlsRef = React.useRef<{ enabled: boolean } | null>(null);
  const [rebuildSeed, setRebuildSeed] = React.useState(0);

  const [pageWidth, setPageWidth] = React.useState(2);
  const [pageHeight, setPageHeight] = React.useState(3);
  const [pageThickness, setPageThickness] = React.useState(0.018);
  const [pageStiffness, setPageStiffness] = React.useState(0.2);
  const [pageCount, setPageCount] = React.useState(10);
  const [pageColor, setPageColor] = React.useState('#f5f5dc');

  const [coverWidth, setCoverWidth] = React.useState(2.1);
  const [coverHeight, setCoverHeight] = React.useState(3.1);
  const [coverThickness, setCoverThickness] = React.useState(0.05);
  const [coverStiffness, setCoverStiffness] = React.useState(0.48);
  const [coverColor, setCoverColor] = React.useState('#8b0000');

  const [direction, setDirection] = React.useState<DirectionValue>('left-to-right');
  const [openProgress, setOpenProgress] = React.useState(0);

  const [castShadows, setCastShadows] = React.useState(true);
  const [alignToGround, setAlignToGround] = React.useState(true);
  const [hideBinder, setHideBinder] = React.useState(false);
  const [reduceShadows, setReduceShadows] = React.useState(false);
  const [reduceSubMeshes, setReduceSubMeshes] = React.useState(false);
  const [reduceOverdraw, setReduceOverdraw] = React.useState(false);
  const [interactive, setInteractive] = React.useState(true);

  const [sunIntensity, setSunIntensity] = React.useState(2.2);
  const [sunX, setSunX] = React.useState(6);
  const [sunY, setSunY] = React.useState(10);
  const [sunZ, setSunZ] = React.useState(3);
  const [ambientIntensity, setAmbientIntensity] = React.useState(0.5);

  const textures = React.useMemo(() => {
    const covers = [
      makeLabelTexture('Front Cover', '#7d1313', '#fff4d4'),
      makeLabelTexture('Inside Front', '#8a1b1b', '#fff4d4'),
      makeLabelTexture('Inside Back', '#8a1b1b', '#fff4d4'),
      makeLabelTexture('Back Cover', '#7d1313', '#fff4d4'),
    ] as const;

    const pages = Array.from({ length: pageCount }, (_, i) =>
      makeLabelTexture(`Page ${i + 1}`, '#f8f8f2', '#1f2937'),
    );

    return { covers, pages };
  }, [pageCount]);

  React.useEffect(() => {
    return () => {
      textures.covers.forEach((texture) => texture.dispose());
      textures.pages.forEach((texture) => texture.dispose());
    };
  }, [textures]);

  const content = React.useMemo<BookContentInput>(
    () => ({
      direction,
      covers: [
        textures.covers[0],
        textures.covers[1],
        textures.covers[2],
        textures.covers[3],
      ],
      pages: textures.pages,
    }),
    [direction, textures],
  );

  const page = React.useMemo(
    () => ({
      width: pageWidth,
      height: pageHeight,
      thickness: pageThickness,
      stiffness: pageStiffness,
      color: pageColor,
    }),
    [pageColor, pageHeight, pageStiffness, pageThickness, pageWidth],
  );

  const cover = React.useMemo(
    () => ({
      width: coverWidth,
      height: coverHeight,
      thickness: coverThickness,
      stiffness: coverStiffness,
      color: coverColor,
    }),
    [coverColor, coverHeight, coverStiffness, coverThickness, coverWidth],
  );

  React.useEffect(() => {
    const book = bookRef.current;
    if (book?.isBuilt) {
      book.setOpenProgress(openProgress);
    }
  }, [openProgress, rebuildSeed]);

  return (
    <>
      <Canvas shadows camera={{ position: [2.1, 1.2, 3.8], fov: 32 }} dpr={[1, 2]}>
        <color attach="background" args={['#151a32']} />

        <ambientLight intensity={ambientIntensity} />
        <directionalLight
          castShadow
          intensity={sunIntensity}
          position={[sunX, sunY, sunZ]}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        <mesh rotation-x={-Math.PI / 2} position={[0, -0.04, 0]} receiveShadow>
          <planeGeometry args={[18, 18]} />
          <meshStandardMaterial color="#1a213f" roughness={0.96} metalness={0.05} />
        </mesh>

        <Book3D
          key={rebuildSeed}
          ref={bookRef}
          content={content}
          initialOpenProgress={openProgress}
          castShadows={castShadows}
          alignToGround={alignToGround}
          hideBinder={hideBinder}
          reduceShadows={reduceShadows}
          reduceSubMeshes={reduceSubMeshes}
          reduceOverdraw={reduceOverdraw}
          interactive={interactive}
          page={page}
          cover={cover}
          position={[0, 0.03, 0]}
          onReady={(book) => book.setOpenProgress(openProgress)}
          onTurnStart={() => {
            if (orbitControlsRef.current) {
              orbitControlsRef.current.enabled = false;
            }
          }}
          onTurnEnd={() => {
            if (orbitControlsRef.current) {
              orbitControlsRef.current.enabled = true;
            }
          }}
        />

        <OrbitControls
          ref={orbitControlsRef}
          makeDefault
          enabled
          enableDamping
          dampingFactor={0.08}
          minDistance={1.5}
          maxDistance={9}
          target={[0, 0.55, 0]}
        />
      </Canvas>

      <div className="panel">
        <h1>react-three-book demo</h1>
        <p>Drag pages to turn. Orbit controls are auto-disabled while turning.</p>

        <h2>Page Paper</h2>
        <SliderControl label="Width" min={1} max={5} step={0.1} value={pageWidth} onChange={setPageWidth} />
        <SliderControl label="Height" min={1} max={5} step={0.1} value={pageHeight} onChange={setPageHeight} />
        <SliderControl
          label="Thickness"
          min={0.005}
          max={0.1}
          step={0.001}
          value={pageThickness}
          onChange={setPageThickness}
        />
        <SliderControl
          label="Stiffness"
          min={0}
          max={1}
          step={0.01}
          value={pageStiffness}
          onChange={setPageStiffness}
        />
        <SliderControl
          label="Count"
          min={2}
          max={40}
          step={1}
          value={pageCount}
          onChange={(value) => setPageCount(Math.max(2, Math.floor(value)))}
        />
        <label className="control-row">
          <div className="row-head">
            <span>Page Color</span>
            <span>{pageColor}</span>
          </div>
          <input type="color" value={pageColor} onChange={(event) => setPageColor(event.target.value)} />
        </label>

        <h2>Cover Paper</h2>
        <SliderControl label="Width" min={1} max={5} step={0.1} value={coverWidth} onChange={setCoverWidth} />
        <SliderControl label="Height" min={1} max={5} step={0.1} value={coverHeight} onChange={setCoverHeight} />
        <SliderControl
          label="Thickness"
          min={0.005}
          max={0.15}
          step={0.001}
          value={coverThickness}
          onChange={setCoverThickness}
        />
        <SliderControl
          label="Stiffness"
          min={0}
          max={1}
          step={0.01}
          value={coverStiffness}
          onChange={setCoverStiffness}
        />
        <label className="control-row">
          <div className="row-head">
            <span>Cover Color</span>
            <span>{coverColor}</span>
          </div>
          <input type="color" value={coverColor} onChange={(event) => setCoverColor(event.target.value)} />
        </label>

        <h2>Book</h2>
        <label className="control-row">
          <div className="row-head">
            <span>Direction</span>
          </div>
          <select value={direction} onChange={(event) => setDirection(event.target.value as DirectionValue)}>
            <option value="left-to-right">Left to Right</option>
            <option value="right-to-left">Right to Left</option>
            <option value="up-to-down">Up to Down</option>
            <option value="down-to-up">Down to Up</option>
          </select>
        </label>
        <SliderControl
          label="Open Progress"
          min={0}
          max={1}
          step={0.01}
          value={openProgress}
          onChange={setOpenProgress}
        />

        <ToggleControl label="Cast Shadows" checked={castShadows} onChange={setCastShadows} />
        <ToggleControl label="Align To Ground" checked={alignToGround} onChange={setAlignToGround} />
        <ToggleControl label="Hide Binder" checked={hideBinder} onChange={setHideBinder} />
        <ToggleControl label="Reduce Shadows" checked={reduceShadows} onChange={setReduceShadows} />
        <ToggleControl label="Reduce Sub Meshes" checked={reduceSubMeshes} onChange={setReduceSubMeshes} />
        <ToggleControl label="Reduce Overdraw" checked={reduceOverdraw} onChange={setReduceOverdraw} />
        <ToggleControl label="Interactive Turning" checked={interactive} onChange={setInteractive} />

        <button className="force-btn" type="button" onClick={() => setRebuildSeed((v) => v + 1)}>
          Force Rebuild
        </button>

        <h2>Lighting</h2>
        <SliderControl label="Sun Intensity" min={0} max={6} step={0.1} value={sunIntensity} onChange={setSunIntensity} />
        <SliderControl
          label="Ambient Intensity"
          min={0}
          max={2}
          step={0.05}
          value={ambientIntensity}
          onChange={setAmbientIntensity}
        />
        <SliderControl label="Sun X" min={-12} max={12} step={0.1} value={sunX} onChange={setSunX} />
        <SliderControl label="Sun Y" min={1} max={20} step={0.1} value={sunY} onChange={setSunY} />
        <SliderControl label="Sun Z" min={-12} max={12} step={0.1} value={sunZ} onChange={setSunZ} />
      </div>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <DemoScene />,
);

import * as React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  Book3D,
  type BookContentInput,
  type BookHandle,
} from '@objectifthunes/react-three-book';
import { type ImageSlot, createImageSlot, createPageTexture } from './textures';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';

export type DirectionValue =
  | 'left-to-right'
  | 'right-to-left'
  | 'up-to-down'
  | 'down-to-up';

export interface DemoParams {
  pageWidth: number;
  pageHeight: number;
  pageThickness: number;
  pageStiffness: number;
  pageCount: number;
  pageColor: string;
  coverWidth: number;
  coverHeight: number;
  coverThickness: number;
  coverStiffness: number;
  coverColor: string;
  direction: DirectionValue;
  openProgress: number;
  castShadows: boolean;
  alignToGround: boolean;
  hideBinder: boolean;
  reduceShadows: boolean;
  reduceSubMeshes: boolean;
  reduceOverdraw: boolean;
  interactive: boolean;
  sunIntensity: number;
  ambientIntensity: number;
  sunX: number;
  sunY: number;
  sunZ: number;
}

const DEFAULT_PARAMS: DemoParams = {
  pageWidth: 2,
  pageHeight: 3,
  pageThickness: 0.02,
  pageStiffness: 0.2,
  pageCount: 8,
  pageColor: '#f5f5dc',
  coverWidth: 2.1,
  coverHeight: 3.1,
  coverThickness: 0.04,
  coverStiffness: 0.5,
  coverColor: '#ff0000',
  direction: 'left-to-right',
  openProgress: 0,
  castShadows: true,
  alignToGround: true,
  hideBinder: false,
  reduceShadows: false,
  reduceSubMeshes: false,
  reduceOverdraw: false,
  interactive: true,
  sunIntensity: 1.2,
  ambientIntensity: 0.6,
  sunX: 5,
  sunY: 10,
  sunZ: 5,
};

const COVER_LABELS = [
  'Front Cover Outer',
  'Front Cover Inner',
  'Back Cover Inner',
  'Back Cover Outer',
];

export function App(): JSX.Element {
  const bookRef = React.useRef<BookHandle>(null);
  const orbitRef = React.useRef<{ enabled: boolean } | null>(null);

  const [params, setParams] = React.useState<DemoParams>(DEFAULT_PARAMS);
  const [coverSlots, setCoverSlots] = React.useState<ImageSlot[]>(() =>
    Array.from({ length: 4 }, createImageSlot),
  );
  const [pageSlots, setPageSlots] = React.useState<ImageSlot[]>(() =>
    Array.from({ length: DEFAULT_PARAMS.pageCount }, createImageSlot),
  );
  const [status, setStatus] = React.useState('Building...');
  const [rebuildSeed, setRebuildSeed] = React.useState(0);

  const updateParam = React.useCallback(
    <K extends keyof DemoParams>(key: K, value: DemoParams[K]) => {
      setParams((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Keep page slots in sync with count
  React.useEffect(() => {
    setPageSlots((prev) => {
      if (prev.length >= params.pageCount) return prev;
      return [
        ...prev,
        ...Array.from(
          { length: params.pageCount - prev.length },
          createImageSlot,
        ),
      ];
    });
  }, [params.pageCount]);

  // Build textures (color baked into canvas; material color stays white)
  const textures = React.useMemo(() => {
    const covers = coverSlots.map((slot, i) =>
      createPageTexture(
        params.coverColor,
        COVER_LABELS[i],
        slot.useImage ? slot.image : null,
        slot.fitMode,
        slot.fullBleed,
      ),
    );
    const pages = pageSlots.slice(0, params.pageCount).map((slot, i) =>
      createPageTexture(
        params.pageColor,
        `Page ${i + 1}`,
        slot.useImage ? slot.image : null,
        slot.fitMode,
        slot.fullBleed,
      ),
    );
    return { covers, pages };
  }, [coverSlots, pageSlots, params.pageCount, params.coverColor, params.pageColor]);

  React.useEffect(() => {
    return () => {
      textures.covers.forEach((t) => t.dispose());
      textures.pages.forEach((t) => t.dispose());
    };
  }, [textures]);

  const content = React.useMemo<BookContentInput>(
    () => ({
      direction: params.direction,
      covers: [
        textures.covers[0],
        textures.covers[1],
        textures.covers[2],
        textures.covers[3],
      ],
      pages: textures.pages,
    }),
    [params.direction, textures],
  );

  // Paper/cover material color is white — the canvas texture already has the
  // user-chosen color baked in, matching the three-book demo approach.
  const page = React.useMemo(
    () => ({
      width: params.pageWidth,
      height: params.pageHeight,
      thickness: params.pageThickness,
      stiffness: params.pageStiffness,
      color: '#ffffff',
    }),
    [params.pageWidth, params.pageHeight, params.pageThickness, params.pageStiffness],
  );

  const cover = React.useMemo(
    () => ({
      width: params.coverWidth,
      height: params.coverHeight,
      thickness: params.coverThickness,
      stiffness: params.coverStiffness,
      color: '#ffffff',
    }),
    [params.coverWidth, params.coverHeight, params.coverThickness, params.coverStiffness],
  );

  // Live open-progress without rebuild
  React.useEffect(() => {
    const book = bookRef.current;
    if (book?.isBuilt) {
      book.setOpenProgress(params.openProgress);
    }
  }, [params.openProgress, rebuildSeed]);

  const handleReady = React.useCallback((book: BookHandle) => {
    setStatus(`Book built: ${book.paperCount} papers`);
  }, []);

  const handleTurnStart = React.useCallback(() => {
    if (orbitRef.current) orbitRef.current.enabled = false;
  }, []);

  const handleTurnEnd = React.useCallback(() => {
    if (orbitRef.current) orbitRef.current.enabled = true;
  }, []);

  const handleSlotUpdate = React.useCallback(
    (type: 'cover' | 'page', index: number, slot: ImageSlot) => {
      if (type === 'cover') {
        setCoverSlots((prev) =>
          prev.map((s, i) => (i === index ? slot : s)),
        );
      } else {
        setPageSlots((prev) =>
          prev.map((s, i) => (i === index ? slot : s)),
        );
      }
    },
    [],
  );

  // Cleanup blob URLs on unmount
  const coverSlotsRef = React.useRef(coverSlots);
  coverSlotsRef.current = coverSlots;
  const pageSlotsRef = React.useRef(pageSlots);
  pageSlotsRef.current = pageSlots;

  React.useEffect(() => {
    return () => {
      for (const s of coverSlotsRef.current) {
        if (s.objectUrl) URL.revokeObjectURL(s.objectUrl);
      }
      for (const s of pageSlotsRef.current) {
        if (s.objectUrl) URL.revokeObjectURL(s.objectUrl);
      }
    };
  }, []);

  return (
    <>
      <Canvas
        shadows
        camera={{ position: [0, 4, 5], fov: 45 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#1a1a2e']} />

        <ambientLight intensity={params.ambientIntensity} />
        <directionalLight
          castShadow
          intensity={params.sunIntensity}
          position={[params.sunX, params.sunY, params.sunZ]}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        <mesh
          rotation-x={-Math.PI / 2}
          position={[0, -0.01, 0]}
          receiveShadow
        >
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#2a2a4a" />
        </mesh>

        <Book3D
          key={rebuildSeed}
          ref={bookRef}
          content={content}
          initialOpenProgress={params.openProgress}
          castShadows={params.castShadows}
          alignToGround={params.alignToGround}
          hideBinder={params.hideBinder}
          reduceShadows={params.reduceShadows}
          reduceSubMeshes={params.reduceSubMeshes}
          reduceOverdraw={params.reduceOverdraw}
          interactive={params.interactive}
          page={page}
          cover={cover}
          onReady={handleReady}
          onTurnStart={handleTurnStart}
          onTurnEnd={handleTurnEnd}
        />

        <OrbitControls
          ref={orbitRef}
          makeDefault
          enableDamping
          dampingFactor={0.05}
          target={[0, 0.5, 0]}
        />
      </Canvas>

      <LeftPanel
        params={params}
        updateParam={updateParam}
        status={status}
        onForceRebuild={() => setRebuildSeed((v) => v + 1)}
      />

      <RightPanel
        coverSlots={coverSlots}
        pageSlots={pageSlots}
        pageCount={params.pageCount}
        coverColor={params.coverColor}
        pageColor={params.pageColor}
        onSlotUpdate={handleSlotUpdate}
      />

      <div className="info-bar">
        Click + drag pages to turn | Orbit: right-click / scroll
      </div>
    </>
  );
}

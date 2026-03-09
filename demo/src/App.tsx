/**
 * Root application component — React port of three-book/demo entry point.
 * Manages all state and wires together LeftPanel, RightPanel, and the R3F Canvas.
 */

import { useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ThreeBook } from '@objectifthunes/react-three-book';
import {
  defaultParams,
  createImageSlot,
  type DemoParams,
  type ImageSlot,
} from './state';
import BookScene from './components/BookScene';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';

const MAX_PAGE_SLOTS = 40;

function makeInitialPageSlots(): ImageSlot[] {
  return Array.from({ length: MAX_PAGE_SLOTS }, () => createImageSlot());
}

export default function App() {
  const [params, setParams] = useState<DemoParams>(defaultParams);
  const [buildKey, setBuildKey] = useState(0);
  const [coverSlots, setCoverSlots] = useState<ImageSlot[]>(() =>
    Array.from({ length: 4 }, () => createImageSlot()),
  );
  const [pageSlots, setPageSlots] = useState<ImageSlot[]>(makeInitialPageSlots);
  const [status, setStatus] = useState('Building…');
  const bookRef = useRef<ThreeBook | null>(null);

  const handleParamChange = useCallback(
    <K extends keyof DemoParams>(key: K, value: DemoParams[K], rebuild = true) => {
      setParams((prev) => ({ ...prev, [key]: value }));
      if (rebuild) setBuildKey((k) => k + 1);
    },
    [],
  );

  const handlePageCountChange = useCallback((count: number) => {
    setParams((prev) => ({ ...prev, pageCount: count }));
    setBuildKey((k) => k + 1);
  }, []);

  const handleRebuild = useCallback(() => {
    setBuildKey((k) => k + 1);
  }, []);

  const handleBuilt = useCallback((book: ThreeBook) => {
    bookRef.current = book;
    setStatus(`Built — ${book.paperCount} pages`);
  }, []);

  const handleError = useCallback((err: Error) => {
    setStatus(`Error: ${err.message}`);
    console.error(err);
  }, []);

  const handleCoverSlotChange = useCallback(
    (index: number, updater: (slot: ImageSlot) => ImageSlot) => {
      setCoverSlots((prev) => {
        const next = [...prev];
        next[index] = updater(next[index]);
        return next;
      });
      setBuildKey((k) => k + 1);
    },
    [],
  );

  const handlePageSlotChange = useCallback(
    (index: number, updater: (slot: ImageSlot) => ImageSlot) => {
      setPageSlots((prev) => {
        const next = [...prev];
        next[index] = updater(next[index]);
        return next;
      });
      setBuildKey((k) => k + 1);
    },
    [],
  );

  return (
    <>
      {/* Full-screen R3F canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 2, 5], fov: 45 }}
        style={{ position: 'fixed', inset: 0 }}
        gl={{ antialias: true }}
      >
        <BookScene
          params={params}
          coverSlots={coverSlots}
          pageSlots={pageSlots}
          buildKey={buildKey}
          bookRef={bookRef}
          onBuilt={handleBuilt}
          onError={handleError}
        />
      </Canvas>

      {/* UI overlays (rendered outside Canvas, above it) */}
      <LeftPanel
        params={params}
        status={status}
        bookRef={bookRef}
        onParamChange={handleParamChange}
        onPageCountChange={handlePageCountChange}
        onRebuild={handleRebuild}
      />
      <RightPanel
        params={params}
        coverSlots={coverSlots}
        pageSlots={pageSlots}
        onCoverSlotChange={handleCoverSlotChange}
        onPageSlotChange={handlePageSlotChange}
      />
    </>
  );
}

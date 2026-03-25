import { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ThreeBook } from '@objectifthunes/react-three-book';
import { defaultParams, EMPTY_SLOT, type DemoParams, type ImageSlot, type PageTextBlock } from './state';
import BookScene from './components/BookScene';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import PageEditor from './components/PageEditor';

const INITIAL_PAGE_SLOTS = 8;

type Tab = 'book' | 'textures' | 'editor';

export default function App() {
  const [params, setParams] = useState<DemoParams>(defaultParams);
  const [coverSlots, setCoverSlots] = useState<ImageSlot[]>(() => Array.from({ length: 4 }, () => ({ ...EMPTY_SLOT })));
  const [pageSlots, setPageSlots] = useState<ImageSlot[]>(() => Array.from({ length: INITIAL_PAGE_SLOTS }, () => ({ ...EMPTY_SLOT })));
  const [pageTextBlocks, setPageTextBlocks] = useState<PageTextBlock[][]>(() => Array.from({ length: INITIAL_PAGE_SLOTS }, () => []));
  const [coverTextBlocks, setCoverTextBlocks] = useState<PageTextBlock[][]>(() => [[], [], [], []]);
  const [spreadPages, setSpreadPages] = useState<Set<number>>(() => new Set());
  const [status, setStatus] = useState('Building\u2026');
  const [sceneKey, setSceneKey] = useState(0);
  const bookRef = useRef<ThreeBook | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('book');
  const [panelOpen, setPanelOpen] = useState(true);

  const forceRebuild = useCallback(() => {
    setSceneKey((k) => k + 1);
  }, []);

  const setParam = useCallback(<K extends keyof DemoParams>(key: K, value: DemoParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setPageCount = useCallback((count: number) => {
    setParams((prev) => ({ ...prev, pageCount: count }));
    // Grow slot arrays if needed (never shrink — preserves data)
    setPageSlots((prev) => {
      if (prev.length >= count) return prev;
      return [...prev, ...Array.from({ length: count - prev.length }, () => ({ ...EMPTY_SLOT }))];
    });
    setPageTextBlocks((prev) => {
      if (prev.length >= count) return prev;
      return [...prev, ...Array.from({ length: count - prev.length }, () => [] as PageTextBlock[])];
    });
  }, []);

  const onBuilt = useCallback((book: ThreeBook) => {
    bookRef.current = book;
    setStatus(`Book built: ${book.paperCount} papers`);
  }, []);

  const onError = useCallback((err: Error) => setStatus(`Error: ${err.message}`), []);

  const onCoverSlotChange = useCallback((i: number, updater: (s: ImageSlot) => ImageSlot) => {
    setCoverSlots((prev) => { const next = [...prev]; next[i] = updater(next[i]); return next; });
  }, []);

  const onPageSlotChange = useCallback((i: number, updater: (s: ImageSlot) => ImageSlot) => {
    setPageSlots((prev) => { const next = [...prev]; next[i] = updater(next[i]); return next; });
  }, []);

  const onPageTextBlocksChange = useCallback((blocks: PageTextBlock[][]) => {
    setPageTextBlocks(blocks);
  }, []);

  const onCoverTextBlocksChange = useCallback((blocks: PageTextBlock[][]) => {
    setCoverTextBlocks(blocks);
  }, []);

  const onSpreadPagesChange = useCallback((next: Set<number>) => {
    setSpreadPages(next);
  }, []);

  // Cleanup object URLs on unload
  useEffect(() => {
    const cleanup = () => {
      for (const slot of pageSlots) {
        if (slot.objectUrl) URL.revokeObjectURL(slot.objectUrl);
      }
      for (const slot of coverSlots) {
        if (slot.objectUrl) URL.revokeObjectURL(slot.objectUrl);
      }
    };
    window.addEventListener('beforeunload', cleanup);
    return () => window.removeEventListener('beforeunload', cleanup);
  });

  // Expose for tooling / screenshots
  useEffect(() => {
    (window as any).__demo = { bookRef };
    return () => { delete (window as any).__demo; };
  }, []);

  return (
    <>
      <Canvas shadows camera={{ position: [0, 2, 5], fov: 45 }} style={{ position: 'fixed', inset: 0 }} gl={{ antialias: true }}>
        <BookScene key={sceneKey} params={params} coverSlots={coverSlots} pageSlots={pageSlots} pageTextBlocks={pageTextBlocks} coverTextBlocks={coverTextBlocks} spreadPages={spreadPages} bookRef={bookRef} onBuilt={onBuilt} onError={onError} />
      </Canvas>

      {panelOpen ? (
        <div
          className="demo-panel"
          style={{ left: 10, width: 'min(92vw, 380px)' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="demo-panel-header">
            <div>
              <h1 className="demo-panel-title">react-three-book demo</h1>
              <p className="demo-panel-subtitle">
                Drag to turn · right-click + wheel to orbit
              </p>
            </div>
            <button className="demo-close-btn" onClick={() => setPanelOpen(false)} title="Hide panel">
              {'\u2715'}
            </button>
          </div>
          <div className="demo-status">
            {status}
          </div>

          {/* Tab bar */}
          <div className="demo-tab-bar">
            {(['book', 'textures', 'editor'] as Tab[]).map((tab) => (
              <button
                key={tab}
                className={activeTab === tab ? 'demo-tab demo-tab--active' : 'demo-tab'}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'book' ? 'Book' : tab === 'textures' ? 'Textures' : 'Editor'}
              </button>
            ))}
          </div>

          {/* Tab content — all stay mounted, visibility toggled */}
          <div style={{ display: activeTab === 'book' ? 'block' : 'none' }}>
            <LeftPanel params={params} bookRef={bookRef} onParamChange={setParam} onPageCountChange={setPageCount} onRebuild={forceRebuild} />
          </div>
          <div style={{ display: activeTab === 'textures' ? 'block' : 'none' }}>
            <RightPanel params={params} coverSlots={coverSlots} pageSlots={pageSlots} spreadPages={spreadPages} onCoverSlotChange={onCoverSlotChange} onPageSlotChange={onPageSlotChange} onSpreadPagesChange={onSpreadPagesChange} />
          </div>
          <div style={{ display: activeTab === 'editor' ? 'block' : 'none' }}>
            <PageEditor params={params} pageSlots={pageSlots} coverSlots={coverSlots} pageTextBlocks={pageTextBlocks} coverTextBlocks={coverTextBlocks} spreadPages={spreadPages} onPageTextBlocksChange={onPageTextBlocksChange} onCoverTextBlocksChange={onCoverTextBlocksChange} onPageSlotChange={onPageSlotChange} onCoverSlotChange={onCoverSlotChange} />
          </div>
        </div>
      ) : (
        <button className="demo-toggle-btn" onClick={() => setPanelOpen(true)}>
          {'\u2630'} Panel
        </button>
      )}

      {/* Info bar */}
      <div style={{
        position: 'fixed', bottom: 10, left: '50%', transform: 'translateX(-50%)',
      }} className="demo-info">
        Click + drag pages to turn | Orbit: right-click / scroll
      </div>
    </>
  );
}

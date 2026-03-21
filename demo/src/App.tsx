import { useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ThreeBook, TextOverlayContent, SpreadContent } from '@objectifthunes/react-three-book';
import { defaultParams, EMPTY_SLOT, type DemoParams, type ImageSlot, type PageTextBlock } from './state';
import BookScene from './components/BookScene';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import PageEditor from './components/PageEditor';
import { PANEL_STYLE } from './components/UiHelpers';

const MAX_PAGE_SLOTS = 40;

type Tab = 'book' | 'textures' | 'editor';

const TAB_BTN: React.CSSProperties = {
  flex: 1,
  padding: '6px 0',
  border: '1px solid rgba(236,242,255,0.15)',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.04)',
  color: 'rgba(236,242,255,0.55)',
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

const TAB_BTN_ACTIVE: React.CSSProperties = {
  ...TAB_BTN,
  background: 'rgba(137,216,176,0.18)',
  color: '#89d8b0',
  borderColor: 'rgba(137,216,176,0.35)',
};

const TOGGLE_BTN: React.CSSProperties = {
  position: 'fixed',
  top: 14,
  left: 14,
  zIndex: 10,
  padding: '8px 14px',
  borderRadius: 10,
  border: '1px solid rgba(236,242,255,0.2)',
  background: 'rgba(8, 10, 18, 0.7)',
  backdropFilter: 'blur(8px)',
  color: '#ecf2ff',
  fontFamily: "'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif",
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
};

const CLOSE_BTN: React.CSSProperties = {
  padding: '4px 8px',
  border: '1px solid rgba(236,242,255,0.15)',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.04)',
  color: 'rgba(236,242,255,0.5)',
  fontFamily: 'inherit',
  fontSize: 14,
  cursor: 'pointer',
  lineHeight: 1,
};

export default function App() {
  const [params, setParams] = useState<DemoParams>(defaultParams);
  const [coverSlots, setCoverSlots] = useState<ImageSlot[]>(() => Array.from({ length: 4 }, () => ({ ...EMPTY_SLOT })));
  const [pageSlots, setPageSlots] = useState<ImageSlot[]>(() => Array.from({ length: MAX_PAGE_SLOTS }, () => ({ ...EMPTY_SLOT })));
  const [pageTextBlocks, setPageTextBlocks] = useState<PageTextBlock[][]>(() => Array.from({ length: MAX_PAGE_SLOTS }, () => []));
  const [spreadPages, setSpreadPages] = useState<Set<number>>(() => new Set());
  const [status, setStatus] = useState('Building\u2026');
  const [sceneKey, setSceneKey] = useState(0);
  const bookRef = useRef<ThreeBook | null>(null);
  const overlaysRef = useRef<(TextOverlayContent | null)[]>([]);
  const spreadsRef = useRef<Map<number, SpreadContent>>(new Map());

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
  }, []);

  const onBuilt = useCallback((book: ThreeBook) => {
    bookRef.current = book;
    setStatus(`Built \u2014 ${book.paperCount} pages`);
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

  const onSpreadPagesChange = useCallback((next: Set<number>) => {
    setSpreadPages(next);
  }, []);

  return (
    <>
      <Canvas shadows camera={{ position: [0, 2, 5], fov: 45 }} style={{ position: 'fixed', inset: 0 }} gl={{ antialias: true }}>
        <BookScene key={sceneKey} params={params} coverSlots={coverSlots} pageSlots={pageSlots} pageTextBlocks={pageTextBlocks} spreadPages={spreadPages} bookRef={bookRef} overlaysRef={overlaysRef} spreadsRef={spreadsRef} onBuilt={onBuilt} onError={onError} />
      </Canvas>

      {panelOpen ? (
        <div
          style={{ ...PANEL_STYLE, left: 10, width: 'min(92vw, 380px)' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>react-three-book demo</h1>
              <p style={{ margin: '3px 0 0', color: 'rgba(236,242,255,0.55)', fontSize: 11 }}>
                Drag to turn · right-click + wheel to orbit
              </p>
            </div>
            <button style={CLOSE_BTN} onClick={() => setPanelOpen(false)} title="Hide panel">
              {'\u2715'}
            </button>
          </div>
          <div style={{ marginBottom: 8, color: '#8cf0bf', fontWeight: 700, fontSize: 12 }}>
            {status}
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {(['book', 'textures', 'editor'] as Tab[]).map((tab) => (
              <button
                key={tab}
                style={activeTab === tab ? TAB_BTN_ACTIVE : TAB_BTN}
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
            <PageEditor params={params} pageTextBlocks={pageTextBlocks} spreadPages={spreadPages} overlaysRef={overlaysRef} spreadsRef={spreadsRef} onPageTextBlocksChange={onPageTextBlocksChange} />
          </div>
        </div>
      ) : (
        <button style={TOGGLE_BTN} onClick={() => setPanelOpen(true)}>
          {'\u2630'} Panel
        </button>
      )}
    </>
  );
}

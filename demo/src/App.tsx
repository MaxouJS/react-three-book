import { useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ThreeBook, TextOverlayContent, SpreadContent } from '@objectifthunes/react-three-book';
import { defaultParams, EMPTY_SLOT, type DemoParams, type ImageSlot, type PageTextBlock } from './state';
import BookScene from './components/BookScene';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import PageEditor from './components/PageEditor';

const MAX_PAGE_SLOTS = 40;

export default function App() {
  const [params, setParams] = useState<DemoParams>(defaultParams);
  const [buildKey, setBuildKey] = useState(0);
  const [coverSlots, setCoverSlots] = useState<ImageSlot[]>(() => Array.from({ length: 4 }, () => ({ ...EMPTY_SLOT })));
  const [pageSlots, setPageSlots] = useState<ImageSlot[]>(() => Array.from({ length: MAX_PAGE_SLOTS }, () => ({ ...EMPTY_SLOT })));
  const [pageTextBlocks, setPageTextBlocks] = useState<PageTextBlock[][]>(() => Array.from({ length: MAX_PAGE_SLOTS }, () => []));
  const [spreadPages, setSpreadPages] = useState<Set<number>>(() => new Set());
  const [status, setStatus] = useState('Building\u2026');
  const bookRef = useRef<ThreeBook | null>(null);
  const overlaysRef = useRef<(TextOverlayContent | null)[]>([]);
  const spreadsRef = useRef<Map<number, SpreadContent>>(new Map());

  const rebuild = useCallback(() => setBuildKey((k) => k + 1), []);

  const setParam = useCallback(<K extends keyof DemoParams>(key: K, value: DemoParams[K], doRebuild = true) => {
    setParams((prev) => ({ ...prev, [key]: value }));
    if (doRebuild) setBuildKey((k) => k + 1);
  }, []);

  const setPageCount = useCallback((count: number) => {
    setParams((prev) => ({ ...prev, pageCount: count }));
    setBuildKey((k) => k + 1);
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
    setBuildKey((k) => k + 1);
  }, []);

  return (
    <>
      <Canvas shadows camera={{ position: [0, 2, 5], fov: 45 }} style={{ position: 'fixed', inset: 0 }} gl={{ antialias: true }}>
        <BookScene params={params} coverSlots={coverSlots} pageSlots={pageSlots} pageTextBlocks={pageTextBlocks} spreadPages={spreadPages} buildKey={buildKey} bookRef={bookRef} overlaysRef={overlaysRef} spreadsRef={spreadsRef} onBuilt={onBuilt} onError={onError} />
      </Canvas>
      <LeftPanel params={params} status={status} bookRef={bookRef} onParamChange={setParam} onPageCountChange={setPageCount} onRebuild={rebuild} />
      <RightPanel params={params} coverSlots={coverSlots} pageSlots={pageSlots} spreadPages={spreadPages} onCoverSlotChange={onCoverSlotChange} onPageSlotChange={onPageSlotChange} onSpreadPagesChange={onSpreadPagesChange} />
      <PageEditor params={params} pageTextBlocks={pageTextBlocks} spreadPages={spreadPages} overlaysRef={overlaysRef} spreadsRef={spreadsRef} onPageTextBlocksChange={onPageTextBlocksChange} />
    </>
  );
}

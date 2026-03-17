import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  Book,
  BookContent,
  BookInteraction,
  StapleBookBinding,
  TextOverlayContent,
  useBookContent,
  createPageTexture,
  PX_PER_UNIT,
} from '@objectifthunes/react-three-book';
import type { ThreeBook } from '@objectifthunes/react-three-book';
import { DIRECTION_TO_BOOK_DIRECTION, type DemoParams, type ImageSlot, type PageTextBlock } from '../state';

const COVER_LABELS = ['Front Cover Outer', 'Front Cover Inner', 'Back Cover Inner', 'Back Cover Outer'];

interface BookSceneProps {
  params: DemoParams;
  coverSlots: ImageSlot[];
  pageSlots: ImageSlot[];
  pageTextBlocks: PageTextBlock[][];
  buildKey: number;
  bookRef: React.MutableRefObject<ThreeBook | null>;
  overlaysRef: React.MutableRefObject<TextOverlayContent[]>;
  onBuilt: (book: ThreeBook) => void;
  onError: (err: Error) => void;
}

export default function BookScene({ params, coverSlots, pageSlots, pageTextBlocks, buildKey, bookRef, overlaysRef, onBuilt, onError }: BookSceneProps) {
  const orbitRef = useRef<any>(null);

  const content = useBookContent(() => {
    // Dispose previous overlays
    for (const o of overlaysRef.current) o.dispose();
    overlaysRef.current = [];

    const c = new BookContent();
    c.direction = DIRECTION_TO_BOOK_DIRECTION[params.direction];

    // Cover textures — use cover dimensions for correct aspect ratio
    c.covers.length = 0;
    for (let i = 0; i < 4; i++) {
      const s = coverSlots[i];
      c.covers.push(createPageTexture(params.coverColor, COVER_LABELS[i], s.useImage ? s.image : null, s.fitMode, s.fullBleed, params.coverWidth, params.coverHeight));
    }

    // Page textures — use page dimensions for correct aspect ratio
    const pageCW = Math.round(params.pageWidth * PX_PER_UNIT);
    const pageCH = Math.round(params.pageHeight * PX_PER_UNIT);

    c.pages.length = 0;
    for (let i = 0; i < params.pageCount; i++) {
      const s = pageSlots[i];
      const baseTex = createPageTexture(params.pageColor, `Page ${i + 1}`, s.useImage ? s.image : null, s.fitMode, s.fullBleed, params.pageWidth, params.pageHeight);
      const overlay = new TextOverlayContent({
        width: pageCW,
        height: pageCH,
        source: (baseTex as THREE.CanvasTexture).image as HTMLCanvasElement,
      });

      // Add text blocks from state
      const blocks = pageTextBlocks[i] ?? [];
      for (const b of blocks) {
        if (!b.text) continue;
        overlay.addText({
          text: b.text,
          x: b.x,
          y: b.y,
          width: b.width,
          fontFamily: b.fontFamily || params.bookFont,
          fontSize: b.fontSize,
          fontWeight: b.fontWeight,
          fontStyle: b.fontStyle,
          color: b.color,
          textAlign: b.textAlign,
          shadowColor: 'rgba(255,255,255,0.6)',
          shadowBlur: 3,
        });
      }

      overlaysRef.current.push(overlay);
      c.pages.push(overlay);
    }
    return c;
  }, [buildKey]);

  useFrame(() => {
    const book = bookRef.current;
    for (const overlay of overlaysRef.current) {
      overlay.update(book ?? undefined);
    }
  });

  const binding = useMemo(() => new StapleBookBinding(), [buildKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <color attach="background" args={[0x1a1a2e]} />
      <ambientLight intensity={params.ambientIntensity} />
      <directionalLight intensity={params.sunIntensity} position={[params.sunX, params.sunY, params.sunZ]} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={0x2a2a4a} />
      </mesh>
      <OrbitControls ref={orbitRef} enableDamping dampingFactor={0.05} target={[0, 0.5, 0]} />
      <Book
        key={buildKey} ref={bookRef} content={content} binding={binding}
        initialOpenProgress={params.openProgress} castShadows={params.castShadows}
        alignToGround={params.alignToGround} hideBinder={params.hideBinder}
        reduceShadows={params.reduceShadows} reduceSubMeshes={params.reduceSubMeshes} reduceOverdraw={params.reduceOverdraw}
        pagePaperSetup={{ width: params.pageWidth, height: params.pageHeight, thickness: params.pageThickness, stiffness: params.pageStiffness, color: new THREE.Color(1, 1, 1), material: null }}
        coverPaperSetup={{ width: params.coverWidth, height: params.coverHeight, thickness: params.coverThickness, stiffness: params.coverStiffness, color: new THREE.Color(1, 1, 1), material: null }}
        onBuilt={onBuilt} onError={onError}
      >
        <BookInteraction enabled={params.interactive} orbitControlsRef={orbitRef} />
      </Book>
    </>
  );
}

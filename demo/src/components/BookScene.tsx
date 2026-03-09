/**
 * R3F scene contents — React port of three-book/demo/src/scene.ts + interaction.ts + book.ts.
 *
 * Contains:
 *  - Lights (ambient + directional)
 *  - Ground plane
 *  - OrbitControls (drei)
 *  - <Book> R3F component
 *  - <BookInteraction> for pointer-driven page turning
 */

import { useRef, useEffect, useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  Book,
  BookContent,
  BookInteraction,
  StapleBookBinding,
} from '@objectifthunes/react-three-book';
import type { ThreeBook } from '@objectifthunes/react-three-book';
import { toBookDirection, type DemoParams, type ImageSlot } from '../state';
import { createPageTexture } from '../textures';

interface BookSceneProps {
  params: DemoParams;
  coverSlots: ImageSlot[];
  pageSlots: ImageSlot[];
  buildKey: number;
  bookRef: React.MutableRefObject<ThreeBook | null>;
  onBuilt: (book: ThreeBook) => void;
  onError: (err: Error) => void;
}

// Build BookContent from current slots.
// Textures created here are returned so the caller can dispose them on next build.
function buildContent(
  params: DemoParams,
  coverSlots: ImageSlot[],
  pageSlots: ImageSlot[],
  outTextures: THREE.Texture[],
): BookContent {
  const content = new BookContent();
  content.direction = toBookDirection(params.direction);

  const coverLabels = [
    'Front Cover Outer',
    'Front Cover Inner',
    'Back Cover Inner',
    'Back Cover Outer',
  ];

  content.covers.length = 0;
  for (let i = 0; i < 4; i++) {
    const s = coverSlots[i];
    const tex = createPageTexture(
      params.coverColor,
      coverLabels[i],
      s.useImage ? s.image : null,
      s.fitMode,
      s.fullBleed,
    );
    outTextures.push(tex);
    content.covers.push(tex);
  }

  content.pages.length = 0;
  for (let i = 0; i < params.pageCount; i++) {
    const s = pageSlots[i];
    const tex = createPageTexture(
      params.pageColor,
      `Page ${i + 1}`,
      s.useImage ? s.image : null,
      s.fitMode,
      s.fullBleed,
    );
    outTextures.push(tex);
    content.pages.push(tex);
  }

  return content;
}

export default function BookScene({
  params,
  coverSlots,
  pageSlots,
  buildKey,
  bookRef,
  onBuilt,
  onError,
}: BookSceneProps) {
  const orbitRef = useRef<any>(null);

  // ── Build content + textures (re-runs when buildKey changes) ─────────────
  const prevTexturesRef = useRef<THREE.Texture[]>([]);

  // Compute content synchronously during render, keyed by buildKey.
  // Use a ref-based cache to avoid recreation on every render.
  const contentCacheRef = useRef<{ key: number; content: BookContent } | null>(null);

  if (!contentCacheRef.current || contentCacheRef.current.key !== buildKey) {
    // Dispose textures from the previous build
    for (const t of prevTexturesRef.current) t.dispose();
    prevTexturesRef.current = [];

    const newTextures: THREE.Texture[] = [];
    const content = buildContent(params, coverSlots, pageSlots, newTextures);
    prevTexturesRef.current = newTextures;
    contentCacheRef.current = { key: buildKey, content };
  }

  const content = contentCacheRef.current.content;

  // Dispose textures when component unmounts
  useEffect(() => {
    return () => {
      for (const t of prevTexturesRef.current) t.dispose();
    };
  }, []);

  // ── Binding (stable instance per build) ────────────────────────────────
  const binding = useMemo(() => new StapleBookBinding(), [buildKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Background colour */}
      <color attach="background" args={[0x1a1a2e]} />

      {/* Lights */}
      <ambientLight intensity={params.ambientIntensity} />
      <directionalLight
        intensity={params.sunIntensity}
        position={[params.sunX, params.sunY, params.sunZ]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Ground plane */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={0x2a2a4a} />
      </mesh>

      {/* Orbit controls */}
      <OrbitControls
        ref={orbitRef}
        enableDamping
        dampingFactor={0.05}
        target={[0, 0.5, 0]}
      />

      {/* The Book — `key` drives full unmount/remount on rebuild */}
      <Book
        key={buildKey}
        ref={bookRef}
        content={content}
        binding={binding}
        initialOpenProgress={params.openProgress}
        castShadows={params.castShadows}
        alignToGround={params.alignToGround}
        hideBinder={params.hideBinder}
        reduceShadows={params.reduceShadows}
        reduceSubMeshes={params.reduceSubMeshes}
        reduceOverdraw={params.reduceOverdraw}
        pagePaperSetup={{
          width: params.pageWidth,
          height: params.pageHeight,
          thickness: params.pageThickness,
          stiffness: params.pageStiffness,
          color: new THREE.Color(1, 1, 1),
          material: null,
        }}
        coverPaperSetup={{
          width: params.coverWidth,
          height: params.coverHeight,
          thickness: params.coverThickness,
          stiffness: params.coverStiffness,
          color: new THREE.Color(1, 1, 1),
          material: null,
        }}
        onBuilt={onBuilt}
        onError={onError}
      >
        {/*
         * <BookInteraction> is a child of <Book>, so it automatically
         * receives the ThreeBook instance via BookContext — no prop drilling.
         * It disables OrbitControls while a page is being dragged.
         */}
        <BookInteraction
          enabled={params.interactive}
          orbitControlsRef={orbitRef}
        />
      </Book>
    </>
  );
}

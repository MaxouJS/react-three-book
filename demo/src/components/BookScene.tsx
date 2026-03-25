/**
 * BookScene — renders the 3D book using the declarative <Page>, <Cover>,
 * <Spread>, <Text> API.
 */

import { useRef, useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  Book,
  BookInteraction,
  StapleBookBinding,
  Cover,
  Page,
  Spread,
  Text,
} from '@objectifthunes/react-three-book';
import type { ThreeBook } from '@objectifthunes/react-three-book';
import { DIRECTION_TO_BOOK_DIRECTION, DEMO_SHADOW_COLOR, DEMO_SHADOW_BLUR, type DemoParams, type ImageSlot, type PageTextBlock } from '../state';

interface BookSceneProps {
  params: DemoParams;
  coverSlots: ImageSlot[];
  pageSlots: ImageSlot[];
  pageTextBlocks: PageTextBlock[][];
  coverTextBlocks: PageTextBlock[][];
  spreadPages: Set<number>;
  bookRef: React.MutableRefObject<ThreeBook | null>;
  onBuilt: (book: ThreeBook) => void;
  onError: (err: Error) => void;
}

export default function BookScene({
  params, coverSlots, pageSlots, pageTextBlocks, coverTextBlocks, spreadPages,
  bookRef, onBuilt, onError,
}: BookSceneProps) {
  const orbitRef = useRef<any>(null);
  const binding = useMemo(() => new StapleBookBinding(), []);

  // Build page elements from state
  const pageElements: React.ReactNode[] = [];
  for (let i = 0; i < params.pageCount; i++) {
    if (spreadPages.has(i)) {
      // Left page of spread — the <Spread> component produces two page entries
      const s = pageSlots[i];
      const blocks = pageTextBlocks[i] ?? [];
      pageElements.push(
        <Spread
          key={`spread-${i}`}
          image={s.useImage ? s.image ?? undefined : undefined}
          color={params.pageColor}
          fitMode={s.fitMode}
          fullBleed={s.fullBleed}
          imageRect={s.useImage ? s.imageRect : undefined}
        >
          {blocks.filter((b) => b.text).map((b, bi) => (
            <Text
              key={bi}
              x={b.x} y={b.y} width={b.width}
              fontSize={b.fontSize}
              fontFamily={b.fontFamily || params.bookFont}
              fontWeight={b.fontWeight}
              fontStyle={b.fontStyle}
              color={b.color}
              textAlign={b.textAlign}
              shadowColor={DEMO_SHADOW_COLOR}
              shadowBlur={DEMO_SHADOW_BLUR}
            >
              {b.text}
            </Text>
          ))}
        </Spread>,
      );
      // Skip right half — <Spread> handles both pages
      i++;
      continue;
    }

    // Normal single page
    const s = pageSlots[i];
    const blocks = pageTextBlocks[i] ?? [];
    pageElements.push(
      <Page
        key={`page-${i}`}
        image={s.useImage ? s.image ?? undefined : undefined}
        color={params.pageColor}
        fitMode={s.fitMode}
        fullBleed={s.fullBleed}
        imageRect={s.useImage ? s.imageRect : undefined}
      >
        {blocks.filter((b) => b.text).map((b, bi) => (
          <Text
            key={bi}
            x={b.x} y={b.y} width={b.width}
            fontSize={b.fontSize}
            fontFamily={b.fontFamily || params.bookFont}
            fontWeight={b.fontWeight}
            fontStyle={b.fontStyle}
            color={b.color}
            textAlign={b.textAlign}
            shadowColor={DEMO_SHADOW_COLOR}
            shadowBlur={DEMO_SHADOW_BLUR}
          >
            {b.text}
          </Text>
        ))}
      </Page>,
    );
  }

  return (
    <>
      <color attach="background" args={[0x1a1a2e]} />
      <ambientLight intensity={params.ambientIntensity} />
      <directionalLight
        intensity={params.sunIntensity}
        position={[params.sunX, params.sunY, params.sunZ]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={0x2a2a4a} />
      </mesh>
      <OrbitControls ref={orbitRef} enableDamping dampingFactor={0.05} target={[0, 0.5, 0]} />

      <Book
        ref={bookRef}
        binding={binding}
        direction={DIRECTION_TO_BOOK_DIRECTION[params.direction]}
        initialOpenProgress={params.openProgress}
        castShadows={params.castShadows}
        alignToGround={params.alignToGround}
        hideBinder={params.hideBinder}
        reduceShadows={params.reduceShadows}
        reduceSubMeshes={params.reduceSubMeshes}
        reduceOverdraw={params.reduceOverdraw}
        pagePaperSetup={{
          width: params.pageWidth, height: params.pageHeight,
          thickness: params.pageThickness, stiffness: params.pageStiffness,
          color: new THREE.Color(1, 1, 1), material: null,
        }}
        coverPaperSetup={{
          width: params.coverWidth, height: params.coverHeight,
          thickness: params.coverThickness, stiffness: params.coverStiffness,
          color: new THREE.Color(1, 1, 1), material: null,
        }}
        onBuilt={onBuilt}
        onError={onError}
      >
        <BookInteraction enabled={params.interactive} orbitControlsRef={orbitRef} />

        {coverSlots.map((s, i) => {
          const blocks = coverTextBlocks[i] ?? [];
          return (
            <Cover
              key={`cover-${i}`}
              image={s.useImage ? s.image ?? undefined : undefined}
              color={params.coverColor}
              fitMode={s.fitMode}
              fullBleed={s.fullBleed}
              imageRect={s.useImage ? s.imageRect : undefined}
            >
              {blocks.filter((b) => b.text).map((b, bi) => (
                <Text
                  key={bi}
                  x={b.x} y={b.y} width={b.width}
                  fontSize={b.fontSize}
                  fontFamily={b.fontFamily || params.bookFont}
                  fontWeight={b.fontWeight}
                  fontStyle={b.fontStyle}
                  color={b.color}
                  textAlign={b.textAlign}
                  shadowColor={DEMO_SHADOW_COLOR}
                  shadowBlur={DEMO_SHADOW_BLUR}
                >
                  {b.text}
                </Text>
              ))}
            </Cover>
          );
        })}

        {pageElements}
      </Book>
    </>
  );
}

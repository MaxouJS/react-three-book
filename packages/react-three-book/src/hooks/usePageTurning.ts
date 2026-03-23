import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Book as ThreeBook } from '@objectifthunes/three-book';

export interface UsePageTurningOptions {
  /** Disable pointer events without unmounting. Default: true. */
  enabled?: boolean;
  /** OrbitControls ref — disabled during drag, re-enabled on release. */
  orbitControlsRef?: React.RefObject<{ enabled: boolean } | null>;
}

/**
 * Attaches pointer-drag events on the R3F canvas for interactive page turning.
 * Prefer the declarative `<BookInteraction>` component unless you need raw access.
 */
export function usePageTurning(
  bookRef: React.RefObject<ThreeBook | null>,
  { enabled = true, orbitControlsRef }: UsePageTurningOptions = {},
): void {
  const { gl, camera } = useThree();
  const isDownRef = useRef(false);
  const selectedRef = useRef<ThreeBook | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const canvas = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const makeRay = (e: PointerEvent): THREE.Ray => {
      const rect = canvas.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      return raycaster.ray;
    };

    const onDown = (e: PointerEvent) => {
      if (!enabledRef.current || e.button !== 0) return;
      isDownRef.current = true;
      const book = bookRef.current;
      if (!book) return;
      if (book.startTurning(makeRay(e))) {
        selectedRef.current = book;
        if (orbitControlsRef?.current) orbitControlsRef.current.enabled = false;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!isDownRef.current || !selectedRef.current) return;
      selectedRef.current.updateTurning(makeRay(e));
    };

    const onUp = () => {
      isDownRef.current = false;
      if (selectedRef.current) {
        selectedRef.current.stopTurning();
        selectedRef.current = null;
        if (orbitControlsRef?.current) orbitControlsRef.current.enabled = true;
      }
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      selectedRef.current = null;
      isDownRef.current = false;
    };
  }, [gl, camera, bookRef, orbitControlsRef]);
}

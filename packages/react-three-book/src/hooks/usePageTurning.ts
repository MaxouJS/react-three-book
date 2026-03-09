/**
 * usePageTurning — attaches pointer events to the R3F canvas that let the
 * user drag pages to turn them.  Optionally disables an OrbitControls ref
 * while a turn is in progress so the drag doesn't also orbit the scene.
 *
 * Usage (standalone):
 *
 *   const orbitRef = useRef(null);
 *   usePageTurning(bookRef, { orbitControlsRef: orbitRef });
 *   <OrbitControls ref={orbitRef} />
 *
 * Or via <BookInteraction> if you prefer a declarative style.
 */

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Book as ThreeBook } from '../core/Book';

export interface UsePageTurningOptions {
  /** When false, pointer events are ignored.  Defaults to true. */
  enabled?: boolean;
  /**
   * Ref to an OrbitControls instance (or any object with an `enabled` flag).
   * Its `enabled` property is set to false while dragging so the orbit camera
   * doesn't fight with the page-turning gesture.
   */
  orbitControlsRef?: React.RefObject<{ enabled: boolean } | null>;
}

/**
 * Wires pointer events on the R3F canvas to `book.startTurning`,
 * `book.updateTurning`, and `book.stopTurning`.
 *
 * @param bookRef  Ref to the ThreeBook instance.
 * @param options  See {@link UsePageTurningOptions}.
 */
export function usePageTurning(
  bookRef: React.RefObject<ThreeBook | null>,
  options: UsePageTurningOptions = {},
): void {
  const { enabled = true, orbitControlsRef } = options;
  const { gl, camera } = useThree();

  const isDownRef = useRef(false);
  const selectedRef = useRef<ThreeBook | null>(null);
  // Keep a stable ref so the event handlers don't need to be recreated when
  // `enabled` toggles.
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const canvas = gl.domElement;

    const makeRay = (e: PointerEvent): THREE.Ray => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
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
    };
  }, [gl, camera, bookRef, orbitControlsRef]);
}

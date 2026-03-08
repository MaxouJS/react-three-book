import * as React from 'react';
import * as THREE from 'three';
import { useFrame, useThree, type ThreeElements, type ThreeEvent } from '@react-three/fiber';
import {
  Book,
  BookContent,
  BookDirection,
  StapleBookBinding,
  type BookOptions,
  type PaperSetupInit,
} from '@objectifthunes/three-book';

export type BookDirectionInput =
  | 'left-to-right'
  | 'right-to-left'
  | 'up-to-down'
  | 'down-to-up';

export interface BookContentInput {
  covers: [
    THREE.Texture | null,
    THREE.Texture | null,
    THREE.Texture | null,
    THREE.Texture | null,
  ];
  pages: Array<THREE.Texture | null>;
  direction?: BookDirectionInput;
}

export type PaperSetupInput = Partial<
  Omit<PaperSetupInit, 'color'> & { color: THREE.ColorRepresentation }
>;

export interface Book3DProps extends Omit<ThreeElements['primitive'], 'object'> {
  content: BookContentInput;
  page?: PaperSetupInput;
  cover?: PaperSetupInput;
  initialOpenProgress?: number;
  castShadows?: boolean;
  alignToGround?: boolean;
  hideBinder?: boolean;
  reduceShadows?: boolean;
  reduceSubMeshes?: boolean;
  reduceOverdraw?: boolean;
  autoInit?: boolean;
  updateEveryFrame?: boolean;
  interactive?: boolean;
  onReady?: (book: Book) => void;
  onTurnStart?: () => void;
  onTurnEnd?: () => void;
}

function toDirection(direction: BookDirectionInput | undefined): BookDirection {
  switch (direction) {
    case 'right-to-left':
      return BookDirection.RightToLeft;
    case 'up-to-down':
      return BookDirection.UpToDown;
    case 'down-to-up':
      return BookDirection.DownToUp;
    case 'left-to-right':
    default:
      return BookDirection.LeftToRight;
  }
}

function toPaperSetup(input: PaperSetupInput | undefined): Partial<PaperSetupInit> | undefined {
  if (!input) return undefined;
  const out: Partial<PaperSetupInit> = {};
  if (input.width !== undefined) out.width = input.width;
  if (input.height !== undefined) out.height = input.height;
  if (input.thickness !== undefined) out.thickness = input.thickness;
  if (input.stiffness !== undefined) out.stiffness = input.stiffness;
  if (input.material !== undefined) out.material = input.material;
  if (input.color !== undefined) out.color = new THREE.Color(input.color);
  return out;
}

export function createBookContent(input: BookContentInput): BookContent {
  const content = new BookContent();
  content.direction = toDirection(input.direction);
  content.covers.length = 0;
  content.covers.push(
    input.covers[0] ?? null,
    input.covers[1] ?? null,
    input.covers[2] ?? null,
    input.covers[3] ?? null,
  );
  content.pages.length = 0;
  content.pages.push(...input.pages);
  return content;
}

export const Book3D = React.forwardRef<Book, Book3DProps>(function Book3D(
  {
    content,
    page,
    cover,
    initialOpenProgress = 0,
    castShadows = true,
    alignToGround = true,
    hideBinder,
    reduceShadows,
    reduceSubMeshes,
    reduceOverdraw,
    autoInit = true,
    updateEveryFrame = true,
    interactive = true,
    onReady,
    onTurnStart,
    onTurnEnd,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onPointerMissed,
    ...primitiveProps
  },
  ref,
): JSX.Element {
  const options = React.useMemo<BookOptions>(
    () => ({
      content: createBookContent(content),
      binding: new StapleBookBinding(),
      initialOpenProgress,
      castShadows,
      alignToGround,
      hideBinder,
      reduceShadows,
      reduceSubMeshes,
      reduceOverdraw,
      pagePaperSetup: toPaperSetup(page),
      coverPaperSetup: toPaperSetup(cover),
    }),
    [
      alignToGround,
      castShadows,
      content,
      cover,
      hideBinder,
      initialOpenProgress,
      page,
      reduceOverdraw,
      reduceShadows,
      reduceSubMeshes,
    ],
  );

  const book = React.useMemo(() => new Book(options), [options]);
  const { camera, gl } = useThree();
  const raycasterRef = React.useRef(new THREE.Raycaster());
  const pointerNdcRef = React.useRef(new THREE.Vector2());
  const draggingRef = React.useRef(false);
  const draggingPointerIdRef = React.useRef<number | null>(null);

  React.useImperativeHandle(ref, () => book, [book]);

  const stopTurning = React.useCallback(() => {
    if (!draggingRef.current) return;
    book.stopTurning();
    draggingRef.current = false;
    draggingPointerIdRef.current = null;
    onTurnEnd?.();
  }, [book, onTurnEnd]);

  const updateTurningFromPointerEvent = React.useCallback(
    (event: PointerEvent) => {
      if (!draggingRef.current || !interactive) return;

      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      pointerNdcRef.current.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycasterRef.current.setFromCamera(pointerNdcRef.current, camera);
      book.updateTurning(raycasterRef.current.ray);
    },
    [book, camera, gl, interactive],
  );

  React.useEffect(() => {
    if (autoInit) {
      book.init();
      onReady?.(book);
    }
    return () => {
      stopTurning();
      book.dispose();
    };
  }, [autoInit, book, onReady, stopTurning]);

  useFrame((_, dt) => {
    if (updateEveryFrame) {
      book.update(dt);
    }
  });

  React.useEffect(() => {
    if (!interactive) {
      stopTurning();
      return;
    }

    const handlePointerMove = (event: PointerEvent): void => {
      if (!draggingRef.current) return;
      if (
        draggingPointerIdRef.current !== null &&
        event.pointerId !== draggingPointerIdRef.current
      ) {
        return;
      }
      updateTurningFromPointerEvent(event);
    };

    const handlePointerUpOrCancel = (event: PointerEvent): void => {
      if (!draggingRef.current) return;
      if (
        draggingPointerIdRef.current !== null &&
        event.pointerId !== draggingPointerIdRef.current
      ) {
        return;
      }
      stopTurning();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUpOrCancel);
    window.addEventListener('pointercancel', handlePointerUpOrCancel);
    window.addEventListener('blur', stopTurning);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUpOrCancel);
      window.removeEventListener('pointercancel', handlePointerUpOrCancel);
      window.removeEventListener('blur', stopTurning);
    };
  }, [interactive, stopTurning, updateTurningFromPointerEvent]);

  const handlePointerDown = React.useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (interactive && book.startTurning(event.ray)) {
        draggingRef.current = true;
        draggingPointerIdRef.current = event.pointerId;
        onTurnStart?.();
        event.stopPropagation();
      }
      onPointerDown?.(event);
    },
    [book, interactive, onPointerDown, onTurnStart],
  );

  const handlePointerMove = React.useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (draggingRef.current) {
        event.stopPropagation();
      }
      onPointerMove?.(event);
    },
    [onPointerMove],
  );

  const handlePointerUp = React.useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (
        draggingRef.current &&
        (draggingPointerIdRef.current === null ||
          draggingPointerIdRef.current === event.pointerId)
      ) {
        stopTurning();
      }
      onPointerUp?.(event);
    },
    [onPointerUp, stopTurning],
  );

  const handlePointerLeave = React.useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      onPointerLeave?.(event);
    },
    [onPointerLeave],
  );

  const handlePointerMissed = React.useCallback(
    (event: MouseEvent) => {
      stopTurning();
      onPointerMissed?.(event);
    },
    [onPointerMissed, stopTurning],
  );

  return (
    <primitive
      object={book}
      {...primitiveProps}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerMissed={handlePointerMissed}
    />
  );
});

export const ReactThreeBook = Book3D;

export type BookHandle = Book;
export type { BookOptions };

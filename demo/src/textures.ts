import * as THREE from 'three';

export type ImageFitMode = 'contain' | 'cover' | 'fill';

export interface ImageSlot {
  image: HTMLImageElement | null;
  objectUrl: string | null;
  useImage: boolean;
  fitMode: ImageFitMode;
  fullBleed: boolean;
}

export function createImageSlot(): ImageSlot {
  return {
    image: null,
    objectUrl: null,
    useImage: false,
    fitMode: 'cover',
    fullBleed: true,
  };
}

export function revokeAndClear(slot: ImageSlot): ImageSlot {
  if (slot.objectUrl) URL.revokeObjectURL(slot.objectUrl);
  return { ...slot, objectUrl: null, image: null, useImage: false };
}

export function drawImageWithFit(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  fit: ImageFitMode,
): void {
  const sw = image.naturalWidth || image.width;
  const sh = image.naturalHeight || image.height;
  if (sw <= 0 || sh <= 0) return;

  if (fit === 'fill') {
    ctx.drawImage(image, x, y, width, height);
    return;
  }

  const scale =
    fit === 'contain'
      ? Math.min(width / sw, height / sh)
      : Math.max(width / sw, height / sh);

  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(image, x + (width - dw) / 2, y + (height - dh) / 2, dw, dh);
}

export function createPageTexture(
  color: string,
  text: string,
  image: HTMLImageElement | null,
  fitMode: ImageFitMode,
  fullBleed: boolean,
): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 512);

  if (image) {
    const margin = fullBleed ? 0 : 56;
    drawImageWithFit(
      ctx,
      image,
      margin,
      margin,
      512 - margin * 2,
      512 - margin * 2,
      fitMode,
    );
  } else {
    ctx.fillStyle = '#333';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export async function loadImageFromFile(
  file: File,
): Promise<{ image: HTMLImageElement; objectUrl: string }> {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = objectUrl;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
  });

  return { image, objectUrl };
}

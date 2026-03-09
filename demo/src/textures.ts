import * as THREE from 'three';
import type { ImageFitMode, ImageSlot } from './state';

export function drawImageWithFit(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  fit: ImageFitMode,
): void {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (sourceWidth <= 0 || sourceHeight <= 0) return;

  if (fit === 'fill') {
    ctx.drawImage(image, x, y, width, height);
    return;
  }

  const scale =
    fit === 'contain'
      ? Math.min(width / sourceWidth, height / sourceHeight)
      : Math.max(width / sourceWidth, height / sourceHeight);

  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const drawX = x + (width - drawWidth) * 0.5;
  const drawY = y + (height - drawHeight) * 0.5;

  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
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
      canvas.width - margin * 2,
      canvas.height - margin * 2,
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
  slot: ImageSlot,
  file: File | null,
): Promise<void> {
  if (!file) return;

  if (slot.objectUrl) URL.revokeObjectURL(slot.objectUrl);

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = objectUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Failed to load selected image.'));
    });
    slot.objectUrl = objectUrl;
    slot.image = image;
    slot.useImage = true;
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    console.error(error);
  }
}

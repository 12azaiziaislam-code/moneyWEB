/**
 * Client-side image preparation: downscale to ~1280px, re-encode as JPEG 0.8
 * (this also strips EXIF/GPS), and hash the result for caching + duplicate
 * detection. Camera capture is handled by the input element itself.
 */

export interface PreparedImage {
  dataUrl: string;
  hash: string;
  width: number;
  height: number;
  bytes: number;
  mime: string;
}

const MAX_DIM = 1280;
const QUALITY = 0.8;
export const MAX_UPLOAD_BYTES = 1_200_000;

export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file).catch(() => loadImageElement(file));
  }
  return loadImageElement(file);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image_decode_failed'));
    };
    image.src = url;
  });
}

function dimensionOf(source: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  if ('width' in source && 'height' in source) return { width: source.width, height: source.height };
  return { width: 0, height: 0 };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode_failed'))),
      'image/jpeg',
      QUALITY,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('read_failed'));
    reader.readAsDataURL(blob);
  });
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file) throw new Error('no_file');
  if (file.size > 25 * 1024 * 1024) throw new Error('too_large');

  const source = await loadBitmap(file);
  const { width, height } = dimensionOf(source);
  if (!width || !height) throw new Error('unsupported_image');

  const scale = Math.min(1, MAX_DIM / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas_unavailable');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.drawImage(source as CanvasImageSource, 0, 0, targetWidth, targetHeight);
  if ('close' in source && typeof source.close === 'function') source.close();

  let blob = await canvasToBlob(canvas);
  // Second pass for very detailed photos that stay above the upload cap.
  if (blob.size > MAX_UPLOAD_BYTES) {
    const smaller = document.createElement('canvas');
    const factor = Math.sqrt(MAX_UPLOAD_BYTES / blob.size) * 0.95;
    smaller.width = Math.max(320, Math.round(targetWidth * factor));
    smaller.height = Math.max(320, Math.round(targetHeight * factor));
    const ctx = smaller.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, 0, smaller.width, smaller.height);
      blob = await canvasToBlob(smaller);
    }
  }

  const dataUrl = await blobToDataUrl(blob);
  const hash = await sha256Hex(await blob.arrayBuffer());

  return { dataUrl, hash, width: targetWidth, height: targetHeight, bytes: blob.size, mime: 'image/jpeg' };
}

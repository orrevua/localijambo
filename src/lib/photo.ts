const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

export interface ProcessedPhoto {
  blob: Blob;
  url: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read the image.'));
    img.src = src;
  });
}

export async function processPhoto(file: Blob): Promise<ProcessedPhoto> {
  const sourceUrl = URL.createObjectURL(file);
  let img: HTMLImageElement;
  try {
    img = await loadImage(sourceUrl);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported.');
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) throw new Error('Could not encode the image.');

  return { blob, url: URL.createObjectURL(blob) };
}

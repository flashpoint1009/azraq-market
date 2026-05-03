export type OptimizedImage = {
  full: File;
  thumbnail: File;
};

async function resizeImage(file: File, maxSize: number, suffix: string): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');
  context.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => nextBlob ? resolve(nextBlob) : reject(new Error('Image compression failed')), 'image/webp', 0.82);
  });
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-${suffix}.webp`, { type: 'image/webp' });
}

export async function optimizeProductImage(file: File): Promise<OptimizedImage> {
  return {
    full: await resizeImage(file, 800, 'full'),
    thumbnail: await resizeImage(file, 200, 'thumb'),
  };
}

/**
 * Compresses an image file client-side using the Canvas API.
 * Resizes to max 3200px width, converts to WebP at quality 85.
 * This keeps uploads well under Vercel's 4.5MB serverless limit.
 */
export async function compressImageClient(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const MAX_WIDTH = 3200;
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > MAX_WIDTH) {
        h = Math.round(h * MAX_WIDTH / w);
        w = MAX_WIDTH;
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const name = file.name.replace(/\.[^.]+$/, '.webp');
            resolve(new File([blob], name, { type: 'image/webp' }));
          } else {
            resolve(file);
          }
        },
        'image/webp',
        0.85,
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

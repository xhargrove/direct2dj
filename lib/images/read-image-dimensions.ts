/**
 * Read intrinsic pixel dimensions from an image file (browser).
 */
export async function readImageFileDimensions(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    const bmp = await createImageBitmap(file);
    try {
      return { width: bmp.width, height: bmp.height };
    } finally {
      bmp.close();
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image."));
    };
    img.src = url;
  });
}

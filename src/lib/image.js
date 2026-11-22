const ACCEPTED = /^image\/(jpeg|png|webp|gif)$/;

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Shrink phone photos before upload: max 2000px on the long side, WebP (or JPEG where
 * WebP encoding isn't available). Turns a 6 MB camera photo into ~200–400 KB.
 * GIFs and already-small images are uploaded unchanged.
 */
export async function prepareImage(file, { maxSize = 2000, quality = 0.84 } = {}) {
  if (!ACCEPTED.test(file.type)) throw new Error("Please choose a JPG, PNG, WebP or GIF image.");
  if (file.type === "image/gif") return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // the browser can't decode it; let the server's type/size checks decide
  }
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 350_000) {
    bitmap.close?.();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  let blob = await canvasToBlob(canvas, "image/webp", quality);
  if (!blob || blob.type !== "image/webp") {
    // Older Safari can't encode WebP. Keep PNG for images that may be transparent.
    blob = file.type === "image/png" ? await canvasToBlob(canvas, "image/png") : await canvasToBlob(canvas, "image/jpeg", quality);
  }
  if (!blob || blob.size >= file.size) return file;
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  const ext = blob.type.split("/")[1].replace("jpeg", "jpg");
  return new File([blob], `${base}.${ext}`, { type: blob.type });
}

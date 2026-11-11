export const MAX_PIXELS = 24000000;
export const formats = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
export function bytes(n) {
  return n < 1024
    ? `${n} B`
    : n < 1048576
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1048576).toFixed(2)} MB`;
}
export function dimensions(w, h) {
  if (
    !Number.isInteger(w) ||
    !Number.isInteger(h) ||
    w < 1 ||
    h < 1 ||
    w > 8192 ||
    h > 8192 ||
    w * h > MAX_PIXELS
  )
    throw new Error(
      "Use whole-number dimensions up to 8,192 px per side and 24 megapixels.",
    );
}
export async function decode(file) {
  if (
    !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)
  )
    throw new Error("Choose a JPG, PNG, WebP or AVIF image.");
  if (file.size > 30 * 1048576)
    throw new Error("Please choose an image smaller than 30 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    dimensions(img.naturalWidth, img.naturalHeight);
    return {
      file,
      url,
      img,
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw new Error(
      e.message.includes("dimensions")
        ? e.message
        : "This image cannot be opened. Try a smaller JPG, PNG or WebP.",
    );
  }
}
export async function encode(source, { width, height, format, quality }) {
  dimensions(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing is unavailable in this browser.");
  if (format === "image/jpeg") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source.img, 0, 0, width, height);
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, format, quality / 100),
  );
  canvas.width = canvas.height = 0;
  if (!blob || blob.type !== format)
    throw new Error(
      "Your browser cannot export this format. Choose another format.",
    );
  return blob;
}
export async function supportedFormats() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const entries = await Promise.all(
    Object.keys(formats).map(async (type) => [
      type,
      await new Promise((r) => canvas.toBlob((b) => r(b?.type === type), type)),
    ]),
  );
  return entries.filter(([, ok]) => ok).map(([type]) => type);
}

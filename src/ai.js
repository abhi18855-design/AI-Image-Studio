// Provider-neutral gateway adapter. No provider credentials belong in this app.
export const endpoint = import.meta.env.VITE_AI_ENDPOINT?.trim() || "";
export async function transformImage(file, style, signal) {
  if (!endpoint)
    throw new Error(
      "AI configuration required. Connect a secure image transformation endpoint first.",
    );
  if (
    new URL(endpoint).protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(new URL(endpoint).hostname)
  )
    throw new Error("The AI endpoint must use HTTPS.");
  const form = new FormData();
  form.append("image", file);
  form.append("style", style);
  const response = await fetch(endpoint, {
    method: "POST",
    body: form,
    signal,
    credentials: "omit",
  });
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "The studio is busy. Please try again later."
        : `Transformation failed (${response.status}). Please try again.`,
    );
  const blob = await response.blob();
  if (
    !["image/png", "image/jpeg", "image/webp", "image/avif"].includes(
      blob.type,
    ) ||
    !blob.size ||
    blob.size > 30 * 1048576
  )
    throw new Error("The AI endpoint returned an invalid image.");
  return blob;
}

/** Convert a logo URL to a JPEG data URL for jsPDF / print. */
export async function loadReportLogoJpeg(
  src: string | null | undefined
): Promise<string | null> {
  if (!src?.trim()) return null;
  try {
    const res = await fetch(src.trim());
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return null;
  }
}

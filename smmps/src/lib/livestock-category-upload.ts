import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  LIVESTOCK_PHOTO_HEIGHT,
  LIVESTOCK_PHOTO_WIDTH,
} from "@/lib/livestock-photo-rules";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function extension(name: string) {
  return path.extname(name).toLowerCase();
}

async function trimDarkBars(buffer: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const image = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (width < 8 || height < 8) return buffer;

  const sw = 160;
  const sh = 90;
  const { data } = await image
    .clone()
    .resize(sw, sh, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const thresh = 42;
  const dark = (i: number) =>
    data[i] < thresh && data[i + 1] < thresh && data[i + 2] < thresh;
  const beige = (i: number) =>
    Math.abs(data[i] - 247) < 22 &&
    Math.abs(data[i + 1] - 244) < 22 &&
    Math.abs(data[i + 2] - 238) < 22;
  const barPx = (i: number) => dark(i) || beige(i);

  const colDark = (x: number) => {
    for (let y = 0; y < sh; y += 1) {
      if (!barPx((y * sw + x) * 3)) return false;
    }
    return true;
  };
  const rowDark = (y: number) => {
    for (let x = 0; x < sw; x += 1) {
      if (!barPx((y * sw + x) * 3)) return false;
    }
    return true;
  };

  let l = 0;
  let r = sw - 1;
  let t = 0;
  let b = sh - 1;
  while (l < r && colDark(l)) l += 1;
  while (r > l && colDark(r)) r -= 1;
  while (t < b && rowDark(t)) t += 1;
  while (b > t && rowDark(b)) b -= 1;

  if (l === 0 && t === 0 && r === sw - 1 && b === sh - 1) return buffer;

  const left = Math.floor((l / sw) * width);
  const top = Math.floor((t / sh) * height);
  const cropW = Math.max(8, Math.ceil(((r - l + 1) / sw) * width));
  const cropH = Math.max(8, Math.ceil(((b - t + 1) / sh) * height));
  return await sharp(buffer, { failOn: "none" })
    .rotate()
    .extract({
      left,
      top,
      width: Math.min(cropW, width - left),
      height: Math.min(cropH, height - top),
    })
    .toBuffer();
}

async function fitToCatalogFrame(buffer: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    const trimmed = await trimDarkBars(buffer);
    return await sharp(trimmed, { failOn: "none" })
      .rotate()
      .resize(LIVESTOCK_PHOTO_WIDTH, LIVESTOCK_PHOTO_HEIGHT, {
        fit: "cover",
        position: "centre",
      })
      .jpeg({ quality: 92, progressive: true })
      .toBuffer();
  } catch {
    return buffer;
  }
}

export async function saveLivestockCategoryImage(file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }
  const extFromName = extension(file.name);
  const mime = (file.type || "").toLowerCase();
  const allowed = ALLOWED_MIME.has(mime) || ALLOWED_EXT.has(extFromName);
  if (!allowed) throw new Error("Use a PNG, JPEG, or WEBP image.");

  const raw = Buffer.from(await file.arrayBuffer());
  const fitted = await fitToCatalogFrame(raw);
  const usedFit = fitted !== raw;
  const ext = usedFit
    ? ".jpg"
    : extFromName && ALLOWED_EXT.has(extFromName)
      ? extFromName
      : ".jpg";
  const safeBase =
    path
      .basename(file.name, extFromName)
      .replace(/[^\w.-]+/g, "_")
      .slice(0, 80) || "category";
  const fileName = `${Date.now()}-${safeBase}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "livestock-categories");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), fitted);
  return `/uploads/livestock-categories/${fileName}?v=${Date.now()}`;
}

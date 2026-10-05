import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  canManageCompany,
  getCurrentUser,
  isApproved,
  isCompanyAdmin,
  isSuperAdmin,
  resolveCompanyAdminSlug,
} from "@/lib/auth";
import { upsertCompanyProfileOverride } from "@/lib/company-profile-store";
import { setRegisteredCompanyLogo } from "@/lib/registered-companies-store";
import {
  revalidateLivestockPublic,
  revalidateUtilityPublic,
} from "@/lib/revalidate-public";
import { revalidatePath } from "next/cache";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const user = (await getCurrentUser("admin")) || (await getCurrentUser());
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in again to upload a logo" },
      { status: 401 }
    );
  }

  if (!isApproved(user)) {
    return NextResponse.json(
      { error: "Your account must be approved before uploading images" },
      { status: 403 }
    );
  }

  if (!isCompanyAdmin(user) && !isSuperAdmin(user)) {
    return NextResponse.json(
      { error: "Only company admins can upload a company logo" },
      { status: 403 }
    );
  }

  const slug = resolveCompanyAdminSlug(user);
  if (!slug || !canManageCompany({ ...user, companySlug: slug }, slug)) {
    return NextResponse.json(
      { error: "You can only update your own company logo" },
      { status: 403 }
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Logo file is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Logo must be 5 MB or smaller" },
      { status: 400 }
    );
  }

  const isImage =
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif)$/i.test(path.extname(file.name));
  if (!isImage) {
    return NextResponse.json(
      { error: "Logo must be PNG, JPEG, WEBP, or GIF" },
      { status: 400 }
    );
  }

  const extFromName = path.extname(file.name).toLowerCase();
  const ext =
    [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extFromName)
      ? extFromName === ".jpeg"
        ? ".jpg"
        : extFromName
      : file.type === "image/png"
        ? ".png"
        : file.type === "image/webp"
          ? ".webp"
          : file.type === "image/gif"
            ? ".gif"
            : ".jpg";

  const safeSlug = slug.replace(/[^\w-]+/g, "-").slice(0, 60);
  const fileName = `${safeSlug}-${Date.now()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "companies");
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, fileName), buffer);

  const image = `/uploads/companies/${fileName}`;
  const override = await upsertCompanyProfileOverride(slug, { image });
  await setRegisteredCompanyLogo(slug, image);
  revalidateUtilityPublic(slug);
  revalidateLivestockPublic(slug);
  revalidatePath("/super-admin/markets");

  return NextResponse.json({ ok: true, image, override, slug });
}

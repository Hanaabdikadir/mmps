"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ImagePlus, Layers, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useActionMessage } from "@/components/super-admin/use-action-message";
import { useConfirmDialog } from "@/components/super-admin/ConfirmDialog";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";
import { AdminPageHeader } from "@/components/super-admin/AdminPagePrimitives";
import { Modal, Field } from "@/components/ui/DataTable";
import { cn } from "@/lib/utils";
import { LIVESTOCK_PHOTO_URLS, adminLivestockName } from "@/lib/livestock-data";
import { canonicalTypeName, isRetiredLivestockType, RETIRED_LIVESTOCK_TYPE_ERROR } from "@/lib/livestock-section-prices";
import { useFileObjectUrl } from "@/hooks/use-file-object-url";
import { authPortalHeaders } from "@/lib/auth-portal";
import { useLang } from "@/lib/language-context";

type Category = {
  id: number;
  name: string;
  nameSomali: string | null;
  slug: string;
  status: string;
  species: string;
  imageUrl?: string | null;
  animalTypes?: { id: number; name: string; nameSomali: string | null; status?: string }[];
};

const fieldCls =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15";

function categoryPhoto(category: { slug: string; name?: string; imageUrl?: string | null }) {
  if (category.imageUrl) return category.imageUrl;
  const hay = `${category.slug || ""} ${category.name || ""}`.toLowerCase();
  if (hay.includes("geel") || hay.includes("camel")) return LIVESTOCK_PHOTO_URLS.geel;
  if (hay.includes("arri") || hay.includes("goat") || hay.includes("sheep")) {
    return LIVESTOCK_PHOTO_URLS.arri;
  }
  if (hay.includes("loda") || hay.includes("cattle") || hay.includes("cow")) {
    return LIVESTOCK_PHOTO_URLS.loda;
  }
  return LIVESTOCK_PHOTO_URLS.marketHero;
}

function categoryLabel(
  category: { name: string; nameSomali?: string | null },
  lang: "en" | "so"
) {
  return adminLivestockName(category.name, category.nameSomali, lang);
}

function categoryTone(name: string, slug?: string) {
  const hay = `${slug || ""} ${name}`.toUpperCase();
  if (hay.includes("CAMEL") || hay.includes("GEEL")) return "text-orange-700";
  if (hay.includes("SHEEP") || hay.includes("GOAT") || hay.includes("ARI")) {
    return "text-violet-700";
  }
  if (hay.includes("CATTLE") || hay.includes("LODA") || hay.includes("COW")) {
    return "text-teal-700";
  }
  return "text-slate-700";
}

function categoryRank(name: string, slug?: string) {
  const hay = `${slug || ""} ${name}`.toLowerCase();
  if (hay.includes("geel") || hay.includes("camel")) return 0;
  if (hay.includes("loda") || hay.includes("cattle")) return 1;
  if (hay.includes("arri") || hay.includes("goat") || hay.includes("sheep")) return 2;
  return 3;
}

export function LivestockCatalogPanel() {
  const { lang } = useLang();
  const pathname = usePathname();
  const isSuperAdminPage = pathname.startsWith("/super-admin");
  const [categories, setCategories] = useState<Category[]>([]);
  const [typePhotos, setTypePhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [q, setQ] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [catSaving, setCatSaving] = useState(false);
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [catForm, setCatForm] = useState({
    name: "",
    nameSomali: "",
    status: "ACTIVE",
  });
  const [catImage, setCatImage] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [catError, setCatError] = useState("");
  const [typeEdits, setTypeEdits] = useState<
    { id: number; name: string; nameSomali: string }[]
  >([]);
  const originalTypesRef = useRef<{ id: number; name: string; nameSomali: string }[]>([]);
  const [message, setMessage] = useActionMessage(2500);
  const { confirm, dialog } = useConfirmDialog();
  const [namesLocked, setNamesLocked] = useState(!isSuperAdminPage);
  const [typeOpen, setTypeOpen] = useState(false);
  const [typeSaving, setTypeSaving] = useState(false);
  const [typeError, setTypeError] = useState("");
  const [typeForm, setTypeForm] = useState({
    categoryId: "",
    name: "",
    nameSomali: "",
  });
  const [newTypes, setNewTypes] = useState([{ nameSomali: "", name: "" }]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imagePreview = useFileObjectUrl(catImage);
  const shownImage = imagePreview || existingImage;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/livestock/catalog?all=1", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load catalog");
      setCategories(json.categories || []);
      const photosRes = await fetch("/api/livestock/type-photos", { cache: "no-store" });
      const photosJson = await photosRes.json().catch(() => ({}));
      if (photosJson.photos && typeof photosJson.photos === "object") {
        setTypePhotos(photosJson.photos as Record<string, string>);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load catalog");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isSuperAdminPage) {
      setNamesLocked(false);
      return;
    }
    void fetch("/api/auth/me", {
      cache: "no-store",
      headers: authPortalHeaders(),
    })
      .then((r) => r.json())
      .then((data) => {
        setNamesLocked(data?.user?.role !== "SUPER_ADMIN");
      })
      .catch(() => setNamesLocked(true));
  }, [isSuperAdminPage]);

  useEffect(() => {
    const t = setTimeout(() => setQ(searchDraft.trim()), 280);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const ordered = useMemo(
    () =>
      [...categories].sort(
        (a, b) => categoryRank(a.name, a.slug) - categoryRank(b.name, b.slug)
      ),
    [categories]
  );

  const visible = ordered.filter((category) => {
    if (!q) return true;
    const hay = `${category.name} ${category.nameSomali || ""} ${category.slug}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  function openCreateCategory() {
    setEditCatId(null);
    setCatError("");
    setCatForm({ name: "", nameSomali: "", status: "ACTIVE" });
    setCatImage(null);
    setExistingImage(null);
    setTypeEdits([]);
    originalTypesRef.current = [];
    setNewTypes([{ nameSomali: "", name: "" }]);
    setCatOpen(true);
  }

  function openEditCategory(category: Category) {
    setEditCatId(category.id);
    setCatError("");
    setCatForm({
      name: category.name,
      nameSomali: category.nameSomali || "",
      status: category.status,
    });
    setCatImage(null);
    setExistingImage(category.imageUrl || categoryPhoto(category));
    const nextTypes = (category.animalTypes || []).map((type) => ({
      id: type.id,
      name: type.name,
      nameSomali: type.nameSomali || type.name,
    }));
    setTypeEdits(nextTypes);
    originalTypesRef.current = nextTypes;
    setNewTypes([{ nameSomali: "", name: "" }]);
    setCatOpen(true);
  }

  async function saveCategory() {
    if (!namesLocked && !catForm.name.trim()) {
      setCatError("Enter a new category name.");
      return;
    }
    if (namesLocked && !catImage && !existingImage) {
      setCatError("Choose a new image.");
      return;
    }
    if (!editCatId && !catImage) {
      setCatError("Choose a category image.");
      return;
    }
    const typeNamesToAdd = newTypes
      .map((row) => ({
        name: row.name.trim(),
        nameSomali: row.nameSomali.trim(),
      }))
      .filter((row) => row.name || row.nameSomali);
    if (!namesLocked && !editCatId && !typeNamesToAdd.length) {
      setCatError("Enter at least one type name.");
      return;
    }
    const savedName = catForm.name.trim();
    if (!namesLocked) {
    const duplicate = categories.some(
      (c) =>
        c.id !== editCatId &&
        c.status === "ACTIVE" &&
        c.name.trim().toLowerCase() === savedName.toLowerCase()
    );
    if (duplicate) {
      setCatError(`${savedName} is already in livestock categories.`);
      return;
    }
    }
    setCatSaving(true);
    setCatError("");
    try {
      const form = new FormData();
      form.append("kind", "category");
      if (editCatId) form.append("id", String(editCatId));
      form.append("name", savedName);
      form.append("nameSomali", catForm.nameSomali.trim());
      form.append("status", catForm.status);
      if (catImage) form.append("image", catImage);
      const res = await fetch("/api/livestock/catalog", {
        method: editCatId ? "PATCH" : "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      const savedEditId = editCatId;
      const categoryId = Number(savedEditId || json.category?.id);
      if (!namesLocked) {
      const originals = originalTypesRef.current;
      for (const type of typeEdits) {
        const somali = type.nameSomali.trim();
        const english = type.name.trim();
        if (!somali && !english) continue;
        const prev = originals.find((row) => row.id === type.id);
        if (
          prev &&
          prev.name.trim() === english &&
          (prev.nameSomali || "").trim() === somali
        ) {
          continue;
        }
        const typeRes = await fetch("/api/livestock/catalog", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "type",
            id: type.id,
            name: english || somali,
            nameSomali: somali || english,
          }),
        });
        const typeJson = await typeRes.json().catch(() => ({}));
        if (!typeRes.ok) {
          throw new Error(typeJson.error || "Could not update type names.");
        }
      }
      if (categoryId) {
        for (const row of typeNamesToAdd) {
          const typeRes = await fetch("/api/livestock/catalog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: "type",
              categoryId,
              name: row.name || row.nameSomali,
              nameSomali: row.nameSomali || row.name,
            }),
          });
          const typeJson = await typeRes.json().catch(() => ({}));
          if (!typeRes.ok) {
            throw new Error(typeJson.error || "Could not add type name.");
          }
        }
      }
      }
      setCatOpen(false);
      setEditCatId(null);
      setCatImage(null);
      setMessage({
        type: "ok",
        text: namesLocked
          ? "Sawirka waa la keydiyey."
          : savedEditId
            ? `${savedName} updated.`
            : `${savedName} added to categories.`,
      });
      await load();
    } catch (err) {
      setCatError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setCatSaving(false);
    }
  }

  async function deleteCategory(category: Category) {
    const label = categoryLabel(category, lang);
    const ok = await confirm({
      title: "Delete category?",
      description: `${label} and all of its animal types will be removed from the livestock catalog.`,
      confirmLabel: "Delete category",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/livestock/catalog?kind=category&id=${category.id}`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage({ type: "error", text: json.error || "Delete failed" });
      return;
    }
    setMessage({ type: "ok", text: `${label} deleted.` });
    await load();
  }

  async function deleteAnimalType(type: {
    id: number;
    name: string;
    nameSomali: string | null;
  }) {
    const label = adminLivestockName(type.name, type.nameSomali, lang);
    const ok = await confirm({
      title: `Delete ${label}?`,
      description:
        "This type will be deleted. The public site will no longer show it. Other types stay.",
      confirmLabel: "OK",
      cancelLabel: "Cancel",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/livestock/catalog?kind=type&id=${type.id}`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage({ type: "error", text: json.error || "Could not delete this type." });
      return;
    }
    setTypeEdits((prev) => prev.filter((row) => row.id !== type.id));
    setMessage({ type: "ok", text: `${label} deleted.` });
    setCatOpen(false);
    setEditCatId(null);
    await load();
  }

  function openProposeType(categoryId?: number) {
    setTypeError("");
    setTypeForm({
      categoryId: categoryId ? String(categoryId) : String(ordered[0]?.id || ""),
      name: "",
      nameSomali: "",
    });
    setTypeOpen(true);
  }

  async function saveProposedType() {
    const categoryId = Number(typeForm.categoryId);
    const name = typeForm.name.trim() || typeForm.nameSomali.trim();
    if (!categoryId || !name) {
      setTypeError("Geli magaca nooca iyo qaybta.");
      return;
    }
    if (isRetiredLivestockType(name, typeForm.nameSomali)) {
      setTypeError(RETIRED_LIVESTOCK_TYPE_ERROR);
      return;
    }
    setTypeSaving(true);
    setTypeError("");
    try {
      const res = await fetch("/api/livestock/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "type",
          categoryId,
          name,
          nameSomali: typeForm.nameSomali.trim() || name,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not submit type");
      setTypeOpen(false);
      setMessage({
        type: "ok",
        text: json.pending
          ? `${name} waa la gudbiyey admin-ka si loo ansixiyo.`
          : `${name} added.`,
      });
      await load();
    } catch (err) {
      setTypeError(err instanceof Error ? err.message : "Could not submit type");
    } finally {
      setTypeSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-none space-y-4">
      {dialog}
      <AdminPageHeader
        title="Livestock Categories"
        subtitle={
          namesLocked
            ? "Add a type or price — an admin must approve it before it appears to the public."
            : "Geelka, Lo'da, and Arriga used by markets and prices."
        }
        icon={Layers}
        actions={
          namesLocked ? (
          <button
            type="button"
            onClick={() => openProposeType()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-[13px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add type
          </button>
          ) : (
          <button
            type="button"
            onClick={openCreateCategory}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-[13px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add category
          </button>
          )
        }
      />

      {message && (
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm font-semibold",
            message.type === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          )}
        >
          {message.text}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="w-full rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 p-3 shadow-sm ring-1 ring-emerald-900/[0.04] sm:p-3.5">
        <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setQ(searchDraft.trim())}
              placeholder="SEARCH"
              className="h-11 w-full min-w-0 bg-transparent pl-10 pr-3 text-[14px] font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:uppercase placeholder:tracking-wide placeholder:text-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={() => setQ(searchDraft.trim())}
            className="inline-flex h-11 shrink-0 items-center gap-2 border-l border-slate-200 bg-emerald-600 px-3 text-[13px] font-bold text-white transition hover:bg-emerald-700 sm:px-5"
          >
            <Search className="h-4 w-4" strokeWidth={2.5} />
            <span className="hidden min-[400px]:inline">Search</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-[20vh] place-items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
            <div>
              <p className="text-[14px] font-bold text-slate-800">Livestock categories</p>
              <p className="mt-0.5 text-[12px] font-medium text-slate-500">
                {visible.length} {visible.length === 1 ? "category" : "categories"} shown
              </p>
            </div>
          </div>
          <div className="mmps-table-fit">
            <table className="w-full table-fixed border-collapse text-left">
              <colgroup>
                <col style={{ width: "10%" }} />
                <col style={{ width: "46%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "22%" }} />
              </colgroup>
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="border-b border-slate-100 px-4 py-3 text-center">#</th>
                  <th className="border-b border-slate-100 px-4 py-3">Category</th>
                  <th className="border-b border-slate-100 px-4 py-3 text-center">Status</th>
                  <th className="border-b border-slate-100 px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!visible.length ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
                      No livestock categories yet. Click Add category to create a new one.
                    </td>
                  </tr>
                ) : (
                  visible.map((category, i) => (
                    <tr key={category.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 text-center align-middle text-[12px] font-bold tabular-nums text-slate-500">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex min-w-0 items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={categoryPhoto(category)}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                          />
                          <div className="min-w-0">
                            <p className={cn("truncate text-[13px] font-bold", categoryTone(category.name, category.slug))}>
                              {categoryLabel(category, lang)}
                            </p>
                            {(category.animalTypes || []).length ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {(category.animalTypes || []).map((type) => {
                                  const label = adminLivestockName(type.name, type.nameSomali, lang);
                                  const key = canonicalTypeName(label);
                                  const src = typePhotos[key];
                                  const chip = (
                                    <>
                                      {src ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={src}
                                          alt=""
                                          className="h-6 w-6 rounded-md object-cover"
                                        />
                                      ) : (
                                        <span className="h-6 w-6 rounded-md bg-slate-100" />
                                      )}
                                      <span className="text-[11px] font-bold text-slate-700">
                                        {label}
                                      </span>
                                      {type.status === "SUSPENDED" ? (
                                        <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800">
                                          Pending
                                        </span>
                                      ) : null}
                                    </>
                                  );
                                  if (namesLocked) {
                                    return (
                                      <span
                                        key={type.id}
                                        className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-1.5 py-1 ${
                                          type.status === "SUSPENDED"
                                            ? "border-amber-300"
                                            : "border-slate-200"
                                        }`}
                                        title={
                                          type.status === "SUSPENDED"
                                            ? `${label} — admin waa inuu ansixiyo`
                                            : label
                                        }
                                      >
                                        {chip}
                                      </span>
                                    );
                                  }
                                  return (
                                    <label
                                      key={type.id}
                                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-1.5 py-1 hover:border-emerald-300"
                                      title={`Upload card photo: ${label}`}
                                    >
                                      {chip}
                                      <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="sr-only"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          e.target.value = "";
                                          if (!file) return;
                                          void (async () => {
                                            for (const season of ["birimo", "sugunto"]) {
                                              const form = new FormData();
                                              form.append("slug", category.slug);
                                              form.append("typeName", label);
                                              form.append("season", season);
                                              form.append("kind", "card");
                                              form.append("image", file);
                                              const res = await fetch("/api/livestock/type-photos", {
                                                method: "POST",
                                                body: form,
                                                credentials: "include",
                                              });
                                              if (!res.ok) {
                                                const json = await res.json().catch(() => ({}));
                                                setError(json.error || "Could not save type photo");
                                                return;
                                              }
                                            }
                                            await load();
                                            setMessage({ type: "ok", text: `Card photo saved for ${label}.` });
                                          })();
                                        }}
                                      />
                                    </label>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center align-middle">
                        <StatusBadge status={category.status} />
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            title={namesLocked ? "Sawirka kaadhka admin ayaa dhigaya" : "Edit category"}
                            aria-label={`Edit ${category.name}`}
                            onClick={() => openEditCategory(category)}
                            disabled={namesLocked}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Pencil className="h-4 w-4" strokeWidth={2.25} />
                          </button>
                          {namesLocked ? null : (
                          <button
                            type="button"
                            title="Delete category"
                            aria-label={`Delete ${category.name}`}
                            onClick={() => void deleteCategory(category)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create and Edit use the same fields: name, Somali name, image. */}
      <Modal
        open={catOpen}
        title={
          namesLocked
            ? "Beddel sawirka"
            : editCatId
              ? "Edit category"
              : "Create new category"
        }
        onClose={() => setCatOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-[13px] font-semibold leading-relaxed text-slate-700">
            {namesLocked
              ? "Magaca waa guud. Kaliya sawirka ayaad beddeli kartaa."
              : editCatId
                ? "Update the category name, type names (Awr, Hal, …), and image."
                : "Enter the category name, type names (Awr, Hal, …), then add an image."}
          </p>
          {catError ? (
            <p className="text-[13px] font-semibold text-rose-700">{catError}</p>
          ) : null}
          {namesLocked ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800">
              {adminLivestockName(catForm.name, catForm.nameSomali, lang)}
            </p>
          ) : (
          <Field label="Category name *">
            <input
              autoFocus
              className={fieldCls}
              value={catForm.name}
              placeholder="Enter category name"
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
            />
          </Field>
          )}
          {namesLocked ? null : (
          <Field label="Somali name">
            <input
              className={fieldCls}
              value={catForm.nameSomali}
              placeholder="Enter Somali name"
              onChange={(e) => setCatForm({ ...catForm, nameSomali: e.target.value })}
            />
          </Field>
          )}
          {namesLocked ? null : (
            <div className="space-y-2">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Type name *
              </span>
              <p className="text-[12px] font-medium text-slate-500">
                Public card type name (Awr, Hal, Sac, …).
              </p>
              <div className="space-y-2">
                {newTypes.map((row, index) => (
                  <div
                    key={`new-type-${index}`}
                    className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5"
                  >
                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        className={fieldCls}
                        value={row.nameSomali}
                        placeholder="Type name (Somali) *"
                        aria-label={`Somali type name ${index + 1}`}
                        onChange={(e) =>
                          setNewTypes((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, nameSomali: e.target.value } : item
                            )
                          )
                        }
                      />
                      <input
                        className={fieldCls}
                        value={row.name}
                        placeholder="Type name (English)"
                        aria-label={`English type name ${index + 1}`}
                        onChange={(e) =>
                          setNewTypes((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, name: e.target.value } : item
                            )
                          )
                        }
                      />
                    </div>
                    {newTypes.length > 1 ? (
                      <button
                        type="button"
                        title="Remove type"
                        aria-label={`Remove type ${index + 1}`}
                        onClick={() =>
                          setNewTypes((prev) => prev.filter((_, i) => i !== index))
                        }
                        className="mt-0.5 inline-flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setNewTypes((prev) => [...prev, { nameSomali: "", name: "" }])
                }
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                Add type name
              </button>
            </div>
          )}
          {editCatId && typeEdits.length && !namesLocked ? (
            <div className="space-y-2">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Type names
              </span>
              <p className="text-[12px] font-medium text-slate-500">
                Change the public names shown on livestock cards (Awr, Hal, Sac, …).
              </p>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {typeEdits.map((type, index) => (
                  <div
                    key={type.id}
                    className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5"
                  >
                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      className={fieldCls}
                      value={type.nameSomali}
                      placeholder="Somali name"
                      aria-label={`Somali name for type ${index + 1}`}
                      onChange={(e) =>
                        setTypeEdits((prev) =>
                          prev.map((row) =>
                            row.id === type.id
                              ? { ...row, nameSomali: e.target.value }
                              : row
                          )
                        )
                      }
                    />
                    <input
                      className={fieldCls}
                      value={type.name}
                      placeholder="English name"
                      aria-label={`English name for type ${index + 1}`}
                      onChange={(e) =>
                        setTypeEdits((prev) =>
                          prev.map((row) =>
                            row.id === type.id
                              ? { ...row, name: e.target.value }
                              : row
                          )
                        )
                      }
                    />
                    </div>
                    <button
                      type="button"
                      title={`Delete ${adminLivestockName(type.name, type.nameSomali, lang)}`}
                      aria-label={`Delete ${adminLivestockName(type.name, type.nameSomali, lang)}`}
                      onClick={() =>
                        void deleteAnimalType({
                          id: type.id,
                          name: type.name,
                          nameSomali: type.nameSomali,
                        })
                      }
                      className="mt-0.5 inline-flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div>
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              {editCatId ? "Image" : "Image *"}
            </span>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => {
                setCatImage(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition",
                shownImage
                  ? "border-emerald-300 bg-emerald-50/40"
                  : "border-slate-200 bg-slate-50/60 hover:border-emerald-300 hover:bg-emerald-50/30"
              )}
            >
              {shownImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shownImage} alt="" className="h-20 w-20 rounded-xl object-cover ring-1 ring-slate-200" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200">
                  <ImagePlus className="h-6 w-6" strokeWidth={1.85} />
                </span>
              )}
              <span className="text-[13px] font-bold text-slate-800">Choose image</span>
              <span className="text-[11px] font-medium text-slate-400">
                PNG, JPEG, or WEBP — max 5 MB
              </span>
            </button>
          </div>
          <AdminSaveButton
            saving={catSaving}
            label={namesLocked ? "Save photo" : editCatId ? "Save changes" : "Create category"}
            onClick={() => void saveCategory()}
          />
        </div>
      </Modal>

      <Modal open={typeOpen} title="Add livestock type" onClose={() => setTypeOpen(false)}>
        <div className="space-y-4">
          <p className="text-[13px] font-semibold leading-relaxed text-slate-700">
            Nooca cusub waa in admin ansixiyo ka hor inta uusan dadweynaha u muuqan.
          </p>
          {typeError ? (
            <p className="text-[13px] font-semibold text-rose-700">{typeError}</p>
          ) : null}
          <Field label="Category">
            <select
              className={fieldCls}
              value={typeForm.categoryId}
              onChange={(e) => setTypeForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              {ordered.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryLabel(c, lang)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type name (Somali)">
            <input
              className={fieldCls}
              value={typeForm.nameSomali}
              onChange={(e) => setTypeForm((f) => ({ ...f, nameSomali: e.target.value }))}
              placeholder="Tusaale: Awr"
            />
          </Field>
          <Field label="Type name (English)">
            <input
              className={fieldCls}
              value={typeForm.name}
              onChange={(e) => setTypeForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Example: Male camel"
            />
          </Field>
          <AdminSaveButton
            saving={typeSaving}
            label="Send to admin"
            onClick={() => void saveProposedType()}
          />
        </div>
      </Modal>
    </div>
  );
}

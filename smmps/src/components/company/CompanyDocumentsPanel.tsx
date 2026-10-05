"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Upload, FileText, Trash2, Download } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { useConfirmDialog } from "@/components/super-admin/ConfirmDialog";
import { formatMmpsStamp } from "@/lib/mogadishu-time";
import { useLang } from "@/lib/language-context";

type Doc = {
  id: number;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: { id: number; fullName: string } | null;
};

export function CompanyDocumentsPanel({ companyId }: { companyId: number }) {
  const { t } = useLang();
  const { confirm, dialog } = useConfirmDialog();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/company-documents?companyId=${companyId}`);
      const data = await res.json();
      setDocs(data.documents || []);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onPick(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("companyId", String(companyId));
      const res = await fetch("/api/company-documents", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("Upload failed", "Soo gelinta way fashilantay"));
        return;
      }
      await load();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(id: number) {
    const ok = await confirm({
      title: t("Delete document?", "Tirtir dukumentiga?"),
      description: t(
        "Permanently delete this document. This cannot be undone.",
        "Si joogto ah u tirtir dukumentigan. Lama soo celin karo."
      ),
      confirmLabel: t("Delete document", "Tirtir dukumentiga"),
      tone: "danger",
    });
    if (!ok) return;
    await fetch(`/api/company-documents?id=${id}`, { method: "DELETE" });
    await load();
  }

  function kb(bytes: number) {
    return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-slate-900">{t("Company Documents", "Dukumentiyada shirkadda")}</h3>
          <p className="text-xs text-slate-500">{t("PDF, JPG, PNG, DOC/DOCX up to 10MB", "PDF, JPG, PNG, DOC/DOCX ilaa 10MB")}</p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0a5240] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            <Upload className="h-4 w-4" /> {uploading ? t("Uploading...", "Waa la soo gelinayaa...") : t("Upload", "Soo geli")}
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}

      <DataTable
        rows={docs}
        onRefresh={load}
        emptyText={loading ? t("Loading...", "Waa la soo dejinayaa...") : t("No documents uploaded.", "Dukumenti lama soo gelin.")}
        columns={[
          {
            key: "originalName",
            header: t("Document", "Dukumentiga"),
            render: (d) => (
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-slate-800">{d.originalName}</p>
                  <p className="text-xs text-slate-500">{kb(d.sizeBytes)}</p>
                </div>
              </div>
            ),
          },
          { key: "uploadedBy", header: t("Uploaded by", "Soo geliyey"), render: (d) => d.uploadedBy?.fullName || "—" },
          { key: "createdAt", header: t("Date", "Taariikhda"), render: (d) => formatMmpsStamp(d.createdAt) },
        ]}
        actions={(d) => (
          <div className="flex justify-end gap-2">
            <a
              href={`/uploads/companies/${d.fileName}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              title={t("Download / preview", "Soo dejiso / eeg")}
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={() => remove(d.id)}
              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      />
      {dialog}
    </div>
  );
}

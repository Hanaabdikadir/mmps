"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  FileText,
  Maximize2,
  Minimize2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompanyDoc } from "@/components/super-admin/approval-helpers";
import { formatDate } from "@/components/super-admin/approval-helpers";
import { authPortalHeaders } from "@/lib/auth-portal";

async function loadSecureBlobUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      credentials: "include",
      cache: "no-store",
      headers: {
        ...authPortalHeaders("super"),
      },
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export function ApprovalDocumentViewer({
  docs,
  startIndex = 0,
  open,
  onClose,
}: {
  docs: CompanyDoc[];
  startIndex?: number;
  open: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setIndex(startIndex);
      setZoom(100);
    }
  }, [open, startIndex]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(docs.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, docs.length, onClose]);

  const doc = open && docs.length > 0 ? docs[index]! : null;
  const previewSrc = doc?.previewUrl || "";

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;

    async function run() {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setLoadError(null);
      if (!previewSrc) {
        setLoading(false);
        return;
      }
      setLoading(true);
      // Secure registration files need an authenticated fetch (portal cookie).
      if (previewSrc.startsWith("/api/secure-files/")) {
        const url = await loadSecureBlobUrl(previewSrc);
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        if (!url) {
          setLoadError("Could not open this file. Sign in again as Super Admin, then retry.");
          setLoading(false);
          return;
        }
        created = url;
        setBlobUrl(url);
        setLoading(false);
        return;
      }
      setBlobUrl(previewSrc);
      setLoading(false);
    }

    void run();
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [previewSrc, index, open]);

  if (!open || !doc) return null;

  const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(doc.ext);
  const displayUrl = blobUrl;

  function downloadDoc() {
    if (!doc) return;
    if (displayUrl) {
      const a = document.createElement("a");
      a.href = displayUrl;
      a.download = doc.name;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.click();
      return;
    }
    if (doc.previewUrl) {
      void loadSecureBlobUrl(doc.previewUrl).then((url) => {
        if (!url) return;
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.name;
        a.click();
        URL.revokeObjectURL(url);
      });
      return;
    }
    const blob = new Blob(
      [
        `MMPS document placeholder\n\nFile: ${doc.name}\nType: ${doc.ext.toUpperCase()}\nUploaded: ${formatDate(doc.uploadedOn)}\nStatus: ${doc.status}\n`,
      ],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.name.replace(/\.\w+$/, ".txt");
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6">
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 text-white shadow-2xl",
          fullscreen ? "h-[100dvh] max-w-none rounded-none" : "h-[min(90dvh,860px)] max-w-5xl"
        )}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{doc.name}</p>
            <p className="text-xs text-white/55">
              {doc.ext.toUpperCase()} · {doc.sizeLabel} · Uploaded {formatDate(doc.uploadedOn)} ·{" "}
              {doc.status}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[3rem] text-center text-xs font-semibold text-white/70">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(200, z + 10))}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setFullscreen((v) => !v)}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10"
              title="Full screen"
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={downloadDoc}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-950/40 p-6">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex((i) => i - 1)}
            className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {loading ? (
            <p className="text-sm font-semibold text-white/70">Loading document…</p>
          ) : loadError ? (
            <p className="max-w-md text-center text-sm font-semibold text-rose-200">{loadError}</p>
          ) : isImage && displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt={doc.name}
              style={{ transform: `scale(${zoom / 100})` }}
              className="max-h-full max-w-full rounded-lg bg-white object-contain shadow-2xl transition-transform"
            />
          ) : doc.ext === "pdf" && displayUrl ? (
            <iframe
              title={doc.name}
              src={`${displayUrl}#toolbar=1&navpanes=0`}
              className="h-full min-h-[28rem] w-full max-w-4xl rounded-lg bg-white shadow-2xl"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center top" }}
            />
          ) : (
            <div
              style={{ transform: `scale(${zoom / 100})` }}
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-white p-8 text-center text-slate-800 shadow-2xl transition-transform"
            >
              <div
                className={cn(
                  "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl",
                  doc.ext === "pdf" ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-sky-600"
                )}
              >
                <FileText className="h-8 w-8" />
              </div>
              <p className="text-lg font-bold">{doc.name}</p>
              <p className="mt-2 text-sm text-slate-500">
                {doc.previewUrl
                  ? `Preview this ${doc.ext.toUpperCase()} file, then download if needed.`
                  : "This document was not uploaded with the registration."}
              </p>
              <div className="mt-5 flex justify-center gap-2">
                {doc.previewUrl && (
                  <button
                    type="button"
                    onClick={downloadDoc}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFullscreen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Expand className="h-4 w-4" />
                  Full screen
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={index >= docs.length - 1}
            onClick={() => setIndex((i) => i + 1)}
            className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-white/60">
          <span>
            Document {index + 1} of {docs.length}
          </span>
          <span>Use ← → keys to browse · Esc to close</span>
        </div>
      </div>
    </div>
  );
}

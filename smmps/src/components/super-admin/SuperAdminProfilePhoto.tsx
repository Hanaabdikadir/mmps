"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

export function SuperAdminProfilePhoto({
  initials,
  photoUrl,
  size = "lg",
}: {
  initials: string;
  photoUrl?: string | null;
  size?: "sm" | "lg";
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const shown = preview || photoUrl || "";
  const box =
    size === "lg"
      ? "h-16 w-16 rounded-2xl text-xl"
      : "h-8 w-8 rounded-md text-[11px]";

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy(true);
    setPreview(URL.createObjectURL(file));
    try {
      const payload = new FormData();
      payload.append("photo", file);
      const res = await fetch("/api/super-admin/account/photo", {
        method: "POST",
        body: payload,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Upload failed"
        );
      }
      if (typeof data.image === "string") setPreview(data.image);
      router.refresh();
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex items-center justify-center overflow-hidden bg-[#0a5240] font-black text-white ring-1 ring-emerald-900/15",
          box,
          busy && "opacity-70"
        )}
        title="Upload profile picture"
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className="h-full w-full object-cover" />
        ) : (
          initials || "SA"
        )}
        <span className="absolute inset-x-0 bottom-0 flex justify-center bg-black/45 py-0.5">
          <Camera className="h-3 w-3 text-white" strokeWidth={2.5} />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void onPick(file);
        }}
      />
      {error ? (
        <p className="absolute left-0 top-full z-10 mt-1 w-48 text-[11px] font-semibold text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

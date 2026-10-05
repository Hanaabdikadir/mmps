"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { PanelCard } from "@/components/super-admin/AdminPagePrimitives";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";
import { livestockMarketDisplayName } from "@/lib/livestock-registration-markets";

type BrokerDetail = {
  broker: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    code: string | null;
    location: string | null;
    description: string | null;
    profilePicture: string | null;
    status: string;
    approvalStatus: string;
    createdAt: string;
    markets: { id: number; name: string }[];
    users: {
      id: number;
      profilePicture: string | null;
    }[];
  };
};

function joinNames(rows: { name: string }[], empty: string) {
  if (!rows.length) return empty;
  return rows.map((row) => row.name).join(", ");
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1 py-3.5 sm:grid-cols-[11rem_1fr] sm:items-baseline">
      <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </dt>
      <dd className="text-[15px] font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

export function LivestockBrokerProfilePanel({
  brokerId,
}: {
  brokerId: number;
}) {
  const { t, lang } = useLang();
  const [data, setData] = useState<BrokerDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/livestock/brokers/${brokerId}?view=profile`,
          { cache: "no-store", credentials: "same-origin" }
        );
        const raw = await res.text();
        let json: { error?: string; broker?: BrokerDetail["broker"] } = {};
        try {
          json = raw ? JSON.parse(raw) : {};
        } catch {
          throw new Error(
            res.ok
              ? "Could not load broker"
              : `Could not load broker (${res.status})`
          );
        }
        if (!res.ok) throw new Error(json.error || "Could not load broker");
        if (!json.broker) throw new Error("Broker not found");
        if (!cancelled) setData({ broker: json.broker });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load broker");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brokerId]);

  if (loading) {
    return (
      <div className="grid min-h-[30vh] place-items-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
        {error || "Broker not found"}
      </div>
    );
  }

  const broker = data.broker;
  const storedPhoto =
    broker.users?.find((u) => u.profilePicture?.trim())?.profilePicture?.trim() ||
    broker.profilePicture?.trim() ||
    "";
  const photo = photoPreview || storedPhoto;
  const markets = joinNames(
    broker.markets.map((m) => ({
      name: livestockMarketDisplayName(m.name, lang).trim() || m.name,
    })),
    t("None assigned", "Lama qoondeyn")
  );

  async function onPickPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError("");
    setPhotoBusy(true);
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    try {
      const payload = new FormData();
      payload.append("photo", file);
      const res = await fetch(`/api/livestock/brokers/${brokerId}/photo`, {
        method: "POST",
        body: payload,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : "Upload failed"
        );
      }
      const image = typeof json.image === "string" ? json.image : localUrl;
      setPhotoPreview(image);
      setData((prev) => {
        if (!prev) return prev;
        const users = prev.broker.users.length
          ? prev.broker.users.map((u) => ({ ...u, profilePicture: image }))
          : [{ id: 0, profilePicture: image }];
        return {
          ...prev,
          broker: {
            ...prev.broker,
            users,
          },
        };
      });
    } catch (err) {
      setPhotoPreview(null);
      setPhotoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PanelCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="relative shrink-0">
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => photoInputRef.current?.click()}
                title={t("Upload profile picture", "Soo geli sawirka profile-ka")}
                className={cn(
                  "relative h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm",
                  photoBusy && "opacity-70"
                )}
              >
                {photo ? (
                  <Image
                    src={photo}
                    alt={broker.name}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[13px] font-black text-slate-400">
                    {broker.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase() ?? "")
                      .join("") || "B"}
                  </div>
                )}
                <span className="absolute inset-x-0 bottom-0 flex justify-center bg-black/45 py-0.5">
                  <Camera className="h-3 w-3 text-white" strokeWidth={2.5} />
                </span>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  void onPickPhoto(file);
                }}
              />
              {photoError ? (
                <p className="absolute left-0 top-full z-10 mt-1 w-48 text-[11px] font-semibold text-red-600">
                  {photoError}
                </p>
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                {t("Broker profile", "Profileka dulaalka")}
              </p>
              <h1 className="mt-1 truncate text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                {broker.name}
              </h1>
            </div>
          </div>
          <StatusBadge status={broker.status} />
        </div>

        <dl className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
          <ProfileField label={t("Email", "Iimayl")} value={broker.email || "—"} />
          <ProfileField label={t("Phone", "Telefoon")} value={broker.phone || "—"} />
          <ProfileField label={t("Assigned market", "Suuqa loo qoondeeyey")} value={markets} />
        </dl>
      </PanelCard>
    </div>
  );
}

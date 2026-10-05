"use client";

import { useState } from "react";
import { useLang } from "@/lib/language-context";

export function BrokerProfileForm({
  fullName,
  email,
  broker,
}: {
  fullName: string;
  email: string;
  phone?: string;
  broker: {
    name: string;
    email: string | null;
    phone: string | null;
    location: string | null;
    livestockFocus: string | null;
    description: string | null;
  } | null;
}) {
  const { t } = useLang();
  const [note, setNote] = useState("");
  const [fileName, setFileName] = useState("");

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-600">
          {t("Account", "Akoonka")}
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t("Display name", "Magaca la muujiyo")}
            </dt>
            <dd className="mt-1 font-semibold text-slate-900">{fullName}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t("Email", "Iimaylka")}
            </dt>
            <dd className="mt-1 font-semibold text-slate-900">{email}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-600">
          {t("Organization", "Ururka")}
        </h2>
        {broker ? (
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t("Broker name", "Magaca dulaalka")}
              </dt>
              <dd className="mt-1 font-semibold text-slate-900">{broker.name}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t("Contact", "Xiriirka")}
              </dt>
              <dd className="mt-1 text-slate-700">
                {[broker.email, broker.phone].filter(Boolean).join(" · ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t("Location", "Goobta")}
              </dt>
              <dd className="mt-1 text-slate-700">{broker.location || "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t("Livestock focus", "Qaybta xoolaha")}
              </dt>
              <dd className="mt-1 text-slate-700">{broker.livestockFocus || "—"}</dd>
            </div>
            {broker.description ? (
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {t("Description", "Faahfaahin")}
                </dt>
                <dd className="mt-1 text-slate-700">{broker.description}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            {t("No broker organization is linked to this account yet.", "Urur dulaal ah weli kuma xirna akoonkan.")}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-600">
          {t("Profile picture", "Sawirka profile-ka")}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {t(
            "Select an image now. Upload will be enabled when the media endpoint is available.",
            "Dooro sawir hadda. Soo gelintu way furmi doontaa marka adeegga sawirka diyaar noqdo."
          )}
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t("Image file", "Faylka sawirka")}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setFileName(f?.name || "");
                setNote(
                  f
                    ? t(
                        `Selected “${f.name}” (${Math.round((f.size || 0) / 1024)} KB).`,
                        `Waa la doortay “${f.name}” (${Math.round((f.size || 0) / 1024)} KB).`
                      )
                    : ""
                );
              }}
              className="block w-full max-w-sm text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#0b3d91] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
          </label>
          <button
            type="button"
            disabled={!fileName}
            onClick={() =>
              setNote(
                fileName
                  ? t(`Queued locally: ${fileName}.`, `Si ku meel gaar ah ayaa loo diiwaangeliyay: ${fileName}.`)
                  : t("Choose a file first.", "Marka hore dooro fayl.")
              )
            }
            className="rounded-xl bg-[#0b3d91] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("Prepare upload", "Diyaari soo gelinta")}
          </button>
        </div>
        {note ? (
          <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-sm text-[#0b3d91]">
            {note}
          </p>
        ) : null}
      </section>
    </div>
  );
}

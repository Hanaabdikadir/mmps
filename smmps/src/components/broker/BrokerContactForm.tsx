"use client";

import { useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";

export function BrokerContactForm({
  initialPhone,
  initialLocation,
  initialDescription,
  email,
  title,
}: {
  initialPhone: string;
  initialLocation: string;
  initialDescription: string;
  email: string;
  title: string;
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [location, setLocation] = useState(initialLocation);
  const [description, setDescription] = useState(initialDescription);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  async function save() {
    setSaving(true);
    setSaved(false);
    setMessage(null);
    try {
      const res = await fetch("/api/broker/page-hero", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          phone,
          location,
          description,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({
          ok: false,
          text: typeof data.error === "string" ? data.error : "Could not save",
        });
        return;
      }
      setSaved(true);
      setMessage({ ok: true, text: "Saved successfully" });
    } catch {
      setMessage({ ok: false, text: "Could not save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-white px-5 py-5 sm:px-6">
        <h3 className="text-lg font-bold text-slate-900">Contact Info</h3>
        <p className="mt-0.5 text-sm text-slate-500">
          Same fields as the Contact Info card on your public livestock page.
        </p>
      </div>
      <div className="space-y-4 px-5 py-6 sm:px-6">
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <Mail className="h-3 w-3" /> Email
          </span>
          <input
            value={email}
            readOnly
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600"
          />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <Phone className="h-3 w-3" /> Phone
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
          />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <MapPin className="h-3 w-3" /> Address
          </span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
          />
        </label>
        <label className="block">
          <span className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
          />
        </label>
        {message ? (
          <p
            className={
              message.ok
                ? "text-sm font-semibold text-emerald-700"
                : "text-sm font-semibold text-rose-600"
            }
          >
            {message.text}
          </p>
        ) : null}
        <AdminSaveButton
          label="Save Contact Info"
          saving={saving}
          saved={saved}
          fullWidth
          onClick={() => void save()}
        />
      </div>
    </div>
  );
}

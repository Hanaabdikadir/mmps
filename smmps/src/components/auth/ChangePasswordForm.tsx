"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";
import { AuthPasswordField } from "@/components/auth/auth-ui";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";
import { useLang } from "@/lib/language-context";

const fieldInputClass =
  "h-10 rounded-xl border-slate-200 bg-white text-[14px] font-semibold text-slate-800 shadow-sm placeholder:font-medium placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20";

export function ChangePasswordForm() {
  const router = useRouter();
  const { t } = useLang();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    setSaved(false);

    if (newPassword.length < 8) {
      setError(t("New password must be at least 8 characters", "Furaha sirta cusub waa inuu ahaadaa ugu yaraan 8 xaraf"));
      return;
    }
    if (newPassword !== confirm) {
      setError(t("New passwords do not match", "Furaha sirta cusub isma mid aha"));
      return;
    }
    if (newPassword === currentPassword) {
      setError(t("New password must be different from your current password", "Furaha sirta cusub waa inuu ka duwanaadaa kan hadda"));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword: confirm,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : t("Failed to change password", "Furaha sirta lama beddelin")
        );
        return;
      }
      setMessage(t("Password updated successfully.", "Furaha sirta waa la cusboonaysiiyey."));
      setSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      router.refresh();
      window.setTimeout(() => setSaved(false), 2200);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex w-full max-w-none flex-col justify-center overflow-hidden">
      <div className="mb-3 text-center">
        <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
          {t("Change Password", "Beddel erayga sirta")}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {t("Update your account password securely", "Si ammaan ah u cusboonaysii furaha sirta akoonkaaga")}
        </p>
      </div>

      <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white ">
        <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50/70 via-white to-white px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0a5240] text-white shadow-md">
              <KeyRound className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-black text-slate-900">{t("Security settings", "Dejinta amniga")}</p>
              <p className="text-xs font-medium text-slate-500">
                {t("Use at least 8 characters. Changes save to the live database.", "Isticmaal ugu yaraan 8 xaraf. Beddelka wuxuu ku kaydsanayaa database-ka.")}
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="grid gap-3 px-4 py-4 sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5"
        >
          {message || error ? (
            <div className="sm:col-span-3">
              {message ? (
                <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.25} />
                  {message}
                </p>
              ) : null}
              {error ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}

          <AuthPasswordField
            id="change-current-password"
            label={t("Current password", "Furaha sirta hadda")}
            icon={Lock}
            iconClassName="text-emerald-700"
            toggleClassName="text-emerald-700 hover:text-emerald-900"
            inputClassName={fieldInputClass}
            value={currentPassword}
            onChange={setCurrentPassword}
            required
            autoComplete="current-password"
            placeholder={t("Enter current password", "Geli furaha sirta hadda")}
          />
          <AuthPasswordField
            id="change-new-password"
            label={t("New password", "Furaha sirta cusub")}
            icon={Lock}
            iconClassName="text-emerald-700"
            toggleClassName="text-emerald-700 hover:text-emerald-900"
            inputClassName={fieldInputClass}
            value={newPassword}
            onChange={setNewPassword}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder={t("Enter new password", "Geli furaha sirta cusub")}
          />
          <AuthPasswordField
            id="change-confirm-password"
            label={t("Confirm new password", "Xaqiiji furaha sirta cusub")}
            icon={Lock}
            iconClassName="text-emerald-700"
            toggleClassName="text-emerald-700 hover:text-emerald-900"
            inputClassName={fieldInputClass}
            value={confirm}
            onChange={setConfirm}
            required
            minLength={8}
            autoComplete="new-password"
            disablePaste
            placeholder={t("Re-type new password", "Ku celi furaha sirta cusub")}
          />

          <div className="sm:col-span-3 sm:flex sm:justify-center">
            <AdminSaveButton
              type="submit"
              label={t("Update password", "Cusboonaysii furaha sirta")}
              saving={saving}
              saved={saved}
              savingLabel={t("Updating…", "Waa la cusboonaysiinayaa…")}
              savedLabel={t("Password updated", "Furaha sirta waa la cusboonaysiiyey")}
              fullWidth
              className="sm:!w-full sm:!max-w-none"
            />
          </div>
        </form>
      </div>
    </div>
  );
}

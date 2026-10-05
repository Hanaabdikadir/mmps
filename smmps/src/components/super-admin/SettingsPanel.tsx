"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserRound,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";

type AccountInfo = {
  id: number;
  fullName: string;
  email: string;
  password: string;
  role: string;
};

type SystemInfo = {
  systemName: string;
  supportEmail: string;
};

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 text-[13px] font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

function Field({
  label,
  children,
  className,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <div className="mt-2">{children}</div>
      {hint && (
        <p className="mt-1.5 text-[11px] font-medium text-slate-400">{hint}</p>
      )}
    </label>
  );
}

export function SettingsPanel({
  initialAccount,
  initialSystem,
}: {
  initialAccount: AccountInfo;
  initialSystem: SystemInfo;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSystem);
  const [account, setAccount] = useState(initialAccount);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mailUser, setMailUser] = useState("");
  const [mailPass, setMailPass] = useState("");
  const [mailReady, setMailReady] = useState(false);
  const [mailSaved, setMailSaved] = useState(false);

  useEffect(() => {
    fetch("/api/super-admin/mail")
      .then((res) => res.json())
      .then((data) => setMailReady(Boolean(data.configured)))
      .catch(() => setMailReady(false));
  }, []);

  useEffect(() => {
    setAccount(initialAccount);
  }, [initialAccount]);

  useEffect(() => {
    setSettings(initialSystem);
  }, [initialSystem]);

  async function handleSave() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      if (account.password.trim()) {
        if (account.password.trim().length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        if (account.password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
      }
      const res = await fetch("/api/super-admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: account.fullName.trim(),
          email: account.email.trim().toLowerCase(),
          password: account.password,
          confirmPassword,
          systemName: settings.systemName.trim(),
          supportEmail: settings.supportEmail.trim().toLowerCase(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Save failed"
        );
      }
      if (data.account) {
        setAccount({
          id: data.account.id,
          fullName: data.account.fullName,
          email: data.account.email,
          password: "",
          role: data.account.role,
        });
        setConfirmPassword("");
      }
      if (data.system) {
        setSettings({
          systemName: data.system.systemName,
          supportEmail: data.system.supportEmail,
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white ">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <UserRound className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Super Admin Account
            </h3>
            <p className="text-xs font-medium text-slate-400">
              Login credentials and system contact details
            </p>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <Field label="Full Name" className="sm:col-span-2">
            <input
              className={inputClass}
              value={account.fullName}
              onChange={(e) => {
                setAccount((a) => ({ ...a, fullName: e.target.value }));
                setSaved(false);
              }}
            />
          </Field>

          <Field
            label="Login Email"
            hint="Email used on the Super Admin login page."
          >
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
              <input
                className={cn(inputClass, "pl-10")}
                type="email"
                autoComplete="username"
                value={account.email}
                onChange={(e) => {
                  setAccount((a) => ({ ...a, email: e.target.value }));
                  setSaved(false);
                }}
              />
            </div>
          </Field>

          <Field
            label="New password"
            hint="Leave blank to keep the current password. Minimum 6 characters when changing."
          >
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
              <input
                className={cn(inputClass, "pl-10 pr-11")}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={account.password}
                onChange={(e) => {
                  setAccount((a) => ({ ...a, password: e.target.value }));
                  setSaved(false);
                }}
              />
              <button
                type="button"
                title={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </Field>

          <Field
            label="Confirm new password"
            hint="Re-type the new password when changing it."
          >
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
              <input
                className={cn(inputClass, "pl-10 pr-11")}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onPaste={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setSaved(false);
                }}
              />
              <button
                type="button"
                title={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </Field>

          <Field label="System Name" className="sm:col-span-2">
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
              <input
                className={cn(inputClass, "pl-10")}
                value={settings.systemName}
                onChange={(e) => {
                  setSettings((s) => ({ ...s, systemName: e.target.value }));
                  setSaved(false);
                }}
              />
            </div>
          </Field>

          <Field label="Support Email" className="sm:col-span-2 sm:max-w-md">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
              <input
                className={cn(inputClass, "pl-10")}
                type="email"
                value={settings.supportEmail}
                onChange={(e) => {
                  setSettings((s) => ({ ...s, supportEmail: e.target.value }));
                  setSaved(false);
                }}
              />
            </div>
          </Field>

          <div className="sm:col-span-2 flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-[1.25rem]">
              {error ? (
                <p className="text-sm font-semibold text-rose-600">{error}</p>
              ) : saved ? (
                <p className="inline-flex items-center gap-1.5 text-sm font-black text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Saved successfully
                </p>
              ) : null}
            </div>
            <AdminSaveButton
              label="Save Changes"
              saving={busy}
              saved={saved}
              onClick={() => void handleSave()}
              className="!min-w-[11rem]"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <Mail className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Password reset email
            </h3>
            <p className="text-xs font-medium text-slate-400">
              {mailReady
                ? "Forgot password emails can be sent to Gmail."
                : "Save a Gmail App Password once. Users only type their Gmail on the reset page."}
            </p>
          </div>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <Field label="Sending Gmail" hint="The mailbox MMPS sends from.">
            <input
              className={inputClass}
              type="email"
              autoComplete="off"
              value={mailUser}
              onChange={(e) => setMailUser(e.target.value)}
              placeholder="mmps@gmail.com"
            />
          </Field>
          <Field
            label="Gmail App Password"
            hint="Google Account → Security → App passwords. Not your normal Gmail password."
          >
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              value={mailPass}
              onChange={(e) => setMailPass(e.target.value)}
              placeholder="16 characters"
            />
          </Field>
          <div className="sm:col-span-2 flex items-center justify-between gap-3">
            {mailSaved ? (
              <p className="inline-flex items-center gap-1.5 text-sm font-black text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Mail settings saved
              </p>
            ) : (
              <span />
            )}
            <AdminSaveButton
              label="Save mail settings"
              saving={false}
              saved={mailSaved}
              onClick={async () => {
                setError("");
                setMailSaved(false);
                const res = await fetch("/api/super-admin/mail", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ user: mailUser, pass: mailPass }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  setError(
                    typeof data.error === "string"
                      ? data.error
                      : "Could not save mail settings"
                  );
                  return;
                }
                setMailReady(true);
                setMailSaved(true);
                setMailPass("");
              }}
              className="!min-w-[11rem]"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

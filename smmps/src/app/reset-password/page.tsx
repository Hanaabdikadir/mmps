"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useLang } from "@/lib/language-context";

function ResetPasswordForm() {
  const { t } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!token) {
        setChecking(false);
        setValid(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/auth/reset-password?token=${encodeURIComponent(token)}`
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setValid(Boolean(data.valid));
        if (typeof data.email === "string") setEmail(data.email);
      } catch {
        if (!cancelled) setValid(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken: token, code, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.resetToken !== "string") {
        setError(
          typeof data.error === "string"
            ? data.error
            : t("That code is incorrect.", "Code-ka waa khaldan yahay.")
        );
        return;
      }
      setAuthToken(data.resetToken);
    } catch {
      setError(t("That code is incorrect.", "Code-ka waa khaldan yahay."));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(
        t(
          "Password must be at least 8 characters",
          "Furaha sirta waa inuu ahaadaa ugu yaraan 8 xaraf"
        )
      );
      return;
    }
    if (password !== confirm) {
      setError(
        t("Passwords do not match", "Furaha sirta isma waafaqaan")
      );
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: authToken, password, confirmPassword: confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : t(
                "Could not reset password",
                "Lama cusboonaysiin karin furaha sirta"
              )
        );
        return;
      }
      setDone(true);
      window.setTimeout(() => {
        router.replace(
          email ? `/login?email=${encodeURIComponent(email)}` : "/login"
        );
      }, 1400);
    } catch {
      setError(
        t(
          "Could not reset password",
          "Lama cusboonaysiin karin furaha sirta"
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[420px] px-6 py-10 sm:py-14">
      {checking ? (
        <div className="grid place-items-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e85d4c] border-t-transparent" />
        </div>
      ) : done ? (
        <div className="space-y-3">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900">
            {t("Password updated", "Furaha sirta waa la cusboonaysiiyay")}
          </h1>
          <p className="text-[15px] text-slate-600">
            {t("Redirecting to Sign In…", "Waxaa laguu wareejinayaa Soo gal…")}
          </p>
        </div>
      ) : !valid ? (
        <div className="space-y-5">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900">
            {t("Link expired", "Xiriirku wuu dhacay")}
          </h1>
          <p className="text-[15px] leading-relaxed text-slate-700">
            {t(
              "This reset link is invalid or expired. Request a new one.",
              "Xiriirkan waa khaldan yahay ama wuu dhacay. Codso mid cusub."
            )}
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex h-12 w-full items-center justify-center rounded-md bg-[#e85d4c] text-[15px] font-semibold text-white transition hover:bg-[#d94f3f]"
          >
            {t("Forgot password?", "Ma illowday furaha sirta?")}
          </Link>
        </div>
      ) : !authToken ? (
        <form onSubmit={submitCode} className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900">
              {t("Enter confirmation code", "Geli code-ka xaqiijinta")}
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-700">
              {t(
                "Type the 6-digit code from your Gmail, then set a new password.",
                "Geli code-ka 6 tiro ah ee Gmail-kaaga ku yimid, kadib samee furaha sirta oo cusub."
              )}
            </p>
            {email ? (
              <p className="text-[13px] font-medium text-slate-500">{email}</p>
            ) : null}
          </div>
          {error ? (
            <p className="text-[13px] font-medium text-rose-600">{error}</p>
          ) : null}
          <label className="block">
            <span className="text-[15px] font-medium text-slate-900">
              {t("Confirmation code", "Code-ka xaqiijinta")}
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="mt-3 w-full border-0 border-b border-slate-300 bg-transparent py-2.5 text-center text-[22px] font-semibold tracking-[0.4em] text-slate-900 outline-none transition focus:border-slate-900"
              placeholder="______"
            />
          </label>
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="flex h-12 w-full items-center justify-center rounded-md bg-[#e85d4c] text-[15px] font-semibold text-white transition hover:bg-[#d94f3f] disabled:opacity-60"
          >
            {loading
              ? t("Checking…", "Waa la hubinayaa…")
              : t("Verify code", "Xaqiiji code-ka")}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900">
              {t("New Password", "Furaha sirta oo cusub")}
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-700">
              {t(
                "Choose a new password for your account, then sign in.",
                "Dooro furaha sirta oo cusub, ka dibna soo gal."
              )}
            </p>
            {email ? (
              <p className="text-[13px] font-medium text-slate-500">{email}</p>
            ) : null}
          </div>

          {error ? (
            <p className="text-[13px] font-medium text-rose-600">{error}</p>
          ) : null}

          <label className="block">
            <span className="text-[15px] font-medium text-slate-900">
              {t("New password", "Furaha sirta oo cusub")}
            </span>
            <div className="relative mt-3">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-0 border-b border-slate-300 bg-transparent py-2.5 pr-10 text-[15px] text-slate-900 outline-none transition focus:border-slate-900"
                placeholder={t("Enter your password", "Geli furaha sirta")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label={showPassword ? "Hide" : "Show"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="text-[15px] font-medium text-slate-900">
              {t("Confirm password", "Xaqiiji furaha sirta")}
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirm}
              onPaste={(e) => e.preventDefault()}
              onDrop={(e) => e.preventDefault()}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-3 w-full border-0 border-b border-slate-300 bg-transparent py-2.5 text-[15px] text-slate-900 outline-none transition focus:border-slate-900"
              placeholder={t("Repeat new password", "Ku celi furaha sirta")}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center rounded-md bg-[#e85d4c] text-[15px] font-semibold text-white transition hover:bg-[#d94f3f] disabled:opacity-60"
          >
            {loading
              ? t("Saving…", "Waa la kaydinayaa…")
              : t("Save new password", "Kaydi furaha sirta")}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-[70vh] bg-white">
      <Suspense
        fallback={
          <div className="grid min-h-[50vh] place-items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e85d4c] border-t-transparent" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}

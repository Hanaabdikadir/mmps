"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useLang } from "@/lib/language-context";

type Step = "email" | "code" | "password" | "done";

function ForgotPasswordForm() {
  const { t } = useLang();
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendResetEmail() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : t(
                "Something went wrong. Try again.",
                "Wax baa khaldamay. Isku day mar kale."
              )
        );
        return false;
      }
      setCode("");
      setToken("");
      setStep("code");
      return true;
    } catch {
      setError(
        t(
          "Something went wrong. Try again.",
          "Wax baa khaldamay. Isku day mar kale."
        )
      );
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    await sendResetEmail();
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
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
      setToken(data.resetToken);
      setStep("password");
    } catch {
      setError(
        t("That code is incorrect.", "Code-ka waa khaldan yahay.")
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitPassword(e: React.FormEvent) {
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
      setError(t("Passwords do not match", "Furaha sirta isma waafaqaan"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirmPassword: confirm,
        }),
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
      setStep("done");
      window.setTimeout(() => {
        router.replace(
          email
            ? `/login?email=${encodeURIComponent(email.trim().toLowerCase())}`
            : "/login"
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
      {step === "done" ? (
        <div className="space-y-3">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900">
            {t("Password updated", "Furaha sirta waa la cusboonaysiiyay")}
          </h1>
          <p className="text-[15px] text-slate-600">
            {t("Redirecting to Sign In…", "Waxaa laguu wareejinayaa Soo gal…")}
          </p>
        </div>
      ) : step === "password" ? (
        <form onSubmit={submitPassword} className="space-y-8">
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
            <p className="text-[13px] font-medium text-slate-500">{email}</p>
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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-0 border-b border-slate-300 bg-transparent py-2.5 pr-10 text-[15px] text-slate-900 outline-none transition focus:border-slate-900"
                placeholder={t("Enter new password", "Geli furaha sirta oo cusub")}
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
              minLength={8}
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
      ) : step === "code" ? (
        <form onSubmit={submitCode} className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900">
              {t("Check your Gmail", "Eeg Gmail-kaaga")}
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-700">
              {t(
                "We sent a reset code to your Gmail. If it is not in Inbox, open Spam and All Mail. Search for MMPS or FormSubmit.",
                "Code-ka waxaan u dirnay Gmail-kaaga. Haddii Inbox-ka aanu ka muuqan, fur Spam iyo All Mail. Raadi MMPS ama FormSubmit."
              )}
            </p>
            <p className="text-[13px] leading-relaxed text-slate-500">
              {t(
                "The first message may ask you to confirm the email. Click that link, then tap Send confirmation again. The MMPS code can also be in Spam.",
                "Fariinta ugu horreysa waxay ku weydiin kartaa xaqiijin. Taabo link-ka, kadib mar kale Dir xaqiijinta. Code-ka MMPS Spam-ka ayuu ku jiri karaa."
              )}
            </p>
            <p className="text-[13px] font-medium text-slate-500">{email}</p>
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
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
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

          <button
            type="button"
            disabled={loading}
            onClick={() => void sendResetEmail()}
            className="w-full text-center text-[14px] font-semibold text-slate-600 hover:underline"
          >
            {t("Resend email", "Dib u dir iimaylka")}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setToken("");
              setError("");
            }}
            className="w-full text-center text-[14px] font-semibold text-slate-600 hover:underline"
          >
            {t("Use a different email", "Isticmaal email kale")}
          </button>
        </form>
      ) : (
        <form onSubmit={submitEmail} className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900">
              {t("Reset Password", "Dib u deji furaha sirta")}
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-700">
              {t(
                "If Gmail shows “Activate FormSubmit”, open that email and tap Activate. That message has no 6-digit code. After Activate, a new email titled MMPS code will arrive with the 6 numbers.",
                "Haddii Gmail-ka ku yimaado “Activate FormSubmit”, fur fariinta oo taabo Activate. Fariintaas kuma jiro code 6 tiro ah. Kadib Activate, fariin cusub “MMPS code” ayaa ku soo dhici doonta, halkaas ayuu ku jiraa 6-da tiro."
              )}
            </p>
          </div>

          {error ? (
            <p className="text-[13px] font-medium text-rose-600">{error}</p>
          ) : null}

          <label className="block">
            <span className="text-[15px] font-medium text-slate-900">
              {t("Type your Gmail", "Qor Gmail-kaaga")}
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-3 w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
              placeholder={t("Write your Gmail here…", "Halkan ku qor Gmail-kaaga…")}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center rounded-md bg-[#e85d4c] text-[15px] font-semibold text-white transition hover:bg-[#d94f3f] disabled:opacity-60"
          >
            {loading
              ? t("Sending…", "Waa la dirayaa…")
              : t("Send confirmation", "Dir xaqiijinta")}
          </button>

          <Link
            href="/login"
            className="block text-center text-[14px] font-semibold text-slate-800 underline-offset-2 hover:underline"
          >
            {t("Back to Sign In", "Ku noqo Soo gal")}
          </Link>
        </form>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-[70vh] bg-white">
      <ForgotPasswordForm />
    </main>
  );
}

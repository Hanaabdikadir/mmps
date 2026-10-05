
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  UserPlus,
} from "lucide-react";
import { LoginMarketLayout, loginInputClass } from "@/components/auth/auth-market-ui";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";
import { StableBilingual } from "@/components/ui/StableBilingual";
import { isAuthPortal, writeTabAuthPortal } from "@/lib/auth-portal";
import { ensureTabSlot, markTabSignedIn } from "@/lib/auth-tab";
import { isValidRegisterEmail } from "@/lib/email";

/**
 * UNIFIED SINGLE SIGN-IN PAGE
 * 
 * Security: NO portal/role picker visible to user
 * - Users enter email + password
 * - System validates credentials and determines role
 * - Redirects to appropriate dashboard based on actual role
 * - Prevents role enumeration and phishing attacks
 */
function LoginForm() {
  const { t, lang } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(
    () => searchParams.get("email")?.trim() || ""
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(() =>
    searchParams.get("reason") === "idle"
      ? t("Signed out after 10 minutes of inactivity. Please sign in again.", "Waxaad ka baxday kadib 10 daqiiqo aan waxtar lahayn. Fadlan mar kale gal.")
      : ""
  );
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyHeight = body.style.height;
    const prevHtmlHeight = html.style.height;
    const prevOverscroll = body.style.overscrollBehavior;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.height = "100dvh";
    body.style.height = "100dvh";
    body.style.overscrollBehavior = "none";
    router.prefetch("/super-admin");
    router.prefetch("/admin");
    router.prefetch("/dashboard");

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.height = prevBodyHeight;
      html.style.height = prevHtmlHeight;
      body.style.overscrollBehavior = prevOverscroll;
    };
  }, [router]);

  function showAuthError(message: string) {
    setError(message);
    setShake(true);
    window.setTimeout(() => setShake(false), 450);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!isValidRegisterEmail(email)) {
      setLoading(false);
      showAuthError(
        t(
          "Enter a valid email like name@gmail.com. Do not skip @.",
          "Geli iimayl sax ah sida name@gmail.com. @ lama dhaafi karo."
        )
      );
      return;
    }

    try {
      const tabSlot = ensureTabSlot();
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
          tabSlot,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
        portal?: string;
      };
      if (!res.ok || data.error) {
        setLoading(false);
        showAuthError(
          data.error ||
            t(
              "Sign-in failed. Please try again.",
              "Galitaanku ma guulaysan. Fadlan isku day mar kale."
            )
        );
        return;
      }
      if (isAuthPortal(data.portal)) {
        writeTabAuthPortal(data.portal);
      }
      markTabSignedIn(tabSlot);
      const next = searchParams.get("next")?.trim() || "";
      const safeNext =
        next.startsWith("/") && !next.startsWith("//") ? next : "";
      window.location.assign(safeNext || data.redirectTo || "/dashboard");
    } catch {
      setLoading(false);
      showAuthError(
        t(
          "Sign-in failed. Please try again.",
          "Galitaanku ma guulaysan. Fadlan isku day mar kale."
        )
      );
    }
  }

  const submitLabel = "Sign In";
  const hasError = Boolean(error);

  return (
    <LoginMarketLayout
      portal="unified"
      title="MMPS Sign In"
      subtitle={
        <StableBilingual
          en="Mogadishu Market Price System"
          so="Nidaamka Qiimaha Suuqa Muqdisho"
          lang={lang}
          align="center"
        />
      }
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-col",
          shake && "animate-[login-shake_0.4s_ease-in-out]"
        )}
      >
        {/* NO portal picker - unified login only */}

        {/* Same slot as subtitle — error replaces it, card height stays original */}
        <div className="mt-1 flex min-h-[1.25rem] items-center justify-center">
          {hasError ? (
            <div
              role="alert"
              aria-live="polite"
              className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5"
            >
              <AlertCircle
                className="h-3 w-3 shrink-0 text-rose-600"
                strokeWidth={2.5}
              />
              <p className="truncate text-[12px] font-semibold leading-none text-rose-700">
                {error}
              </p>
            </div>
          ) : (
            <StableBilingual
              en="Enter your credentials for market access."
              so="Geli xogtaada gelitaanka si aad suuqa u gasho"
              lang={lang}
              align="center"
              multiline
              className="text-center text-[13px] leading-snug text-gray-500"
            />
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-2 flex flex-col gap-2.5"
          suppressHydrationWarning
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-xs font-semibold text-gray-700">
              <StableBilingual en="Email address" so="Cinwaanka Emailka" lang={lang} />
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500"
                strokeWidth={2.2}
              />
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                spellCheck={false}
                placeholder={t("Enter your email", "Geli emailkaaga")}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                className={cn(loginInputClass, "py-2")}
                suppressHydrationWarning
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password" className="text-xs font-semibold text-gray-700">
              <StableBilingual en="Password" so="Furaha sirta" lang={lang} />
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500"
                strokeWidth={2.2}
              />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder={t("Enter your password", "Geli furaha sirta")}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                className={cn(loginInputClass, "py-2 pr-10")}
                suppressHydrationWarning
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-600 transition hover:text-teal-800"
                aria-label={showPassword ? t("Hide password", "Qari furaha sirta") : t("Show password", "Tus furaha sirta")}
                suppressHydrationWarning
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" strokeWidth={2.2} />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={2.2} />
                )}
              </button>
            </div>
            {/* Modern placement: under password field, right-aligned */}
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
              >
                {lang === "so"
                  ? "Ma illowday furaha sirta?"
                  : "Forgot password?"}
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "mt-1.5 flex h-10 w-full items-center justify-center gap-2.5 rounded-[10px] text-[15px] font-bold tracking-tight text-white shadow-md transition disabled:opacity-60",
              "bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 shadow-emerald-900/12 hover:from-emerald-600 hover:to-teal-600"
            )}
            suppressHydrationWarning
          >
            {loading ? (
              <StableBilingual en="Signing in…" so="Soo gal…" lang={lang} />
            ) : (
              <>
                <User
                  className="h-[1.125rem] w-[1.125rem] shrink-0 text-amber-200"
                  strokeWidth={2.5}
                />
                <StableBilingual en="Sign In" so="Soo gal" lang={lang} />
              </>
            )}
          </button>
        </form>

        {/* ── divider ── */}
        <div className="mt-3 flex items-center gap-2">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">or</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        {/* ── action pills ── */}
        <div className="mt-2.5 flex flex-col gap-2">
          <Link
            href="/register"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-teal-600 to-cyan-600 text-[12.5px] font-semibold text-white shadow-sm transition hover:from-teal-700 hover:to-cyan-700 active:brightness-95"
          >
            <UserPlus className="h-3.5 w-3.5 shrink-0 text-amber-200" strokeWidth={2.5} />
            <span className="whitespace-nowrap">
              {lang === "so" ? (
                <>
                  Ma lihid akoon?{" "}
                  <span className="font-bold">Isdiiwaangeli</span>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <span className="font-bold">Register</span>
                </>
              )}
            </span>
          </Link>
        </div>
      </div>
    </LoginMarketLayout>
  );
}

function LoginFallback() {
  return (
    <div className="grid h-[calc(100dvh-4.75rem)] max-h-[calc(100dvh-4.75rem)] w-full flex-1 place-items-center overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex h-[calc(100dvh-4.75rem)] max-h-[calc(100dvh-4.75rem)] min-h-0 w-full flex-1 flex-col overflow-hidden">
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

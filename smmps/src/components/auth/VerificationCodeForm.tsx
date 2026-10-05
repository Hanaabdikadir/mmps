"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerificationCodeFormProps {
  userId: number;
  email: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export function VerificationCodeForm({
  userId,
  email,
  onSuccess,
  onError,
}: VerificationCodeFormProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });

      const result = await res.json();

      if (result.verified) {
        setVerified(true);
        onSuccess?.();
      } else {
        setError(result.message || "Verification failed");
        setAttempts((a) => a + 1);
        onError?.(result.message || "Verification failed");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification error";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }

  if (verified) {
    return (
      <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-900">Verification Successful</h3>
            <p className="mt-1 text-sm text-emerald-700">
              Your email has been verified. Your application is now awaiting admin approval.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">Email Verification Required</p>
            <p className="mt-1 text-sm text-amber-700">
              A 6-digit verification code was sent to <strong>{email}</strong>.
              Enter it below to proceed with your application.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Verification Code
        </label>
        <input
          type="text"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          disabled={loading}
          className={cn(
            "w-full rounded-lg border-2 px-4 py-3 text-center text-2xl font-bold tracking-widest transition-all",
            "border-gray-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none",
            error && "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200"
          )}
        />
        <p className="mt-1 text-xs text-gray-500">
          Code expires in 24 hours
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-900 text-sm">{error}</p>
              {attempts > 0 && (
                <p className="text-xs text-red-700 mt-1">
                  {attempts >= 5
                    ? "Account locked. Try again in 15 minutes."
                    : `${5 - attempts} attempts remaining`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || code.length !== 6 || attempts >= 5}
        className={cn(
          "w-full rounded-lg px-4 py-3 font-semibold transition-all",
          "flex items-center justify-center gap-2",
          code.length === 6 && attempts < 5
            ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
            : "bg-gray-200 text-gray-500 cursor-not-allowed"
        )}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Verifying..." : "Verify Code"}
      </button>

      <p className="text-xs text-center text-gray-500">
        Did not receive a code?{" "}
        <button
          type="button"
          className="text-emerald-600 hover:underline font-medium"
          onClick={() => {
            alert("Code resend functionality coming soon");
          }}
        >
          Resend
        </button>
      </p>
    </form>
  );
}

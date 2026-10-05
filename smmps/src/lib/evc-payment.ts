/**
 * Hormuud EVC Plus:
 * - auto: WaafiPay API_PURCHASE — PIN prompt is pushed to the payer's phone
 * - manual: customer sends *712*merchant*amount# (PIN on phone), then pastes Tx ID from SMS
 */
import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const EVC_MERCHANT_PHONE = "0619643334";
export type EvcPaymentMode = "auto" | "manual";

type WaafiParams = Record<string, unknown>;

type WaafiResponse = {
  responseCode?: string | number;
  errorCode?: string | number;
  responseMsg?: string;
  params?: {
    transactionId?: string;
    referenceId?: string;
    state?: string;
    txAmount?: string | number;
    accountNo?: string;
    description?: string;
  };
};

function env(name: string): string {
  return String(process.env[name] || "").trim();
}

export function isEvcPaymentConfigured(): boolean {
  return Boolean(
    env("WAAFI_MERCHANT_UID") &&
      env("WAAFI_API_USER_ID") &&
      env("WAAFI_API_KEY")
  );
}

export function getEvcPaymentMode(): EvcPaymentMode {
  const forced = env("EVC_PAYMENT_MODE").toLowerCase();
  if (forced === "manual") return "manual";
  if (forced === "auto") return "auto";
  return isEvcPaymentConfigured() ? "auto" : "manual";
}

/** Display 061xxxxxxx for the merchant receive number. */
export function getEvcMerchantDisplayPhone(): string {
  const raw = env("PAYMENT_EVC_PHONE") || env("EVC_MERCHANT_PHONE") || EVC_MERCHANT_PHONE;
  const account = normalizeEvcAccountNo(raw);
  if (!account) return EVC_MERCHANT_PHONE;
  return `0${account.slice(3)}`;
}

export function hormuudUssdCode(amount: number, merchantPhone = getEvcMerchantDisplayPhone()): string {
  const dollars = Number(amount);
  const amt = Number.isFinite(dollars) ? dollars.toFixed(2) : "0.00";
  return `*712*${merchantPhone}*${amt}#`;
}

/** Normalize Somali Hormuud numbers to 25261xxxxxxx. */
export function normalizeEvcAccountNo(raw: string): string | null {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("00252")) d = d.slice(2);
  if (d.startsWith("252")) {
    // ok
  } else if (d.startsWith("0") && d.length === 10) {
    d = `252${d.slice(1)}`;
  } else if (d.length === 9 && d.startsWith("61")) {
    d = `252${d}`;
  } else {
    return null;
  }
  // Hormuud EVC: 25261XXXXXXX (12 digits)
  if (!/^25261\d{7}$/.test(d)) return null;
  return d;
}

/** Transaction ID from Hormuud / EVC SMS after a successful send. */
export function normalizeEvcTransactionId(raw: string): string | null {
  const id = String(raw || "").trim().replace(/\s+/g, "");
  if (!/^[A-Za-z0-9-]{6,24}$/.test(id)) return null;
  return id;
}

function uniqueId(prefix: string): string {
  return `${prefix}${Date.now()}${randomBytes(3).toString("hex")}`;
}

function receiptSecret(): string {
  return env("WAAFI_API_KEY") || env("JWT_SECRET") || "mmps-dev-secret";
}

function makeReceiptToken(
  kind: EvcPaymentMode,
  transactionId: string,
  accountNo: string,
  amount: number
): string {
  const hex = createHash("sha256")
    .update(
      `${kind}|${transactionId}|${accountNo}|${Number(amount).toFixed(2)}|${receiptSecret()}`
    )
    .digest("hex")
    .slice(0, 40);
  return `${kind}.${hex}`;
}

function tokensEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  try {
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

async function waafiRequest(
  serviceName: string,
  serviceParams: WaafiParams
): Promise<WaafiResponse> {
  const endpoint =
    env("WAAFI_API_URL") || "https://api.waafipay.net/asm";
  const body = {
    schemaVersion: "1.0",
    requestId: uniqueId("req"),
    timestamp: new Date().toISOString(),
    channelName: "WEB",
    serviceName,
    serviceParams: {
      merchantUid: env("WAAFI_MERCHANT_UID"),
      apiUserId: env("WAAFI_API_USER_ID"),
      apiKey: env("WAAFI_API_KEY"),
      ...serviceParams,
    },
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(100_000),
  });

  const text = await res.text();
  let data: WaafiResponse = {};
  try {
    data = JSON.parse(text) as WaafiResponse;
  } catch {
    throw new Error(`WaafiPay invalid response (${res.status})`);
  }
  return data;
}

function friendlyWaafiError(msg: string | undefined, code?: string | number): string {
  const raw = String(msg || "");
  const lower = raw.toLowerCase();
  if (lower.includes("abort") || lower.includes("cancelled") || lower.includes("rejected")) {
    return "Payment was cancelled on the phone.";
  }
  if (lower.includes("subscriber not found") || lower.includes("wrong")) {
    return "EVC number not found. Check the phone number.";
  }
  if (lower.includes("invalid pin")) {
    return "Invalid EVC PIN.";
  }
  if (lower.includes("timeout") || lower.includes("timedout")) {
    return "Payment timed out. Try again and approve the PIN promptly.";
  }
  if (lower.includes("insufficient") || lower.includes("balance")) {
    return "Insufficient EVC balance.";
  }
  if (code && String(code) !== "0" && String(code) !== "2001") {
    return raw.slice(0, 180) || `Payment failed (${code}).`;
  }
  return raw.slice(0, 180) || "EVC payment failed.";
}

export type EvcChargeResult =
  | {
      ok: true;
      transactionId: string;
      referenceId: string;
      accountNo: string;
      amount: number;
      receiptToken: string;
    }
  | { ok: false; error: string };

function isWaafiSuccess(data: WaafiResponse): boolean {
  const code = String(data.responseCode || "");
  const msg = String(data.responseMsg || "");
  return (
    code === "2001" ||
    msg === "RCS_SUCCESS" ||
    String(data.params?.state || "").toUpperCase() === "APPROVED"
  );
}

function shouldFallbackPreauth(data: WaafiResponse): boolean {
  const code = String(data.responseCode || "");
  const msg = String(data.responseMsg || "").toLowerCase();
  return (
    msg.includes("not supported") ||
    msg.includes("invalid service") ||
    code === "5306" ||
    code === "5318"
  );
}

/**
 * Merchant-initiated Hormuud EVC charge (one PIN prompt on the payer's phone).
 */
export async function chargeEvcPlus(opts: {
  payerPhone: string;
  amount: number;
  description: string;
  invoiceId?: string | number;
}): Promise<EvcChargeResult> {
  if (!isEvcPaymentConfigured()) {
    return {
      ok: false,
      error:
        "EVC merchant is not configured. Set WAAFI_MERCHANT_UID, WAAFI_API_USER_ID, and WAAFI_API_KEY.",
    };
  }

  const accountNo = normalizeEvcAccountNo(opts.payerPhone);
  if (!accountNo) {
    return {
      ok: false,
      error: "Enter a valid Hormuud EVC number (e.g. 061xxxxxxx).",
    };
  }

  const amount = Number(opts.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Invalid payment amount." };
  }

  const referenceId = uniqueId("mmps");
  const invoiceId = opts.invoiceId ?? referenceId.slice(-8);
  const purchaseBody = {
    paymentMethod: "MWALLET_ACCOUNT",
    payerInfo: { accountNo },
    transactionInfo: {
      referenceId,
      invoiceId,
      amount: amount.toFixed(2),
      currency: "USD",
      description: String(opts.description || "MMPS subscription").slice(0, 120),
    },
  };

  try {
    let data = await waafiRequest("API_PURCHASE", purchaseBody);

    if (!isWaafiSuccess(data) && shouldFallbackPreauth(data)) {
      data = await waafiRequest("API_PREAUTHORIZE", purchaseBody);
      const txId = String(data.params?.transactionId || "");
      if (!isWaafiSuccess(data) || !txId) {
        return {
          ok: false,
          error: friendlyWaafiError(data.responseMsg, data.responseCode),
        };
      }
      const commit = await waafiRequest("API_PREAUTHORIZE_COMMIT", {
        transactionId: txId,
        referenceId: String(data.params?.referenceId || referenceId),
        description: "Commit MMPS subscription payment",
      });
      if (!isWaafiSuccess(commit)) {
        await waafiRequest("API_PREAUTHORIZE_CANCEL", {
          transactionId: txId,
          referenceId: String(data.params?.referenceId || referenceId),
          description: "Cancel MMPS subscription payment",
        }).catch(() => null);
        return {
          ok: false,
          error: friendlyWaafiError(commit.responseMsg, commit.responseCode),
        };
      }
      data = {
        ...commit,
        params: {
          ...(commit.params || {}),
          transactionId: txId,
          referenceId: String(commit.params?.referenceId || referenceId),
          accountNo,
        },
      };
    } else if (!isWaafiSuccess(data)) {
      return {
        ok: false,
        error: friendlyWaafiError(data.responseMsg, data.responseCode),
      };
    }

    const transactionId = String(data.params?.transactionId || referenceId);
    return {
      ok: true,
      transactionId,
      referenceId: String(data.params?.referenceId || referenceId),
      accountNo,
      amount,
      receiptToken: makeReceiptToken("auto", transactionId, accountNo, amount),
    };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      return {
        ok: false,
        error: "Payment timed out. Approve the PIN on your phone and try again.",
      };
    }
    const message = err instanceof Error ? err.message : "EVC payment failed.";
    return { ok: false, error: message };
  }
}

/** Record a Hormuud send (*712*) using the SMS transaction ID. */
export function issueManualEvcReceipt(opts: {
  payerPhone: string;
  transactionId: string;
  amount: number;
}): EvcChargeResult {
  const accountNo = normalizeEvcAccountNo(opts.payerPhone);
  if (!accountNo) {
    return {
      ok: false,
      error: "Enter a valid Hormuud EVC number (e.g. 061xxxxxxx).",
    };
  }
  const transactionId = normalizeEvcTransactionId(opts.transactionId);
  if (!transactionId) {
    return {
      ok: false,
      error: "Enter the transaction ID from your Hormuud EVC SMS.",
    };
  }
  const amount = Number(opts.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Invalid payment amount." };
  }
  return {
    ok: true,
    transactionId,
    referenceId: uniqueId("evc"),
    accountNo,
    amount,
    receiptToken: makeReceiptToken("manual", transactionId, accountNo, amount),
  };
}

/** Verify a client-returned payment token matches known charge fields. */
export function verifyEvcReceiptToken(opts: {
  transactionId: string;
  accountNo: string;
  amount: number;
  token: string;
}): boolean {
  const accountNo = normalizeEvcAccountNo(opts.accountNo) || String(opts.accountNo || "").trim();
  const tx = String(opts.transactionId || "").trim();
  const token = String(opts.token || "").trim();
  if (!accountNo || !tx || !token) return false;
  const mode = getEvcPaymentMode();
  const expected = makeReceiptToken(mode, tx, accountNo, opts.amount);
  return tokensEqual(token, expected);
}

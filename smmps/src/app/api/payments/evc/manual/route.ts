import { NextRequest, NextResponse } from "next/server";
import {
  getEvcMerchantDisplayPhone,
  getEvcPaymentMode,
  issueManualEvcReceipt,
  normalizeEvcAccountNo,
  normalizeEvcTransactionId,
} from "@/lib/evc-payment";
import { clientIpFromHeaders } from "@/lib/client-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  phone?: string;
  transactionId?: string;
  amount?: number | string;
};

/** Simple in-memory throttle (per process) for thesis abuse resistance. */
const hits = new Map<string, { n: number; resetAt: number }>();

function rateLimit(ip: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || now > cur.resetAt) {
    hits.set(ip, { n: 1, resetAt: now + windowMs });
    return true;
  }
  if (cur.n >= max) return false;
  cur.n += 1;
  return true;
}

export async function POST(request: NextRequest) {
  if (getEvcPaymentMode() !== "manual") {
    return NextResponse.json(
      {
        error:
          "Live EVC (Waafi) is configured. Use the PIN charge flow instead of manual Tx ID.",
        code: "useAutoCharge",
      },
      { status: 409 }
    );
  }

  const ip = clientIpFromHeaders(request.headers);
  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a minute and try again.", code: "rateLimited" },
      { status: 429 }
    );
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phone = String(body.phone || "").trim();
  const transactionId = String(body.transactionId || "").trim();
  const amount = Number(body.amount);

  if (!normalizeEvcAccountNo(phone)) {
    return NextResponse.json(
      {
        error: "Enter a valid Hormuud EVC number (061xxxxxxx).",
        code: "invalidPhone",
      },
      { status: 400 }
    );
  }
  if (!normalizeEvcTransactionId(transactionId)) {
    return NextResponse.json(
      {
        error:
          "Enter the transaction ID from your Hormuud / EVC SMS after you send the money.",
        code: "invalidTx",
      },
      { status: 400 }
    );
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 5000) {
    return NextResponse.json(
      { error: "Invalid amount.", code: "invalidAmount" },
      { status: 400 }
    );
  }

  const result = issueManualEvcReceipt({
    payerPhone: phone,
    transactionId,
    amount,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: "invalidProof" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "manual",
    merchantPhone: getEvcMerchantDisplayPhone(),
    transactionId: result.transactionId,
    referenceId: result.referenceId,
    accountNo: result.accountNo,
    amount: result.amount,
    receiptToken: result.receiptToken,
    note: "Pending Super Admin confirmation after you register / renew.",
  });
}

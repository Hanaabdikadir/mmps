import { NextRequest, NextResponse } from "next/server";
import {
  chargeEvcPlus,
  getEvcMerchantDisplayPhone,
  getEvcPaymentMode,
  isEvcPaymentConfigured,
  normalizeEvcAccountNo,
} from "@/lib/evc-payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Customer may take time to enter PIN on the phone. */
export const maxDuration = 120;

type Body = {
  phone?: string;
  amount?: number | string;
  description?: string;
  planId?: number | string;
};

export async function GET() {
  const merchantPhone = getEvcMerchantDisplayPhone();
  const mode = getEvcPaymentMode();
  return NextResponse.json({
    configured: isEvcPaymentConfigured(),
    mode,
    merchantPhone,
    currency: "USD",
    ussd: `*712*${merchantPhone}*AMOUNT#`,
  });
}

export async function POST(request: NextRequest) {
  if (!isEvcPaymentConfigured()) {
    return NextResponse.json(
      {
        error:
          "EVC merchant API is not configured.",
        code: "evcNotConfigured",
      },
      { status: 503 }
    );
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phone = String(body.phone || "").trim();
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
  if (!Number.isFinite(amount) || amount <= 0 || amount > 5000) {
    return NextResponse.json(
      { error: "Invalid amount.", code: "invalidAmount" },
      { status: 400 }
    );
  }

  const result = await chargeEvcPlus({
    payerPhone: phone,
    amount,
    description: String(body.description || "MMPS subscription payment").slice(0, 120),
    invoiceId: body.planId ? String(body.planId) : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: "paymentFailed" },
      { status: 402 }
    );
  }

  return NextResponse.json({
    ok: true,
    transactionId: result.transactionId,
    referenceId: result.referenceId,
    accountNo: result.accountNo,
    amount: result.amount,
    receiptToken: result.receiptToken,
  });
}

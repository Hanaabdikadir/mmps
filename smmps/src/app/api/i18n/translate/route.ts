import { NextRequest, NextResponse } from "next/server";
import { translateContent } from "@/lib/translate-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  text?: string;
  texts?: string[];
  targetLang?: string;
  protect?: string[];
};

function parseTarget(raw: unknown): "en" | "so" {
  return String(raw || "").toLowerCase() === "so" ? "so" : "en";
}

export async function POST(request: NextRequest) {
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetLang = parseTarget(body.targetLang);
  const batch = Array.isArray(body.texts)
    ? body.texts.map((t) => String(t || "").trim()).filter(Boolean).slice(0, 40)
    : [];

  if (batch.length > 0) {
    const translations: Record<string, string> = {};
    await Promise.all(
      batch.map(async (text) => {
        translations[text] = await translateContent(text, targetLang);
      })
    );
    return NextResponse.json({ targetLang, translations });
  }

  const text = String(body.text || "").trim();
  if (!text) {
    return NextResponse.json({ targetLang, text: "", translated: "" });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: "Text too long" }, { status: 400 });
  }

  const protect = Array.isArray(body.protect)
    ? body.protect.map((p) => String(p || "").trim()).filter(Boolean).slice(0, 12)
    : [];
  const translated = await translateContent(text, targetLang, { protect });
  return NextResponse.json({ targetLang, text, translated });
}

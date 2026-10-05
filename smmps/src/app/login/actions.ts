"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIpFromHeaders } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { authenticateUser } from "@/lib/login-service";

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<{ error?: string } | never> {
  const h = await headers();
  const ip = clientIpFromHeaders(h);
  const rl = rateLimit(`login:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return { error: "Too many attempts. Please try again later." };
  }

  const result = await authenticateUser({
    email: input.email,
    password: input.password,
    userAgent: h.get("user-agent") || "",
  });

  if (!result.ok) {
    return { error: result.error };
  }

  redirect(result.redirectTo);
}

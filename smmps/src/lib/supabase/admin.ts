// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAuthConfig } from "@/lib/supabase/env";

export function createSupabaseAnonClient(): SupabaseClient | null {
  const { url, anonKey, configured } = getSupabaseAuthConfig();
  if (!configured) return null;
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createSupabaseAdminClient(): SupabaseClient | null {
  const { url, serviceRoleKey, adminConfigured } = getSupabaseAuthConfig();
  if (!adminConfigured) return null;
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

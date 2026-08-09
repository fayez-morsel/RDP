import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "./database.types";

export type SupabaseCookieAdapter = { getAll: () => { name: string; value: string }[]; setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => void };

/** Create this only at a request boundary; callers provide the framework's cookie adapter. */
export function createSupabaseServerClient(cookies: SupabaseCookieAdapter) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase server client is not configured.");
  return createServerClient<Database>(url, key, { cookies });
}

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "./database.types";

export type SupabaseCookieAdapter = {
  getAll: () => { name: string; value: string }[];
  setAll: (
    cookies: { name: string; value: string; options: CookieOptions }[],
  ) => void;
};

function getSupabaseServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return { url, key };
}

/** Create this only at a request boundary; callers provide the framework's cookie adapter. */
export function createSupabaseServerClient(cookies: SupabaseCookieAdapter) {
  const { url, key } = getSupabaseServerConfig();
  return createServerClient<Database>(url, key, { cookies });
}

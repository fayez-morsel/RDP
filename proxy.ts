import type { NextRequest } from "next/server";
import { refreshSupabaseSession } from "./app/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return refreshSupabaseSession(request);
}

export const config = {
  matcher: [
    /* Run for application requests, but skip immutable static files and images. */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

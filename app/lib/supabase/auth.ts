"use client";

import { createSupabaseBrowserClient } from "./browser";

const safeReturnTo = (path: string | null | undefined) => path && path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";

export async function signUpWithPassword(email: string, password: string, returnTo?: string) {
  const client = createSupabaseBrowserClient();
  const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeReturnTo(returnTo))}` } });
  if (error) throw new Error(error.message); return data;
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await createSupabaseBrowserClient().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message); return data;
}

export async function requestPasswordReset(email: string) {
  const { error } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
  if (error) throw new Error(error.message);
}

export async function updatePassword(password: string) {
  const { error } = await createSupabaseBrowserClient().auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export async function signOut() { const { error } = await createSupabaseBrowserClient().auth.signOut(); if (error) throw new Error(error.message); }
export async function initializePlayer(displayName: string, username: string, title?: string) { const { data, error } = await createSupabaseBrowserClient().rpc("initialize_player", { p_display_name: displayName, p_username: username, p_title: title } as never); if (error) throw new Error(error.message); return data; }

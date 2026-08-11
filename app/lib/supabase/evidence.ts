"use client";

import { clampSignedUrlExpiry, validateAttachment } from "../../skills/mastery-engine";
import { createSupabaseBrowserClient } from "./browser";

const evidenceBucket = "skill-evidence";

/** Private evidence paths are always scoped to the authenticated user and skill. */
export async function uploadSkillEvidence(skillId: string, file: File) {
  const validation = validateAttachment(file);
  if (!validation.ok) throw new Error(validation.message);
  const supabase = createSupabaseBrowserClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Authentication required.");
  const safeSkillId = skillId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const path = `${auth.user.id}/${safeSkillId}/${crypto.randomUUID()}-${validation.sanitizedName}`;
  const { error } = await supabase.storage.from(evidenceBucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return { path, mimeType: file.type, size: file.size, originalName: validation.sanitizedName };
}

/** Signed URLs are short-lived and never persisted as portfolio or evidence metadata. */
export async function createEvidenceSignedUrl(path: string, expiresInSeconds = 120) {
  const safeExpiry = clampSignedUrlExpiry(expiresInSeconds);
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.storage.from(evidenceBucket).createSignedUrl(path, safeExpiry);
  if (error) throw new Error(error.message);
  return { signedUrl: data.signedUrl, expiresInSeconds: safeExpiry };
}

export async function deleteSkillEvidence(path: string) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage.from(evidenceBucket).remove([path]);
  if (error) throw new Error(error.message);
}

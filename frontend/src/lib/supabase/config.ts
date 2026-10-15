/**
 * Supabase configuration constants and environment validation.
 * Distinguishes browser-safe public variables from server-only credentials.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Returns true if both the Supabase URL and anonymous key are configured in environment variables.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("placeholder") &&
    !SUPABASE_ANON_KEY.includes("placeholder") &&
    SUPABASE_URL.startsWith("https://")
  );
}

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config";

/**
 * Creates and returns a singleton Supabase client for Client Components.
 * Uses @supabase/ssr to handle cookie-based session synchronization automatically.
 */
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  if (!isSupabaseConfigured()) {
    // Provide a placeholder client that does not break static rendering
    browserClient = createBrowserClient(
      SUPABASE_URL || "https://placeholder-project.supabase.co",
      SUPABASE_ANON_KEY || "placeholder-anon-key"
    );
    return browserClient;
  }

  browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return browserClient;
}

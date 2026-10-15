import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config";

/**
 * Creates a Supabase client for Server Components, Server Actions, or Route Handlers.
 * Automatically synchronizes auth cookies with Next.js headers.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  if (!isSupabaseConfigured()) {
    return createServerClient(
      SUPABASE_URL || "https://placeholder-project.supabase.co",
      SUPABASE_ANON_KEY || "placeholder-anon-key",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // No-op for unconfigured demo
          },
        },
      }
    );
  }

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}

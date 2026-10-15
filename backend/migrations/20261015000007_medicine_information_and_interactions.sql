-- Migration 7: Medicine Information Search History and Trusted Source Cache
-- Supports authoritative medicine lookups, drug interaction checks, and user search history with Row Level Security.

CREATE TABLE IF NOT EXISTS public.medicine_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    query TEXT NOT NULL,
    medicine_name TEXT,
    searched_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_medicine_search_history_user ON public.medicine_search_history(user_id, searched_at DESC);

CREATE TABLE IF NOT EXISTS public.medicine_source_cache (
    cache_key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT,
    retrieved_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_medicine_source_cache_expires ON public.medicine_source_cache(expires_at);

-- Row Level Security
ALTER TABLE public.medicine_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_source_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "med_history_select_own" ON public.medicine_search_history;
    DROP POLICY IF EXISTS "med_history_insert_own" ON public.medicine_search_history;
    DROP POLICY IF EXISTS "med_history_delete_own" ON public.medicine_search_history;

    CREATE POLICY "med_history_select_own" ON public.medicine_search_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
    CREATE POLICY "med_history_insert_own" ON public.medicine_search_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "med_history_delete_own" ON public.medicine_search_history FOR DELETE TO authenticated USING (auth.uid() = user_id);

    -- Cache table is readable by authenticated users and managed by backend service
    DROP POLICY IF EXISTS "med_cache_select_all" ON public.medicine_source_cache;
    CREATE POLICY "med_cache_select_all" ON public.medicine_source_cache FOR SELECT TO authenticated USING (true);
END $$;

-- Migration 6: Assistant Conversations, Structured Citations, and Safety Metadata
-- Enhances public.assistant_conversations and public.assistant_messages with citations, emergency flags, and RLS policies.

DO $$
BEGIN
    -- Add citations column to assistant_messages
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assistant_messages' AND column_name = 'citations'
    ) THEN
        ALTER TABLE public.assistant_messages ADD COLUMN citations JSONB DEFAULT '[]'::JSONB NOT NULL;
    END IF;

    -- Add is_emergency column to assistant_messages
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assistant_messages' AND column_name = 'is_emergency'
    ) THEN
        ALTER TABLE public.assistant_messages ADD COLUMN is_emergency BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;

    -- Add is_mock column to assistant_messages
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assistant_messages' AND column_name = 'is_mock'
    ) THEN
        ALTER TABLE public.assistant_messages ADD COLUMN is_mock BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;

    -- Add model_used column to assistant_messages
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assistant_messages' AND column_name = 'model_used'
    ) THEN
        ALTER TABLE public.assistant_messages ADD COLUMN model_used TEXT;
    END IF;
END $$;

-- Indices for fast conversation retrieval
CREATE INDEX IF NOT EXISTS idx_assistant_conv_user_updated ON public.assistant_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistant_msg_conv_created ON public.assistant_messages(conversation_id, created_at ASC);

-- Row Level Security
ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Policies for assistant_conversations
    DROP POLICY IF EXISTS "assistant_conv_select_own" ON public.assistant_conversations;
    DROP POLICY IF EXISTS "assistant_conv_insert_own" ON public.assistant_conversations;
    DROP POLICY IF EXISTS "assistant_conv_update_own" ON public.assistant_conversations;
    DROP POLICY IF EXISTS "assistant_conv_delete_own" ON public.assistant_conversations;

    CREATE POLICY "assistant_conv_select_own" ON public.assistant_conversations FOR SELECT TO authenticated USING (auth.uid() = user_id);
    CREATE POLICY "assistant_conv_insert_own" ON public.assistant_conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "assistant_conv_update_own" ON public.assistant_conversations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "assistant_conv_delete_own" ON public.assistant_conversations FOR DELETE TO authenticated USING (auth.uid() = user_id);

    -- Policies for assistant_messages
    DROP POLICY IF EXISTS "assistant_msg_select_own" ON public.assistant_messages;
    DROP POLICY IF EXISTS "assistant_msg_insert_own" ON public.assistant_messages;
    DROP POLICY IF EXISTS "assistant_msg_delete_own" ON public.assistant_messages;

    CREATE POLICY "assistant_msg_select_own" ON public.assistant_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
    CREATE POLICY "assistant_msg_insert_own" ON public.assistant_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "assistant_msg_delete_own" ON public.assistant_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
END $$;

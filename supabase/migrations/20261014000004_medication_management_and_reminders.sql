-- ==============================================================================
-- MediMate AI - Migration 4: Medication Management, Schedules, and Reminders
-- Version: 20261014000004
-- Description: Extends medications, schedules, dose events with versioning,
--              audit columns, and introduces the reminder_jobs queue.
-- ==============================================================================

-- 1. Extend medications table
ALTER TABLE public.medications
    ADD COLUMN IF NOT EXISTS formulation TEXT DEFAULT 'Tablet',
    ADD COLUMN IF NOT EXISTS route TEXT DEFAULT 'Oral',
    ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS end_date DATE,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Paused', 'Completed', 'Discontinued')),
    ADD COLUMN IF NOT EXISTS original_source_text TEXT,
    ADD COLUMN IF NOT EXISTS user_corrections JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS is_user_edited BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_medications_status ON public.medications(status);

-- 2. Extend medication_schedules table
ALTER TABLE public.medication_schedules
    ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS schedule_version INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS reminder_offset_minutes INT DEFAULT 10,
    ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT TRUE;

-- 3. Extend dose_events table with correction and audit columns
ALTER TABLE public.dose_events
    ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS corrected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS original_status TEXT,
    ADD COLUMN IF NOT EXISTS correction_reason TEXT;

-- Prevent duplicate event logs for the exact same scheduled instance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_dose_event_schedule_time'
    ) THEN
        ALTER TABLE public.dose_events
            ADD CONSTRAINT uq_dose_event_schedule_time UNIQUE (schedule_id, scheduled_for);
    END IF;
END $$;

-- 4. Create reminder_jobs table
CREATE TABLE IF NOT EXISTS public.reminder_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES public.medication_schedules(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ NOT NULL,
    reminder_time TIMESTAMPTZ NOT NULL,
    channel TEXT DEFAULT 'push' NOT NULL CHECK (channel IN ('push', 'sms', 'email')),
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    is_mock BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    -- Prevent duplicate reminder job for same schedule instance & channel
    CONSTRAINT uq_reminder_job_instance UNIQUE (schedule_id, reminder_time, channel)
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminder_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminder_jobs(status);
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_time ON public.reminder_jobs(reminder_time);

-- 5. Enable Row Level Security (RLS) on reminder_jobs
ALTER TABLE public.reminder_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminder_jobs_select_own"
    ON public.reminder_jobs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "reminder_jobs_insert_own"
    ON public.reminder_jobs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reminder_jobs_update_own"
    ON public.reminder_jobs FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reminder_jobs_delete_own"
    ON public.reminder_jobs FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

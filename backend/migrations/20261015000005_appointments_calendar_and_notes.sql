-- Migration 5: Appointments, Calendar, Reminders, and Healthcare Visit Notes
-- Enhances public.appointments with visit types, duration, clinic details, visit notes, and audit logs.

DO $$
BEGIN
    -- Add duration_minutes column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'duration_minutes'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN duration_minutes INTEGER DEFAULT 30 NOT NULL;
    END IF;

    -- Add visit_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'visit_type'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN visit_type TEXT DEFAULT 'In-Person' NOT NULL;
        ALTER TABLE public.appointments ADD CONSTRAINT check_visit_type CHECK (visit_type IN ('In-Person', 'Online'));
    END IF;

    -- Add clinic details
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'clinic_name'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN clinic_name TEXT;
        ALTER TABLE public.appointments ADD COLUMN clinic_phone TEXT;
        ALTER TABLE public.appointments ADD COLUMN clinic_email TEXT;
        ALTER TABLE public.appointments ADD COLUMN clinic_address TEXT;
        ALTER TABLE public.appointments ADD COLUMN teleconsult_url TEXT;
    END IF;

    -- Add management indicators
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'is_locally_managed'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN is_locally_managed BOOLEAN DEFAULT TRUE NOT NULL;
        ALTER TABLE public.appointments ADD COLUMN is_verified_doctor BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;

    -- Add reminder offsets array (minutes before appointment)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'reminder_offsets'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN reminder_offsets INTEGER[] DEFAULT '{1440, 60}'::INTEGER[] NOT NULL;
    END IF;

    -- Add healthcare visit notes columns (separate from clinician documents)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'visit_purpose'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN visit_purpose TEXT;
        ALTER TABLE public.appointments ADD COLUMN questions_to_ask JSONB DEFAULT '[]'::JSONB NOT NULL;
        ALTER TABLE public.appointments ADD COLUMN personal_notes TEXT;
        ALTER TABLE public.appointments ADD COLUMN follow_up_instructions TEXT;
        ALTER TABLE public.appointments ADD COLUMN follow_up_recommended_date DATE;
    END IF;

    -- Add audit history & reschedule tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'history'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN history JSONB DEFAULT '[]'::JSONB NOT NULL;
        ALTER TABLE public.appointments ADD COLUMN rescheduled_from TIMESTAMPTZ;
        ALTER TABLE public.appointments ADD COLUMN cancellation_reason TEXT;
    END IF;
END $$;

-- Update status constraint if needed
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
    CHECK (status IN ('Upcoming', 'Completed', 'Cancelled', 'Rescheduled', 'Scheduled'));

-- Create indexing for calendar date queries
CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON public.appointments(user_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- Ensure RLS is active
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS policies for appointments
DO $$
BEGIN
    DROP POLICY IF EXISTS "appointments_select_own" ON public.appointments;
    DROP POLICY IF EXISTS "appointments_insert_own" ON public.appointments;
    DROP POLICY IF EXISTS "appointments_update_own" ON public.appointments;
    DROP POLICY IF EXISTS "appointments_delete_own" ON public.appointments;
    
    CREATE POLICY "appointments_select_own" ON public.appointments FOR SELECT TO authenticated USING (auth.uid() = user_id);
    CREATE POLICY "appointments_insert_own" ON public.appointments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "appointments_update_own" ON public.appointments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "appointments_delete_own" ON public.appointments FOR DELETE TO authenticated USING (auth.uid() = user_id);
END $$;

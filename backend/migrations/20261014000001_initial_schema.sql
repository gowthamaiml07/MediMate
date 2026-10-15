-- Mirrored from supabase/migrations/20261014000001_initial_schema.sql
-- Run in your Supabase SQL Editor or via supabase db push

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    blood_group TEXT,
    emergency_contact TEXT,
    preferred_language TEXT DEFAULT 'English (US)' NOT NULL,
    role TEXT DEFAULT 'patient' NOT NULL CHECK (role IN ('patient', 'doctor', 'caregiver', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    speciality TEXT NOT NULL,
    hospital TEXT,
    phone TEXT,
    email TEXT,
    rating NUMERIC(2, 1) DEFAULT 4.9,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_doctors_speciality ON public.doctors(speciality);

CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    doctor_name TEXT NOT NULL,
    patient_name TEXT,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type TEXT DEFAULT 'image/png' NOT NULL,
    prescription_date DATE,
    status TEXT DEFAULT 'Uploaded' NOT NULL CHECK (status IN ('Uploaded', 'Processing', 'Reviewed', 'Confirmed', 'Archived')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_user_id ON public.prescriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON public.prescriptions(status);

CREATE TRIGGER trg_prescriptions_updated_at
    BEFORE UPDATE ON public.prescriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.prescription_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    raw_ocr_text TEXT,
    extracted_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    confidence_score NUMERIC(5, 2),
    review_status TEXT DEFAULT 'pending' NOT NULL CHECK (review_status IN ('pending', 'reviewed', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_extractions_prescription_id ON public.prescription_extractions(prescription_id);
CREATE INDEX IF NOT EXISTS idx_extractions_user_id ON public.prescription_extractions(user_id);

CREATE TRIGGER trg_extractions_updated_at
    BEFORE UPDATE ON public.prescription_extractions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
    extraction_id UUID REFERENCES public.prescription_extractions(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    strength TEXT NOT NULL,
    category TEXT,
    instructions TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT,
    is_verified_by_user BOOLEAN DEFAULT FALSE NOT NULL,
    confidence_score NUMERIC(5, 2),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_medications_user_id ON public.medications(user_id);
CREATE INDEX IF NOT EXISTS idx_medications_prescription_id ON public.medications(prescription_id);

CREATE TRIGGER trg_medications_updated_at
    BEFORE UPDATE ON public.medications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.medication_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    scheduled_time TIME NOT NULL,
    timing_relation TEXT DEFAULT 'After food' NOT NULL CHECK (timing_relation IN ('Before food', 'After food', 'With food', 'Empty stomach', 'At bedtime')),
    start_date DATE DEFAULT CURRENT_DATE NOT NULL,
    end_date DATE,
    is_confirmed BOOLEAN DEFAULT FALSE NOT NULL,
    confirmed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'Active' NOT NULL CHECK (status IN ('Active', 'Paused', 'Completed', 'Discontinued')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT check_unverified_cannot_be_active CHECK (NOT (status = 'Active' AND is_confirmed = FALSE))
);

CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON public.medication_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_medication_id ON public.medication_schedules(medication_id);
CREATE INDEX IF NOT EXISTS idx_schedules_time ON public.medication_schedules(scheduled_time);

CREATE TRIGGER trg_schedules_updated_at
    BEFORE UPDATE ON public.medication_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.dose_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES public.medication_schedules(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Taken', 'Missed', 'Skipped', 'Snoozed', 'Upcoming')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dose_events_user_id ON public.dose_events(user_id);
CREATE INDEX IF NOT EXISTS idx_dose_events_schedule_id ON public.dose_events(schedule_id);
CREATE INDEX IF NOT EXISTS idx_dose_events_scheduled_for ON public.dose_events(scheduled_for);

CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    doctor_name TEXT NOT NULL,
    speciality TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    location TEXT,
    status TEXT DEFAULT 'Upcoming' NOT NULL CHECK (status IN ('Upcoming', 'Completed', 'Cancelled', 'Rescheduled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);

CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.consultation_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    doctor_name TEXT NOT NULL,
    visit_date DATE NOT NULL,
    summary TEXT NOT NULL,
    patient_symptoms TEXT[] DEFAULT '{}' NOT NULL,
    doctor_questions JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consultation_notes_user_id ON public.consultation_notes(user_id);

CREATE TRIGGER trg_consultation_notes_updated_at
    BEFORE UPDATE ON public.consultation_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.assistant_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Medication Assistant Chat' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assistant_conv_user ON public.assistant_conversations(user_id);

CREATE TABLE IF NOT EXISTS public.assistant_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    sources TEXT[] DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assistant_msg_conv ON public.assistant_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_assistant_msg_user ON public.assistant_messages(user_id);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    push_reminders BOOLEAN DEFAULT TRUE NOT NULL,
    sms_alerts BOOLEAN DEFAULT TRUE NOT NULL,
    appointment_alerts_24h BOOLEAN DEFAULT TRUE NOT NULL,
    refill_alerts BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trg_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON public.audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_events(action);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_full_name TEXT;
BEGIN
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (NEW.id, user_full_name, 'patient')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.audit_events (user_id, action, entity_type, entity_id, metadata)
    VALUES (NEW.id, 'AUTH_SIGNUP', 'users', NEW.id::text, jsonb_build_object('email', NEW.email));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

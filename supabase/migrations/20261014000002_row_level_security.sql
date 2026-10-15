-- ==============================================================================
-- MediMate AI - Row Level Security (RLS) Policies & Storage Configuration
-- Version: 20261014000002
-- Description: Strict ownership verification, zero-trust policies, and storage isolation.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Enable RLS on all public tables
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dose_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. Profiles Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 3. Doctors Policies (Directory is readable by authenticated users)
-- ------------------------------------------------------------------------------
CREATE POLICY "doctors_select_authenticated"
    ON public.doctors FOR SELECT
    TO authenticated
    USING (true);

-- ------------------------------------------------------------------------------
-- 4. Prescriptions Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "prescriptions_select_own"
    ON public.prescriptions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "prescriptions_insert_own"
    ON public.prescriptions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "prescriptions_update_own"
    ON public.prescriptions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "prescriptions_delete_own"
    ON public.prescriptions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. Prescription Extractions Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "extractions_select_own"
    ON public.prescription_extractions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "extractions_insert_own"
    ON public.prescription_extractions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "extractions_update_own"
    ON public.prescription_extractions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6. Medications Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "medications_select_own"
    ON public.medications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "medications_insert_own"
    ON public.medications FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "medications_update_own"
    ON public.medications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "medications_delete_own"
    ON public.medications FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 7. Medication Schedules Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "schedules_select_own"
    ON public.medication_schedules FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "schedules_insert_own"
    ON public.medication_schedules FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "schedules_update_own"
    ON public.medication_schedules FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "schedules_delete_own"
    ON public.medication_schedules FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 8. Dose Events Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "dose_events_select_own"
    ON public.dose_events FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "dose_events_insert_own"
    ON public.dose_events FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "dose_events_update_own"
    ON public.dose_events FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 9. Appointments Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "appointments_select_own"
    ON public.appointments FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "appointments_insert_own"
    ON public.appointments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "appointments_update_own"
    ON public.appointments FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "appointments_delete_own"
    ON public.appointments FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 10. Consultation Notes Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "consultation_notes_select_own"
    ON public.consultation_notes FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "consultation_notes_insert_own"
    ON public.consultation_notes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "consultation_notes_update_own"
    ON public.consultation_notes FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 11. Assistant Conversations & Messages Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "assistant_conv_select_own"
    ON public.assistant_conversations FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "assistant_conv_insert_own"
    ON public.assistant_conversations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "assistant_conv_delete_own"
    ON public.assistant_conversations FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "assistant_msg_select_own"
    ON public.assistant_messages FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "assistant_msg_insert_own"
    ON public.assistant_messages FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 12. Notification Preferences Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "notification_preferences_select_own"
    ON public.notification_preferences FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "notification_preferences_insert_own"
    ON public.notification_preferences FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_preferences_update_own"
    ON public.notification_preferences FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 13. Audit Events Policies (Append-only & read own logs; no UPDATE or DELETE)
-- ------------------------------------------------------------------------------
CREATE POLICY "audit_events_select_own"
    ON public.audit_events FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "audit_events_insert_own"
    ON public.audit_events FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 14. Private Storage Bucket Setup & Security Policies
-- Bucket Name: 'prescriptions' (Private)
-- Isolated under user directory path: `{user_id}/{filename}`
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'prescriptions',
    'prescriptions',
    false,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Only the owner of the folder ({auth.uid()}/...) can access files
CREATE POLICY "storage_prescriptions_select_own"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'prescriptions'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "storage_prescriptions_insert_own"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'prescriptions'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "storage_prescriptions_update_own"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'prescriptions'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "storage_prescriptions_delete_own"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'prescriptions'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

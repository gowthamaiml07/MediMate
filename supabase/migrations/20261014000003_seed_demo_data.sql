-- ==============================================================================
-- MediMate AI - Reference Seed Data
-- Version: 20261014000003
-- Description: Standard doctors directory & reference medicine information
-- ==============================================================================

-- Seed reference doctors into public.doctors
INSERT INTO public.doctors (id, name, speciality, hospital, phone, email, rating)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Dr. S. Kumar', 'Cardiologist', 'City Heart Care & Research', '+1 (555) 234-5678', 'dr.kumar@cityheartcare.org', 4.9),
    ('22222222-2222-2222-2222-222222222222', 'Dr. Radhika Patel', 'General Physician', 'Apollo Health Clinic', '+1 (555) 345-6789', 'dr.patel@apollohealth.org', 4.8),
    ('33333333-3333-3333-3333-333333333333', 'Dr. Rajesh Mehta', 'Endocrinologist', 'Metro Diabetes Center', '+1 (555) 456-7890', 'dr.mehta@metrodiabetes.org', 4.9)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    speciality = EXCLUDED.speciality,
    hospital = EXCLUDED.hospital;

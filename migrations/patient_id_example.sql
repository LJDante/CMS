-- Example: To find a patient's ID for use in clinic_visits
-- Replace '1234567' with the actual student_id
SELECT id, first_name, last_name FROM public.patients WHERE student_id = '1234567';

-- Then use that id as patient_id in clinic_visits
-- INSERT INTO public.clinic_visits (patient_id, visit_date, complaint, disposition)
-- VALUES ('the-id-from-above', '2026-03-15', 'Headache', 'returned_to_class');

-- Check if patients table exists and its columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'patients' AND table_schema = 'public'
ORDER BY ordinal_position;
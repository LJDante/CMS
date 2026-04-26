-- Check what tables exist in public schema
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- If you have old tables with student_id instead of patient_id, drop them
-- DROP TABLE IF EXISTS public.medical_records CASCADE;
-- DROP TABLE IF EXISTS public.clinic_visits CASCADE;
-- DROP TABLE IF EXISTS public.student_accident_reports CASCADE;

-- Then run the full schema from README.md to recreate with patient_id

-- Check patients table structure after creating
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'patients' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check medical_records table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'medical_records' AND table_schema = 'public'
ORDER BY ordinal_position;
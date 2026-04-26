-- Rename students table to patients and update foreign keys
-- This migration fixes the table name mismatch between schema (students) and code (patients)

-- Rename the main table
ALTER TABLE public.students RENAME TO patients;

-- Update foreign key references
ALTER TABLE public.clinic_visits RENAME COLUMN student_id TO patient_id;
ALTER TABLE public.clinic_visits DROP CONSTRAINT clinic_visits_student_id_fkey;
ALTER TABLE public.clinic_visits ADD CONSTRAINT clinic_visits_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.medical_records RENAME COLUMN student_id TO patient_id;
ALTER TABLE public.medical_records DROP CONSTRAINT medical_records_student_id_fkey;
ALTER TABLE public.medical_records ADD CONSTRAINT medical_records_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.student_accident_reports RENAME COLUMN student_id TO patient_id;
ALTER TABLE public.student_accident_reports DROP CONSTRAINT student_accident_reports_student_id_fkey;
ALTER TABLE public.student_accident_reports ADD CONSTRAINT student_accident_reports_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

-- Update indexes
DROP INDEX IF EXISTS idx_students_student_id;
CREATE INDEX IF NOT EXISTS idx_patients_student_id ON public.patients(student_id);

DROP INDEX IF EXISTS clinic_visits_student_id_idx;
CREATE INDEX IF NOT EXISTS clinic_visits_patient_id_idx ON public.clinic_visits(patient_id);

DROP INDEX IF EXISTS medical_records_student_id_idx;
CREATE INDEX IF NOT EXISTS medical_records_patient_id_idx ON public.medical_records(patient_id);

DROP INDEX IF EXISTS student_accident_reports_student_id_idx;
CREATE INDEX IF NOT EXISTS student_accident_reports_patient_id_idx ON public.student_accident_reports(patient_id);
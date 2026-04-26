-- Add 'kindergarten' to patients.education_level constraint
ALTER TABLE public.patients
DROP CONSTRAINT IF EXISTS patients_education_level_check;

ALTER TABLE public.patients
ADD CONSTRAINT patients_education_level_check CHECK (education_level IN ('kindergarten', 'basic', 'shs', 'college', 'n/a'));

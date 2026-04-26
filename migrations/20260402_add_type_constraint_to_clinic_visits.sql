-- Add CHECK constraint to type column to limit values to: IBED, College, SHS, Kindergarten
-- This ensures data integrity for visit type categorization

ALTER TABLE public.clinic_visits
ADD CONSTRAINT clinic_visits_type_check 
  CHECK (type IS NULL OR type = ANY (ARRAY['IBED'::text, 'College'::text, 'SHS'::text, 'Kindergarten'::text]));

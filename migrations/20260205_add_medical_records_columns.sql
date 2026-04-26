-- Add medical_records columns if missing
ALTER TABLE public.medical_records
  ADD COLUMN IF NOT EXISTS diagnosed_diseases text;

ALTER TABLE public.medical_records
  ADD COLUMN IF NOT EXISTS allergies text;

ALTER TABLE public.medical_records
  ADD COLUMN IF NOT EXISTS immunization_history text;

-- After running this migration, refresh the Supabase schema cache in the dashboard if needed.

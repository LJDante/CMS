-- Add zip_code column if missing
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS zip_code text;

-- After running this migration, refresh the Supabase schema cache in the dashboard if needed.

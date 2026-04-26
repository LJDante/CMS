-- Add year_level column if missing
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS year_level text;

-- After running this migration, refresh the Supabase schema cache in the dashboard if needed.

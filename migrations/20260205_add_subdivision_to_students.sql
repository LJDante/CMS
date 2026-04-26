-- Add subdivision column if missing
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS subdivision text;

-- After running this migration, refresh the Supabase schema cache in the dashboard if needed.

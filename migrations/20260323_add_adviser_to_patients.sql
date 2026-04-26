-- Add adviser (and optional fields for student attendance report) to patients table
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS adviser text;

-- Optional: create index for faster lookup by adviser
CREATE INDEX IF NOT EXISTS patients_adviser_idx ON public.patients (adviser);

-- Create dental_repository table
CREATE TABLE IF NOT EXISTS public.dental_repository (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  form_type text NOT NULL CHECK (form_type IN ('dental_health_record', 'dental_health_referral')),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dental_repository ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Clinic staff can read dental records" ON public.dental_repository;
DROP POLICY IF EXISTS "Clinic staff can create dental records" ON public.dental_repository;
DROP POLICY IF EXISTS "Clinic staff can delete dental records" ON public.dental_repository;

-- Create policies
CREATE POLICY "Clinic staff can read dental records"
  ON public.dental_repository
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can create dental records"
  ON public.dental_repository
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND uploaded_by = auth.uid());

CREATE POLICY "Clinic staff can delete dental records"
  ON public.dental_repository
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS dental_repository_patient_id_idx ON public.dental_repository(patient_id);
CREATE INDEX IF NOT EXISTS dental_repository_form_type_idx ON public.dental_repository(form_type);
CREATE INDEX IF NOT EXISTS dental_repository_uploaded_at_idx ON public.dental_repository(uploaded_at DESC);

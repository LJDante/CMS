-- FOOLPROOF: Completely reset and recreate
DROP TABLE IF EXISTS public.accident_report_repository CASCADE;

CREATE TABLE public.accident_report_repository (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accident_report_repository ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies
CREATE POLICY "read_all"
  ON public.accident_report_repository FOR SELECT
  USING (true);

CREATE POLICY "insert_own"
  ON public.accident_report_repository FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "delete_own"
  ON public.accident_report_repository FOR DELETE
  USING (uploaded_by = auth.uid());

CREATE INDEX accident_report_repository_patient_id_idx ON public.accident_report_repository(patient_id);
CREATE INDEX accident_report_repository_uploaded_at_idx ON public.accident_report_repository(uploaded_at DESC);

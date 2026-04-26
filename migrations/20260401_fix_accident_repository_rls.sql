-- Drop and recreate like dental_repository
DROP TABLE IF EXISTS public.accident_report_repository CASCADE;

-- Create table exactly like dental_repository
CREATE TABLE public.accident_report_repository (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accident_report_repository ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Clinic staff can read accident reports" ON public.accident_report_repository;
DROP POLICY IF EXISTS "Clinic staff can create accident reports" ON public.accident_report_repository;
DROP POLICY IF EXISTS "Clinic staff can delete accident reports" ON public.accident_report_repository;

-- Create policies (exactly like dental_repository)
CREATE POLICY "Clinic staff can read accident reports"
  ON public.accident_report_repository
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can create accident reports"
  ON public.accident_report_repository
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND uploaded_by = auth.uid());

CREATE POLICY "Clinic staff can delete accident reports"
  ON public.accident_report_repository
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create indexes for better query performance
CREATE INDEX accident_report_repository_patient_id_idx ON public.accident_report_repository(patient_id);
CREATE INDEX accident_report_repository_uploaded_at_idx ON public.accident_report_repository(uploaded_at DESC);

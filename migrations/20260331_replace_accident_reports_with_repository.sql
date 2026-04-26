-- Completely drop and recreate the table to ensure fresh state
DROP TABLE IF EXISTS public.accident_report_repository CASCADE;
DROP TABLE IF EXISTS public.student_accident_reports CASCADE;

-- Create accident_report_repository table for PDF storage
CREATE TABLE public.accident_report_repository (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX accident_report_repository_patient_id_idx ON public.accident_report_repository(patient_id);
CREATE INDEX accident_report_repository_uploaded_at_idx ON public.accident_report_repository(uploaded_at DESC);
CREATE INDEX accident_report_repository_uploaded_by_idx ON public.accident_report_repository(uploaded_by);

-- Do NOT enable RLS - all authenticated staff have access
-- RLS remains disabled for this internal clinic management table

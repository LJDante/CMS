-- Add attendance tracking columns to clinic_visits table
-- These fields track entrance/exit events and vital information for daily attendance reports

ALTER TABLE public.clinic_visits 
ADD COLUMN IF NOT EXISTS entrance_time timestamptz,
ADD COLUMN IF NOT EXISTS exit_time timestamptz,
ADD COLUMN IF NOT EXISTS entry_type text check (entry_type in ('entrance', 'exit')),
ADD COLUMN IF NOT EXISTS temperature numeric(5,2),
ADD COLUMN IF NOT EXISTS commuter_status text check (commuter_status in ('commuter', 'non-commuter')),
ADD COLUMN IF NOT EXISTS place_name text;

-- Create index for faster queries on visit_date and entrance_time for attendance reports
CREATE INDEX IF NOT EXISTS clinic_visits_visit_date_entrance_idx 
ON public.clinic_visits(visit_date, entrance_time);

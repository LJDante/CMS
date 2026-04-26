-- Add assigned medical staff fields to clinic_visits table
-- This allows booking of specific doctors and staff to clinic visits

-- Columns may already exist, so we check and skip if they do
ALTER TABLE public.clinic_visits
ADD COLUMN IF NOT EXISTS assigned_doctor uuid,
ADD COLUMN IF NOT EXISTS assigned_staff uuid;

-- Drop existing constraints if they exist
ALTER TABLE public.clinic_visits
DROP CONSTRAINT IF EXISTS clinic_visits_assigned_doctor_fkey,
DROP CONSTRAINT IF EXISTS clinic_visits_assigned_staff_fkey;

-- Add foreign key constraints
ALTER TABLE public.clinic_visits
ADD CONSTRAINT clinic_visits_assigned_doctor_fkey 
  FOREIGN KEY (assigned_doctor) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL,
ADD CONSTRAINT clinic_visits_assigned_staff_fkey 
  FOREIGN KEY (assigned_staff) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- Enable RLS if not already enabled
ALTER TABLE public.clinic_visits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "clinic_visits_select_assigned_fields" ON public.clinic_visits;
DROP POLICY IF EXISTS "clinic_visits_update_assigned_fields" ON public.clinic_visits;
DROP POLICY IF EXISTS "clinic_visits_insert_assigned_fields" ON public.clinic_visits;
DROP POLICY IF EXISTS "clinic_visits_delete_assigned_fields" ON public.clinic_visits;

-- Create comprehensive RLS policies for clinic visits
CREATE POLICY "clinic_visits_select_assigned_fields" ON public.clinic_visits
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "clinic_visits_insert_assigned_fields" ON public.clinic_visits
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "clinic_visits_update_assigned_fields" ON public.clinic_visits
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "clinic_visits_delete_assigned_fields" ON public.clinic_visits
  FOR DELETE TO authenticated
  USING (true);

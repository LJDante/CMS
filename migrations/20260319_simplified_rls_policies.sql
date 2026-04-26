-- Simplified RLS policies that allow all authenticated users to read/write all data
-- This is easier to debug than role-based policies

-- ===== PATIENTS TABLE =====
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic staff can read patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic staff can create patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic staff can update patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic staff can delete patients" ON public.patients;

CREATE POLICY "Allow all authenticated users"
  ON public.patients
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ===== CLINIC_VISITS TABLE =====
ALTER TABLE public.clinic_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic staff can read clinic visits" ON public.clinic_visits;
DROP POLICY IF EXISTS "Clinic staff can create clinic visits" ON public.clinic_visits;
DROP POLICY IF EXISTS "Clinic staff can update clinic visits" ON public.clinic_visits;
DROP POLICY IF EXISTS "Clinic staff can delete clinic visits" ON public.clinic_visits;

CREATE POLICY "Allow all authenticated users"
  ON public.clinic_visits
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ===== MEDICAL_RECORDS TABLE =====
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic staff can read medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Clinic staff can create medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Clinic staff can update medical records" ON public.medical_records;

CREATE POLICY "Allow all authenticated users"
  ON public.medical_records
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ===== INVENTORY TABLE =====
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic staff can read inventory" ON public.inventory;
DROP POLICY IF EXISTS "Clinic staff can create inventory" ON public.inventory;
DROP POLICY IF EXISTS "Clinic staff can update inventory" ON public.inventory;
DROP POLICY IF EXISTS "Clinic staff can delete inventory" ON public.inventory;

CREATE POLICY "Allow all authenticated users"
  ON public.inventory
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ===== SUPPLY_REQUESTS TABLE =====
ALTER TABLE public.supply_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic staff can read supply requests" ON public.supply_requests;
DROP POLICY IF EXISTS "Clinic staff can create supply requests" ON public.supply_requests;
DROP POLICY IF EXISTS "Clinic staff can update supply requests" ON public.supply_requests;

CREATE POLICY "Allow all authenticated users"
  ON public.supply_requests
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ===== SUPPLY_REQUEST_ITEMS TABLE =====
ALTER TABLE public.supply_request_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic staff can read supply request items" ON public.supply_request_items;
DROP POLICY IF EXISTS "Clinic staff can create supply request items" ON public.supply_request_items;
DROP POLICY IF EXISTS "Clinic staff can delete supply request items" ON public.supply_request_items;

CREATE POLICY "Allow all authenticated users"
  ON public.supply_request_items
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ===== STUDENT_ACCIDENT_REPORTS TABLE =====
ALTER TABLE public.student_accident_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic staff can read accident reports" ON public.student_accident_reports;
DROP POLICY IF EXISTS "Clinic staff can create accident reports" ON public.student_accident_reports;
DROP POLICY IF EXISTS "Clinic staff can update accident reports" ON public.student_accident_reports;
DROP POLICY IF EXISTS "Clinic staff can delete accident reports" ON public.student_accident_reports;

CREATE POLICY "Allow all authenticated users"
  ON public.student_accident_reports
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ===== CONSULTATIONS TABLE =====
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated users" ON public.consultations;

CREATE POLICY "Allow all authenticated users"
  ON public.consultations
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ===== STAFF_SCHEDULES TABLE =====
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic staff can read schedules" ON public.staff_schedules;
DROP POLICY IF EXISTS "Clinic staff can create schedules" ON public.staff_schedules;
DROP POLICY IF EXISTS "Clinic staff can update schedules" ON public.staff_schedules;
DROP POLICY IF EXISTS "Clinic staff can delete schedules" ON public.staff_schedules;

CREATE POLICY "Allow all authenticated users"
  ON public.staff_schedules
  FOR ALL
  USING (auth.uid() IS NOT NULL);

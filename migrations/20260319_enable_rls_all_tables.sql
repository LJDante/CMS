-- Enable RLS on all tables and create appropriate policies

-- ===== PATIENTS TABLE =====
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic staff can read patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic staff can create patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic staff can update patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic staff can delete patients" ON public.patients;

CREATE POLICY "Clinic staff can read patients"
  ON public.patients
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can create patients"
  ON public.patients
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can update patients"
  ON public.patients
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can delete patients"
  ON public.patients
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ===== CLINIC_VISITS TABLE =====
ALTER TABLE public.clinic_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic staff can read clinic visits" ON public.clinic_visits;
DROP POLICY IF EXISTS "Clinic staff can create clinic visits" ON public.clinic_visits;
DROP POLICY IF EXISTS "Clinic staff can update clinic visits" ON public.clinic_visits;
DROP POLICY IF EXISTS "Clinic staff can delete clinic visits" ON public.clinic_visits;

CREATE POLICY "Clinic staff can read clinic visits"
  ON public.clinic_visits
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can create clinic visits"
  ON public.clinic_visits
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can update clinic visits"
  ON public.clinic_visits
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can delete clinic visits"
  ON public.clinic_visits
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ===== MEDICAL_RECORDS TABLE =====
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic staff can read medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Clinic staff can create medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Clinic staff can update medical records" ON public.medical_records;

CREATE POLICY "Clinic staff can read medical records"
  ON public.medical_records
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can create medical records"
  ON public.medical_records
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can update medical records"
  ON public.medical_records
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ===== INVENTORY TABLE =====
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic staff can read inventory" ON public.inventory;
DROP POLICY IF EXISTS "Clinic staff can create inventory" ON public.inventory;
DROP POLICY IF EXISTS "Clinic staff can update inventory" ON public.inventory;
DROP POLICY IF EXISTS "Clinic staff can delete inventory" ON public.inventory;

CREATE POLICY "Clinic staff can read inventory"
  ON public.inventory
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can create inventory"
  ON public.inventory
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can update inventory"
  ON public.inventory
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can delete inventory"
  ON public.inventory
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ===== SUPPLY_REQUESTS TABLE =====
ALTER TABLE public.supply_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic staff can read supply requests" ON public.supply_requests;
DROP POLICY IF EXISTS "Clinic staff can create supply requests" ON public.supply_requests;
DROP POLICY IF EXISTS "Clinic staff can update supply requests" ON public.supply_requests;

CREATE POLICY "Clinic staff can read supply requests"
  ON public.supply_requests
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can create supply requests"
  ON public.supply_requests
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can update supply requests"
  ON public.supply_requests
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ===== SUPPLY_REQUEST_ITEMS TABLE =====
ALTER TABLE public.supply_request_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic staff can read supply request items" ON public.supply_request_items;
DROP POLICY IF EXISTS "Clinic staff can create supply request items" ON public.supply_request_items;
DROP POLICY IF EXISTS "Clinic staff can delete supply request items" ON public.supply_request_items;

CREATE POLICY "Clinic staff can read supply request items"
  ON public.supply_request_items
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can create supply request items"
  ON public.supply_request_items
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can delete supply request items"
  ON public.supply_request_items
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ===== CONSULTATIONS TABLE =====
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic staff can read consultations" ON public.consultations;
DROP POLICY IF EXISTS "Clinic staff can create consultations" ON public.consultations;
DROP POLICY IF EXISTS "Clinic staff can update consultations" ON public.consultations;
DROP POLICY IF EXISTS "Clinic staff can delete consultations" ON public.consultations;

CREATE POLICY "Clinic staff can read consultations"
  ON public.consultations
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can create consultations"
  ON public.consultations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can update consultations"
  ON public.consultations
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can delete consultations"
  ON public.consultations
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ===== STUDENT_ACCIDENT_REPORTS TABLE =====
ALTER TABLE public.student_accident_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic staff can read accident reports" ON public.student_accident_reports;
DROP POLICY IF EXISTS "Clinic staff can create accident reports" ON public.student_accident_reports;
DROP POLICY IF EXISTS "Clinic staff can update accident reports" ON public.student_accident_reports;
DROP POLICY IF EXISTS "Clinic staff can delete accident reports" ON public.student_accident_reports;

CREATE POLICY "Clinic staff can read accident reports"
  ON public.student_accident_reports
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can create accident reports"
  ON public.student_accident_reports
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can update accident reports"
  ON public.student_accident_reports
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can delete accident reports"
  ON public.student_accident_reports
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ===== STAFF_SCHEDULES TABLE =====
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic staff can read schedules" ON public.staff_schedules;
DROP POLICY IF EXISTS "Clinic staff can create schedules" ON public.staff_schedules;
DROP POLICY IF EXISTS "Clinic staff can update schedules" ON public.staff_schedules;
DROP POLICY IF EXISTS "Clinic staff can delete schedules" ON public.staff_schedules;

CREATE POLICY "Clinic staff can read schedules"
  ON public.staff_schedules
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can create schedules"
  ON public.staff_schedules
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can update schedules"
  ON public.staff_schedules
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can delete schedules"
  ON public.staff_schedules
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ===== PHYSICAL_EXAMINATIONS TABLE =====
ALTER TABLE public.physical_examinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic staff can read physical examinations" ON public.physical_examinations;
DROP POLICY IF EXISTS "Clinic staff can create physical examinations" ON public.physical_examinations;
DROP POLICY IF EXISTS "Clinic staff can update physical examinations" ON public.physical_examinations;
DROP POLICY IF EXISTS "Clinic staff can delete physical examinations" ON public.physical_examinations;

CREATE POLICY "Clinic staff can read physical examinations"
  ON public.physical_examinations
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can create physical examinations"
  ON public.physical_examinations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can update physical examinations"
  ON public.physical_examinations
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clinic staff can delete physical examinations"
  ON public.physical_examinations
  FOR DELETE
  USING (auth.role() = 'authenticated');

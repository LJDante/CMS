-- ============================================================================
-- School Clinic Accident Reporting System - SQL Schema (Normalized ERD)
-- For Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STUDENTS TABLE (Core Registry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL UNIQUE,
  first_name VARCHAR(255) NOT NULL,
  middle_name VARCHAR(255),
  last_name VARCHAR(255) NOT NULL,
  grade_level VARCHAR(50),
  section VARCHAR(50),
  program VARCHAR(255),
  year_level VARCHAR(50),
  date_of_birth DATE,
  sex CHAR(1) CHECK (sex IN ('M', 'F')),
  contact_number VARCHAR(20),
  guardian_name VARCHAR(255),
  guardian_contact VARCHAR(20),
  guardian_email VARCHAR(255),
  street VARCHAR(255),
  subdivision VARCHAR(255),
  barangay VARCHAR(255),
  city VARCHAR(255),
  province VARCHAR(255),
  zip_code VARCHAR(10),
  enrollment_status VARCHAR(50) DEFAULT 'active' CHECK (enrollment_status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for STUDENTS table
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_enrollment_status ON public.students(enrollment_status);

-- ============================================================================
-- ACCIDENT_REPORTS TABLE (Core Transaction Log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.accident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  accident_date DATE NOT NULL,
  accident_time TIME,
  location VARCHAR(255),
  place_of_accident VARCHAR(255),
  type_of_injury VARCHAR(255),
  description TEXT NOT NULL,
  body_parts_affected VARCHAR(255),
  severity VARCHAR(50) CHECK (severity IN ('minor', 'moderate', 'severe')),
  immediate_cause VARCHAR(255),
  how_accident_occurred TEXT,
  days_out_of_school INTEGER DEFAULT 0,
  teacher_in_charge VARCHAR(255),
  teacher_present VARCHAR(255),
  reported_by VARCHAR(255),
  first_aid_by VARCHAR(255),
  sent_to_home BOOLEAN DEFAULT false,
  sent_to_physician BOOLEAN DEFAULT false,
  sent_to_hospital BOOLEAN DEFAULT false,
  hospital_name VARCHAR(255),
  referred_to_physician BOOLEAN DEFAULT false,
  referred_to_hospital BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  notes TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for ACCIDENT_REPORTS table
CREATE INDEX IF NOT EXISTS idx_accident_reports_student_id ON public.accident_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_accident_reports_accident_date ON public.accident_reports(accident_date);
CREATE INDEX IF NOT EXISTS idx_accident_reports_severity ON public.accident_reports(severity);

-- ============================================================================
-- WITNESSES TABLE (Normalized - allows multiple witnesses per accident)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.witnesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accident_id UUID NOT NULL REFERENCES public.accident_reports(id) ON DELETE CASCADE,
  witness_name VARCHAR(255) NOT NULL,
  witness_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for WITNESSES table
CREATE INDEX IF NOT EXISTS idx_witnesses_accident_id ON public.witnesses(accident_id);

-- ============================================================================
-- NOTIFICATIONS TABLE (Audit & Communication Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accident_id UUID NOT NULL REFERENCES public.accident_reports(id) ON DELETE CASCADE,
  notified_person VARCHAR(255) NOT NULL,
  parent_notified BOOLEAN DEFAULT false,
  notification_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notification_method VARCHAR(50),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for NOTIFICATIONS table
CREATE INDEX IF NOT EXISTS idx_notifications_accident_id ON public.notifications(accident_id);
CREATE INDEX IF NOT EXISTS idx_notifications_notification_date ON public.notifications(notification_date);

-- ============================================================================
-- (OPTIONAL) Enable Row-Level Security
-- Uncomment below to enable RLS policies
-- ============================================================================
-- ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.accident_reports ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.witnesses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (uncomment and customize as needed):
-- CREATE POLICY "clinic_staff_read_all" ON public.students
--   FOR SELECT USING (auth.uid() IS NOT NULL);
-- 
-- CREATE POLICY "clinic_staff_manage_accidents" ON public.accident_reports
--   FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
-- 
-- CREATE POLICY "clinic_staff_manage_witnesses" ON public.witnesses
--   FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
-- 
-- CREATE POLICY "clinic_staff_manage_notifications" ON public.notifications
--   FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- END OF SCHEMA - Ready for Supabase SQL Editor
-- ============================================================================

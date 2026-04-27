-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.accident_report_repository (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT accident_report_repository_pkey PRIMARY KEY (id),
  CONSTRAINT accident_report_repository_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT accident_report_repository_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.clinic_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  visit_date date NOT NULL,
  complaint text NOT NULL,
  assessment text,
  treatment text,
  disposition text NOT NULL CHECK (disposition = ANY (ARRAY['returned_to_class'::text, 'sent_home'::text, 'referred'::text, 'other'::text])),
  referred_to text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  entrance_time timestamp with time zone,
  exit_time timestamp with time zone,
  entry_type text CHECK (entry_type = ANY (ARRAY['entrance'::text, 'exit'::text])),
  temperature numeric,
  commuter_status text CHECK (commuter_status = ANY (ARRAY['commuter'::text, 'non-commuter'::text])),
  place_name text,
  type text,
  assigned_doctor uuid,
  assigned_staff uuid,
  CONSTRAINT clinic_visits_pkey PRIMARY KEY (id),
  CONSTRAINT clinic_visits_assigned_doctor_fkey FOREIGN KEY (assigned_doctor) REFERENCES public.profiles(id),
  CONSTRAINT clinic_visits_assigned_staff_fkey FOREIGN KEY (assigned_staff) REFERENCES public.profiles(id),
  CONSTRAINT clinic_visits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT clinic_visits_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.consultation_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL,
  note_text text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT consultation_notes_pkey PRIMARY KEY (id),
  CONSTRAINT consultation_notes_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id),
  CONSTRAINT consultation_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.consultations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  patient_type text NOT NULL CHECK (patient_type = ANY (ARRAY['student'::text, 'personnel'::text])),
  patient_name text NOT NULL,
  grade_level text,
  section text,
  reason text NOT NULL,
  intervention text,
  actions_taken text,
  doctors_remarks text,
  diagnosis_result text,
  consultation_date timestamp without time zone NOT NULL,
  follow_up_date timestamp without time zone,
  prescription_images ARRAY,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  attending_staff_name text,
  doctor_name text,
  course text,
  year_level text,
  shs_track text,
  blood_pressure text,
  heart_rate integer CHECK (heart_rate IS NULL OR heart_rate > 0 AND heart_rate < 300),
  oxygen_saturation numeric CHECK (oxygen_saturation IS NULL OR oxygen_saturation >= 0::numeric AND oxygen_saturation <= 100::numeric),
  temperature numeric CHECK (temperature IS NULL OR temperature > 0::numeric AND temperature < 50::numeric),
  height_cm numeric CHECK (height_cm IS NULL OR height_cm > 0::numeric AND height_cm < 300::numeric),
  weight_kg numeric CHECK (weight_kg IS NULL OR weight_kg > 0::numeric AND weight_kg < 500::numeric),
  lmp date,
  medicines text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'follow_up'::text, 'cancelled'::text])),
  CONSTRAINT consultations_pkey PRIMARY KEY (id),
  CONSTRAINT consultations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT consultations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.dental_repository (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  form_type text NOT NULL CHECK (form_type = ANY (ARRAY['dental_health_record'::text, 'dental_health_referral'::text])),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dental_repository_pkey PRIMARY KEY (id),
  CONSTRAINT dental_repository_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT dental_repository_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['medicine'::text, 'supply'::text, 'equipment'::text])),
  unit text NOT NULL,
  quantity_on_hand integer NOT NULL DEFAULT 0,
  reorder_level integer,
  expiration_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  remarks text,
  CONSTRAINT inventory_pkey PRIMARY KEY (id)
);
CREATE TABLE public.medical_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  diagnosed_diseases text,
  allergies text,
  immunization_history text,
  last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_updated_by uuid,
  CONSTRAINT medical_records_pkey PRIMARY KEY (id),
  CONSTRAINT medical_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT medical_records_last_updated_by_fkey FOREIGN KEY (last_updated_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id character varying NOT NULL UNIQUE CHECK (patient_id::text ~ '^[0-9]{7}$'::text),
  patient_type text NOT NULL CHECK (patient_type = ANY (ARRAY['student'::text, 'personnel'::text])),
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  age integer,
  grade_level text,
  section text,
  education_level text CHECK (education_level = ANY (ARRAY['kindergarten'::text, 'k-12'::text, 'shs'::text, 'college'::text, 'n/a'::text])),
  program text,
  year_level text,
  date_of_birth date,
  sex character CHECK (sex::text = ANY (ARRAY['M'::text, 'F'::text])),
  contact_number character varying CHECK (contact_number::text ~ '^[0-9]{11}$'::text),
  guardian_name text,
  guardian_contact character varying CHECK (guardian_contact::text ~ '^[0-9]{11}$'::text),
  guardian_email character varying,
  enrollment_status text DEFAULT 'active'::text CHECK (enrollment_status = ANY (ARRAY['active'::text, 'inactive'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  adviser text,
  person_to_notify text,
  emergency_contact character varying CHECK (emergency_contact::text ~ '^[0-9]{11}$'::text),
  voucher_type text,
  address_field text,
  barangay text,
  city text,
  province text,
  zip_code character varying CHECK (zip_code::text ~ '^[0-9]{4}$'::text),
  shs_track text CHECK (shs_track = ANY (ARRAY['ABM'::text, 'HUMSS'::text, 'STEM'::text])),
  allergies text,
  diagnosed_diseases text,
  suffix text,
  father_suffix text CHECK (father_suffix = ANY (ARRAY['Jr.'::text, 'Sr.'::text, 'II'::text, 'III'::text, 'IV'::text])),
  mother_first_name text,
  mother_middle_name text,
  mother_last_name text,
  father_first_name text,
  father_middle_name text,
  father_last_name text,
  CONSTRAINT patients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.physical_examinations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  exam_date date NOT NULL,
  weight_kg numeric,
  height_cm numeric,
  bmi numeric DEFAULT 
CASE
    WHEN (height_cm > (0)::numeric) THEN round((weight_kg / ((height_cm / (100)::numeric) * (height_cm / (100)::numeric))), 2)
    ELSE NULL::numeric
END,
  blood_pressure text,
  past_illness text,
  present_illness text,
  vaccination_status text CHECK (vaccination_status = ANY (ARRAY['complete'::text, 'incomplete'::text])),
  remarks text,
  examined_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT physical_examinations_pkey PRIMARY KEY (id),
  CONSTRAINT physical_examinations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT physical_examinations_examined_by_fkey FOREIGN KEY (examined_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['clinic_staff'::text, 'clinic_admin'::text, 'clinic_doctor'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  email text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.recurring_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  days_of_week ARRAY NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recurring_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT recurring_schedules_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.staff_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  schedule_date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT staff_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT staff_schedules_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.supply_request_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  inventory_id uuid NOT NULL,
  quantity integer NOT NULL,
  CONSTRAINT supply_request_items_pkey PRIMARY KEY (id),
  CONSTRAINT supply_request_items_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.supply_requests(id),
  CONSTRAINT supply_request_items_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(id)
);
CREATE TABLE public.supply_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'fulfilled'::text])),
  needed_by date,
  notes text,
  fulfilled_at timestamp with time zone,
  CONSTRAINT supply_requests_pkey PRIMARY KEY (id),
  CONSTRAINT supply_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id)
);
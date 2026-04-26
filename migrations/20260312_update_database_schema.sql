-- Updated schema with refined accident reports structure
-- Run this migration to update your database schema

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('clinic_staff', 'clinic_admin', 'clinic_doctor')),
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_id text not null unique,
  patient_type text not null check (patient_type in ('student', 'personnel')),
  first_name text not null,
  middle_name text,
  last_name text not null,
  age integer,
  grade_level text,
  section text,
  education_level text check (education_level in ('basic', 'shs', 'college', 'n/a')),
  program text,
  year_level text,
  date_of_birth date,
  sex text check (sex in ('M', 'F')),
  contact_number text,
  guardian_name text,
  guardian_contact text,
  guardian_email text,
  house_unit text,
  street text,
  subdivision text,
  barangay text,
  city text,
  zip_code text,
  province text,
  enrollment_status text default 'active' check (enrollment_status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- Clinic visits
create table if not exists public.clinic_visits (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  visit_date date not null,
  complaint text not null,
  assessment text,
  treatment text,
  disposition text not null check (disposition in ('returned_to_class', 'sent_home', 'referred', 'other')),
  referred_to text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Medical records (high-level history)
create table if not exists public.medical_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  diagnosed_diseases text,
  allergies text,
  immunization_history text,
  last_updated_at timestamptz not null default now(),
  last_updated_by uuid references public.profiles(id)
);

-- Inventory (medicines, supplies, equipment)
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('medicine', 'supply', 'equipment')),
  unit text not null,
  quantity_on_hand integer not null default 0,
  reorder_level integer,
  expiration_date date,
  created_at timestamptz not null default now()
);

-- Supply requests
create table if not exists public.supply_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id),
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'fulfilled')),
  needed_by date,
  notes text
);

-- Items per supply request, linked to inventory
create table if not exists public.supply_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.supply_requests(id) on delete cascade,
  inventory_id uuid not null references public.inventory(id),
  quantity integer not null
);

-- Staff schedules
create table if not exists public.staff_schedules (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles(id) on delete cascade,
  schedule_date date not null,
  start_time time not null,
  end_time time not null,
  is_available boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_schedules_staff_id_idx on public.staff_schedules(staff_id);
create index if not exists staff_schedules_date_idx on public.staff_schedules(schedule_date);
create index if not exists staff_schedules_staff_date_idx on public.staff_schedules(staff_id, schedule_date);

-- Student accident reports (updated schema)
create table if not exists public.student_accident_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,

  -- When & where
  accident_date date not null,
  time_of_accident time,
  place_of_accident text,

  -- What happened
  description text not null,
  how_accident_occurred text,
  immediate_cause text,

  -- Injury details
  type_of_injury text,
  body_parts_affected text,
  severity text check (severity in ('minor', 'moderate', 'severe')),

  -- Witness
  witness_name text,
  witness_address text,

  -- Actions taken
  action_by_nurse boolean default false,
  sent_home boolean default false,
  referred_to_physician boolean default false,
  referred_to_hospital boolean default false,
  other_action text,

  -- Follow-up
  parent_notified boolean default false,
  parent_notification_date date,
  follow_up_notes text,
  notes text,

  -- Administrative
  reported_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_accident_reports_student_id_idx on public.student_accident_reports(student_id);

-- Migration: Update old accident_reports columns to new schema
-- Uncomment and run if migrating from old schema
/*
BEGIN;

-- Rename location column if it exists
ALTER TABLE public.student_accident_reports
  RENAME COLUMN location TO place_of_accident;

-- Add new witness columns if they don't exist
ALTER TABLE public.student_accident_reports
  ADD COLUMN IF NOT EXISTS witness_name text;

ALTER TABLE public.student_accident_reports
  ADD COLUMN IF NOT EXISTS witness_address text;

-- Drop old witnesses column if it exists (backup data first if needed)
ALTER TABLE public.student_accident_reports
  DROP COLUMN IF EXISTS witnesses;

COMMIT;
*/

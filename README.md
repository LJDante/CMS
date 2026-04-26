# School Clinic Management Information System (SCMIS)

Web-based La Consolacion College-Biñan built with **React + Vite + TypeScript** and **Supabase** (PostgreSQL, Auth, Storage).

## Features

- **Authentication & Roles**: Supabase Auth with `clinic_staff`, `clinic_admin`, and `clinic_doctor` roles (stored in `profiles` table).
- **Students**: Clinic-only registry of students, separate from the main school information system.
- **Clinic Visits**: Log daily visits, complaints, assessment, treatment, and disposition.
- **Medical Records**: Extendable via `medical_records` table for history/allergies/immunizations.
- **Inventory**: Track medicines, supplies, and equipment; basic low-stock indication and duplicate prevention.
- **Supply Requests**: Record requests for replenishment, independent of the school inventory system.
- **Accident Reports**: Document student accidents/injuries with detailed injury information and actions taken.
- **Staff Scheduling**: Manage doctor and staff availability with calendar view and create/edit/delete functionality.
- **Reports**: Year-end summary of visits by disposition.

The system is entirely software-based and **does not require any hardware components** or integration with the school's existing system.

## Tech Stack

- React 18, TypeScript, Vite
- Tailwind CSS
- Supabase:
  - PostgreSQL (data storage)
  - Auth (email/password, roles in `profiles`)
  - Storage (for medical documents, not yet wired in UI)

## Environment Setup

Create a `.env.local` (or `.env`) file in the project root with:

```bash
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Supabase Schema (SQL)

*NOTE: if your Supabase project was previously used for a dental module, you may still have leftover tables or columns prefixed with `dental_`. the application no longer uses these and they can be safely removed.*

You can execute the following snippet in the Supabase SQL editor to drop any unwanted dental objects before creating the current schema. adjust table/column names as needed:

```sql
-- remove legacy dental tables (will succeed even if they don't exist)
-- include the ones you encountered in the screenshot below:
drop table if exists public.dental_treatment_records;
drop table if exists public.dental_records;
drop table if exists public.dental_referral_forms;
-- any other legacy tables can be added here as needed

-- remove any dental columns on existing tables
alter table public.students drop column if exists dental_history;
alter table public.students drop column if exists last_dental_visit;

-- helper query to inspect remaining "dental" objects
-- select tablename from pg_tables where tablename ilike '%dental%';
```

Run this in Supabase SQL editor / migration to create the core tables:

```sql
-- Profiles (one-to-one with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('clinic_staff', 'clinic_admin', 'clinic_doctor')),
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  patient_id varchar(7) not null unique check (patient_id ~ '^\\d{7}$'),
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
  contact_number varchar(11) check (contact_number ~ '^\\d{11}$'),
  guardian_name text,
  guardian_contact varchar(11) check (guardian_contact ~ '^\\d{11}$'),
  guardian_email text,
  house_unit text,
  street text,
  subdivision text,
  barangay text,
  city text,
  zip_code varchar(4) check (zip_code ~ '^\\d{4}$'),
  province text,
  enrollment_status text default 'active' check (enrollment_status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- If your Supabase database reports that the `age` column or other address columns (e.g., `barangay`) are missing on the `patients` table, you can add them with this migration (run in the Supabase SQL editor or in your migration pipeline):
-- NOTE: the app expects `age` as an integer column; `barangay` as text
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS age integer;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS barangay text;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS zip_code text;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS education_level text;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS guardian_email text;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS house_unit text;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS street text;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS subdivision text;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS middle_name text;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS patient_type text;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS program text;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS year_level text;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS province text;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS enrollment_status text default 'active' check (enrollment_status in ('active', 'inactive'));

-- If your Supabase database reports that the `diagnosed_diseases` column or other columns are missing on the `medical_records` table, add them with this migration:
ALTER TABLE public.medical_records
  ADD COLUMN IF NOT EXISTS diagnosed_diseases text;

ALTER TABLE public.medical_records
  ADD COLUMN IF NOT EXISTS allergies text;

ALTER TABLE public.medical_records
  ADD COLUMN IF NOT EXISTS immunization_history text;

-- If your Supabase database reports that columns are missing on the `student_accident_reports` table,
-- add them with the statements below (run in the Supabase SQL editor or in your migration pipeline):
ALTER TABLE public.student_accident_reports
  ADD COLUMN IF NOT EXISTS type_of_injury text,
  ADD COLUMN IF NOT EXISTS body_parts_affected text,
  ADD COLUMN IF NOT EXISTS time_of_accident time,
  ADD COLUMN IF NOT EXISTS place_of_accident text,
  ADD COLUMN IF NOT EXISTS how_accident_occurred text,
  ADD COLUMN IF NOT EXISTS witness_name text,
  ADD COLUMN IF NOT EXISTS witness_address text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS immediate_cause text,
  ADD COLUMN IF NOT EXISTS action_by_nurse boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sent_home boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS referred_to_physician boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS referred_to_hospital boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS other_action text,
  ADD COLUMN IF NOT EXISTS parent_notified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_notification_date date,
  ADD COLUMN IF NOT EXISTS follow_up_notes text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS reported_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();


-- Clinic visits
create table if not exists public.clinic_visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
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

### ⭐ NEW: Consultations Table

-- Consultations (new module)
create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  patient_external_id varchar(7) not null,
  patient_type text not null check (patient_type in ('student', 'personnel')),
  patient_name text not null,
  grade_level text,
  section text,
  reason text not null,
  intervention text,
  actions_taken text,
  doctors_remarks text,
  diagnosis_result text,
  consultation_date timestamp not null,
  follow_up_date timestamp,
  prescription_images text[],
  attending_staff_name text,
  doctor_name text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Storage bucket for prescription images
-- Run migration: 20260322_create_prescriptions_storage.sql
-- Bucket: prescriptions (public access for image viewing)

-- README fields for consultations
--
-- student / employee information
--   name: patient_name
--   patient id: patient_external_id
--   grade level: grade_level
--   section: section
-- consultation details
--   reasons: reason
--   medicine / intervention: intervention
--   actions taken: actions_taken
--   doctor's remarks: doctors_remarks
--   diagnosis result: diagnosis_result
--   consultation date: consultation_date
--   follow-up date: follow_up_date
--   prescription / treatment images: prescription_images

-- Consultation Notes (linked to consultations for follow-up documentation)
create table if not exists public.consultation_notes (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  note_text text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Physical Examinations
create table if not exists public.physical_examinations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  exam_date date not null,
  weight_kg numeric,
  height_cm numeric,
  bmi numeric generated always as (
    case
      when weight_kg is not null and height_cm is not null and height_cm > 0
      then round((weight_kg / ((height_cm / 100) * (height_cm / 100)))::numeric, 2)
      else null
    end
  ) stored,
  blood_pressure text,
  past_illness text,
  present_illness text,
  vaccination_status text check (vaccination_status in ('complete', 'incomplete')),
  remarks text,
  examined_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Medical records (high-level history)
create table if not exists public.medical_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
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

-- Optional: items per supply request, linked to inventory
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

-- Student accident reports
create table if not exists public.student_accident_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  
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
  updated_at timestamptz not null default now(),
  
  constraint fk_patient foreign key(patient_id) references public.patients(id) on delete cascade
);

-- Create index on patient_id for faster queries
create index if not exists student_accident_reports_patient_id_idx on public.student_accident_reports(patient_id);
```

-- Provisioning helper: copy the SQL below into the Supabase SQL editor
-- to allow the `clinic_doctor` role and create/update a profile for
-- an existing auth user.
-- Copy the SQL below into the Supabase SQL editor (requires an admin session).

```sql
-- Safe: find and drop any check constraint that references the `role` column
DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', cname);
  END IF;
END$$;

-- Add updated check constraint including clinic_doctor
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('clinic_staff','clinic_admin','clinic_doctor'));

-- Option A: Create/update a profile by user email (replace <user-email> and <Full Name>)
WITH u AS (
  SELECT id FROM auth.users WHERE email = '<user-email>'
)
INSERT INTO public.profiles (id, full_name, role)
SELECT id, '<Full Name>', 'clinic_doctor' FROM u
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- Option B: If you already know the auth user UUID, replace <auth-user-uuid> below
-- INSERT INTO public.profiles (id, full_name, role)
-- VALUES ('<auth-user-uuid>', 'Dr. Example', 'clinic_doctor')
-- ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;
```

## 🔧 Database Troubleshooting

> **⚠️ Important**: If you encounter database errors like "null value in column" or "column does not exist", use these diagnostic queries to identify and fix schema issues.

### 📋 Check Table Structure
```sql
-- Check the current structure of the patients table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'patients' AND table_schema = 'public' 
ORDER BY ordinal_position;
```

### 🔗 Check Foreign Key Constraints
```sql
-- Check foreign key constraints
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE 
    constraint_type = 'FOREIGN KEY' 
    AND (tc.table_name = 'patients' OR ccu.table_name = 'patients');
```

### 🔍 Check for Null Values
```sql
-- Check for patients with null patient_id
SELECT id, patient_id, patient_type, first_name, last_name 
FROM public.patients 
WHERE patient_id IS NULL 
LIMIT 5;
```

### 🛠️ Fix Missing Columns
```sql
-- Add missing patient_id column if it doesn't exist
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS patient_id varchar(7);

-- Add other potentially missing columns
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS patient_type text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS date_of_birth date;
```

### Row-Level Security (RLS) – high level

Enable RLS on all tables and add policies such as:

```sql
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.clinic_visits enable row level security;
alter table public.medical_records enable row level security;
alter table public.inventory enable row level security;
alter table public.supply_requests enable row level security;
alter table public.supply_request_items enable row level security;
alter table public.student_accident_reports enable row level security;
alter table public.staff_schedules enable row level security;

-- Example: clinic staff can read/write core clinic tables
create policy "clinic_staff_read_write" on public.patients
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
```

Adjust policies to your school's requirements (e.g. restrict some actions to `clinic_admin`).

### Staff Schedules Setup

If you need to add or update the staff schedules feature, run this in the Supabase SQL editor:

```sql
-- Staff schedules table for managing doctor/staff availability
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

-- Create indexes for faster queries
create index if not exists staff_schedules_staff_id_idx on public.staff_schedules(staff_id);
create index if not exists staff_schedules_date_idx on public.staff_schedules(schedule_date);
create index if not exists staff_schedules_staff_date_idx on public.staff_schedules(staff_id, schedule_date);
```

## Running the App

```bash
npm install
npm run dev
```

Then open the printed `http://localhost:5173` URL in your browser.


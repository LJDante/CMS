-- Create physical_examinations table
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

-- Create index for better performance
create index if not exists physical_examinations_patient_id_idx on public.physical_examinations(patient_id);
create index if not exists physical_examinations_exam_date_idx on public.physical_examinations(exam_date);
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

-- Create index on staff_id and schedule_date for faster queries
create index if not exists staff_schedules_staff_id_idx on public.staff_schedules(staff_id);
create index if not exists staff_schedules_date_idx on public.staff_schedules(schedule_date);
create index if not exists staff_schedules_staff_date_idx on public.staff_schedules(staff_id, schedule_date);

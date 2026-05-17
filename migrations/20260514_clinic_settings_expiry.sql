-- Clinic-wide settings (key/value). Used for inventory expiry warning threshold.
create table if not exists public.clinic_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

comment on table public.clinic_settings is 'Application-wide settings; e.g. expiry_warning_days';

insert into public.clinic_settings (key, value)
values ('expiry_warning_days', '30')
on conflict (key) do nothing;

alter table public.clinic_settings enable row level security;

drop policy if exists "Allow all authenticated users" on public.clinic_settings;

create policy "Allow all authenticated users"
  on public.clinic_settings
  for all
  using (auth.uid() is not null);

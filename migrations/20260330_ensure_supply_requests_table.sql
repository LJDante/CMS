-- Ensure supply_requests table exists
create table if not exists public.supply_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id),
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'fulfilled')),
  needed_by date,
  notes text,
  fulfilled_at timestamptz
);

-- Ensure supply_request_items table exists
create table if not exists public.supply_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.supply_requests(id) on delete cascade,
  inventory_id uuid not null references public.inventory(id),
  quantity integer not null
);

-- Enable RLS
ALTER TABLE public.supply_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_request_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Clinic staff can read supply requests" ON public.supply_requests;
DROP POLICY IF EXISTS "Clinic staff can create supply requests" ON public.supply_requests;
DROP POLICY IF EXISTS "Clinic staff can update supply requests" ON public.supply_requests;
DROP POLICY IF EXISTS "Clinic staff can read supply request items" ON public.supply_request_items;
DROP POLICY IF EXISTS "Clinic staff can create supply request items" ON public.supply_request_items;
DROP POLICY IF EXISTS "Clinic staff can delete supply request items" ON public.supply_request_items;

-- Create policies
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
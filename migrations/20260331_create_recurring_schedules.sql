-- Create recurring schedules table
CREATE TABLE public.recurring_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  days_of_week text[] NOT NULL, -- Array of day names: ['Monday', 'Tuesday', etc.]
  is_available boolean NOT NULL DEFAULT true,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recurring_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT recurring_schedules_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX idx_recurring_schedules_staff_id ON public.recurring_schedules(staff_id);
CREATE INDEX idx_recurring_schedules_is_active ON public.recurring_schedules(is_active);

-- Enable RLS
ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring schedules
CREATE POLICY "Allow viewing all recurring schedules"
  ON public.recurring_schedules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow creating recurring schedules"
  ON public.recurring_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow updating recurring schedules"
  ON public.recurring_schedules
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow deleting recurring schedules"
  ON public.recurring_schedules
  FOR DELETE
  TO authenticated
  USING (true);

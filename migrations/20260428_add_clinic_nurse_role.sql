-- Add clinic_nurse role to profiles constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY[
  'clinic_staff'::text,
  'clinic_nurse'::text,
  'clinic_admin'::text,
  'clinic_doctor'::text
]));

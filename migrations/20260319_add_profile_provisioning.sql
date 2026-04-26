-- Create function to automatically create profile when user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role text;
  user_name text;
BEGIN
  -- Extract role from metadata, defaulting to 'clinic_staff'
  user_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'clinic_staff'
  );
  
  -- Validate role
  IF user_role NOT IN ('clinic_staff', 'clinic_admin', 'clinic_doctor') THEN
    user_role := 'clinic_staff';
  END IF;
  
  -- Extract name from metadata or use email
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    'User'
  );
  
  -- Insert profile
  BEGIN
    INSERT INTO public.profiles (id, full_name, role, created_at)
    VALUES (NEW.id, user_name, user_role, NOW());
  EXCEPTION WHEN unique_violation THEN
    -- Profile already exists, do nothing
    NULL;
  END;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Provision all existing users without profiles
INSERT INTO public.profiles (id, full_name, role, created_at)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email, 'User'),
  'clinic_staff',
  created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

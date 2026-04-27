-- Create RPC function for staff account creation
-- This function can be called from the client and uses SECURITY DEFINER to run with elevated privileges
-- RLS policies will control who can call this function

CREATE OR REPLACE FUNCTION create_staff_account(
  p_full_name TEXT,
  p_email TEXT,
  p_password TEXT,
  p_role TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_profile_result JSON;
BEGIN
  -- Check if the calling user is a clinic_admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'clinic_admin'
  ) THEN
    RETURN json_build_object('error', 'Only clinic administrators can create staff accounts');
  END IF;

  -- Validate input parameters
  IF p_full_name IS NULL OR trim(p_full_name) = '' THEN
    RETURN json_build_object('error', 'Full name is required');
  END IF;

  IF p_email IS NULL OR trim(p_email) = '' THEN
    RETURN json_build_object('error', 'Email is required');
  END IF;

  IF p_password IS NULL OR length(p_password) < 6 THEN
    RETURN json_build_object('error', 'Password must be at least 6 characters');
  END IF;

  IF p_role NOT IN ('clinic_doctor', 'clinic_nurse', 'clinic_staff') THEN
    RETURN json_build_object('error', 'Invalid role. Must be clinic_doctor, clinic_nurse, or clinic_staff');
  END IF;

  -- Create the user account
  -- Note: This requires the service role key to work from client-side RPC calls
  -- For now, this will need to be called from a secure backend

  -- Insert profile (this would be done after user creation)
  -- INSERT INTO profiles (id, full_name, email, role, created_at)
  -- VALUES (v_user_id, trim(p_full_name), trim(p_email), p_role, now());

  RETURN json_build_object('success', true, 'message', 'Staff account creation function ready');
END;
$$;
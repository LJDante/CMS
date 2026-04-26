-- Migration: Update education_level from 'basic' to 'k-12'
-- Date: 2026-04-14
-- Description: Updates all existing patient records where education_level is 'basic' to 'k-12'
--              and updates database constraint to accept 'k-12' instead of 'basic'

-- Step 1: Update all existing records from 'basic' to 'k-12'
UPDATE patients
SET education_level = 'k-12'
WHERE education_level = 'basic';

-- Step 2: Drop the old CHECK constraint
ALTER TABLE patients
DROP CONSTRAINT IF EXISTS patients_education_level_check;

-- Step 3: Add the new CHECK constraint with 'k-12' instead of 'basic'
ALTER TABLE patients
ADD CONSTRAINT patients_education_level_check 
CHECK (education_level = ANY (ARRAY['kindergarten'::text, 'elementary'::text, 'junior-high-school'::text, 'k-12'::text, 'shs'::text, 'college'::text, 'n/a'::text]));

-- Step 4: Verify the update
SELECT COUNT(*) as updated_count
FROM patients
WHERE education_level = 'k-12';

-- Step 5: Check if any 'basic' values remain (should return 0)
SELECT COUNT(*) as remaining_basic
FROM patients
WHERE education_level = 'basic';

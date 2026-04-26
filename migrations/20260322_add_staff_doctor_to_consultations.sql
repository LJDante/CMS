-- Add attending staff and doctor name columns to consultations table
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS attending_staff_name TEXT,
ADD COLUMN IF NOT EXISTS doctor_name TEXT;
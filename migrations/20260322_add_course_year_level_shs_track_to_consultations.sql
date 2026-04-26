-- Add course, year_level, and shs_track columns to consultations table
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS course TEXT,
ADD COLUMN IF NOT EXISTS year_level TEXT,
ADD COLUMN IF NOT EXISTS shs_track TEXT;
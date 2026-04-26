-- Add status column to consultations table
ALTER TABLE consultations ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'follow_up', 'cancelled'));
-- Add time to consultation_date column (using timestamp without timezone for local time)
ALTER TABLE consultations
ALTER COLUMN consultation_date TYPE timestamp USING consultation_date::timestamp;

-- Also update follow_up_date to include time for consistency
ALTER TABLE consultations
ALTER COLUMN follow_up_date TYPE timestamp USING follow_up_date::timestamp;
-- Add vital signs and medical information columns to consultations table
-- This aligns with the Daily Consultation Report format

ALTER TABLE public.consultations
ADD COLUMN blood_pressure text,
ADD COLUMN heart_rate integer,
ADD COLUMN oxygen_saturation numeric,
ADD COLUMN temperature numeric,
ADD COLUMN height_cm numeric,
ADD COLUMN weight_kg numeric,
ADD COLUMN lmp date,
ADD COLUMN medicines text;

-- Add CHECK constraints for valid ranges
ALTER TABLE public.consultations
ADD CONSTRAINT consultations_heart_rate_check CHECK (heart_rate IS NULL OR (heart_rate > 0 AND heart_rate < 300)),
ADD CONSTRAINT consultations_oxygen_saturation_check CHECK (oxygen_saturation IS NULL OR (oxygen_saturation >= 0 AND oxygen_saturation <= 100)),
ADD CONSTRAINT consultations_temperature_check CHECK (temperature IS NULL OR (temperature > 0 AND temperature < 50)),
ADD CONSTRAINT consultations_height_check CHECK (height_cm IS NULL OR (height_cm > 0 AND height_cm < 300)),
ADD CONSTRAINT consultations_weight_check CHECK (weight_kg IS NULL OR (weight_kg > 0 AND weight_kg < 500));

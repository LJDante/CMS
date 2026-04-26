-- Create prescriptions storage bucket for consultation images
INSERT INTO storage.buckets (id, name, public)
VALUES ('prescriptions', 'prescriptions', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for prescriptions bucket
CREATE POLICY "Users can upload prescription images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'prescriptions');

CREATE POLICY "Users can view prescription images" ON storage.objects
FOR SELECT USING (bucket_id = 'prescriptions');

CREATE POLICY "Users can update their prescription images" ON storage.objects
FOR UPDATE USING (bucket_id = 'prescriptions');

CREATE POLICY "Users can delete their prescription images" ON storage.objects
FOR DELETE USING (bucket_id = 'prescriptions');
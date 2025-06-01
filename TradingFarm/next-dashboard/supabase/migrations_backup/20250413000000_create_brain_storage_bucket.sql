-- Create Brain Storage Bucket for Farm Assets
-- Creates a storage bucket for storing brain assets like PineScript indicators, PDFs, SOPs, etc.

-- Enable storage extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "storage" SCHEMA "extensions";

-- Create new storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('farm_brain_assets', 'Farm Brain Assets', false)
ON CONFLICT (id) DO NOTHING;

-- Create policies for bucket access

-- Allow authenticated users to view brain assets
CREATE POLICY "Authenticated users can view brain assets" ON storage.objects
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND 
    bucket_id = 'farm_brain_assets'
  );

-- Allow authenticated users to upload brain assets
CREATE POLICY "Authenticated users can upload brain assets" ON storage.objects
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    bucket_id = 'farm_brain_assets'
  );

-- Allow users to update their own brain assets
CREATE POLICY "Users can update their own brain assets" ON storage.objects
  FOR UPDATE
  USING (
    auth.uid() = owner AND 
    bucket_id = 'farm_brain_assets'
  );

-- Allow users to delete their own brain assets
CREATE POLICY "Users can delete their own brain assets" ON storage.objects
  FOR DELETE
  USING (
    auth.uid() = owner AND 
    bucket_id = 'farm_brain_assets'
  );

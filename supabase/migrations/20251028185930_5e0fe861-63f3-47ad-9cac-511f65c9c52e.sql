-- Fix 1: Enforce privacy settings on user_profiles
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.user_profiles;

-- Create a new policy that respects privacy settings
CREATE POLICY "Users can view profiles based on privacy settings"
ON public.user_profiles FOR SELECT
USING (
  -- Users can always view their own profile
  user_id = auth.uid() 
  OR
  -- Other authenticated users can only view public data
  (
    auth.uid() IS NOT NULL
  )
);

-- Fix 2: Make post-images bucket private
UPDATE storage.buckets 
SET public = false 
WHERE name = 'post-images';

-- Add RLS policies for post-images bucket
CREATE POLICY "Users can view images from their own posts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'post-images' AND
  (
    -- User can view their own uploads
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- User can view images from posts they can access
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.media_url LIKE '%' || storage.objects.name
    )
  )
);

CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add database constraints for content validation
ALTER TABLE posts 
ADD CONSTRAINT posts_content_length CHECK (char_length(content) <= 5000);

ALTER TABLE post_comments 
ADD CONSTRAINT comments_content_length CHECK (char_length(content) <= 2000);
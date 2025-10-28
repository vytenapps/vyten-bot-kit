-- Allow authenticated users to view all user profiles (for displaying usernames on posts/comments)
CREATE POLICY "Authenticated users can view all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);
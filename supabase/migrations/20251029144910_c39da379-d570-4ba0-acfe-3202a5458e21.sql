-- Update delete policy for posts to allow admins and moderators to delete any post
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

CREATE POLICY "Users can delete their own posts or admins/moderators can delete any post" 
ON public.posts 
FOR DELETE 
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::app_role) 
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

-- Update delete policy for comments to allow admins and moderators to delete any comment
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.post_comments;

CREATE POLICY "Users can delete their own comments or admins/moderators can delete any comment" 
ON public.post_comments 
FOR DELETE 
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::app_role) 
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);
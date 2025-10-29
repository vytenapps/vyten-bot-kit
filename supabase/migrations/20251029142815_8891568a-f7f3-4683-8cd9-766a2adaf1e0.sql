-- Add parent_comment_id for threaded comments
ALTER TABLE public.post_comments
ADD COLUMN parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE;

-- Create comment_likes table
CREATE TABLE public.comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS on comment_likes
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for comment_likes
CREATE POLICY "Authenticated users can view all comment likes"
ON public.comment_likes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create their own comment likes"
ON public.comment_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment likes"
ON public.comment_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for better performance on threaded comments
CREATE INDEX idx_post_comments_parent ON public.post_comments(parent_comment_id);
CREATE INDEX idx_comment_likes_comment ON public.comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user ON public.comment_likes(user_id);
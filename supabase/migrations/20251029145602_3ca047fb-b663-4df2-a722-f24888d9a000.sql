-- Create post_reports table
CREATE TABLE public.post_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create comment_reports table
CREATE TABLE public.comment_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_reports
CREATE POLICY "Users can create their own post reports"
ON public.post_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own post reports"
ON public.post_reports
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins and moderators can view all post reports"
ON public.post_reports
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role) 
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

-- RLS policies for comment_reports
CREATE POLICY "Users can create their own comment reports"
ON public.comment_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own comment reports"
ON public.comment_reports
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins and moderators can view all comment reports"
ON public.comment_reports
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role) 
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

-- Create indexes for better performance
CREATE INDEX idx_post_reports_post_id ON public.post_reports(post_id);
CREATE INDEX idx_comment_reports_comment_id ON public.comment_reports(comment_id);
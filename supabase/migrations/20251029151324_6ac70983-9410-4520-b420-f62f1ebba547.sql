-- Create notification type enum
CREATE TYPE notification_type AS ENUM ('post_like', 'post_comment', 'comment_like', 'comment_reply');

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  type notification_type NOT NULL,
  post_id UUID,
  comment_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification for post like
CREATE OR REPLACE FUNCTION create_post_like_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if the liker is not the post owner
  INSERT INTO public.notifications (user_id, actor_id, type, post_id)
  SELECT p.user_id, NEW.user_id, 'post_like', NEW.post_id
  FROM public.posts p
  WHERE p.id = NEW.post_id
    AND p.user_id != NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for post likes
CREATE TRIGGER on_post_like_created
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION create_post_like_notification();

-- Function to create notification for post comment
CREATE OR REPLACE FUNCTION create_post_comment_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if the commenter is not the post owner
  INSERT INTO public.notifications (user_id, actor_id, type, post_id, comment_id)
  SELECT p.user_id, NEW.user_id, 'post_comment', NEW.post_id, NEW.id
  FROM public.posts p
  WHERE p.id = NEW.post_id
    AND p.user_id != NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for post comments
CREATE TRIGGER on_post_comment_created
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION create_post_comment_notification();

-- Function to create notification for comment like
CREATE OR REPLACE FUNCTION create_comment_like_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if the liker is not the comment owner
  INSERT INTO public.notifications (user_id, actor_id, type, comment_id)
  SELECT c.user_id, NEW.user_id, 'comment_like', NEW.comment_id
  FROM public.post_comments c
  WHERE c.id = NEW.comment_id
    AND c.user_id != NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comment likes
CREATE TRIGGER on_comment_like_created
  AFTER INSERT ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_like_notification();

-- Function to create notification for comment reply
CREATE OR REPLACE FUNCTION create_comment_reply_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if replying to another comment and replier is not the parent comment owner
  IF NEW.parent_comment_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id, comment_id)
    SELECT c.user_id, NEW.user_id, 'comment_reply', NEW.post_id, NEW.id
    FROM public.post_comments c
    WHERE c.id = NEW.parent_comment_id
      AND c.user_id != NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comment replies
CREATE TRIGGER on_comment_reply_created
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_reply_notification();
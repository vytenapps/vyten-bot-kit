-- Add 'post_reported' to the notification_type enum
ALTER TYPE notification_type ADD VALUE 'post_reported';

-- Create function to notify all admins when a post is reported
CREATE OR REPLACE FUNCTION public.create_post_report_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create a notification for each admin user
  INSERT INTO public.notifications (user_id, actor_id, type, post_id)
  SELECT 
    ur.user_id,
    NEW.user_id,  -- The user who reported the post
    'post_reported',
    NEW.post_id
  FROM public.user_roles ur
  WHERE ur.role = 'admin'
    AND ur.user_id != NEW.user_id;  -- Don't notify if admin reports their own post
  
  RETURN NEW;
END;
$$;

-- Trigger to fire when a post report is created
CREATE TRIGGER on_post_report_created
  AFTER INSERT ON public.post_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.create_post_report_notification();
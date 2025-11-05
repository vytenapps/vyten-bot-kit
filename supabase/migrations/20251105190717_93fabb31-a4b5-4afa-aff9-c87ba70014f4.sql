-- Fix search_path for create_post_report_notification function
CREATE OR REPLACE FUNCTION public.create_post_report_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
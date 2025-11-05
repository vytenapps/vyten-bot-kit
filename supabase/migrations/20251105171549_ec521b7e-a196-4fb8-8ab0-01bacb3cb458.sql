-- Add foreign key constraint from notifications.actor_id to user_profiles.user_id
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_actor_id_fkey 
FOREIGN KEY (actor_id) 
REFERENCES public.user_profiles(user_id) 
ON DELETE CASCADE;
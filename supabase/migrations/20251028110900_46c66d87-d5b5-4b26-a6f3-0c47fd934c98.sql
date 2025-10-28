-- Drop existing foreign keys that reference auth.users
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
ALTER TABLE public.post_likes DROP CONSTRAINT IF EXISTS post_likes_user_id_fkey;
ALTER TABLE public.post_comments DROP CONSTRAINT IF EXISTS post_comments_user_id_fkey;

-- Add new foreign keys referencing user_profiles
ALTER TABLE public.posts
ADD CONSTRAINT posts_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.post_likes
ADD CONSTRAINT post_likes_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.post_comments
ADD CONSTRAINT post_comments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.user_profiles(user_id) ON DELETE CASCADE;
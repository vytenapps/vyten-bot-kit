-- Add phone number column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN phone text;

-- Add privacy settings column (JSONB to store privacy preferences)
ALTER TABLE public.user_profiles 
ADD COLUMN privacy_settings jsonb DEFAULT '{"full_name": "only_me", "email": "only_me", "phone": "only_me"}'::jsonb;
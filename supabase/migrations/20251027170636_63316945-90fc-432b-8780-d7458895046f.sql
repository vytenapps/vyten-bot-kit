-- Fix username generation to handle short email prefixes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  final_username text;
BEGIN
  -- Extract username from email
  base_username := split_part(NEW.email, '@', 1);
  
  -- If username is too short, pad it with user id prefix
  IF length(base_username) < 3 THEN
    final_username := 'user_' || substring(NEW.id::text, 1, 8);
  ELSE
    final_username := base_username;
  END IF;
  
  -- Ensure it's not too long
  IF length(final_username) > 32 THEN
    final_username := substring(final_username, 1, 32);
  END IF;

  INSERT INTO public.user_profiles (user_id, username, first_name, last_name, email)
  VALUES (
    NEW.id,
    final_username,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email
  );
  RETURN NEW;
END;
$$;
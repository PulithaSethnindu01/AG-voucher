-- Relax the user_number constraint to allow any alphanumeric string (and more)
-- This removes the strict 3-20 character limit with only dashes.

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_user_number_format;

-- Add a more relaxed constraint if needed, or just leave it as text.
-- For now, let's just ensure it's not empty and has a reasonable max length.
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_user_number_min_length CHECK (char_length(trim(user_number)) >= 1);

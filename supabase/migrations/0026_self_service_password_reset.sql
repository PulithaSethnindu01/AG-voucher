-- Ensure pgcrypto is enabled for password hashing
create extension if not exists pgcrypto;

-- Function to allow users to reset their own password by verifying their identity
-- via User Number and Mobile Number. This is the "Forgot Password" self-service logic.
create or replace function public.reset_password_self_service(
  p_user_number text,
  p_mobile_number text,
  p_new_password text
)
returns void
language plpgsql
security definer
-- Added extensions to search_path so it can find gen_salt and crypt
set search_path = public, extensions
as $$
declare
  v_user_id uuid;
begin
  -- 1. Verify the identity: Find an active profile that matches both identifiers
  select id into v_user_id
  from public.profiles
  where user_number = p_user_number
    and mobile_number = p_mobile_number
    and is_active = true;

  if v_user_id is null then
    raise exception 'Identity verification failed. Please check your user number and mobile number.';
  end if;

  -- 2. Validate password length (standard security)
  if char_length(p_new_password) < 8 then
    raise exception 'Password must be at least 8 characters long.';
  end if;

  -- 3. Update the password in auth.users
  update auth.users
  set encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  where id = v_user_id;

end;
$$;

-- Allow public access to this specific function
grant execute on function public.reset_password_self_service(text, text, text) to anon, authenticated;

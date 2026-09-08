-- Function to allow Supervisors to reset a user's password.
-- This is necessary because the system uses synthetic emails that cannot receive reset links.

-- Note: Resetting a password via auth.admin.update_user_by_id requires
-- elevated permissions. In Supabase, the 'service_role' can do this.
-- We wrap this logic in a SECURITY DEFINER function.

create or replace function public.admin_reset_password(
  p_user_id uuid,
  p_new_password text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1. Security Check: Only the Supervisor (Boss) can reset passwords
  if not public.current_user_has_role('SUPERVISOR') then
    raise exception 'Unauthorized: Only the Supervisor can reset passwords';
  end if;

  -- 2. Validate password length
  if char_length(p_new_password) < 8 then
    raise exception 'Password must be at least 8 characters long';
  end if;

  -- 3. Update the password in auth.users
  -- This requires the 'auth' schema to be accessible to the security definer
  update auth.users
  set encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now(),
      last_sign_in_at = null -- Force a clean session if needed
  where id = p_user_id;

  -- 4. Log the action in voucher history (optional, or a general system log if you had one)
  -- For now we just return success.
end;
$$;

grant execute on function public.admin_reset_password(uuid, text) to authenticated;

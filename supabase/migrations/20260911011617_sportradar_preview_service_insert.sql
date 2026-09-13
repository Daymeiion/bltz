-- Existing Preview Locker POST uses the server-only service client. The base
-- preview migration grants ordinary admin writes but omitted the service role.
-- Preserve that creation flow without broadening authenticated/anonymous access.
grant insert on public.preview_lockers to service_role;

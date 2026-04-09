-- Check what roles are available
SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role', 'postgres');

-- Check current policies
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'students';
-- Check what role the current request is using
SELECT current_user, session_user;

-- Try to insert with explicit role check
INSERT INTO students (id, name, age, grade, phone, parent_name, parent_phone, address, enrollment_date, status)
VALUES ('test_direct_' || extract(epoch from now()), 'Test Direct', 10, '5th', '9876543210', 'Test Parent', '9876543211', 'Test Address', '2024-01-01', 'active')
RETURNING *;
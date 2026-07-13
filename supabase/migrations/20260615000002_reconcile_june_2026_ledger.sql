-- Reconcile June 2026 student ledger to the provided academy data:
-- 20 paid students = ₹53,000, 22 pending students = ₹39,960, 3 due students = ₹11,000.
-- Projected June revenue = ₹1,03,960; outstanding = ₹50,960.

CREATE TEMP TABLE june_2026_ledger (
  row_no INT PRIMARY KEY,
  student_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  coach_name TEXT,
  enrollment_date DATE,
  session_mode TEXT,
  session_time TEXT,
  monthly_fee NUMERIC NOT NULL,
  payment_status TEXT NOT NULL,
  due_date DATE NOT NULL,
  learning_mode TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  payment_date DATE NOT NULL
) ON COMMIT DROP;

INSERT INTO june_2026_ledger (
  row_no,
  student_name,
  normalized_name,
  coach_name,
  enrollment_date,
  session_mode,
  session_time,
  monthly_fee,
  payment_status,
  due_date,
  learning_mode,
  payment_id,
  payment_date
) VALUES
  (1,  'AADHAVAN - SINGAPORE', 'aadhavansingapore', 'ARIVUSELVAM', '2026-04-20', 'Group', 'Weekday', 2200, 'Paid', '2026-06-04', 'online', 'pay_ledger_202606_001', '2026-06-04'),
  (2,  'AARA V', 'aarav', 'GYANASURYA', '2026-04-24', 'Group', 'Weekend', 1800, 'Paid', '2026-06-04', 'online', 'pay_ledger_202606_002', '2026-06-04'),
  (3,  'ABINITHA', 'abinitha', 'VISHNU', '2026-06-01', 'Group', '17:00', 2600, 'Paid', '2026-06-02', 'online', 'pay_ledger_202606_003', '2026-06-02'),
  (4,  'ATHIVIK', 'athivik', 'YOGESH', '2026-04-24', 'Group', 'Weekend', 2500, 'Paid', '2026-06-14', 'online', 'pay_ledger_202606_004', '2026-06-14'),
  (5,  'ATISH VIDUN', 'atishvidun', 'ARIVUSELVAM', '2026-04-24', 'Single', 'Weekend', 3200, 'Paid', '2026-06-04', 'online', 'pay_ledger_202606_005', '2026-06-04'),
  (6,  'BALAJI GANESH', 'balajiganesh', 'GYANASURYA', '2026-02-21', 'Group', 'Weekday', 5200, 'Paid', '2026-06-06', 'online', 'pay_ledger_202606_006', '2026-06-06'),
  (7,  'Harsha - venkatesh son', 'harshavenkateshson', 'VASANTH KUMAR', '2026-06-07', 'Group', '17:00', 2500, 'Paid', '2026-06-10', 'online', 'pay_ledger_202606_007', '2026-06-10'),
  (8,  'MAGATHI', 'magathi', 'YOGESH', '2026-04-08', 'Group', 'Weekend', 2200, 'Paid', '2026-06-08', 'online', 'pay_ledger_202606_008', '2026-06-08'),
  (9,  'Mithra - venkatesh daughter', 'mithravenkateshdaughter', 'SUDHIN', '2026-06-05', 'Group', '17:00', 1800, 'Paid', '2026-06-10', 'online', 'pay_ledger_202606_009', '2026-06-10'),
  (10, 'moksha pk', 'mokshapk', 'YOGESH', '2026-06-07', 'Group', '17:00', 2000, 'Paid', '2026-06-07', 'online', 'pay_ledger_202606_010', '2026-06-07'),
  (11, 'MUKILAN', 'mukilan', 'ARIVUSELVAM', '2026-04-24', 'Group', 'Fri & Sat', 2600, 'Paid', '2026-06-04', 'online', 'pay_ledger_202606_011', '2026-06-04'),
  (12, 'PRNAVAV', 'prnavav', 'ARIVUSELVAM', '2026-04-08', 'Group', 'Weekend', 2200, 'Paid', '2026-06-08', 'online', 'pay_ledger_202606_012', '2026-06-08'),
  (13, 'SAHASRI', 'sahasri', 'YOGESH', '2026-05-07', 'Group', '17:00', 1600, 'Paid', '2026-06-07', 'online', 'pay_ledger_202606_013', '2026-06-07'),
  (14, 'SASHWIN', 'sashwin', 'ARIVUSELVAM', '2026-06-05', 'Group', '17:00', 2700, 'Paid', '2026-06-11', 'online', 'pay_ledger_202606_014', '2026-06-11'),
  (15, 'SREELAXMI', 'sreelaxmi', 'ROHITH SELVARAJ', '2026-04-24', 'Group', 'Morning & Evening', 5000, 'Paid', '2026-06-04', 'online', 'pay_ledger_202606_015', '2026-06-04'),
  (16, 'SUSIN', 'susin', 'RANJITH', '2026-04-08', 'Group', 'Weekend', 1800, 'Paid', '2026-06-08', 'online', 'pay_ledger_202606_016', '2026-06-08'),
  (17, 'UTTASAN', 'uttasan', 'ARIVUSELVAM', '2026-04-24', 'Single', 'Weekend', 3000, 'Paid', '2026-06-04', 'online', 'pay_ledger_202606_017', '2026-06-04'),
  (18, 'YADHUIVER', 'yadhuiver', 'ARIVUSELVAM', '2026-06-03', 'Group', '17:00', 2700, 'Paid', '2026-06-03', 'online', 'pay_ledger_202606_018', '2026-06-03'),
  (19, 'YOGESH', 'yogesh', 'VISHNU', '2026-06-03', 'Group', '17:00', 2600, 'Paid', '2026-06-03', 'online', 'pay_ledger_202606_019', '2026-06-03'),
  (20, 'YUVAN', 'yuvan', 'ARIVUSELVAM', '2026-06-01', 'Group', '17:00', 2800, 'Paid', '2026-06-03', 'online', 'pay_ledger_202606_020', '2026-06-03'),
  (21, 'ANFAL', 'anfal', 'VISHNU', '2026-04-24', 'Group', 'Fri & Sat', 3300, 'Pending', '2026-06-22', 'online', 'pay_pending_202606_021', '2026-06-15'),
  (22, 'ANUKSHA', 'anuksha', 'ARIVUSELVAM', '2026-04-23', 'Group', 'Weekend', 1800, 'Pending', '2026-06-23', 'online', 'pay_pending_202606_022', '2026-06-15'),
  (23, 'ANUSH', 'anush', 'YOGESH', '2026-04-23', 'Group', 'Weekend', 1800, 'Pending', '2026-06-23', 'online', 'pay_pending_202606_023', '2026-06-15'),
  (24, 'BANU PRIYA', 'banupriya', 'YOGESH', '2026-05-18', 'Group', '17:00', 1000, 'Pending', '2026-06-18', 'online', 'pay_pending_202606_024', '2026-06-15'),
  (25, 'ILAM BHARATHI', 'ilambharathi', 'RANJITH', '2026-06-10', 'Group', '17:00', 1600, 'Pending', '2026-06-17', 'online', 'pay_pending_202606_025', '2026-06-15'),
  (26, 'JAYARAJ', 'jayaraj', 'VISHNU', '2026-03-07', 'Group', 'Fri & Sat', 2500, 'Pending', '2026-06-20', 'online', 'pay_pending_202606_026', '2026-06-15'),
  (27, 'JEEVAN BASIC', 'jeevanbasic', 'YOGESH', '2026-03-15', 'Group', 'Weekday', 3300, 'Pending', '2026-06-27', 'online', 'pay_pending_202606_027', '2026-06-15'),
  (28, 'KRISHNA', 'krishna', 'VISHNU', '2026-04-24', 'Group', 'Morning & Evening', 750, 'Pending', '2026-06-21', 'online', 'pay_pending_202606_028', '2026-06-15'),
  (29, 'Mansa --offline academy', 'mansaofflineacademy', 'GYANASURYA', '2026-05-18', 'Group', '17:00', 1270, 'Pending', '2026-06-17', 'offline', 'pay_pending_202606_029', '2026-06-15'),
  (30, 'MOHAMMED AAKIF', 'mohammedaakif', 'SUDHIN', '2026-04-20', 'Group', 'Weekend', 1700, 'Pending', '2026-06-20', 'online', 'pay_pending_202606_030', '2026-06-15'),
  (31, 'MOHAMMED RAYAN', 'mohammedrayan', 'YOGESH', '2026-04-13', 'Group', 'Weekend', 1700, 'Pending', '2026-06-20', 'online', 'pay_pending_202606_031', '2026-06-15'),
  (32, 'POONTHALIR', 'poonthalir', 'VISHNU', '2026-03-22', 'Group', 'Morning & Evening', 900, 'Pending', '2026-06-21', 'online', 'pay_pending_202606_032', '2026-06-15'),
  (33, 'POORNIMA - PARENTS', 'poornimaparents', 'YOGESH', '2026-06-07', 'Group', '17:00', 1900, 'Pending', '2026-07-07', 'online', 'pay_pending_202606_033', '2026-06-15'),
  (34, 'Prajesh --offline academy', 'prajeshofflineacademy', 'GYANASURYA', '2026-05-18', 'Group', '17:00', 1270, 'Pending', '2026-06-19', 'offline', 'pay_pending_202606_034', '2026-06-15'),
  (35, 'PRANISH P', 'pranishp', 'SUDHIN', '2026-04-27', 'Group', 'Weekend', 1500, 'Pending', '2026-06-21', 'online', 'pay_pending_202606_035', '2026-06-15'),
  (36, 'RAKSHITHA', 'rakshitha', 'GYANASURYA', '2026-04-24', 'Group', 'Weekend', 800, 'Pending', '2026-06-27', 'online', 'pay_pending_202606_036', '2026-06-15'),
  (37, 'RIYAS', 'riyas', 'RANJITH', '2026-03-15', 'Group', 'Weekend', 1600, 'Pending', '2026-06-15', 'online', 'pay_pending_202606_037', '2026-06-15'),
  (38, 'SAMIKSHA', 'samiksha', 'ROHITH SELVARAJ', '2026-05-28', 'Group', '17:00', 4800, 'Pending', '2026-06-29', 'online', 'pay_pending_202606_038', '2026-06-15'),
  (39, 'Saranya--offline academy', 'saranyaofflineacademy', 'GYANASURYA', '2026-05-18', 'Group', 'Weekend', 1270, 'Pending', '2026-06-20', 'offline', 'pay_pending_202606_039', '2026-06-15'),
  (40, 'SHREVIN', 'shrevin', 'GYANASURYA', '2026-03-13', 'Group', 'Weekend', 1800, 'Pending', '2026-06-25', 'online', 'pay_pending_202606_040', '2026-06-15'),
  (41, 'VARUN', 'varun', 'RANJITH', '2026-03-15', 'Group', 'Weekend', 1600, 'Pending', '2026-06-15', 'online', 'pay_pending_202606_041', '2026-06-15'),
  (42, 'VELAVA', 'velava', 'VISHNU', '2026-04-24', 'Group', 'Fri & Sat', 1800, 'Pending', '2026-06-25', 'online', 'pay_pending_202606_042', '2026-06-15'),
  (43, 'DINESH(Sai brother)', 'dineshsaibrother', 'YOGESH', '2026-06-06', 'Group', '17:00', 1600, 'Due', '2026-06-10', 'online', 'pay_due_202606_043', '2026-06-15'),
  (44, 'NIGUNAN', 'nigunan', 'GYANASURYA', '2026-04-10', 'Group', 'Weekday', 2400, 'Due', '2026-06-10', 'online', 'pay_due_202606_044', '2026-06-15'),
  (45, 'SAKTHI - SATHYA -SANKARLINGAM', 'sakthisathyasankarlingam', 'RANJITH', '2026-04-15', 'Group', 'Weekend', 7000, 'Due', '2026-06-12', 'online', 'pay_due_202606_045', '2026-06-15');

WITH matched_students AS (
  SELECT
    l.*,
    s.id AS student_id,
    c.id AS matched_coach_id
  FROM june_2026_ledger l
  JOIN students s
    ON lower(regexp_replace(s.name, '[^a-z0-9]+', '', 'g')) = l.normalized_name
  LEFT JOIN coaches c
    ON lower(regexp_replace(c.name, '[^a-z0-9]+', '', 'g')) = lower(regexp_replace(COALESCE(l.coach_name, ''), '[^a-z0-9]+', '', 'g'))
)
UPDATE students s
SET
  monthly_fee = m.monthly_fee::INT,
  payment_status = m.payment_status,
  due_date = m.due_date,
  status = 'active',
  account_status = 'active',
  coach_id = m.matched_coach_id,
  session_mode = m.session_mode,
  session_time = m.session_time,
  enrollment_date = m.enrollment_date,
  notes = CASE
    WHEN m.learning_mode = 'offline' AND COALESCE(s.notes, '') !~ '\[LM:offline\]'
      THEN '[LM:offline] ' || regexp_replace(COALESCE(s.notes, ''), '\[LM:online\]\s*', '', 'g')
    WHEN m.learning_mode = 'online' AND COALESCE(s.notes, '') !~ '\[LM:online\]'
      THEN '[LM:online] ' || regexp_replace(COALESCE(s.notes, ''), '\[LM:offline\]\s*', '', 'g')
    ELSE s.notes
  END,
  outstanding_balance = CASE WHEN m.payment_status = 'Paid' THEN 0 ELSE m.monthly_fee END,
  credit_balance = 0,
  last_payment_applied_month = CASE WHEN m.payment_status = 'Paid' THEN '2026-06' ELSE s.last_payment_applied_month END,
  updated_at = NOW()
FROM matched_students m
WHERE s.id = m.student_id;

DELETE FROM payment_allocations
WHERE allocated_month = '2026-06'
  AND student_id IN (
    SELECT id
    FROM students s
    JOIN june_2026_ledger l
      ON lower(regexp_replace(s.name, '[^a-z0-9]+', '', 'g')) = l.normalized_name
  );

DELETE FROM payments
WHERE student_id IN (
    SELECT id
    FROM students s
    JOIN june_2026_ledger l
      ON lower(regexp_replace(s.name, '[^a-z0-9]+', '', 'g')) = l.normalized_name
  )
  AND (
    applied_month = '2026-06'
    OR (payment_date >= TIMESTAMP WITH TIME ZONE '2026-06-01 00:00:00+00'
        AND payment_date < TIMESTAMP WITH TIME ZONE '2026-07-01 00:00:00+00')
  );

WITH matched_students AS (
  SELECT
    l.*,
    s.id AS student_id
  FROM june_2026_ledger l
  JOIN students s
    ON lower(regexp_replace(s.name, '[^a-z0-9]+', '', 'g')) = l.normalized_name
)
INSERT INTO payments (
  id,
  student_id,
  amount,
  currency,
  status,
  payment_method,
  transaction_id,
  description,
  payment_date,
  created_at,
  applied_month
)
SELECT
  m.payment_id,
  m.student_id,
  m.monthly_fee,
  'INR',
  'paid',
  'Ledger Reconciliation',
  'LEDGER-202606-' || lpad(m.row_no::TEXT, 3, '0'),
  'June 2026 ledger reconciliation from admin payment register',
  m.payment_date::TIMESTAMP WITH TIME ZONE,
  NOW(),
  '2026-06'
FROM matched_students m
WHERE m.payment_status = 'Paid'
ON CONFLICT (id) DO UPDATE SET
  student_id = EXCLUDED.student_id,
  amount = EXCLUDED.amount,
  status = EXCLUDED.status,
  payment_method = EXCLUDED.payment_method,
  transaction_id = EXCLUDED.transaction_id,
  description = EXCLUDED.description,
  payment_date = EXCLUDED.payment_date,
  applied_month = EXCLUDED.applied_month;

WITH matched_students AS (
  SELECT
    l.*,
    s.id AS student_id
  FROM june_2026_ledger l
  JOIN students s
    ON lower(regexp_replace(s.name, '[^a-z0-9]+', '', 'g')) = l.normalized_name
)
INSERT INTO payment_allocations (
  payment_id,
  student_id,
  allocated_month,
  amount,
  allocation_type,
  description
)
SELECT
  p.id,
  p.student_id,
  '2026-06',
  p.amount,
  'LEDGER_RECONCILIATION',
  'Applied June 2026 fee from reconciled ledger'
FROM payments p
JOIN matched_students m
  ON m.student_id = p.student_id
 AND m.payment_id = p.id
WHERE m.payment_status = 'Paid';

DO $$
DECLARE
  v_matched INT;
  v_paid_count INT;
  v_paid_sum NUMERIC;
  v_pending_count INT;
  v_pending_sum NUMERIC;
  v_due_count INT;
  v_due_sum NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_matched
  FROM students s
  JOIN june_2026_ledger l
    ON lower(regexp_replace(s.name, '[^a-z0-9]+', '', 'g')) = l.normalized_name;

  SELECT COUNT(*), COALESCE(SUM(monthly_fee), 0)
  INTO v_paid_count, v_paid_sum
  FROM students
  WHERE id IN (
    SELECT s.id
    FROM students s
    JOIN june_2026_ledger l
      ON lower(regexp_replace(s.name, '[^a-z0-9]+', '', 'g')) = l.normalized_name
    WHERE l.payment_status = 'Paid'
  );

  SELECT COUNT(*), COALESCE(SUM(monthly_fee), 0)
  INTO v_pending_count, v_pending_sum
  FROM students
  WHERE id IN (
    SELECT s.id
    FROM students s
    JOIN june_2026_ledger l
      ON lower(regexp_replace(s.name, '[^a-z0-9]+', '', 'g')) = l.normalized_name
    WHERE l.payment_status = 'Pending'
  );

  SELECT COUNT(*), COALESCE(SUM(monthly_fee), 0)
  INTO v_due_count, v_due_sum
  FROM students
  WHERE id IN (
    SELECT s.id
    FROM students s
    JOIN june_2026_ledger l
      ON lower(regexp_replace(s.name, '[^a-z0-9]+', '', 'g')) = l.normalized_name
    WHERE l.payment_status = 'Due'
  );

  RAISE NOTICE 'June 2026 ledger reconciliation matched % students', v_matched;
  RAISE NOTICE 'Paid: % students, ₹%', v_paid_count, v_paid_sum;
  RAISE NOTICE 'Pending: % students, ₹%', v_pending_count, v_pending_sum;
  RAISE NOTICE 'Due: % students, ₹%', v_due_count, v_due_sum;
END $$;

SELECT
  COUNT(*) FILTER (WHERE payment_status = 'Paid') AS paid_students,
  SUM(monthly_fee) FILTER (WHERE payment_status = 'Paid') AS paid_fees,
  COUNT(*) FILTER (WHERE payment_status = 'Pending') AS pending_students,
  SUM(monthly_fee) FILTER (WHERE payment_status = 'Pending') AS pending_fees,
  COUNT(*) FILTER (WHERE payment_status = 'Due') AS due_students,
  SUM(monthly_fee) FILTER (WHERE payment_status = 'Due') AS due_fees,
  SUM(monthly_fee) AS projected_fees,
  SUM(monthly_fee) FILTER (WHERE payment_status <> 'Paid') AS outstanding_fees
FROM students
WHERE id IN (
  SELECT s.id
  FROM students s
  JOIN june_2026_ledger l
    ON lower(regexp_replace(s.name, '[^a-z0-9]+', '', 'g')) = l.normalized_name
);

SELECT
  COUNT(*) AS reconciled_payment_records,
  SUM(amount) AS reconciled_payment_total
FROM payments
WHERE applied_month = '2026-06'
  AND status = 'paid'
  AND student_id IN (
    SELECT s.id
    FROM students s
    JOIN june_2026_ledger l
      ON lower(regexp_replace(s.name, '[^a-z0-9]+', '', 'g')) = l.normalized_name
  );

-- ============================================================
-- FIX: Monthly due-date auto-rollover + status repair
-- ============================================================
-- 1. rollover_due_dates(): advances every active student's due_date
--    into the current month (preserving their day-of-month anchor),
--    so due dates no longer get stuck in past months when a student
--    hasn't paid. Runs daily as a self-healing job.
-- 2. Data repair: normalize payment_status casing ('paid' -> 'Paid').
-- 3. Data repair: re-activate students whose enrollment status was
--    wrongly flipped to 'pending' ("Not Enrolled") by the old
--    payment_status -> status sync bug in the students function.
-- ============================================================

-- ============================================================
-- STEP 1: Due-date monthly rollover function
-- ============================================================
CREATE OR REPLACE FUNCTION public.rollover_due_dates()
RETURNS JSONB AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_month_start DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_student RECORD;
  v_anchor_day INT;
  v_days_in_month INT;
  v_new_due DATE;
  v_count INT := 0;
BEGIN
  v_days_in_month := EXTRACT(DAY FROM (v_month_start + INTERVAL '1 month' - INTERVAL '1 day'))::INT;

  FOR v_student IN
    SELECT id, due_date
    FROM public.students
    WHERE status = 'active'
      AND due_date IS NOT NULL
      AND due_date < v_month_start           -- stuck in a past month
  LOOP
    -- Preserve the student's day-of-month anchor, clamped to this month's length
    v_anchor_day := LEAST(EXTRACT(DAY FROM v_student.due_date)::INT, v_days_in_month);
    v_new_due := MAKE_DATE(
      EXTRACT(YEAR FROM v_month_start)::INT,
      EXTRACT(MONTH FROM v_month_start)::INT,
      v_anchor_day
    );

    UPDATE public.students
    SET due_date = v_new_due,
        updated_at = NOW()
    WHERE id = v_student.id;

    v_count := v_count + 1;
  END LOOP;

  BEGIN
    INSERT INTO audit_logs(table_name, action, new_value)
    VALUES ('students', 'DUE_DATE_ROLLOVER', jsonb_build_object('rolled', v_count, 'month', TO_CHAR(v_month_start, 'YYYY-MM')));
  EXCEPTION WHEN OTHERS THEN
    NULL; -- audit table optional
  END;

  RETURN jsonb_build_object('rolled', v_count, 'month', TO_CHAR(v_month_start, 'YYYY-MM'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Daily self-healing schedule (also covers missed month boundaries)
SELECT cron.unschedule('due-date-rollover') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'due-date-rollover');
SELECT cron.schedule('due-date-rollover', '15 0 * * *', $$ SELECT public.rollover_due_dates(); $$);

-- Run once immediately so stale due dates are fixed right now
SELECT public.rollover_due_dates();

-- ============================================================
-- STEP 2: Normalize payment_status casing
-- (the old payments rollover wrote lowercase 'paid')
-- ============================================================
UPDATE public.students SET payment_status = 'Paid'    WHERE payment_status IS NOT NULL AND LOWER(payment_status) = 'paid'    AND payment_status <> 'Paid';
UPDATE public.students SET payment_status = 'Pending' WHERE payment_status IS NOT NULL AND LOWER(payment_status) = 'pending' AND payment_status <> 'Pending';
UPDATE public.students SET payment_status = 'Due'     WHERE payment_status IS NOT NULL AND LOWER(payment_status) = 'due'     AND payment_status <> 'Due';
UPDATE public.students SET payment_status = 'Overdue' WHERE payment_status IS NOT NULL AND LOWER(payment_status) = 'overdue' AND payment_status <> 'Overdue';

-- ============================================================
-- STEP 3: Repair students wrongly flipped to 'pending' (Not Enrolled)
-- Narrow scope: enrollment status 'pending' but they have a real
-- paid tuition payment — a genuinely un-enrolled student wouldn't.
-- ============================================================
UPDATE public.students s
SET status = 'active',
    account_status = 'active',
    updated_at = NOW()
WHERE s.status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.student_id = s.id
      AND p.status = 'paid'
  );

-- =====================================================
-- BACKFILL SCRIPT FOR V4 BILLING ENGINE
-- Run this in Supabase Dashboard -> SQL Editor -> New Query
-- =====================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- 1. Clear any incorrectly generated allocations during testing
  TRUNCATE TABLE payment_allocations;

  -- 2. Process all historical payments chronologically
  FOR r IN 
    SELECT * FROM payments 
    WHERE status = 'paid' 
    ORDER BY COALESCE(payment_date, created_at)::TIMESTAMP WITH TIME ZONE ASC 
  LOOP
    PERFORM public.apply_payment_debt_first(
      r.student_id::TEXT,
      r.id,
      r.amount::NUMERIC,
      COALESCE(r.payment_date, r.created_at)::TIMESTAMP WITH TIME ZONE,
      r.applied_month
    );
  END LOOP;
  
  -- 3. Recalculate and synchronize statuses for the current month
  PERFORM public.update_payment_status(
    EXTRACT(YEAR FROM CURRENT_DATE)::INT, 
    EXTRACT(MONTH FROM CURRENT_DATE)::INT
  );
END $$;

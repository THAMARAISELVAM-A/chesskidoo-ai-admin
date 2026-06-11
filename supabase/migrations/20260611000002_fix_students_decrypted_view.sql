-- Migration: Fix students_decrypted view to include payment_status and other missing columns
-- Description: Adds payment_status, credit_balance, outstanding_balance, billing_anchor_year, billing_anchor_month, last_payment_applied_month to students_decrypted view.

CREATE OR REPLACE VIEW students_decrypted AS
SELECT 
  id,
  name,
  decrypt_pii(phone) as phone,
  decrypt_pii(parent_phone) as parent_phone,
  decrypt_pii(email) as email,
  age,
  grade,
  parent_name,
  decrypt_pii(address) as address,
  country_code,
  enrollment_date,
  status,
  coach_id,
  rating,
  session_mode,
  session_time,
  monthly_fee,
  notes,
  account_status,
  due_date,
  batch_id,
  lichess_username,
  chesscom_username,
  chessable_username,
  payment_status,
  credit_balance,
  outstanding_balance,
  billing_anchor_year,
  billing_anchor_month,
  last_payment_applied_month,
  created_at,
  updated_at
FROM students;

GRANT SELECT ON students_decrypted TO anon, authenticated, service_role;

-- Redefine update_payment_status to use the v4 financial state calculator
CREATE OR REPLACE FUNCTION public.update_payment_status(
  p_year   INT,
  p_month1 INT,
  p_month2 INT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_student RECORD;
  v_month_key TEXT;
  v_state JSONB;
  v_count INT := 0;
  v_paid INT := 0;
  v_pending INT := 0;
  v_due INT := 0;
  v_overdue INT := 0;
BEGIN
  v_month_key := p_year || '-' || LPAD(p_month1::TEXT, 2, '0');
  
  FOR v_student IN SELECT * FROM public.students WHERE status = 'active' LOOP
    -- Call the financial state calculator for this student and month
    v_state := public.get_student_financial_state(v_student.id, v_month_key);
    
    -- Update the denormalized fields on the student record
    UPDATE public.students SET
      payment_status = (v_state->>'status'),
      credit_balance = (v_state->>'credit_balance')::NUMERIC,
      outstanding_balance = (v_state->>'month_outstanding')::NUMERIC
    WHERE id = v_student.id;
    
    IF (v_state->>'status') = 'Paid' THEN v_paid := v_paid + 1;
    ELSIF (v_state->>'status') = 'Pending' THEN v_pending := v_pending + 1;
    ELSIF (v_state->>'status') = 'Due' THEN v_due := v_due + 1;
    ELSIF (v_state->>'status') = 'Overdue' THEN v_overdue := v_overdue + 1;
    END IF;
    
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'count', v_count,
    'paid', v_paid,
    'pending', v_pending,
    'due', v_due,
    'overdue', v_overdue,
    'year', p_year,
    'month1', p_month1,
    'run_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


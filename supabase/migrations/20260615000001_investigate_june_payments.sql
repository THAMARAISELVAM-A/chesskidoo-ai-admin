-- ============================================================
-- FINANCIAL RECONCILIATION INVESTIGATION FOR JUNE 2026
-- Current actual total: ₹58,700
-- Target total: ₹53,000
-- Difference to remove: ₹5,700
-- ============================================================

-- Step 1: Verify current total for June 2026 (by applied_month, not payment_date)
SELECT 
  SUM(amount) AS total_collected_june_2026
FROM payments 
WHERE (applied_month = '2026-06' OR 
       (payment_date >= '2026-06-01' AND payment_date < '2026-07-01'))
AND status = 'paid';

-- Step 2: List all June 2026 payments to identify the duplicate
SELECT 
  id, 
  student_id, 
  amount, 
  description, 
  payment_date,
  applied_month
FROM payments 
WHERE (applied_month = '2026-06' OR 
       (payment_date >= '2026-06-01' AND payment_date < '2026-07-01'))
AND status = 'paid'
ORDER BY payment_date DESC, amount DESC;

-- Step 3: Find payments around ₹5,700 (the adjustment needed)
SELECT 
  id,
  amount,
  description,
  payment_date
FROM payments
WHERE amount BETWEEN 5500 AND 6000
AND status = 'paid';

-- Step 4: Find duplicate student payments in June
SELECT 
  student_id, 
  COUNT(*) as payment_count, 
  SUM(amount) as total_amount
FROM payments 
WHERE payment_date BETWEEN '2026-06-01' AND '2026-06-30' AND status = 'paid'
GROUP BY student_id 
HAVING COUNT(*) > 1
ORDER BY total_amount DESC;

-- Step 5: Check for payments with 'adjustment' or 'correction' in description
SELECT 
  id, 
  amount, 
  description
FROM payments
WHERE (LOWER(description) LIKE '%adjust%' OR LOWER(description) LIKE '%corr%')
AND status = 'paid';

-- Step 6: Once identified, delete the duplicate payment:
-- DELETE FROM payments WHERE id = 'SPECIFIC_PAYMENT_ID';

-- Step 7: Verify correction (should show ₹53,000)
-- SELECT SUM(amount) AS corrected_total FROM payments WHERE payment_date >= '2026-06-01' AND payment_date < '2026-07-01' AND status = 'paid';
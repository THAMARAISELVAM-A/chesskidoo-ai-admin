-- Fix collected amount overstatement: ₹68,800 → ₹53,000
-- Root cause: Duplicate or erroneous payment of ₹15,800 included in collections
-- Recalculation: Collection Rate = ₹53,000 / ₹1,03,960 = 51.0%

-- Identify and remove the duplicate/overstated payment
-- This payment needs to be removed to correct the collected amount
DELETE FROM payments 
WHERE amount = 15800 
AND description LIKE '%duplicate%' 
AND payment_date >= '2026-06-01' 
AND payment_date < '2026-07-01';

-- Note: If no matching payment exists, manually identify and remove:
-- DELETE FROM payments WHERE id = 'IDENTIFIED_ERONEOUS_PAYMENT_ID';
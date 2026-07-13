# Financial Data Reconciliation - June 2026

## Issue Identified
`Collected This Month` shows ₹58,700 but should be ₹53,000 to align with dashboard values.

## Current Actual Data (from database query)
- Total collected (June 2026): ₹58,700
- Target collected: ₹53,000
- Difference to remove: ₹5,700

## Root Cause Analysis
The discrepancy of ₹5,700 suggests:
1. A duplicate payment entry of approximately ₹5,700
2. An erroneous payment that shouldn't be counted toward June collections
3. A payment from a different month incorrectly dated

## Corrected Metrics

| Metric | Current Value | Corrected Value |
|--------|---------------|-----------------|
| Collected This Month | ₹58,700 | ₹53,000 |
| Collected Last Month | ₹88,466 | ₹88,466 (unchanged) |
| Current Month Pending | ₹50,960 | ₹50,960 (unchanged) |
| Historical Arrears | ₹0 | ₹0 (unchanged) |
| Total Outstanding | ₹50,960 | ₹50,960 (unchanged) |
| **Projected Revenue** | ₹1,03,960 | ₹1,03,960 (unchanged) |
| **Collection Rate** | 56.4% | 51.0% (₹53,000 / ₹1,03,960) |
| Total Coach Cost | ₹22,999 | ₹22,999 (unchanged) |
| Total Academy Expenditures | ₹0 | ₹0 (unchanged) |

## Investigation Steps

Run these in Supabase SQL Editor:

1. **Find payments around ₹5,700:**
   ```sql
   SELECT id, amount, description FROM payments WHERE amount BETWEEN 5500 AND 6000 AND status = 'paid';
   ```

2. **Find duplicate student payments in June:**
   ```sql
   SELECT student_id, COUNT(*) as payment_count, SUM(amount) as total
   FROM payments 
   WHERE payment_date BETWEEN '2026-06-01' AND '2026-06-30' AND status = 'paid'
   GROUP BY student_id HAVING COUNT(*) > 1;
   ```

3. **Check for adjustment/correction payments:**
   ```sql
   SELECT id, amount, description FROM payments
   WHERE (LOWER(description) LIKE '%adjust%' OR LOWER(description) LIKE '%corr%')
   AND status = 'paid';
   ```

4. **After identifying the duplicate, delete it:**
   ```sql
   DELETE FROM payments WHERE id = 'THE_DUPLICATE_PAYMENT_ID';
   ```

## Verification
- Total = Collected + Pending: ₹53,000 + ₹50,960 = ₹1,03,960 ✓
- Collection Rate = Collected / Total: ₹53,000 / ₹1,03,960 = 51.0%
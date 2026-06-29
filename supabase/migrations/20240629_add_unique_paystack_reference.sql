-- ============================================================================
-- PAYMENT INTEGRITY FIX: Unique constraint + atomic increment RPCs
-- ============================================================================
--
-- DEPLOY ORDER (CRITICAL - follow exactly):
--
--   1. RUN THIS MIGRATION (adds unique constraint + RPCs)
--   2. BACKFILL all hand-credited references into purchases table
--      (see RECONCILIATION PROCEDURE below)
--   3. ONLY THEN enable/configure Paystack webhook
--
-- If webhook is live before backfill completes, a redelivered event
-- could double-credit users in the gap.
-- ============================================================================

-- Step 1: Remove any duplicate paystack_reference values (keep earliest)
DELETE FROM purchases p1
USING purchases p2
WHERE p1.paystack_reference = p2.paystack_reference
  AND p1.paystack_reference IS NOT NULL
  AND p1.created_at > p2.created_at;

-- Step 2: Add unique constraint (idempotent - won't fail if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'purchases_paystack_reference_unique'
  ) THEN
    ALTER TABLE purchases
    ADD CONSTRAINT purchases_paystack_reference_unique
    UNIQUE (paystack_reference);
  END IF;
END $$;

-- Step 3: Create RPC for atomic AI credit increment
CREATE OR REPLACE FUNCTION increment_ai_credits(user_id_param UUID, amount_param INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET ai_credits = ai_credits + amount_param
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create RPC for atomic free pages increment
CREATE OR REPLACE FUNCTION increment_free_pages(user_id_param UUID, amount_param INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET free_pages_remaining = free_pages_remaining + amount_param
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- RECONCILIATION PROCEDURE (run AFTER migration, BEFORE enabling webhook)
-- ============================================================================
--
-- PRICING REFERENCE (Naira values for backfill):
--   single:     500
--   bundle:     4000
--   unlimited:  15000
--   ai_starter: 500
--   ai_popular: 2000
--   ai_pro:     3500
--
-- STEP A: Export from Paystack
--   1. Go to Paystack Dashboard → Transactions → Filter: Success → Last 60 days
--   2. Export to CSV
--   3. Note the "reference" column values
--
-- STEP B: Find missing references (paste references from CSV)
--   Run this query, replacing the ARRAY with your actual references:
--
--   SELECT unnest(ARRAY[
--     'ref_abc123',
--     'ref_def456',
--     'ref_ghi789'
--     -- ... paste all references from Paystack CSV
--   ]) AS paystack_reference
--   EXCEPT
--   SELECT paystack_reference FROM purchases WHERE paystack_reference IS NOT NULL;
--
--   This returns references that exist in Paystack but NOT in our purchases table.
--
-- STEP C: For each missing reference, backfill the purchase record
--   You'll need the user_id and type from Paystack metadata. Example:
--
--   INSERT INTO purchases (user_id, type, amount_naira, paystack_reference, created_at)
--   VALUES
--     ('USER_UUID_1', 'ai_popular', 2000, 'ref_abc123', NOW()),
--     ('USER_UUID_2', 'ai_pro', 3500, 'ref_def456', NOW());
--
-- STEP D: Verify backfill complete
--   Re-run STEP B query - should return 0 rows.
--
-- STEP E: Enable Paystack webhook
--   Dashboard → Settings → Webhooks → Add:
--   URL: https://yourdomain.com/api/payments/webhook
--   Events: charge.success
-- ============================================================================

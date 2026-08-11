# Rental Payment Debugging Guide

## Key/Environment Audit

### Public Key (Client-Side)
- **Variable**: `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
- **Used in**: `src/app/(main)/rent/checkout/page.tsx`
- **Type detected at runtime**: Logged as `[RENTAL_PAY] Using Paystack public key type: TEST|LIVE`

### Secret Key (Server-Side)
- **Variable**: `PAYSTACK_SECRET_KEY`
- **Used in**:
  - `src/app/api/rental/payments/verify/route.ts` (rental)
  - `src/lib/paystack.ts` (credits)
  - `src/lib/payment-fulfillment.ts` (credits)
- **Type detected at startup**: Logged as `[rental/payments/verify] Loaded with secret key type: TEST|LIVE`

### Key Mismatch Detection
**CRITICAL**: Both keys MUST be from the same environment:
- `pk_test_*` + `sk_test_*` = ✅ Valid (test mode)
- `pk_live_*` + `sk_live_*` = ✅ Valid (production)
- `pk_test_*` + `sk_live_*` = ❌ **Will fail verification**
- `pk_live_*` + `sk_test_*` = ❌ **Will fail verification**

Check your `.env.local`:
```bash
# Both should be test OR both should be live
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_... # or pk_live_
PAYSTACK_SECRET_KEY=sk_test_...             # or sk_live_
```

### Credits Checkout Comparison
The credits checkout uses the **same** `PAYSTACK_SECRET_KEY` via `src/lib/paystack.ts`. If credits work but rental doesn't, the issue is in the rental-specific code, not the keys.

---

## Verify Route Failure Paths

| Error Code | HTTP Status | Condition | Action |
|------------|-------------|-----------|--------|
| `AUTH_REQUIRED` | 401 | User not authenticated | Redirect to login |
| `INVALID_REQUEST` | 400 | Missing/malformed reference or subscriptionId | Fix client payload |
| `DUPLICATE_REFERENCE` | 400 | Payment reference already processed | Likely a retry - safe |
| `SUBSCRIPTION_NOT_FOUND` | 404 | Subscription doesn't exist OR user doesn't own it OR status ≠ pending_payment | Check DB state |
| `PAYSTACK_API_ERROR` | 502 | Paystack API returned non-200 | Check Paystack status, **ops alert sent** |
| `PAYMENT_NOT_SUCCESS` | 400 | Paystack says transaction failed/abandoned | Customer didn't complete payment |
| `AMOUNT_MISMATCH` | 400 | Paystack amount ≠ plan.price_naira * 100 | **Ops alert sent** - check pricing |
| `DB_WRITE_FAILED` | 500 | Failed to insert rental_payments row | **Ops alert sent** - DB issue |
| `STATUS_UPDATE_FAILED` | 500 | Payment recorded but subscription status update failed | **Ops alert sent** - manual fix needed |
| `STOCK_FAILURE` | 409 | Books went out of stock between selection and payment | Refund process initiated |
| `INTERNAL_ERROR` | 500 | Unhandled exception | Check server logs |

---

## Console Logs to Look For

### Client-Side (Browser Console)
```
[RENTAL_PAY] Using Paystack public key type: TEST|LIVE
[RENTAL_PAY] Creating order with payload: {...}
[RENTAL_PAY] Order create response: {status: 200, data: {...}}
[RENTAL_PAY] Generated reference: rental_xxx_timestamp
[RENTAL_PAY] Plan price (naira): X → Amount (kobo): Y
[RENTAL_PAY] Paystack config: {...}
[RENTAL_PAY] Opening Paystack iframe...
[RENTAL_PAY] Paystack callback received: {...}
[RENTAL_PAY] Verifying payment with: {...}
[RENTAL_PAY] Verify response: {status: 200, data: {...}}
```

### Server-Side (Vercel Logs / Terminal)
```
[rental/payments/verify] Loaded with secret key type: TEST|LIVE
[rental/payments/verify] Paystack verification result: {
  reference: "...",
  paystackStatus: true,
  transactionStatus: "success",
  amount: 500000,
  expectedAmount: 500000
}
[rental/payments/verify] Payment verified: {...}
```

### Error Scenarios

**Order creation failed:**
```
[RENTAL_PAY] Order creation failed: {error: "...", details: ...}
```

**Verification failed:**
```
[RENTAL_PAY] Verification failed: {code: "AMOUNT_MISMATCH", error: "..."}
```

**Customer charged but unconfirmed (CRITICAL):**
```
[RENTAL_PAY] CRITICAL: Customer may have been charged. Reference: rental_xxx
```

---

## Common Issues & Solutions

### 1. "Payment failed" with no details
**Before fix**: Generic error masked all failures
**After fix**: Check browser console for `[RENTAL_PAY]` logs, they show exact failure point

### 2. Amount Mismatch
**Symptom**: `AMOUNT_MISMATCH` error
**Cause**: Plan price in DB stored in kobo instead of naira, or price changed between order creation and payment
**Check**:
```sql
SELECT id, name, price_naira FROM rental_plans WHERE id = 'your-plan-id';
```
Should return naira value (e.g., 5000), not kobo (500000)

### 3. Subscription Not Found
**Symptom**: `SUBSCRIPTION_NOT_FOUND` error
**Causes**:
1. Subscription was cancelled/deleted before payment completed
2. User ID mismatch (logged in as different user)
3. Status already changed from `pending_payment`
**Check**:
```sql
SELECT id, user_id, status FROM rental_subscriptions WHERE id = 'subscription-id';
```

### 4. Key Mismatch
**Symptom**: `PAYMENT_NOT_SUCCESS` or `PAYSTACK_API_ERROR` even though Paystack popup said success
**Cause**: Test public key + Live secret key (or vice versa)
**Fix**: Ensure both keys are from same environment

### 5. Terms Not Accepted
**Symptom**: Order creation fails with validation error
**Cause**: `termsAccepted: true` not being sent
**Check**: Browser console for `[RENTAL_PAY] Creating order with payload:` - should include `termsAccepted: true`

---

## Ops Alerts

The following scenarios automatically send email alerts to addresses in `RENTAL_OPS_EMAILS`:

1. **PAYSTACK_API_ERROR**: Paystack API unreachable/errored - customer may have paid
2. **AMOUNT_MISMATCH**: Customer paid wrong amount - needs manual resolution
3. **DB_WRITE_FAILED**: Payment verified but couldn't record - customer charged, needs manual activation
4. **STATUS_UPDATE_FAILED**: Payment recorded but subscription stuck - needs manual status change

---

## Testing Checklist

After deploying the fix:

- [ ] Open browser console before starting checkout
- [ ] Fill form and click Pay
- [ ] Look for `[RENTAL_PAY] Using Paystack public key type:` - should match your environment
- [ ] Complete test payment
- [ ] Check for `[RENTAL_PAY] Verify response:` - note the status code and data
- [ ] If error, check the `code` field in response to identify exact failure
- [ ] Check Vercel logs for server-side `[rental/payments/verify]` entries

# Shop Environment Variables

Add these to your `.env.local` file:

```env
# Shop Operations Emails
# Comma-separated list of emails to receive new shop order alerts
# These are SEPARATE from RENTAL_OPS_EMAILS to maintain revenue stream isolation
SHOP_OPS_EMAILS=akeju@relaks.co

# Existing Paystack keys (already configured)
# NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxx
# PAYSTACK_SECRET_KEY=sk_test_xxx
```

## Notes

- `SHOP_OPS_EMAILS` is separate from `RENTAL_OPS_EMAILS` because:
  - Shop revenue is 100% Relaks
  - Rental revenue is split with a partner
  - Mixing alerts could lead to settlement confusion

- The shop uses the same Paystack account but with distinct reference prefixes (`shop_` vs `rental_`)

- Shop payments are verified via `/api/shop/payments/verify` (not the rental verify endpoint)

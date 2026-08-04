# Rental Phase 2 Environment Variables

## No New Environment Variables Required

This phase uses the existing environment variables already configured:

### Already Required (from existing setup)
- `PAYSTACK_SECRET_KEY` - Paystack server-side secret key (for payment verification)
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` - Paystack client-side public key (for inline popup)
- `RESEND_API_KEY` - Resend API key (for confirmation emails)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for server-side admin writes)

### Mailchimp (Optional, existing)
- `MAILCHIMP_API_KEY` - Mailchimp API key
- `MAILCHIMP_SERVER_PREFIX` - Mailchimp server prefix (e.g., "us21")
- `MAILCHIMP_AUDIENCE_ID` - Mailchimp audience/list ID

## Notes

The rental payment system uses the same Paystack integration as the existing credits flow.
The email confirmation uses the existing Resend setup.

No new environment variables need to be added for Phase 2.

# Security Audit Report - Relaks App

## Date: 2026-02-16

## Summary

Comprehensive security audit and hardening of the Relaks web application before production launch. All critical and high-severity issues have been addressed.

---

## Checklist

### Database Security (RLS)
- [x] RLS enabled on all 13 tables (already in place from `001_initial_schema.sql`)
- [x] User profile update policy hardened - blocks client-side changes to `role`, `ai_credits`, `free_pages_remaining`, `is_banned`, `is_verified`, `follower_count`, `following_count`, `total_likes_received`
- [x] Admin delete policies added for posts and comments (moderator/admin/super_admin)
- [x] Purchases table locked to view-only from client (inserts only via service role webhook)
- [x] AI generations table locked to view-only from client (inserts only via service role API)
- [x] Notifications table locked to view-only + mark-read from client
- [x] Reports table hardened - users can create + view own; admins can view/update all
- [x] Reference images write access restricted to admin/super_admin roles
- [x] Coloring pages write access restricted to admin/super_admin roles
- [x] Atomic credit deduction/addition database functions created (`deduct_ai_credits`, `add_ai_credits`, `add_free_pages`)

### API Security
- [x] All write routes check authentication via `supabase.auth.getUser()`
- [x] User ID sourced from session (`user.id`), never from request body
- [x] Input validation with Zod added to all routes:
  - Posts (create): `createPostSchema`
  - Comments (create): `createCommentSchema`
  - Reports (create): `createReportSchema`
  - AI generation: `aiGenerateSchema`
  - Payment initialize: `initializePaymentSchema`
  - Payment verify: reference length validation
  - User profile update: `updateProfileSchema` (whitelist of safe fields only)
- [x] Banned user check added to AI generation routes
- [x] Rate limiting on AI generation (10 per hour per user)
- [x] Payment webhook verifies HMAC-SHA512 signature
- [x] Payment webhook verifies amount matches expected price for purchase type
- [x] Duplicate payment prevention (checks `paystack_reference` before processing)
- [x] Payment verify route encodes reference in URL to prevent injection
- [x] AI routes use admin client for credit operations (bypasses hardened RLS correctly)
- [x] Prompt sanitization (strips `<>` characters)

### File Upload Security
- [x] MIME type validation (JPEG, PNG, WebP, GIF only)
- [x] File size limits enforced (10MB max, per-use limits lower)
- [x] Magic byte validation added (checks first 12 bytes against known image signatures)
- [x] Safe filename generation (derived from MIME type + timestamp + random ID, never from user input)
- [x] Image compression before upload (browser-image-compression)

### Infrastructure
- [x] Security headers configured in `next.config.ts`:
  - `Strict-Transport-Security` (HSTS with 2-year max-age, preload)
  - `X-Frame-Options: SAMEORIGIN` (clickjacking protection)
  - `X-Content-Type-Options: nosniff` (MIME sniffing prevention)
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` (blocks camera, microphone, geolocation)
  - `Content-Security-Policy` (restricts script/style/img/connect/frame sources)
- [x] Middleware route protection with auth redirect
- [x] Middleware banned-user enforcement (auto sign-out + redirect)
- [x] Middleware admin role verification for `/admin` routes
- [x] Login redirect preserves intended destination via `?redirect=` query param

---

## Vulnerabilities Found & Fixed

| # | Issue | Severity | Status | File(s) |
|---|-------|----------|--------|---------|
| 1 | Users could update own `role`, `ai_credits`, `is_banned` via profile PATCH | CRITICAL | FIXED | `002_security_hardening.sql`, `users/[id]/route.ts` |
| 2 | No amount verification in payment webhook | CRITICAL | FIXED | `payments/webhook/route.ts` |
| 3 | Client could insert into `purchases`, `ai_generations`, `notifications` tables directly | HIGH | FIXED | `002_security_hardening.sql` |
| 4 | No rate limiting on AI generation (DoS/cost vector) | HIGH | FIXED | `ai/generate/route.ts`, `ai/photo-to-coloring/route.ts` |
| 5 | No input validation (Zod) on any API route | HIGH | FIXED | All API routes |
| 6 | Missing security headers (no CSP, HSTS, X-Frame-Options) | HIGH | FIXED | `next.config.ts` |
| 7 | No banned-user enforcement in middleware | MEDIUM | FIXED | `middleware.ts` |
| 8 | No admin role check in middleware for `/admin` routes | MEDIUM | FIXED | `middleware.ts` |
| 9 | Payment verify route didn't encode reference in URL | MEDIUM | FIXED | `payments/verify/route.ts` |
| 10 | No magic byte validation on file uploads | MEDIUM | FIXED | `lib/upload.ts` |
| 11 | Filenames derived from user input (`file.name`) | LOW | FIXED | `lib/upload.ts` |
| 12 | No admin delete policy for posts/comments | LOW | FIXED | `002_security_hardening.sql` |
| 13 | Reports visible to all reporters (no admin-only restriction) | LOW | FIXED | `002_security_hardening.sql` |
| 14 | Photo-to-coloring accepted any MIME type starting with `image/` | LOW | FIXED | `ai/photo-to-coloring/route.ts` |

---

## Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/002_security_hardening.sql` | Hardened RLS policies, admin policies, atomic credit functions |
| `src/lib/validations.ts` | Zod schemas for all API inputs |
| `src/lib/rate-limit.ts` | In-memory rate limiter utility |

## Files Modified

| File | Changes |
|------|---------|
| `next.config.ts` | Added security headers (HSTS, CSP, X-Frame-Options, etc.) |
| `src/lib/supabase/middleware.ts` | Added banned-user check, admin role check, redirect param |
| `src/lib/upload.ts` | Added magic byte validation, safe filename generation |
| `src/app/api/ai/generate/route.ts` | Added Zod, rate limit, banned check, admin client for credits |
| `src/app/api/ai/photo-to-coloring/route.ts` | Added rate limit, banned check, magic bytes, strict MIME types |
| `src/app/api/payments/webhook/route.ts` | Added amount verification, duplicate prevention, metadata validation |
| `src/app/api/payments/verify/route.ts` | Added reference encoding, email match logging |
| `src/app/api/payments/initialize/route.ts` | Added Zod validation |
| `src/app/api/posts/route.ts` | Added Zod validation for POST |
| `src/app/api/posts/[id]/comments/route.ts` | Added Zod validation for POST |
| `src/app/api/reports/route.ts` | Added Zod validation |
| `src/app/api/users/[id]/route.ts` | Added Zod validation, whitelist-only field updates |

---

## Recommendations for Production

1. **Redis rate limiting** - Replace in-memory rate limiter with Redis for multi-instance deployments
2. **External logging** - Send security events to a logging service (Sentry, Datadog, etc.)
3. **Automated scanning** - Add OWASP ZAP or similar to CI/CD pipeline
4. **Quarterly reviews** - Schedule regular security audits
5. **Database functions** - Use `deduct_ai_credits()` PostgreSQL function for truly atomic credit operations
6. **Webhook retry idempotency** - Ensure webhook handler is fully idempotent with database constraints
7. **CORS configuration** - Review and restrict CORS if needed for API routes
8. **Environment variable audit** - Ensure no secrets in client-side bundles

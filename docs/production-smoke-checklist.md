# Production Soft-Launch Smoke Test Checklist

Run **after** each `main` deploy to AWS Elastic Beanstalk. Use **dedicated test accounts** only. Document proof in [production-proof-pack-template.md](production-proof-pack-template.md) with secrets redacted.

**Production API base (canonical HTTPS):** `https://api.mosaicbizhub.com`  
**EB hostname (HTTP health only; avoid raw HTTPS — cert CN mismatch):** `http://mosaic-backend.us-east-1.elasticbeanstalk.com/`

---

## Tier 0 — Infrastructure (S0)

| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| P0.1 | `GET https://api.mosaicbizhub.com/` | 200 JSON health | |
| P0.2 | EB application health + boot logs | Mongo connected; no startup crash | |
| P0.3 | Log hygiene after auth tests | No OTP values in application logs | |

---

## Tier 1 — Auth (S1)

| ID | Test | Endpoint |
|----|------|----------|
| P1.1 | Register test user | `POST /api/users/register` |
| P1.2 | Verify OTP | `POST /api/users/verify-otp` |
| P1.3 | Resend OTP | `POST /api/users/resend-otp` |
| P1.4 | Login / logout | `POST /api/users/login`, `/logout` |
| P1.5 | Session check | `GET /api/users/auth/check` |
| P1.6 | Admin role block | Register with `role: admin` → must not become admin |
| P1.7 | Forgot / reset password | `POST /api/users/forgot-password`, `/reset-password` |
| P1.8 | Google OAuth | `GET /api/auth/google` → callback (test Google app) |

---

## Tier 2 — Vendor onboarding (S2)

| ID | Test |
|----|------|
| P2.1 | Save draft — `POST /api/vendor-onboarding/draft` |
| P2.2 | Create verification payment — `POST /api/vendor-onboarding/stage1/create-payment` |
| P2.3 | Complete verification payment (test card / controlled amount) |
| P2.4 | Payment status — `GET /api/vendor-onboarding/stage1/payment-status` → paid |
| P2.5 | Submit — `POST /api/vendor-onboarding/submit` (must reject if unpaid) |
| P2.6 | Upload URL — `GET /api/vendor-onboarding/stage1/upload-url` |

---

## Tier 3 — Admin review

| ID | Test |
|----|------|
| P3.1 | List applications — `GET /api/vendor-onboarding/pending` (admin token) |
| P3.2 | Application detail — `GET /api/vendor-onboarding/:applicationId` |
| P3.3 | Verify document — `POST /api/vendor-onboarding/:applicationId/verify` |
| P3.4 | Finalize — `POST /api/vendor-onboarding/:applicationId/finalize` |
| P3.5 | Business approve — `POST /admin/api/business/approve/:id` (requires Connect completed) |

---

## Tier 4 — Stripe / webhooks

| ID | Test |
|----|------|
| P4.1 | Stripe Dashboard: all 5 endpoints show recent successful deliveries |
| P4.2 | Vendor verification webhook fires on PI success |
| P4.3 | Subscription webhook fires on invoice payment |
| P4.4 | Order webhooks fire on test order payment |
| P4.5 | No signature bypass in production (`NODE_ENV=production`) |

See [stripe-webhook-registration.md](stripe-webhook-registration.md).

---

## Tier 5 — Orders

| ID | Test |
|----|------|
| P5.1 | Vendor Connect complete — `POST /api/connect/:businessId/account-link` |
| P5.2 | Initiate order — `POST /api/orders/initiate` (server-derived total) |
| P5.3 | Pay with test card; confirm `paymentStatus: paid` |
| P5.4 | Retrieve intent — `GET /api/orders/retrieve-intent/:id` |
| P5.5 | Vendor order list — `GET /api/orders/vendor` |

---

## Tier 6 — Public discovery

| ID | Test |
|----|------|
| P6.1 | Keyword search — `GET /api/public/search?keyword=...` |
| P6.2 | Location filter — `GET /api/public/search?location=...` |
| P6.3 | Product list / filters — `GET /api/products/list`, `/products/filters` |
| P6.4 | Vendor profile — `GET /api/public/product/vendor-profile/:businessId` |
| P6.5 | Subscription plans — `GET /api/subscription-plans` |

---

## Known P0 blockers (smoke may pass while these remain)

Deployment smoke confirms **deploy health**, not unrestricted public launch. Track open items in [launch-readiness-report.md](launch-readiness-report.md) section 9.

| ID | Risk |
|----|------|
| P0-1 | No automated tests / CI |
| P0-2 | `POST /api/business` trusts client `paymentStatus` |
| P0-3 | Product tier limits not enforced on create |
| P0-4 | Vendor submit validation mostly disabled |
| P0-5 | Business `isActive: true` before admin approval |
| P0-6 | Order confirmation emails before payment |
| P0-7 | `/api/payments/create-payment-intent` unauthenticated |
| P0-8 | `/stripe/*` Connect routes unauthenticated |
| P0-9 | Sanitization middleware not mounted |
| P0-10 | Dual vendor onboarding paths |
| P0-11 | Duplicate order webhook handlers |

---

## Automated probe (Tier 0 only)

From any machine with network access:

```powershell
(Invoke-WebRequest -Uri "https://api.mosaicbizhub.com/" -UseBasicParsing).StatusCode
(Invoke-WebRequest -Uri "https://api.mosaicbizhub.com/" -UseBasicParsing).Content
```

Expected: status `200` and JSON health body.

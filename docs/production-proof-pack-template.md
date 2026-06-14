# Production Soft-Launch Proof Pack — 2026-06-07

> Template: copy this file per release, fill in fields, attach redacted screenshots. Do not commit secrets.

## Release metadata

- Deployed commit (`main`):
- Previous known-good commit:
- Deploy timestamp:
- PR link (`staging` → `main`):
- Approvers:
- Executor:

## Pre-deploy rollback confirmation

- [ ] Last good SHA recorded on EB
- [ ] EB rollback path confirmed with infra owner
- [ ] Production env vars documented ([production-env-checklist.md](production-env-checklist.md))

## Branch / deploy model (MVP)

- Integration: PR → `staging` (no hosted staging backend)
- Production: PR → `main` → AWS EB
- Hosted staging: **deferred** ([hosted-staging-decision.md](hosted-staging-decision.md))

---

## Smoke results

Reference: [production-smoke-checklist.md](production-smoke-checklist.md)

| ID | PASS/FAIL | Notes |
|----|-----------|-------|
| P0.1 | PASS | `GET https://api.mosaicbizhub.com/` — automated probe 2026-06-07 (see below) |
| P0.2 | PENDING | Requires EB log access — infra owner |
| P0.3 | PENDING | Requires auth flow + log review |
| P1.1–P1.8 | PENDING | Manual test accounts |
| P2.1–P2.6 | PENDING | Manual vendor test account |
| P3.1–P3.5 | PENDING | Manual admin test account |
| P4.1–P4.5 | PENDING | Stripe Dashboard + test payments |
| P5.1–P5.5 | PENDING | Connect + order flow |
| P6.1–P6.5 | PENDING | Public API probes |

### P0.1 evidence (2026-06-07)

- URL: `https://api.mosaicbizhub.com/`
- Method: `GET`
- Result: HTTP 200 — `{"message":"Mosaic Biz Hub API is working 9 feb "}`
- EB boot logs: not captured in this pass (requires AWS console access)

---

## Webhook delivery (Stripe Dashboard — redact secrets)

| Route | Last success timestamp | HTTP status |
|-------|------------------------|-------------|
| `/api/webhooks/stripe` | | |
| `/api/stripe/webhook` | | |
| `/api/subscription/webhook` | | |
| `/api/vendor-onboarding/webhook/payment` | | |
| `/api/stripe/payment/webhook` | | |

Registration guide: [stripe-webhook-registration.md](stripe-webhook-registration.md)

---

## Environment verification

- [ ] All vars in [production-env-checklist.md](production-env-checklist.md) set on EB
- [ ] Stripe webhook secrets match Dashboard signing secrets (5 endpoints)
- [ ] Frontend env on Vercel/host matches API URL and JWT

---

## Launch readiness sign-off

| Gate | Status |
|------|--------|
| Deploy healthy (P0.1–P0.2) | Partial — P0.1 only |
| Auth smoke (P1) | Not run |
| Vendor journey (P2–P3) | Not run |
| Payments / webhooks (P4–P5) | Not run |
| P0 code blockers closed | **No** — see [launch-readiness-report.md](launch-readiness-report.md) |

**Recommendation:** Do not sign off unrestricted public launch until P1–P6 smoke complete and P0 blockers tracked or explicitly deferred with business approval.

---

## Redactions applied

- [ ] No OTP, JWT, cookie values, `whsec_`, `sk_live_`, passwords in attachments
- [ ] Screenshots cropped to exclude env var panels

---

## Attachments (optional)

- Stripe webhook delivery screenshots (5 endpoints)
- EB health screenshot
- Sample order flow screenshot (test account)

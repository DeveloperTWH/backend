# Production Soft-Launch Proof Pack

> Template: copy this file per release, fill in fields, attach redacted screenshots. Do not commit secrets.

---

## Release — staging integration gate 2026-06-14 (pre-merge)

Candidate not yet on EB. Records integration gate before PR `staging` → `main`.

### Release metadata

- Candidate commit (`staging`): `28510cf`
- Previous known-good commit (`main` / current EB): `2dd52c4`
- Deploy timestamp: not deployed yet
- PR link (`staging` → `main`): pending
- Approvers: pending
- Executor: automated integration gate run

### Pre-deploy rollback confirmation

- [x] Last good SHA recorded on EB — `2dd52c4`
- [ ] EB rollback path confirmed with infra owner
- [x] Production env vars documented ([production-env-checklist.md](production-env-checklist.md))

### Smoke results (partial — pre-merge)

| ID | PASS/FAIL | Notes |
|----|-----------|-------|
| P0.1 | PASS | Prod probe 2026-06-14 — `GET https://api.mosaicbizhub.com/` HTTP 200 |
| P0.2 | PENDING | EB logs — infra owner |
| P0.3 | PENDING | After post-deploy auth smoke + log review |
| P1.5 (unauth) | PASS | Prod `GET /api/users/auth/check` → 401 |
| P1.1–P1.8 (full) | PARTIAL | Local `verify-auth-check-smoke.js` PASS; prod login flow pending post-deploy |
| P2.1–P2.6 | PENDING | Post-deploy vendor test account |
| P3.1–P3.5 | PENDING | Post-deploy admin test account |
| P4.1–P4.5 | PENDING | Stripe Dashboard after deploy |
| P5.1–P5.5 | PENDING | Connect + order flow |
| P6.1–P6.5 | PENDING | Public API probes |

Local integration: `npm test` 57/57 pass; `GET http://localhost:3001/` 200; auth smoke script PASS.

Local boot probe evidence:

- `GET http://localhost:3001/` returned **200** with expected health JSON.
- Server process was intentionally stopped after the probe.
- Windows process termination exit code observed: **4294967295** (normal for intentional stop on Windows).

Hosted staging smoke test is **not applicable** for this release — hosted staging is deferred and no staging deploy target exists ([hosted-staging-decision.md](hosted-staging-decision.md)). Current release path: validate on `staging` branch → merge to `main` → deploy `main` to AWS Elastic Beanstalk → controlled production smoke.

See [deploy-verification.md](deploy-verification.md) § Integration gate — 2026-06-14.

---

## Release — PR #9 post-merge gate 2026-06-14

PR [#9](https://github.com/DeveloperTWH/backend/pull/9) merged to `main`. Controlled production smoke **blocked** until EB deploy commit confirmed.

### Release metadata

- Merge commit (`main`): `efbf0fb`
- Latest `origin/main` HEAD: `2e41cd6` (evidence docs only)
- Previous known-good commit (EB rollback target): `2dd52c4`
- Deploy timestamp: _pending infra — merge does not auto-deploy_
- PR link: https://github.com/DeveloperTWH/backend/pull/9 (merged)
- EB deployed commit: _pending infra_
- Controlled smoke approved: _pending infra_

### Baseline probes only (2026-06-14T21:42:14Z)

| Check | Result | Notes |
|-------|--------|-------|
| `GET https://api.mosaicbizhub.com/` | **PASS** — HTTP 200 | Baseline only — does not prove PR #9 live |
| Unauth `GET /api/users/auth/check` | **PASS** — HTTP 401 | Baseline only |

### Post-deploy smoke (BLOCKED)

| ID | PASS/FAIL | Notes |
|----|-----------|-------|
| P0.1 | BASELINE | 200 at probe time — EB commit unconfirmed |
| P0.2 | BLOCKED | Pending infra EB deploy confirmation |
| P0.3–P6 | BLOCKED | Run after infra confirms `efbf0fb`+ live + Q9 smoke approval |

See [integration-gate-asana-evidence.md](integration-gate-asana-evidence.md) § Post-merge deploy gate.

---

## Release — 2026-06-07 (historical template)

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

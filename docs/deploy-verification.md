# Deploy Verification Log

Records post-deploy verification for Mosaic Biz Hub backend. For full smoke tiers see [production-smoke-checklist.md](production-smoke-checklist.md).

---

## MVP deploy target

- **Branch deployed to EB:** `main` (not `staging` — staging is integration-only)
- **Canonical URL:** `https://api.mosaicbizhub.com`
- **Process:** [DEPLOYMENT.md](../DEPLOYMENT.md)

---

## Verification — 2026-06-07 (launch-readiness doc pass)

| Check | Result | Notes |
|-------|--------|-------|
| `GET https://api.mosaicbizhub.com/` | **PASS** | HTTP 200 — `{"message":"Mosaic Biz Hub API is working 9 feb "}` |
| EB boot logs | Not captured | Requires AWS console / infra owner |
| Mongo connected in logs | Not captured | Requires AWS console |
| Stripe webhook deliveries | Not captured | Requires Stripe Dashboard review |

**Conclusion:** Production API is reachable and returns health JSON. Full S1–S6 smoke and EB log review remain pending for release sign-off.

---

## After each future deploy

1. Record deployed `main` commit SHA.
2. Run Tier 0–S2 minimum from [production-smoke-checklist.md](production-smoke-checklist.md).
3. Update [production-proof-pack-template.md](production-proof-pack-template.md).
4. Confirm no OTP values in EB logs after auth smoke (P0.3).

---

## Staging branch note

The `staging` branch is **not deployed** to a host in MVP workflow. Verification on `staging` is limited to:

- PR review complete
- Local `npm run dev` boot with `.env`
- Integration checklist in [STAGING.md](../STAGING.md)

Runtime webhook and payment proof happens only after `main` → EB deploy.

---

## Integration gate — 2026-06-14 (`staging` @ `28510cf`)

Pre-PR verification before `staging` → `main`. Staging is **8 commits ahead** of `origin/main` (`2dd52c4`).

### Rollback readiness (pre-merge)

| Item | Value |
|------|-------|
| Last known good `main` SHA (current EB baseline) | `2dd52c4` — Merge pull request #8 from DeveloperTWH/staging |
| Staging HEAD (candidate release) | `28510cf` — Add launch readiness and production verification docs |
| EB rollback path | Manual — infra owner per [DEPLOYMENT.md](../DEPLOYMENT.md) |

### STAGING.md integration checklist

| Item | Status |
|------|--------|
| PR reviewed; security-sensitive diffs called out | Pending reviewer (Wave 2 hardening in 8 commits) |
| App boots locally with `.env` | **PASS** — `npm start`, Mongo connected, port 3001 |
| No secrets committed; `.env.example` updated | **PASS** — working tree clean at audit time |
| Docs updated (README, SETUP, DEPLOYMENT, security) | **PASS** — launch docs commit `28510cf` |
| P0 blockers tracked in launch-readiness-report | **PASS** — reviewed; deploy does not close them |

### Automated / local commands executed

| Command | Result |
|---------|--------|
| `npm test` | **57/57 pass** |
| `GET http://localhost:3001/` | **200** — `{"message":"Mosaic Biz Hub API is working 9 feb "}` |
| `node scripts/verify-auth-check-smoke.js` | **PASS** — unauth 401; customer/vendor/admin auth/check 200 with safe keys; frontend pages 200 |
| `.env` boot-critical vars | **PASS** — `PORT=3001`, `API_BASE_URL` port 3001 aligned; all 5 `STRIPE_*_WEBHOOK_SECRET` set |
| `.env.local` | Exists but **not loaded** by app (`dotenv.config()` in `index.js`) |

### Local boot probe evidence

Local boot probe passed:

- `GET http://localhost:3001/` returned **200** with expected health JSON.
- Server process was intentionally stopped after the probe.
- Windows process termination exit code observed: **4294967295** (normal for intentional stop on Windows).

### Release path note

Hosted staging smoke test is **not applicable** for this release — hosted staging is deferred and no staging deploy target exists ([hosted-staging-decision.md](hosted-staging-decision.md)).

Current release path: validate on `staging` branch → merge to `main` → deploy `main` to AWS Elastic Beanstalk → controlled production smoke.

### Production probes (current `main` on EB — not staging candidate yet)

| Check | Result |
|-------|--------|
| `GET https://api.mosaicbizhub.com/` (P0.1) | **PASS** — HTTP 200 |
| `GET https://api.mosaicbizhub.com/api/users/auth/check` (unauth) | **PASS** — HTTP 401 |
| P0.2 EB boot logs | Not captured — infra owner |
| P1–P6 full manual smoke | **PENDING** — run after `staging` → `main` merge + EB deploy of `28510cf` |
| P4 Stripe webhook deliveries | Not captured — Stripe Dashboard |

**Integration verdict:** **GO** for opening PR `staging` → `main` (automated tests + local boot + auth smoke pass).

**Production deploy verdict:** **NO-GO** for unrestricted launch until post-merge EB deploy smoke (P1–P6) and P0 blocker sign-off.

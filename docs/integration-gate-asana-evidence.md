# Integration Gate — Asana Control Center Evidence

**Date:** 2026-06-14  
**Branch:** `staging`  
**Evidence commit:** `f4d246b` — Record local boot probe evidence and clarify production release path  
**Integration gate candidate (pre-evidence):** `28510cf`  
**EB baseline (`main`):** `2dd52c4`

---

## Asana status — mark **Evidence Added** / **Ready for Review**

Do **not** mark Complete or launch-ready. Hosted staging: **Deferred / Not applicable**.

### Paste-ready note

```text
Local backend boot probe completed and documented.

Evidence:
- GET http://localhost:3001/ returned 200 with expected health JSON.
- API process was intentionally stopped after the probe.
- Windows termination exit code 4294967295 recorded as normal for this stop.
- Evidence added to docs/deploy-verification.md and docs/production-proof-pack-template.md.
- Committed to staging: f4d246b
- Pushed to origin/staging.

Hosted staging:
- Not applicable — repo docs confirm hosted staging is deferred; no staging deploy target exists.

Status:
Local boot verification passed. Production deployment verification (main → EB → controlled smoke) is still required before launch-ready sign-off.
```

---

## Pre-promotion checklist (2026-06-14)

| Item | Status | Notes |
|------|--------|-------|
| `npm test` | **PASS** | 57/57 pass on `f4d246b` |
| PR reviewed; security-sensitive diffs called out | **PASS** | [PR #9](https://github.com/DeveloperTWH/backend/pull/9) merged `2026-06-14` |
| App boots locally with `.env` | **PASS** | Documented in deploy-verification.md |
| No secrets committed | **PASS** | Secret scan clean on evidence docs |
| Docs updated | **PASS** | deploy-verification + proof-pack updated |
| P0 blockers tracked | **PASS** | See launch-readiness-report.md §9 — deploy does not close them |
| Rollback SHA recorded | **PASS** | `2dd52c4` on EB |
| EB rollback path confirmed | **PENDING** | Infra owner |
| `staging` pushed to origin | **PASS** | `2371421` on `origin/staging` |

**Pre-promotion verdict:** PR #9 **merged** to `main` (`efbf0fb`). EB deploy confirmation pending. Not launch-ready.

---

## Post-merge deploy gate (2026-06-14)

| Item | Value |
|------|-------|
| PR #9 status | **MERGED** @ `2026-06-14T21:38:12Z` |
| Merge commit | `efbf0fb` |
| Local `main` synced | **PASS** @ `efbf0fb`; contains `645a282` |
| `npm test` on `main` | **57/57 pass** |
| Auto-deploy on merge | **No** — manual EB deploy per DEPLOYMENT.md |
| EB deployed commit | _pending infra_ |
| PR #9 live on production? | _pending infra_ |
| Rollback target | `2dd52c4` (documented pre-PR #9 baseline) |
| Controlled smoke approved? | _pending infra_ |

### Production baseline probes (baseline only)

Timestamp: `2026-06-14T21:42:14Z`

| Check | Result |
|-------|--------|
| `GET https://api.mosaicbizhub.com/` | **200** |
| Unauth `GET /api/users/auth/check` | **401** |

Does **not** prove PR #9 is deployed — EB commit confirmation required.

---

## Infra owner request (post-merge — send now, PENDING)

PR #9 has been merged into `main`. **Do not start controlled production smoke until infra responds.**

```text
PR #9 has been merged into main.

Please confirm whether AWS Elastic Beanstalk production has deployed the merged main commit.

Needed before post-deploy smoke:
1. EB application/environment name
2. Deployed version label or commit
3. Whether PR #9 / latest main (efbf0fb) is currently live
4. Rollback target/version
5. Who can execute rollback
6. Confirmation production env vars/secrets are configured
7. Approval to begin controlled production smoke
```

| Question | Response |
|----------|----------|
| EB application/environment name | _pending_ |
| Deployed version label/commit | _pending_ |
| PR #9 / `efbf0fb` live on production? | _pending_ |
| Rollback target/version | _pending_ |
| Rollback executor | _pending_ |
| Production env vars configured | _pending_ |
| Controlled smoke approved | _pending_ |

---

## PR review gate (2026-06-14) — CLOSED

| Item | Value |
|------|-------|
| PR | [#9 — Wave 2 backend hardening and production preflight evidence](https://github.com/DeveloperTWH/backend/pull/9) |
| Base | `main` (`2dd52c4`) |
| Head | `staging` (`2371421`) |
| Commits | 11 ahead of `main` |
| Preflight | `npm test` 57/57 pass; working tree clean |
| Assignee | Manual — pending |
| Merge | **MERGED** `2026-06-14T21:38:12Z` → `efbf0fb` |

---

## Infra owner request (pre-merge — superseded by post-merge gate below)

Do **not** merge until infra owner responds. Paste-ready message:

```text
Please confirm the AWS Elastic Beanstalk rollback path before we merge/deploy:

1. Current EB application/environment name
2. Current deployed version label or commit
3. Rollback target/version
4. Who has permission to execute rollback
5. Estimated rollback time
6. Confirmation that production env vars/secrets are already configured
7. Preferred deploy window
```

| Question | Response |
|----------|----------|
| EB application/environment name | _pending_ |
| Current deployed version/commit | _pending_ |
| Rollback target/version | _pending_ |
| Rollback executor | _pending_ |
| Estimated rollback time | _pending_ |
| Production env vars configured | _pending_ |
| Preferred deploy window | _pending_ |

---

## Production smoke gate (post-deploy — PENDING)

Run after `main` merge + EB deploy of merged SHA. Record in [production-proof-pack-template.md](production-proof-pack-template.md).

| Field | Value |
|-------|-------|
| URL | `GET https://api.mosaicbizhub.com/` |
| Expected | HTTP 200 + health JSON |
| Commit deployed | _pending infra — merge is `efbf0fb`; EB commit unconfirmed_ |
| Environment | production (EB) |
| Timestamp | baseline probe `2026-06-14T21:42:14Z` only |
| Tester | automated baseline probe |
| Screenshot/log | _pending post-deploy smoke_ |

**Controlled production smoke:** **BLOCKED** until infra confirms PR #9 / `efbf0fb` is live on EB.

Current EB baseline (pre-PR #9 deploy confirmation): prod health probe **PASS** at `2026-06-14T21:42:14Z` — see deploy-verification.md § Post-merge gate.

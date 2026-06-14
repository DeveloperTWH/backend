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
| PR reviewed; security-sensitive diffs called out | **PENDING** | [PR #9](https://github.com/DeveloperTWH/backend/pull/9) open — assign reviewer |
| App boots locally with `.env` | **PASS** | Documented in deploy-verification.md |
| No secrets committed | **PASS** | Secret scan clean on evidence docs |
| Docs updated | **PASS** | deploy-verification + proof-pack updated |
| P0 blockers tracked | **PASS** | See launch-readiness-report.md §9 — deploy does not close them |
| Rollback SHA recorded | **PASS** | `2dd52c4` on EB |
| EB rollback path confirmed | **PENDING** | Infra owner |
| `staging` pushed to origin | **PASS** | `2371421` on `origin/staging` |

**Pre-promotion verdict:** PR **opened** — awaiting reviewer sign-off. Not launch-ready.

---

## PR review gate (2026-06-14)

| Item | Value |
|------|-------|
| PR | [#9 — Wave 2 backend hardening and production preflight evidence](https://github.com/DeveloperTWH/backend/pull/9) |
| Base | `main` (`2dd52c4`) |
| Head | `staging` (`2371421`) |
| Commits | 11 ahead of `main` |
| Preflight | `npm test` 57/57 pass; working tree clean |
| Assignee | Manual — pending |
| Merge | **Blocked** until reviewer approval + infra rollback confirmation |

---

## Infra owner request (send before merge — PENDING)

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
| Commit deployed | _pending merge/deploy_ |
| Environment | production (EB) |
| Timestamp | _pending_ |
| Tester | _pending_ |
| Screenshot/log | _pending_ |

Current EB baseline (not staging candidate): prod health probe **PASS** at audit time — see deploy-verification.md.

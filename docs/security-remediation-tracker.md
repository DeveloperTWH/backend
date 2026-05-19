# Security Remediation Tracker

This document tracks security checklist remediation items, their repository evidence, staging proof status, and validation date.

## Status summary

| Item | Checklist item | PR link | Commit hash | Staging proof | Validation date |
| --- | --- | --- | --- | --- | --- |
| 10 | Canonical Stripe webhook path identified | Pending: no PR link available from local workspace | `d6aed10b3fa5392980339cdae88d3a996aa2268d` | Local signed webhook simulation passed. Deployed Stripe delivery log capture still pending. | 2026-05-19 |
| 11 | Duplicate payment/webhook handlers documented | Pending: no PR link available from local workspace | `faf432f3562a9e8473dcb8adc13caf20b33d52b0` | N/A for runtime behavior. Documentation verified in repo. | 2026-05-19 |
| 12 | Backend README created | Pending: no PR link available from local workspace | `18554f2c28738f8b21a8f91ca36e2ab1f46325e4` | N/A for runtime behavior. README verified in repo. | 2026-05-19 |
| 13 | Environment/setup checklist created | Pending: no PR link available from local workspace | `0f7b7a0976a4b79818fc53c369037706ef1f57c0` | N/A for runtime behavior. `.env.example` and `SETUP.md` verified in repo. | 2026-05-19 |
| 17 | Tracking document created | Pending: no PR link available from local workspace | `aec0e1af4e5bf26caa74a15154b09f13e9e1b647` | N/A. Tracking document created and committed in repo. | 2026-05-19 |

## Evidence details

### Item 10

- Canonical order-payment webhook path: `/api/webhooks/stripe`
- Duplicate order-payment webhook definitions removed from legacy locations.
- Raw-body mount order preserved so Stripe signature verification still works.
- Local validation completed with a signed `payment_intent.succeeded` simulation against the canonical handler.
- Remaining staging evidence to capture after deployment:
  - Stripe event ID
  - HTTP `200` delivery result
  - application log showing successful processing

Supporting docs:

- [docs/stripe-webhook-remediation.md](C:/Users/Asus/OneDrive/Desktop/TWH-projects/mosiac-backend/docs/stripe-webhook-remediation.md:1)
- [docs/stripe-handler-ownership-map.md](C:/Users/Asus/OneDrive/Desktop/TWH-projects/mosiac-backend/docs/stripe-handler-ownership-map.md:1)

### Item 11

- Route-to-handler mapping documented.
- Webhook-to-secret mapping documented.
- Flow ownership across Stripe-related controllers documented.

Supporting doc:

- [docs/stripe-handler-ownership-map.md](C:/Users/Asus/OneDrive/Desktop/TWH-projects/mosiac-backend/docs/stripe-handler-ownership-map.md:1)

### Item 12

- Backend README added with setup, commands, environment variables, architecture, and deployment notes.

Supporting doc:

- [README.md](C:/Users/Asus/OneDrive/Desktop/TWH-projects/mosiac-backend/README.md:1)

### Item 13

- Safe `.env.example` added with placeholder values only.
- `SETUP.md` added with quick start, checklist, command summary, and environment guidance.

Supporting docs:

- [.env.example](C:/Users/Asus/OneDrive/Desktop/TWH-projects/mosiac-backend/.env.example:1)
- [SETUP.md](C:/Users/Asus/OneDrive/Desktop/TWH-projects/mosiac-backend/SETUP.md:1)

## Deployment notes

- Fill in the PR link column once the relevant commits are pushed and a PR is opened.
- Replace `Pending` staging proof entries with deployed-environment screenshots, Stripe test logs, or application log excerpts after staging validation.
- Because a populated local `.env` exists in this workspace, any credentials previously shared outside a secure local machine should be rotated.

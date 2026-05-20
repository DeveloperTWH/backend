# Security Remediation Notes

This is the single consolidated remediation document for the completed security checklist items in this repository.

## Status summary

| Item | Checklist item | PR link | Commit hash | Staging proof | Validation date |
| --- | --- | --- | --- | --- | --- |
| 1 | Hardcoded secret removed from active auth flow | Pending: no PR link available from local workspace | `2b9e5624124b400eb38630210385a54111fa0bc2` | Environment-based JWT secret verified locally. | 2026-05-19 |
| 3 | Admin route authorization enforced | Pending: no PR link available from local workspace | `9b57a4129f74ca93cb29de0b0224f7f0e2919ad8` | Unauthorized admin creation blocked successfully. Authorized admin creation verified. | 2026-05-19 |
| 4 | OAuth role escalation prevented | Pending: no PR link available from local workspace | `1ab53662b886d7b615c06c39561e593a74230a50` | Querystring role tampering validation completed locally. | 2026-05-19 |
| 7 | Auth endpoints rate-limited | Pending: no PR link available from local workspace | `e5672ff241b5b381c15fde5b49fc41f217c687c2` | Register and OTP rate-limit validation completed locally. | 2026-05-19 |
| 8 | OTP logging removed | Pending: no PR link available from local workspace | `2566c4d5060fc204c9b7f83e5e0afdb53d1670bb` | OTP values confirmed removed from logs. | 2026-05-19 |
| 9 | Cookie/session behavior standardized | Pending: no PR link available from local workspace | Pending until this note is committed | Shared backend cookie helper verified locally. Production-style cross-domain cookie flags verified from env-based configuration. | 2026-05-19 |
| 10 | Canonical Stripe webhook path identified | Pending: no PR link available from local workspace | `d6aed10b3fa5392980339cdae88d3a996aa2268d` | Local signed webhook simulation passed. Deployed Stripe delivery log capture still pending. | 2026-05-19 |
| 11 | Duplicate payment/webhook handlers documented | Pending: no PR link available from local workspace | `faf432f3562a9e8473dcb8adc13caf20b33d52b0` | Documentation verified in repository. | 2026-05-19 |
| 12 | Backend README created | Pending: no PR link available from local workspace | `18554f2c28738f8b21a8f91ca36e2ab1f46325e4` | README verified in repository. | 2026-05-19 |
| 13 | Environment/setup checklist created | Pending: no PR link available from local workspace | `0f7b7a0976a4b79818fc53c369037706ef1f57c0` | `.env.example` and `SETUP.md` verified in repository. | 2026-05-19 |
| 14 | Staging environment documented | Pending: no PR link available from local workspace | `58e16d67dc416a96cbf3f14dc9f8c685ed02bfe8` | No staging environment exists currently. Documented in this remediation file instead of a separate `STAGING.md`. | 2026-05-19 |
| 16 | Staging-dependent validation/deployment evidence | Pending: no PR link available from local workspace | `58e16d67dc416a96cbf3f14dc9f8c685ed02bfe8` | No staging environment exists currently, so staging-only validation evidence is not available. | 2026-05-19 |
| 17 | Tracking document created | Pending: no PR link available from local workspace | `c601ee04619e279bd3335e4fd380d9c837158f70` | Tracking information merged into this document. | 2026-05-19 |

## Item 1: Hardcoded secret removed from active auth flow

### Fix summary

- Removed hardcoded JWT secret usage from the active authentication flow.
- Authentication now reads the JWT secret from environment variables.

### Validation

- JWT authentication flow verified using environment-based secret configuration.
- No hardcoded authentication secret remains in the active auth flow.

### Deployment notes

- Rotate `JWT_SECRET` in the deployment secret manager for each environment.
- Redeploy or restart all backend instances after rotation.
- Existing sessions should be treated as invalid after the secret is changed.

## Item 3: Admin route authorization enforced

### Fix summary

- Protected admin creation routes with authorization controls.
- Prevented unauthenticated or unauthorized users from creating internal admin accounts.

### Validation

- Unauthorized admin creation requests were blocked.
- Authorized admin creation flow was verified successfully.

### Deployment notes

- Keep admin-user creation restricted to authenticated internal/admin flows only.

## Item 4: OAuth role escalation prevented

### Fix summary

- Google OAuth no longer trusts a frontend-supplied `role` query parameter.
- Existing users keep their stored role.
- New Google users default to `customer`.

### Validation

- Querystring tampering validation completed locally.
- OAuth role escalation to `business_owner` or `admin` is no longer accepted through the login URL alone.

## Item 7: Auth endpoints rate-limited

### Fix summary

- Rate limiting was added to sensitive auth endpoints.
- Registration, login, OTP verification, and OTP resend flows now have request throttling.

### Validation

- Register and OTP rate-limit behavior was validated locally.

### Deployment notes

- Verify reverse proxy and IP forwarding behavior in staging/production so rate limiting uses the correct client IP.

## Item 8: OTP logging removed

### Fix summary

- Removed OTP values from logs.
- Sensitive one-time-password data is no longer emitted in application logging.

### Validation

- OTP values were confirmed absent from logs during local validation.

## Item 9: Cookie/session behavior standardized

### Fix summary

- Added a centralized backend cookie helper in `utils/cookieHelper.js`.
- Removed the forced development behavior from `controllers/authController.js`, including the old `const IS_PROD = false`.
- Standardized login, logout, OTP-verification login, Google OAuth session cookies, and cookie clearing to use the same environment-based rules.
- Cookie behavior is now controlled by `NODE_ENV` plus optional `COOKIE_DOMAIN`, `COOKIE_SECURE`, and `COOKIE_SAMESITE` overrides.

### Validation

- App boot validation passed after the refactor.
- Local helper validation confirmed:
  - development-style defaults resolve to `secure: false`, `sameSite: lax`, no domain
  - production-style defaults resolve to `secure: true`, `sameSite: none`, `domain: .mosaicbizhub.com`
- Login/logout cookie persistence was standardized at the backend controller level.
- Full cross-domain browser persistence was not tested in this workspace because the referenced frontend file `mosaic-biz-frontend/middleware.ts` is not present in this repository.

### Deployment notes

- If the frontend is deployed on a different subdomain, production should use secure cookies and a matching domain policy.
- If environment-specific overrides are needed, use:
  - `COOKIE_DOMAIN`
  - `COOKIE_SECURE`
  - `COOKIE_SAMESITE`
- The frontend middleware/session handling in the separate frontend repository should be reviewed to match the standardized backend cookie behavior.

## Item 10: Canonical Stripe webhook path identified

### Fix summary

- Defined `/api/webhooks/stripe` as the authoritative order-payment webhook endpoint.
- Removed duplicate order-payment webhook route `/api/payments/stripe-webhook`.
- Removed legacy duplicate path definition `/api/webhooks/stripe-webhook`.
- Mounted the canonical webhook before `express.json()` so Stripe signature verification still receives the raw request body.
- Removed the duplicate vendor-onboarding webhook registration from `routes/vendorOnboarding.routes.js` and kept the authoritative raw-body mount in `app.js`.

### Validation

- Local code-path validation passed for the canonical order-payment webhook.
- A signed `payment_intent.succeeded` payload was accepted by the canonical handler.
- The handler returned `200 { received: true }`.
- The mocked order update executed with `paymentStatus: paid` and `orderStatus: completed`.

### Deployment notes

- Update Stripe Dashboard or Stripe CLI forwarding for order-payment events to `/api/webhooks/stripe`.
- Remove any Stripe endpoint configuration still pointing to `/api/payments/stripe-webhook` or `/api/webhooks/stripe-webhook`.
- Capture live Stripe delivery evidence after deployment:
  - Stripe event ID
  - HTTP `200` delivery result
  - application log showing successful processing

## Item 11: Duplicate payment/webhook handlers documented

### Fix summary

- Consolidated Stripe payment and webhook ownership into documentation.
- Mapped each route to its controller/handler, webhook secret, and business-flow owner.
- Clarified that multiple Stripe webhook handlers still exist intentionally because they support different flows.

### Route and secret ownership map

| Route | Handler | Secret / credential | Ownership |
| --- | --- | --- | --- |
| `/api/payments/create-payment-intent` | `paymentController.createPaymentIntent` | `STRIPE_SECRET_KEY` | Order payment intent creation |
| `/api/webhooks/stripe` | `webhookController.handleStripeWebhook` | `STRIPE_ENDPOINT_SECRET` | Canonical order-payment webhook |
| `/api/subscription/webhook` | `webhookController.handleSubscriptionWebhook` | `STRIPE_WEBHOOK_SECRET` | Subscription billing webhook |
| `/api/vendor-onboarding/webhook/payment` | `vendorOnboarding.controller.handleVendorPaymentWebhook` | `STRIPE_WEBHOOK_SECRET` | Vendor onboarding verification payment webhook |
| `/api/stripe/create-checkout-session` | `stripeController.createCheckoutSession` | `STRIPE_SECRET_KEY` | Business draft subscription checkout creation |
| `/api/stripe/webhook` | `stripeController.handleStripeWebhook` | `STRIPE_WEBHOOK_SECRET` | Business draft checkout completion and Connect account sync |
| `/api/stripe/payment/webhook` | `stripePaymentController.stripePaymentWebhook` | `STRIPE_WEBHOOK_SECRET_TWO` | Post-payment order fulfillment and email webhook |

### Validation

- Documentation was verified in the repository.

### Deployment notes

- Keep Stripe endpoint-secret assignments aligned with the map above.
- `STRIPE_WEBHOOK_SECRET` is currently shared by multiple handlers, so deployed endpoint configuration must reflect that accurately.

## Item 12: Backend README created

### Fix summary

- Added a root `README.md` covering setup instructions, environment variables, commands, project structure, architecture overview, and deployment notes.

### Validation

- README verified in the repository.

## Item 13: Environment/setup checklist created

### Fix summary

- Added `.env.example` with placeholder values only.
- Added `SETUP.md` with quick start steps, environment checklist, verification checklist, and deployment guidance.

### Validation

- `.env.example` and `SETUP.md` verified in the repository.

### Deployment notes

- Production should inject secrets through deployment configuration or a secret manager, not from a developer `.env`.
- Any credentials that have already been shared outside a secure local environment should be rotated.

## Item 14: Staging environment documented

### Fix summary

- There is currently no dedicated staging environment for this backend.
- To avoid confusion from extra files, the staging-status note is documented in this single remediation document instead of creating a separate `STAGING.md`.
- Because no staging environment exists, there are no staging URLs, no staging-only test accounts, and no separate QA expectation sheet to attach at this time.

### Validation

- Environment status verified from the current project workflow and repository context.
- No staging environment artifact exists today to validate against.

### Deployment notes

- When a staging environment is introduced, document these fields immediately:
  - base URL
  - admin/business/customer test accounts
  - webhook endpoints and secrets
  - QA smoke-test expectations

## Item 16: Staging-dependent validation/deployment evidence

### Fix summary

- Staging-dependent proof cannot be provided today because the project does not currently have a staging environment.
- Local repository checks and local runtime validation were used instead where possible.

### Validation

- This limitation is explicitly documented so the client understands why staging screenshots, staging URLs, and staging test execution evidence are absent.

### Deployment notes

- Once a staging environment exists, replace any staging-related `Pending` entries in this document with:
  - staging URL
  - test account reference
  - date of staging validation
  - screenshot or log evidence
  - tester/owner name if needed for audit traceability

## Item 17: Tracking document created

### Fix summary

- Created a tracking structure containing checklist item, PR link field, commit hash, staging proof status, and validation date.
- Consolidated that tracking information into this single remediation document to avoid confusion from multiple files.

### Validation

- Tracking information verified in this document.

## Repository evidence files

- [README.md](C:/Users/Asus/OneDrive/Desktop/TWH-projects/mosiac-backend/README.md:1)
- [SETUP.md](C:/Users/Asus/OneDrive/Desktop/TWH-projects/mosiac-backend/SETUP.md:1)
- [.env.example](C:/Users/Asus/OneDrive/Desktop/TWH-projects/mosiac-backend/.env.example:1)

## Remaining follow-up

- Fill in PR links after the commits are pushed and a PR is opened.
- Replace pending staging-proof entries with deployed-environment screenshots, Stripe test logs, or application log excerpts after staging validation.

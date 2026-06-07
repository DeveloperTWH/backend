# Staging Environment

## Current state

As of 2026-05-27, this repository uses the `staging` branch as the pre-production integration branch.

There is not currently a separate always-on hosted staging backend environment for this project. In practice, "staging" means:

- code is merged into `staging` first
- validation is performed from the `staging` branch
- production promotion happens only after staging-branch review and smoke testing against the live deployment workflow

The current live hosted production backend is:

- `mosaic-backend.us-east-1.elasticbeanstalk.com`

## Branch and environment model

| Layer | Current state |
| --- | --- |
| Feature work | Short-lived feature branch opened from `staging` or the current integration branch |
| Integration branch | `staging` |
| Hosted staging backend | Not currently provisioned |
| Hosted production backend | AWS Elastic Beanstalk at `mosaic-backend.us-east-1.elasticbeanstalk.com` |
| Production release source | Reviewed code promoted after `staging` validation |

## Expected staging configuration

If a hosted staging backend is introduced, it should use:

- a separate MongoDB database or isolated collections from production
- Stripe test keys and test webhook secrets only
- non-production AWS/S3 credentials and buckets
- non-production email credentials or a safe mail sandbox
- the same required environment variables as production, with test-safe values

## Validation required on `staging`

Before anything moves toward production, validate at least the following from the `staging` branch:

1. App boot succeeds with the target environment variables.
2. Auth flows work:
   - register
   - login
   - OTP verify
   - OTP resend
   - logout
3. Public registration cannot create admin users.
4. Google OAuth cannot elevate a user role from client input.
5. Vendor onboarding cannot bypass verification payment state.
6. Payment intent amount is derived from server-side order data.
7. Canonical Stripe webhook endpoints are configured and accept signed test events.
8. No OTP values or secrets appear in logs.
9. README, setup, staging, deployment, and remediation tracking docs match the current codebase.

## Promotion rule

Do not promote from `staging` to production until:

- the staging checklist above is complete
- security-impacting changes are reviewed
- required secrets are present in the deployment environment
- rollback instructions are confirmed in [DEPLOYMENT.md](C:/Users/Asus/OneDrive/Desktop/TWH-projects/mosiac-backend/DEPLOYMENT.md:1)

## Gap to close later

This project would benefit from a real hosted staging backend so webhook delivery, cookies, auth, and deployment behavior can be validated before production with environment parity.

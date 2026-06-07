# Deployment Process

## Purpose

This document defines the backend deployment flow, rollback approach, and release responsibilities for Mosaic Biz Hub.

## Current production environment

The backend is currently deployed on AWS Elastic Beanstalk at:

- `mosaic-backend.us-east-1.elasticbeanstalk.com`

This is the live hosted backend environment referenced by the deployment steps below.

## Release roles

| Role | Responsibility |
| --- | --- |
| Backend engineer | Prepare code changes, update docs, validate locally, and identify required environment changes |
| Reviewer or tech lead | Review security-sensitive behavior and approve release readiness |
| Release owner | Coordinate the production deployment window and confirm smoke-test completion |
| Infrastructure or AWS owner | Manage deployment platform settings, secrets, networking, and rollback access |

## Pre-deployment checklist

Before deployment:

1. Merge intended changes into `staging`.
2. Complete the checks listed in [STAGING.md](C:/Users/Asus/OneDrive/Desktop/TWH-projects/mosiac-backend/STAGING.md:1).
3. Confirm environment variables are set correctly in the target deployment environment.
4. Confirm Stripe webhook endpoints and webhook secrets match the active routes.
5. Confirm database, AWS, mail, and auth credentials belong to the correct environment.
6. Confirm any security documentation changes are reflected in [docs/security-remediation-notes.md](C:/Users/Asus/OneDrive/Desktop/TWH-projects/mosiac-backend/docs/security-remediation-notes.md:1).

## Deployment steps

1. Identify the exact commit to release.
2. Get reviewer or release-owner approval.
3. Promote the reviewed code from `staging` to the production release branch or target used by the hosting platform.
4. Deploy to the AWS Elastic Beanstalk production environment `mosaic-backend.us-east-1.elasticbeanstalk.com` using the platform-specific process owned by the infrastructure or AWS owner.
5. Verify the application boot log:
   - database connection succeeds
   - server starts on the expected port
   - no missing-secret or webhook-signature errors appear during startup
6. Run smoke tests against production-safe endpoints:
   - `GET https://mosaic-backend.us-east-1.elasticbeanstalk.com/`
   - auth login/logout
   - one non-destructive protected route
   - Stripe webhook delivery health, if applicable

## Rollback steps

If the deployment fails or a critical regression is found:

1. Stop further traffic changes or release promotion.
2. Re-deploy the last known good production commit.
3. Re-verify Elastic Beanstalk application health, startup logs, and smoke-test the restored version.
4. If the issue is configuration-related, restore the previous environment variables or secrets.
5. Record the failed release commit, observed impact, and rollback time in the release notes or incident log.

## Rollback ownership

- The release owner decides whether rollback is required.
- The infrastructure or AWS owner performs the rollback on the hosting platform.
- The backend engineer validates the restored application behavior.

## Evidence to retain after each deployment

Keep the following release evidence:

- deployed commit hash
- deployment timestamp
- person who approved the release
- person who executed the deployment
- smoke-test result summary
- rollback reference, if rollback was needed

## Notes

- Secret rotation verification and AWS-side credential hygiene are tracked separately from this repository-level deployment process.
- If a dedicated hosted staging environment is created later, update this document and [STAGING.md](C:/Users/Asus/OneDrive/Desktop/TWH-projects/mosiac-backend/STAGING.md:1) together.

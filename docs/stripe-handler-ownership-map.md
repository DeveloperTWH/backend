# Stripe Payment and Webhook Handler Ownership Map

## Purpose

This document maps each Stripe-related payment or webhook route to:

- the mounted route
- the controller/handler that owns it
- the webhook secret or Stripe credential it depends on
- the business flow it is responsible for

This is intended to reduce ambiguity where Stripe logic is split across multiple controllers.

## Route to handler map

| Route | Source mount | Handler | Stripe secret / credential | Flow ownership | Notes |
| --- | --- | --- | --- | --- | --- |
| `/api/payments/create-payment-intent` | `app.js` -> `routes/paymentRoutes.js` | `paymentController.createPaymentIntent` | `STRIPE_SECRET_KEY` | Order payment intent creation | Creates payment intents for order checkout and stores `orderId` in metadata. Not a webhook. |
| `/api/webhooks/stripe` | `app.js` -> `routes/webhookRoutes.js` | `webhookController.handleStripeWebhook` | `STRIPE_ENDPOINT_SECRET` | Canonical order-payment webhook | Authoritative route for order payment status updates such as `payment_intent.succeeded`, `payment_intent.payment_failed`, and `charge.refunded`. |
| `/api/subscription/webhook` | `app.js` direct mount | `webhookController.handleSubscriptionWebhook` | `STRIPE_WEBHOOK_SECRET` | Subscription billing webhook | Updates `Subscription` status for recurring billing events. |
| `/api/vendor-onboarding/webhook/payment` | `app.js` direct mount | `vendorOnboarding.controller.handleVendorPaymentWebhook` | `STRIPE_WEBHOOK_SECRET` | Vendor onboarding verification payment webhook | Handles vendor verification payment events tied to onboarding metadata. |
| `/api/stripe/create-checkout-session` | `app.js` -> `routes/stripeRoutes.js` | `stripeController.createCheckoutSession` | `STRIPE_SECRET_KEY` | Business draft subscription checkout creation | Creates Stripe Checkout sessions for the business onboarding/subscription flow. Not a webhook. |
| `/api/stripe/webhook` | `app.js` -> `routes/stripeRoutes.js` | `stripeController.handleStripeWebhook` | `STRIPE_WEBHOOK_SECRET` | Business draft checkout completion and Connect account sync | Processes `checkout.session.completed` and `account.updated` for the business draft flow. |
| `/api/stripe/payment/webhook` | `app.js` -> `routes/stripeRoutes.js` | `stripePaymentController.stripePaymentWebhook` | `STRIPE_WEBHOOK_SECRET_TWO` | Post-payment order fulfillment and email webhook | Marks orders paid, stores charge/transfer/application fee IDs, and sends order-paid emails. |
| `/stripe/account-session` | `app.js` -> `routes/stripe.routes.js` | `stripe.controller.createAccountSession` | `STRIPE_SECRET_KEY` | Stripe Connect account management | Not a webhook. Provides embedded account session access. |
| `/stripe/express-login-link` | `app.js` -> `routes/stripe.routes.js` | `stripe.controller.createExpressLoginLink` | `STRIPE_SECRET_KEY` | Stripe Connect account management | Not a webhook. Generates Express dashboard login links. |
| `/stripe/account-balance` | `app.js` -> `routes/stripe.routes.js` | `stripe.controller.getAccountBalance` | `STRIPE_SECRET_KEY` | Stripe Connect reporting | Not a webhook. Reads connected account balance. |
| `/stripe/last-payout` | `app.js` -> `routes/stripe.routes.js` | `stripe.controller.getLastPayout` | `STRIPE_SECRET_KEY` | Stripe Connect reporting | Not a webhook. Reads recent payout data. |
| `/stripe/backfill-customers` | `app.js` -> `routes/stripe.routes.js` | `stripe.controller.backfillMissingStripeCustomers` | `STRIPE_SECRET_KEY` | Stripe customer data repair | Operational endpoint for backfill/maintenance, not a webhook. |

## Secret ownership map

| Secret | Used by | Intended responsibility |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | All Stripe API client initializations | Server-to-Stripe API access for creating payment intents, checkout sessions, refunds, subscriptions, account sessions, and related reads/writes. |
| `STRIPE_ENDPOINT_SECRET` | `webhookController.handleStripeWebhook` | Canonical order-payment webhook signature verification for `/api/webhooks/stripe`. |
| `STRIPE_WEBHOOK_SECRET` | `webhookController.handleSubscriptionWebhook`, `vendorOnboarding.controller.handleVendorPaymentWebhook`, `stripeController.handleStripeWebhook` | Shared today across subscription billing, vendor onboarding payment, and business draft checkout/account webhooks. This is functional only if Stripe endpoints are configured to match, but it increases coupling across flows. |
| `STRIPE_WEBHOOK_SECRET_TWO` | `stripePaymentController.stripePaymentWebhook` | Signature verification for `/api/stripe/payment/webhook`. |

## Flow ownership summary

- `paymentController`
  - owns order payment intent creation only
  - does not own webhook processing anymore
- `webhookController`
  - owns the canonical order-payment webhook
  - also owns subscription billing webhook processing
- `stripeController`
  - owns business draft subscription checkout creation
  - owns business draft checkout completion webhook and Connect account status sync
- `stripePaymentController`
  - owns post-payment order fulfillment side effects for the `/api/stripe/payment/webhook` flow
  - this is distinct from the canonical order-payment status webhook
- `vendorOnboarding.controller`
  - owns vendor verification payment intent creation
  - owns vendor onboarding payment webhook handling
- `stripe.controller`
  - owns Stripe Connect operational/account management endpoints
  - does not own webhook processing

## Important implementation notes

- The canonical order-payment webhook path is `/api/webhooks/stripe`.
- That route must remain mounted before `express.json()` so Stripe signature verification receives the raw request body.
- Multiple webhook handlers still exist by design because they support different business flows; the duplication concern is about ambiguous ownership, not about reducing the system to a single Stripe webhook for all use cases.
- `STRIPE_WEBHOOK_SECRET` is currently shared by multiple handlers. That should be reflected accurately in deployment configuration and Stripe endpoint setup.

## Deployment and environment notes

- In Stripe Dashboard or Stripe CLI forwarding, point order-payment events to `/api/webhooks/stripe`.
- Keep endpoint-secret assignments aligned with the table above.
- If the team later separates shared webhook flows in Stripe into distinct endpoint secrets, this document should be updated alongside the env vars and Stripe Dashboard configuration.

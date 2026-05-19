# Stripe Webhook Remediation

Related reference:

- See `docs/stripe-handler-ownership-map.md` for the full route-to-handler, secret, and flow-ownership mapping across Stripe payment and webhook controllers.

## Canonical order-payment webhook path

- Authoritative endpoint: `/api/webhooks/stripe`
- Removed duplicate order-payment webhook route: `/api/payments/stripe-webhook`
- Removed legacy duplicate path definition for `/api/webhooks/stripe-webhook`
- Mounted the canonical route before `express.json()` so Stripe signature verification still receives the raw request body

## Endpoints intentionally kept separate

- `/api/webhooks/stripe`
  - canonical order-payment Stripe webhook
- `/api/subscription/webhook`
  - subscription billing webhook
- `/api/vendor-onboarding/webhook/payment`
  - vendor onboarding payment webhook
- `/api/stripe/webhook`
  - Stripe checkout/account webhook flow handled by `stripeController`
- `/api/stripe/payment/webhook`
  - payment-intent/order email webhook handled by `stripePaymentController`

These endpoints are not duplicates of the order-payment webhook path above; they back different handlers and Stripe event-processing flows.

## Duplicate cleanup performed

- Removed the duplicate vendor-onboarding webhook registration from `routes/vendorOnboarding.routes.js`
- Kept the authoritative vendor-onboarding webhook mount in `app.js` because it must execute before JSON body parsing

## Deployment follow-up

- Update the Stripe dashboard or Stripe CLI forwarding target for order-payment events to `/api/webhooks/stripe`.
- Remove any Stripe endpoint configuration that still points to `/api/payments/stripe-webhook` or `/api/webhooks/stripe-webhook`.
- Retest with a Stripe test event after deployment and confirm successful processing in application logs.

## Validation status

- Local code-path validation passed for the canonical order-payment webhook:
  - a signed `payment_intent.succeeded` payload was accepted by `handleStripeWebhook`
  - the handler returned `200 { received: true }`
  - the mocked order update executed with `paymentStatus: paid` and `orderStatus: completed`
- Live Stripe Dashboard or Stripe CLI event logs still need to be captured after deployment because this local environment cannot produce external Stripe delivery logs on its own

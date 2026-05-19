# Backend Setup Checklist

This checklist is for bringing up the Mosaic Biz Hub backend locally or preparing a new environment safely.

## Quick start

1. Install dependencies.

```bash
npm install
```

2. Create a local environment file from the example.

```bash
copy .env.example .env
```

If you are on macOS or Linux, use:

```bash
cp .env.example .env
```

3. Fill in `.env` with real values for the features you need.

4. Start the server.

```bash
npm run dev
```

5. Confirm the API is up by visiting `GET /` on `http://localhost:3001` unless you changed `PORT`.

## Setup checklist

### Core application

- Install Node.js and npm.
- Confirm `node` and `npm` are available in your shell.
- Set `MONGODB_URI`.
- Set `JWT_SECRET`.
- Set `FRONTEND_URL`.
- Set `PORT` if you do not want the default `3001`.

### Stripe

- Set `STRIPE_SECRET_KEY`.
- Set `STRIPE_ENDPOINT_SECRET` for the canonical order-payment webhook at `/api/webhooks/stripe`.
- Set `STRIPE_WEBHOOK_SECRET` for the currently shared subscription/vendor-onboarding/business-draft webhook flows.
- Set `STRIPE_WEBHOOK_SECRET_TWO` for `/api/stripe/payment/webhook`.
- Set `PLATFORM_FEE_CENTS` if your order/payment flow uses platform fees.
- Set Connect return/refresh URLs or paths if Stripe Connect onboarding is used.

### AWS uploads

- Set `AWS_REGION`.
- Set `AWS_ACCESS_KEY_ID`.
- Set `AWS_SECRET_ACCESS_KEY`.
- Set `AWS_S3_BUCKET`.

### Email

- Set `MAIL_USER`.
- Set `MAIL_PASSWORD`.
- Set `ADMIN_EMAIL`.
- Set `SUPPORT_EMAIL` if you want support links in emails.

### Optional integrations

- Set `GOOGLE_GEOCODING_API_KEY` for Google geocoding/place flows.
- Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` only if PayPal verification utilities are used.
- Set `PUPPETEER_EXECUTABLE_PATH` only when your environment needs a custom Chromium path.
- Set Cloudinary variables only if that storage path is still used in your environment.

## Verification checklist

- Run `npm run dev`.
- Confirm the server logs show a successful MongoDB connection.
- Confirm the server logs show the HTTP listener started on the expected port.
- Open `http://localhost:3001/` and confirm you receive the JSON health response.
- If using Stripe, send a test event only after webhook secrets are configured correctly for the target endpoint.

## Commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Run with nodemon for development |
| `npm start` | Run with Node.js |
| `npm test` | Placeholder script; currently not implemented |

## Environment file guidance

- Do not commit your real `.env`.
- Keep `.env.example` updated when new required variables are introduced.
- Use distinct Stripe webhook secrets per deployed endpoint where possible.
- If you rotate credentials, update the deployment environment and local `.env`, not `.env.example`.

## Related docs

- [README.md](C:/Users/Asus/OneDrive/Desktop/TWH-projects/mosiac-backend/README.md:1)
- [docs/stripe-webhook-remediation.md](C:/Users/Asus/OneDrive/Desktop/TWH-projects/mosiac-backend/docs/stripe-webhook-remediation.md:1)
- [docs/stripe-handler-ownership-map.md](C:/Users/Asus/OneDrive/Desktop/TWH-projects/mosiac-backend/docs/stripe-handler-ownership-map.md:1)

## Deployment notes

- Production should inject secrets through the deployment platform or secret manager, not by reusing a local developer `.env`.
- Stripe webhook endpoints must be configured with the matching secret for each deployed route.
- Any credentials already exposed in an existing tracked or shared `.env` should be treated as compromised and rotated.

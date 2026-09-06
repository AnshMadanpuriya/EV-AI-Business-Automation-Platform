# Razorpay subscriptions setup

This integration uses Razorpay-hosted Checkout. The application never receives
or stores card numbers, CVV, UPI PIN, OTP, bank passwords or personal UPI QR
codes.

## 1. Start in Test Mode

1. Create or open the business Razorpay account.
2. Complete the Razorpay Subscriptions activation steps available for the
   account.
3. Switch the Razorpay Dashboard to **Test Mode**.
4. Create the following recurring plans. The amount and interval in Razorpay
   must exactly match the application catalog:

| Environment variable | Amount | Razorpay interval |
| --- | ---: | --- |
| `RAZORPAY_PLAN_STARTER_MONTHLY` | ₹4,999 | monthly |
| `RAZORPAY_PLAN_GROWTH_MONTHLY` | ₹14,999 | monthly |
| `RAZORPAY_PLAN_STARTER_ANNUAL` | ₹47,988 | yearly |
| `RAZORPAY_PLAN_GROWTH_ANNUAL` | ₹1,43,988 | yearly |

Copy each generated `plan_...` ID into `backend/.env`.

## 2. Configure server-only secrets

Generate Test Mode API keys in the Razorpay Dashboard and add them only to
`backend/.env`:

```env
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=rzp_test_replace_me
RAZORPAY_KEY_SECRET=replace_me
RAZORPAY_WEBHOOK_SECRET=use_a_separate_long_random_secret
RAZORPAY_PLAN_STARTER_MONTHLY=plan_replace_me
RAZORPAY_PLAN_GROWTH_MONTHLY=plan_replace_me
RAZORPAY_PLAN_STARTER_ANNUAL=plan_replace_me
RAZORPAY_PLAN_GROWTH_ANNUAL=plan_replace_me
```

`RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` must never be placed in a
frontend environment file, committed to Git, pasted into screenshots or sent
over chat.

## 3. Configure the signed webhook

Razorpay requires a public HTTPS endpoint. Configure:

```text
https://YOUR-BACKEND-DOMAIN/api/payments/webhook
```

Use the same separate webhook secret stored in `RAZORPAY_WEBHOOK_SECRET`.
Subscribe to:

- `subscription.authenticated`
- `subscription.activated`
- `subscription.charged`
- `subscription.pending`
- `subscription.halted`
- `subscription.paused`
- `subscription.resumed`
- `subscription.cancelled`
- `subscription.completed`
- `subscription.expired`
- `payment.failed`

The server validates `X-Razorpay-Signature` against the unmodified raw request
body, records `X-Razorpay-Event-Id` for idempotency and tolerates out-of-order
events.

## 4. Test

```powershell
cd "D:\EV-AI-Business-Automation-Platform"
npm test
npm --prefix frontend run build
npm run dev:all
```

Open the pricing section, choose Starter or Growth, register/sign in and
complete Razorpay's Test Mode checkout. Confirm all three:

1. Checkout success is accepted by `/api/payments/subscriptions/verify`.
2. The signed webhook returns HTTP 200.
3. MongoDB contains a `subscriptions` record with the expected status and a
   `paymentwebhookevents` audit record.

## 5. Go live

Complete Razorpay business KYC and settlement-bank verification. Test and Live
Mode use different keys, plan IDs and webhook configuration. Replace every test
value with the matching live value, use an HTTPS production backend and set:

```env
NODE_ENV=production
RAZORPAY_MODE=live
```

Never collect payment credentials in a custom form. Settlement is managed by
Razorpay to the verified bank account attached to the merchant account.

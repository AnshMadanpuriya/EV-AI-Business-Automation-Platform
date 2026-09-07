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
| `RAZORPAY_PLAN_STARTER_MONTHLY` | ₹499 | every 1 month |
| `RAZORPAY_PLAN_GROWTH_MONTHLY` | ₹1,000 | every 1 month |
| `RAZORPAY_PLAN_ENTERPRISE_MONTHLY` | ₹2,499 | every 1 month |
| `RAZORPAY_PLAN_STARTER_ANNUAL` | ₹4,790.40 | every 1 year |
| `RAZORPAY_PLAN_GROWTH_ANNUAL` | ₹9,600 | every 1 year |
| `RAZORPAY_PLAN_ENTERPRISE_ANNUAL` | ₹23,990.40 | every 1 year |

Copy each generated `plan_...` ID into `backend/.env`.

These are platform subscription fees; AI, voice, WhatsApp and hosting usage are
paid separately. The website does not promise unlimited provider credits or
enforce per-plan conversation quotas. Enterprise onboarding/training are
assisted services. Monthly mandates allow up to 12 billing cycles and annual
mandates up to 3; the checkout page discloses these limits. Annual totals are
exactly 20% below 12 monthly payments and are billed as a full year.

### Migrating from the old prices

Create new Razorpay plans at the amounts above. Do not reuse the old ₹4,999,
₹14,999 or old annual plans. The backend fetches the selected Razorpay plan and
checks its ID, INR amount in paise, billing period and interval before creating
or reusing a checkout. A mismatch blocks checkout rather than charging an old
price. Existing authorised/active subscriptions are not repriced by this code
change. An unfinished old checkout must be cancelled before selecting a new
plan; cancelling one with no current billing cycle is immediate.

The landing page and checkout both load `/api/payments/plans`; there is no
second price list in the frontend.

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
RAZORPAY_PLAN_ENTERPRISE_MONTHLY=plan_replace_me
RAZORPAY_PLAN_ENTERPRISE_ANNUAL=plan_replace_me
PAYMENT_SUPPORT_PHONE=
```

`RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` must never be placed in a
frontend environment file, committed to Git, pasted into screenshots or sent
over chat.

Use a random webhook secret of at least 32 characters. Example generation:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save that value locally in `backend/.env` and the Razorpay Dashboard webhook
configuration. Do not paste it in chat. Empty/placeholder keys, a mismatched
Test/Live key prefix, a missing webhook secret or an invalid Plan ID keep
checkout disabled. Readiness flags check local configuration; they do not prove
that Razorpay credentials are valid or the webhook URL is reachable.

### UPI QR, mobile number and the receiving bank

`PAYMENT_SUPPORT_PHONE` is optional and empty by default. Set it only in your
private `backend/.env` to a support number including country code. This enables
a public **Billing help** call link on the website. It does not route payments
and is never passed as the payer's contact. Keep it empty to hide the link.
Never derive a UPI ID such as `number@upi` from a mobile number.

The payer selects **UPI AutoPay** or **Card / Bank** on this page and presses
Continue. These are real, keyboard-accessible preference controls. They
highlight the preferred payment block in Razorpay Standard Checkout while
retaining supported fallback methods. Actual availability is controlled by
Razorpay and the payer's bank/app. This preference cannot enable a method that
is disabled for the merchant account.

For recurring payments use Razorpay's mandate/QR flow where available, not a
personal static QR. A manual transfer to a personal QR does not authorise a
recurring subscription or produce this integration's verified payment event.
The receiving bank is configured and verified in your Razorpay merchant
Dashboard. Do not add account passwords, UPI PINs, card credentials or a
guessed UPI address to this application.

## 3. Configure the signed webhook

Razorpay requires a public HTTPS endpoint. Configure:

```text
https://YOUR-BACKEND-DOMAIN/api/payments/webhook
```

`localhost:5000` is not reachable by Razorpay. For local testing use an approved
public HTTPS forwarding endpoint or a staging backend, then configure the
matching Test Mode webhook. Keep secrets in the backend environment.

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

Also test Enterprise, annual amounts including paise, both method choices,
an abandoned checkout followed by retry, cancellation, a provider-plan price
mismatch, and invalid signatures. Test mode must use `rzp_test_...` keys and
must not transfer real money. Verify that webhook updates actually arrive;
successful browser authorisation alone does not prove webhook delivery.

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

## Official references

- [Create Razorpay plans](https://razorpay.com/docs/payments/subscriptions/create-plans)
- [Subscription integration](https://razorpay.com/docs/payments/subscriptions/integration-guide)
- [Checkout payment-method configuration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/configure-payment-methods/)
- [Subscription payment methods](https://razorpay.com/docs/payments/subscriptions/supported-payment-methods/)
- [Settlements](https://razorpay.com/docs/api/settlements)

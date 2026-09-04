# Phase 1 — Production MVP

This phase turns the existing EV showcase into a measurable dealership sales workflow. It keeps the premium landing experience intact and adds a real operational path from lead capture to test-drive completion.

## Delivered in this phase

- Deterministic lead scoring from contact quality, vehicle, budget, intent and purchase timeline.
- Hot/warm/cold priority plus a next-best-action for every lead.
- Consent-aware WhatsApp, email or call follow-up requests through n8n.
- Human handoff that pauses automation and assigns an owner/agent.
- Idempotent test-drive creation with a public booking code and duplicate protection.
- Booking lifecycle: pending, confirmed, completed, no-show, rescheduled and cancelled.
- Owner command centre with live attention queue, funnel metrics, upcoming drives and automation failures.
- Persistent chatbot sessions for a real owner conversation inbox.
- API rate limits, security headers, CORS allowlist, bounded JSON payloads and stricter input validation.
- Admin/agent/viewer role checks; only the first account becomes an owner admin by default.
- Signed n8n event envelopes when `N8N_WEBHOOK_SECRET` is configured.
- Unit tests for lead scoring and request validation.
- EV-card test-drive CTA with selected-model prefill, home/showroom preference, address, PIN code and consent.
- Booking notification workflow that emails the dealership owner and customer, with an optional Slack team alert.

## Local setup

From the repository root:

```powershell
git switch feature/production-mvp
npm run setup:node
Copy-Item backend/.env.example backend/.env
npm run dev:all
```

Open:

- Website: `http://localhost:3000`
- Backend health: `http://localhost:5000/api/health`
- n8n: `http://localhost:5678`
- RAG service: `http://localhost:8000`

The root-level `dev:all` script must be run from the repository root, not from `frontend`.

## Required environment configuration

Use `backend/.env.example` as the source of truth. Never commit `backend/.env`.

```env
MONGODB_URI=mongodb://127.0.0.1:27017/tatamotors-ev
JWT_SECRET=replace_with_a_random_secret_of_at_least_32_characters
JWT_EXPIRES_IN=8h
ALLOW_PUBLIC_REGISTRATION=false
FRONTEND_URLS=http://localhost:3000
N8N_AUTOMATION_WEBHOOK_URL=http://localhost:5678/webhook/tataev-automation
N8N_BOOKING_WEBHOOK_URL=http://localhost:5678/webhook/tataev-booking-notifications
N8N_WEBHOOK_SECRET=replace_with_a_webhook_signing_secret
BOOKING_ADMIN_EMAIL=owner@example.com
```

Import `n8n-samples/phase1-automation-workflow.json` into n8n and activate it. The starter workflow validates and acknowledges events. Add WATI/Meta WhatsApp, email and CRM nodes after the validator according to the event type.

## Test-drive Gmail and Slack setup

Import `n8n-samples/test-drive-gmail-slack-workflow.json` for booking notifications.

1. Open both Gmail nodes and select a Gmail OAuth2 credential. The sender will be whichever Gmail account is authorized in n8n.
2. Confirm `BOOKING_ADMIN_EMAIL` in `backend/.env`; this address receives the complete dealership copy.
3. Activate the workflow and copy its production URL into `N8N_BOOKING_WEBHOOK_URL`.
4. Submit a test booking with an email address you control. Verify the database record, admin email and customer acknowledgement.
5. For Slack, connect a Slack OAuth2 credential, select the private team channel, then enable `Slack Team Alert • Enable After Setup`.

The Slack node starts disabled so Gmail notifications can work before Slack authorization is complete. Slack messages intentionally omit the full street address; the owner email and authenticated dashboard retain the complete booking record.

The first customer email says **request received**, not **booking confirmed**. When the team moves a booking from `pending` to `confirmed`, use a separate confirmation workflow after vehicle, staff and slot availability are verified.

## Lead score

The score is deterministic and auditable rather than LLM-generated.

| Signal | Maximum contribution |
| --- | ---: |
| Name, valid email and phone | 25 |
| City and preferred vehicle | 15 |
| Budget | 10 |
| Purchase or test-drive intent | 20 |
| Purchase timeline | 25 |
| Booking source / WhatsApp consent | 15 |

- Hot: 70–100
- Warm: 40–69
- Cold: 0–39

## Phase 1 API

Public capture endpoints are rate-limited:

```text
POST /api/leads/qualify
POST /api/bookings
POST /api/chat
GET  /api/health
```

JWT-protected dealership endpoints:

```text
GET    /api/leads?temperature=hot&page=1&limit=20
GET    /api/leads/:id
PUT    /api/leads/:id
POST   /api/leads/:id/follow-up
POST   /api/leads/:id/handoff
DELETE /api/leads/:id                         # soft archive

GET  /api/bookings
PUT  /api/bookings/:id                        # lifecycle status
POST /api/bookings/:id/reschedule
POST /api/bookings/:id/cancel

GET /api/analytics/owner
```

Send an `Idempotency-Key` header when creating a booking. Retrying the same request then returns the original booking instead of creating a duplicate.

## n8n event contract

Every webhook receives this envelope:

```json
{
  "event": "lead.followup.requested",
  "eventId": "uuid",
  "occurredAt": "ISO-8601 timestamp",
  "source": "tataev-api",
  "data": {}
}
```

Supported events:

- `lead.qualified`
- `lead.followup.requested`
- `lead.followup.scheduled`
- `lead.handoff.requested`
- `booking.created`
- `booking.confirmed`
- `booking.completed`
- `booking.no-show`
- `booking.rescheduled`
- `booking.cancelled`

`automation.status=delivered` means n8n accepted the webhook. Final WhatsApp/email delivery receipts must be written back by the selected provider workflow in a later integration step.

## Verification

```powershell
npm test
npm --prefix frontend run build
npm --prefix backend audit --omit=dev
npm --prefix frontend audit --omit=dev
```

## Decisions required before a public launch

1. Choose WhatsApp provider: Meta Cloud API, WATI coexistence, or another approved BSP.
2. Choose CRM destination and field ownership: HubSpot, Zoho, Salesforce, Bitrix24 or the built-in MongoDB pipeline.
3. Define showroom locations, capacity and valid time slots.
4. Decide lead response SLA and which staff receive hot-lead/handoff alerts.
5. Add organisation-level tenancy and role-based permissions before selling to multiple dealerships.
6. Deploy n8n with a persistent database and public HTTPS webhook; a laptop-only n8n instance is suitable for development, not 24/7 production.

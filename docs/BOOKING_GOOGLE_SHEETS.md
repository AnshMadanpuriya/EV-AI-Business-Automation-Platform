# Website and ElevenLabs bookings → Google Sheets

Both channels use the same validated booking service. MongoDB saves a pending booking and a durable Sheet queue entry before sync. A background worker checks every five seconds, updates rows by Booking ID, and retries failures with backoff up to one hour. A Google outage does not lose an accepted booking. The Sheet is an operational copy; MongoDB remains the source of truth.

## 1. Google setup (account owner)

1. Create a Google Sheet and an empty tab named `Bookings`.
2. In your Google Cloud project, enable the Google Sheets API, create a service account, and download its JSON key. Keep it outside the repository, for example `D:/EV-Secrets/google-service-account.json`. Restrict file access to the backend operator.
3. Share this specific Sheet as **Editor** with the `client_email` in that JSON. Do not make the Sheet publicly editable. A service account does not need access to your entire personal Drive.
4. Copy the spreadsheet ID between `/d/` and `/edit` in the Sheet URL.
5. Set these values in your private `backend/.env`:

```dotenv
BOOKING_SHEET_ID=YOUR_SPREADSHEET_ID
BOOKING_SHEET_TAB=Bookings
GOOGLE_SERVICE_ACCOUNT_FILE=D:/EV-Secrets/google-service-account.json
ELEVENLABS_BOOKING_SECRET=YOUR_RANDOM_SECRET
```

Generate the secret locally and copy it privately to the backend and ElevenLabs:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Never commit the JSON key or `.env`, put them in frontend variables, or paste them into chat. On a deployed backend, mount the credential file privately and update its path. Restart the backend after configuration changes.

## 2. Connect the existing ElevenLabs agent

The hosted voice widget is not a booking database. Configure a **server/webhook tool** on the same agent used by the website:

- Name: `book_test_drive`
- Method: `POST`
- URL: `https://YOUR_PUBLIC_BACKEND/api/voice/bookings`
- Secret header: `X-EV-Voice-Secret`, using ElevenLabs' stored-secret header setting. Use the same value as the private backend environment variable.
- Content-Type: `application/json`
- Body schema: see `elevenlabs-booking.openapi.json`.
- Bind `conversationId` to the system dynamic variable `{{system__conversation_id}}`; do not ask the model to invent this value.
- Add the instructions from `ELEVENLABS_BOOKING_PROMPT.md` to the agent's existing system prompt and save/publish its configuration.

ElevenLabs must reach a public HTTPS backend; `localhost:5000` on your laptop is not reachable from its servers. No Google key belongs in the voice widget or tool payload.

The tool supports one booking per voice conversation. Repeating identical details returns the existing Booking ID. Changed details with the same ID return 409; use the dealership's authenticated booking management for changes.

## 3. Verify end to end

1. Restart with `npm run dev:all` from the project root, with MongoDB connected.
2. Submit a website booking using test customer details and privacy consent. Expect a Booking ID, pending status, then one Sheet row with source `website`.
3. Call the agent, supply all required details, approve the read-back, and permit sharing with the dealership. In ElevenLabs tool history confirm an actual successful API call, not just spoken confirmation. Expect a second row with source `elevenlabs`.
4. Retry the same voice tool call: it should return the original Booking ID without creating another booking.
5. Update a booking through the authenticated dashboard and check that its existing Sheet row updates.

Only a successful tool response proves the booking request was saved. `pending` means the dealership still needs to confirm availability. `sheetSyncStatus: queued` does not mean Google has received the row yet. This integration does not create calendar reservations or itself send email/SMS.

## Operations and recovery

Admin-authenticated routes (use an existing admin JWT in the Authorization Bearer header):

- `GET /api/integrations/booking-sheet`: environment configuration presence and queue counts. `configured` is not proof of Google permissions.
- `POST /api/bookings/:id/sheet-retry`: enqueue a booking again, including an older booking that predates this integration.

A dedicated tab is required. Headers are created automatically: Booking ID, Source, Name, Phone, Email, Vehicle, Booking Type, Date, Time (Asia/Kolkata), Mode, Address, City, PIN Code, Status, Created At, Updated At. Customer text is written with RAW input, not interpreted as formulas.

Keep the header and Booking ID column intact. Avoid sorting/editing the source tab while writes run; use a separate reporting tab. A database lease serializes worker writes across backend instances. Retries re-read IDs after ambiguous Google failures, but manual Sheet edits or exceptional concurrent failures can still require reconciliation. The worker processes one booking per tick; monitor queue size for larger volumes.

For failures, check Sheet sharing, API enablement, credential path, tab name and headers. Only sanitized sync errors are stored. Existing ElevenLabs conversations are not retrospectively imported. These account setup steps and a live end-to-end test are required before calling the integration connected.

References: [Google service account authentication](https://developers.google.com/identity/protocols/oauth2/service-account), [Sheets values](https://developers.google.com/workspace/sheets/api/guides/values), [ElevenLabs webhook tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/webhook-tools), [dynamic variables](https://elevenlabs.io/docs/eleven-agents/customization/personalization/dynamic-variables).

# ⚡ Tata Motors EV — AI Voice & Chat Agent Platform

> A production-focused EV dealership automation MVP for AI-powered customer interactions and sales operations.

![Stack](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Stack](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)
![Stack](https://img.shields.io/badge/MongoDB-7-47A248?style=flat-square&logo=mongodb)
![Stack](https://img.shields.io/badge/n8n-Automation-EA4B71?style=flat-square)
![Stack](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss)

---

## Phase 1 production MVP

The `feature/production-mvp` branch adds auditable lead scoring, consent-aware follow-ups, human handoff, an idempotent test-drive lifecycle, n8n event delivery and a live owner command centre. See [docs/PHASE_1_PRODUCTION_MVP.md](docs/PHASE_1_PRODUCTION_MVP.md) for setup, API contracts and the decisions still required before public launch.

---

## 📁 Project Structure

```
tata-motors-ev/
├── frontend/                  # React.js + Tailwind CSS
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── components/
│       │   ├── Landing/       # Navbar, Hero, Features, HowItWorks,
│       │   │                  # Pricing, Testimonials, Contact, Footer
│       │   ├── Chatbot/       # ChatbotWidget (floating AI chat)
│       │   └── Dashboard/     # Sidebar, Overview, LeadsTable,
│       │                      # BookingsTable, Conversations, Analytics
│       ├── pages/             # LandingPage, LoginPage, DashboardPage
│       ├── context/           # AuthContext (JWT auth)
│       └── utils/             # api.js (Axios instance)
│
├── backend/                   # Node.js + Express (MVC)
│   ├── controllers/           # authController, chatController,
│   │                          # leadsController, bookingsController,
│   │                          # analyticsController
│   ├── models/                # User, Lead, ChatSession, Booking
│   ├── routes/                # auth, chat, leads, bookings, analytics
│   ├── middleware/            # auth.js (JWT middleware)
│   ├── server.js
│   └── .env.example
│
└── n8n-samples/
    ├── webhook-flow.json      # Chat workflow starter
    └── phase1-automation-workflow.json # Lead/booking event gateway
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** >= 20.x
- **MongoDB** (local or Atlas)
- **n8n** (optional, for AI workflow)

---

### 1. Clone & Install

```bash
git clone https://github.com/AnshMadanpuriya/Tata-EV-AI-platform.git
cd Tata-EV-AI-platform
npm run setup:node
```

`npm run setup:node` installs the root, backend, and frontend packages. Run it once after cloning; otherwise Node may report `Cannot find module 'express'`.

---

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tata-motors-ev
JWT_SECRET=replace_with_a_random_secret_of_at_least_32_characters
N8N_AUTOMATION_WEBHOOK_URL=http://localhost:5678/webhook/tataev-automation
N8N_WEBHOOK_SECRET=replace_with_a_webhook_signing_secret
NODE_ENV=development
FRONTEND_URLS=http://localhost:3000
```

Start backend:
```bash
npm run dev    # Development (with nodemon)
npm start      # Production
```

From the repository root, start frontend and backend together with:

```bash
npm run dev
```

---

### 3. Frontend Setup

```bash
cd frontend
```

Create `.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

Start frontend:
```bash
npm start
```

The app will open at **http://localhost:3000**

---

### 4. Optional RAG Assistant Setup

```bash
copy rag-service\.env.example rag-service\.env
npm run setup:rag
npm run rag:start
```

Add your Mistral API key to `rag-service/.env`. The assistant can now answer general EV questions through Mistral immediately. For grounded answers from the included EV documents, run `npm run rag:ingest` once before `npm run rag:start`.

The AI API runs at **http://localhost:8000**. Its `/health` response reports `mistral`, `rag`, or `setup-required` mode. If the Python service is unavailable, the website clearly switches to the limited Node fallback on port 5000.

---

### 5. n8n Setup (AI Workflows)

```bash
# Install n8n globally
npm install -g n8n

# Start n8n
n8n start
```

Open **http://localhost:5678**, import `n8n-samples/phase1-automation-workflow.json`, activate it, and set `N8N_AUTOMATION_WEBHOOK_URL=http://localhost:5678/webhook/tataev-automation`. Connect your approved WhatsApp/email/CRM provider nodes after the validation node. The existing `webhook-flow.json` remains available as a chat workflow starter.

---

## 🌐 Application Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — Hero, Features, Pricing, Contact |
| `/login` | Authentication (Login + Register) |
| `/dashboard` | Overview with stats & charts |
| `/dashboard/leads` | Lead management table |
| `/dashboard/bookings` | Booking management |
| `/dashboard/conversations` | Chat session history |
| `/dashboard/analytics` | Analytics with trend charts |

---

## 🔌 API Reference

### Auth
```
POST /api/auth/register     { name, email, password, company }
POST /api/auth/login        { email, password }
GET  /api/auth/me           (JWT required)
```

The first registered account becomes the owner admin. Later public registrations are blocked unless `ALLOW_PUBLIC_REGISTRATION=true`; subsequent public accounts are read-only viewers.

### Chat (Public)
```
POST /api/chat              { message, sessionId?, visitorName?, visitorEmail? }
GET  /api/chat/sessions     (JWT required, paginated)
GET  /api/chat/session/:id  (JWT required)
```

### Leads (JWT required except POST)
```
POST   /api/leads/qualify       { name, email|phone, city, vehicle, budget, purchaseTimeline, consent }
GET    /api/leads               ?page=1&limit=20&status=&temperature=&search=
GET    /api/leads/:id
PUT    /api/leads/:id
POST   /api/leads/:id/follow-up { channel, scheduledAt?, message? }
POST   /api/leads/:id/handoff   { reason, assignedTo? }
DELETE /api/leads/:id           (soft archive)
```

### Bookings
```
GET  /api/bookings          (JWT required)
POST /api/bookings          { name, email, phone, type, vehicle, date, timeSlot } + Idempotency-Key
PUT  /api/bookings/:id      (JWT required, status lifecycle)
POST /api/bookings/:id/reschedule (JWT required)
POST /api/bookings/:id/cancel     (JWT required)
```

### Analytics
```
GET /api/analytics/dashboard  (JWT required)
GET /api/analytics/owner      (JWT required)
```

---

## 📦 Sample API Requests

```bash
# Register a new account
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@ev.ai","password":"admin123","company":"EV Motors"}'

# Send a chat message
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"I want to book a test ride for Nexon EV","visitorName":"Rahul"}'

# Create a booking
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: customer-rahul-2026-09-15-1100" \
  -d '{"name":"Rahul Kumar","email":"rahul@email.com","phone":"+91 9876543210","type":"test-ride","vehicle":"Nexon EV","date":"2026-09-15","timeSlot":"11:00 AM"}'
```

---

## 🧪 Offline behavior

The landing page and grounded local chatbot fallback remain usable when optional AI services are unavailable. Authentication, lead, booking and owner dashboard data require MongoDB; the UI now shows an explicit connection warning instead of presenting fake dealership metrics.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router 6, Tailwind CSS |
| State | React Context API |
| Charts | Recharts |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose ODM |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| AI Workflow | n8n (webhook + LLM) |
| HTTP Client | Axios |
| Notifications | react-hot-toast |

---

## 🚢 Deployment

### Frontend (Vercel)
```bash
cd frontend && npm run build
# Deploy /build folder to Vercel
```

### Backend (Railway / Render)
```bash
# Set environment variables in platform dashboard
# Deploy from GitHub
```

### MongoDB (Atlas)
```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/tata-motors-ev
```

---

## 📄 License

MIT License — Free for commercial use.

---

Built with ❤️ for the EV revolution 🔋⚡

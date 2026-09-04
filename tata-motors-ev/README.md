# ⚡ Tata Motors EV — AI Voice & Chat Agent Platform

> A production-ready full-stack SaaS application for AI-powered Electric Vehicle customer interactions.

![Stack](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Stack](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)
![Stack](https://img.shields.io/badge/MongoDB-7-47A248?style=flat-square&logo=mongodb)
![Stack](https://img.shields.io/badge/n8n-Automation-EA4B71?style=flat-square)
![Stack](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss)

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
    └── webhook-flow.json      # n8n workflow nodes + setup guide
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** >= 18.x
- **MongoDB** (local or Atlas)
- **n8n** (optional, for AI workflow)

---

### 1. Clone & Install

```bash
git clone <repo-url>
cd tata-motors-ev

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

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
JWT_SECRET=your_super_secret_jwt_key_here
N8N_WEBHOOK_URL=http://localhost:5678/webhook/ev-agent
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

Start backend:
```bash
npm run dev    # Development (with nodemon)
npm start      # Production
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

### 4. n8n Setup (AI Workflows)

```bash
# Install n8n globally
npm install -g n8n

# Start n8n
n8n start
```

Open **http://localhost:5678** and:
1. Create a new workflow
2. Add **Webhook** node → Path: `ev-agent`, Method: `POST`
3. Add **OpenAI** node with your system prompt
4. Add **Respond to Webhook** node to return AI response
5. Activate workflow
6. Set `N8N_WEBHOOK_URL=http://localhost:5678/webhook/ev-agent` in backend `.env`

See `n8n-samples/webhook-flow.json` for the full node configuration.

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

### Chat (Public)
```
POST /api/chat              { message, sessionId?, visitorName?, visitorEmail? }
GET  /api/chat/session/:id  (public)
GET  /api/chat/sessions     (JWT required, paginated)
```

### Leads (JWT required except POST)
```
GET    /api/leads           ?page=1&limit=20&status=&source=&search=
POST   /api/leads           { name, email, phone, source, interest, vehicle }
PUT    /api/leads/:id       { status, notes, ... }
DELETE /api/leads/:id
```

### Bookings
```
GET  /api/bookings          (JWT required)
POST /api/bookings          { name, email, phone, type, vehicle, date, timeSlot }
PUT  /api/bookings/:id      (JWT required)
```

### Analytics
```
GET /api/analytics/dashboard  (JWT required)
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
  -d '{"name":"Rahul Kumar","email":"rahul@email.com","phone":"+91 9876543210","type":"test-ride","vehicle":"Nexon EV","date":"2025-08-01","timeSlot":"11:00 AM"}'
```

---

## 🧪 Demo Mode

The application works **without a MongoDB connection** using built-in demo data:
- Demo credentials: `admin@tatamotorsev.ai` / `demo1234`
- All tables show realistic dummy data
- Chatbot uses intelligent fallback responses
- Analytics charts use static demo data

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

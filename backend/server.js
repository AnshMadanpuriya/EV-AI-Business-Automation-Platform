// ============================================================
// COMPLETE BACKEND - server.js
// Run: npm run dev (or node server.js)
// ============================================================

const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');
const User = require('./models/User');
const Lead = require('./models/Lead');
const Booking = require('./models/Booking');
const ChatSession = require('./models/ChatSession');
const { qualifyLead } = require('./services/leadScoring');
const { dispatchAutomation } = require('./services/automation');
const { cleanText, validateLead, validateBooking, safePagination } = require('./utils/validation');

// Load environment files from deterministic locations. This lets the Node
// fallback use the same Mistral key as the Python RAG service even when the
// backend is started from the repository root.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../rag-service/.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

const app = express();

// ─── Middleware ───────────────────────────────────────────
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});
const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '200kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false }));
app.use('/api/chat', rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false }));
app.use(['/api/bookings', '/api/leads'], rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false }));

// ─── Config ───────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tatamotors-ev';
const JWT_SECRET = process.env.JWT_SECRET || 'development-only-change-me';
const EV_API_KEY = process.env.EV_API_KEY || '';
const EV_API_BASE = 'https://api.api-ninjas.com/v1';
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '';
const MISTRAL_CHAT_MODEL = process.env.MISTRAL_CHAT_MODEL || 'mistral-small-latest';
const MISTRAL_CHAT_URL = 'https://api.mistral.ai/v1/chat/completions';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be set to at least 32 characters in production');
}

async function connectDatabase() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('✅ MongoDB connected');
    return true;
  } catch (err) {
    console.error('❌ MongoDB Error:', err.message);
    return false;
  }
}

app.use('/api', (req, res, next) => {
  const databaseOptional = ['/health', '/chat'].includes(req.path) || req.path.startsWith('/ev/');
  if (databaseOptional || mongoose.connection.readyState === 1) return next();
  return res.status(503).json({
    success: false,
    message: 'Database is not connected. Start local MongoDB or check the Atlas URI, network access and DNS.',
    requestId: req.requestId
  });
});

// ============================================================
// SCHEMAS & MODELS
// ============================================================

// Enquiry remains local; the main operational entities use the shared models.
const enquirySchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true },
  phone:     { type: String, default: '' },
  company:   { type: String, default: '' },
  message:   { type: String, required: true },
  source:    { type: String, default: 'contact-form' },
  status:    { type: String, enum: ['new', 'read', 'replied', 'closed'], default: 'new' },
  ipAddress: { type: String, default: '' },
}, { timestamps: true });

const Enquiry = mongoose.model('Enquiry', enquirySchema);

// ============================================================
// INDIAN EV DATABASE (for EV Explorer / Comparator)
// ============================================================
const INDIAN_EV_DATABASE = [
  { make: 'Tata', model: 'Nexon EV Max', year_start: '2022', battery_capacity: '40.5 kWh', battery_type: 'Lithium-ion NMC', battery_useable_capacity: '40.5 kWh', charge_power: '7.2 kW AC', charge_power_max: '50 kW DC', charge_speed: '600 km/h', acceleration_0_100_kmh: '9.9 sec', top_speed: '140 km/h', electric_range: '437 km', total_power: '105 kW (143 PS)', total_torque: '250 Nm', drive: 'Front', vehicle_consumption: '147 Wh/km', co2_emissions: '0 g/km', length: '3993 mm', width: '1811 mm', height: '1616 mm', seats: '5 people', cargo_volume: '350 L', car_body: 'SUV', segment: 'B - Compact' },
  { make: 'Tata', model: 'Nexon EV', year_start: '2020', battery_capacity: '30 kWh', battery_type: 'Lithium-ion NMC', battery_useable_capacity: '30 kWh', charge_power: '3.3 kW AC', charge_power_max: '25 kW DC', charge_speed: '350 km/h', acceleration_0_100_kmh: '9.9 sec', top_speed: '120 km/h', electric_range: '312 km', total_power: '95 kW (129 PS)', total_torque: '245 Nm', drive: 'Front', vehicle_consumption: '155 Wh/km', co2_emissions: '0 g/km', length: '3993 mm', width: '1811 mm', height: '1616 mm', seats: '5 people', cargo_volume: '350 L', car_body: 'SUV', segment: 'B - Compact' },
  { make: 'Tata', model: 'Punch EV', year_start: '2024', battery_capacity: '35 kWh', battery_type: 'Lithium-ion NMC', battery_useable_capacity: '35 kWh', charge_power: '7.2 kW AC', charge_power_max: '50 kW DC', charge_speed: '500 km/h', acceleration_0_100_kmh: '9.5 sec', top_speed: '145 km/h', electric_range: '421 km', total_power: '90 kW (122 PS)', total_torque: '190 Nm', drive: 'Front', vehicle_consumption: '140 Wh/km', co2_emissions: '0 g/km', length: '3827 mm', width: '1742 mm', height: '1615 mm', seats: '5 people', cargo_volume: '366 L', car_body: 'SUV', segment: 'A - Mini' },
  { make: 'Tata', model: 'Tiago EV', year_start: '2022', battery_capacity: '24 kWh', battery_type: 'Lithium-ion NMC', battery_useable_capacity: '24 kWh', charge_power: '3.3 kW AC', charge_power_max: '25 kW DC', charge_speed: '350 km/h', acceleration_0_100_kmh: '13.5 sec', top_speed: '120 km/h', electric_range: '315 km', total_power: '55 kW (75 PS)', total_torque: '114 Nm', drive: 'Front', vehicle_consumption: '128 Wh/km', co2_emissions: '0 g/km', length: '3765 mm', width: '1677 mm', height: '1535 mm', seats: '5 people', cargo_volume: '240 L', car_body: 'Hatchback', segment: 'A - Mini' },
  { make: 'Tata', model: 'Tigor EV', year_start: '2021', battery_capacity: '26 kWh', battery_type: 'Lithium-ion NMC', battery_useable_capacity: '26 kWh', charge_power: '3.3 kW AC', charge_power_max: '25 kW DC', charge_speed: '350 km/h', acceleration_0_100_kmh: '13.2 sec', top_speed: '120 km/h', electric_range: '306 km', total_power: '55 kW (75 PS)', total_torque: '170 Nm', drive: 'Front', vehicle_consumption: '135 Wh/km', co2_emissions: '0 g/km', length: '3993 mm', width: '1677 mm', height: '1537 mm', seats: '5 people', cargo_volume: '316 L', car_body: 'Sedan', segment: 'B - Compact' },
  { make: 'Tata', model: 'Curvv EV', year_start: '2024', battery_capacity: '45 kWh', battery_type: 'Lithium-ion NMC', battery_useable_capacity: '45 kWh', charge_power: '7.2 kW AC', charge_power_max: '70 kW DC', charge_speed: '650 km/h', acceleration_0_100_kmh: '8.6 sec', top_speed: '150 km/h', electric_range: '502 km', total_power: '150 kW (204 PS)', total_torque: '215 Nm', drive: 'Front', vehicle_consumption: '135 Wh/km', co2_emissions: '0 g/km', length: '4308 mm', width: '1810 mm', height: '1637 mm', seats: '5 people', cargo_volume: '500 L', car_body: 'SUV Coupe', segment: 'C - Medium' },
  { make: 'Mahindra', model: 'XUV400 EV', year_start: '2023', battery_capacity: '39.4 kWh', battery_type: 'Lithium-ion NMC', battery_useable_capacity: '39.4 kWh', charge_power: '7.2 kW AC', charge_power_max: '50 kW DC', charge_speed: '500 km/h', acceleration_0_100_kmh: '8.3 sec', top_speed: '150 km/h', electric_range: '456 km', total_power: '110 kW (150 PS)', total_torque: '310 Nm', drive: 'Front', vehicle_consumption: '135 Wh/km', co2_emissions: '0 g/km', length: '4200 mm', width: '1821 mm', height: '1634 mm', seats: '5 people', cargo_volume: '378 L', car_body: 'SUV', segment: 'B - Compact' },
  { make: 'Mahindra', model: 'BE 6', year_start: '2025', battery_capacity: '79 kWh', battery_type: 'Lithium-ion NMC', battery_useable_capacity: '79 kWh', charge_power: '11 kW AC', charge_power_max: '175 kW DC', charge_speed: '1200 km/h', acceleration_0_100_kmh: '6.7 sec', top_speed: '200 km/h', electric_range: '682 km', total_power: '210 kW (286 PS)', total_torque: '380 Nm', drive: 'Rear', vehicle_consumption: '155 Wh/km', co2_emissions: '0 g/km', length: '4371 mm', width: '1907 mm', height: '1627 mm', seats: '5 people', cargo_volume: '455 L', car_body: 'SUV Coupe', segment: 'C - Medium' },
  { make: 'Mahindra', model: 'XEV 9e', year_start: '2025', battery_capacity: '79 kWh', battery_type: 'Lithium-ion NMC', battery_useable_capacity: '79 kWh', charge_power: '11 kW AC', charge_power_max: '175 kW DC', charge_speed: '1200 km/h', acceleration_0_100_kmh: '6.8 sec', top_speed: '200 km/h', electric_range: '656 km', total_power: '210 kW (286 PS)', total_torque: '380 Nm', drive: 'Rear', vehicle_consumption: '160 Wh/km', co2_emissions: '0 g/km', length: '4789 mm', width: '1907 mm', height: '1690 mm', seats: '5 people', cargo_volume: '663 L', car_body: 'SUV', segment: 'D - Large' },
  { make: 'MG', model: 'Comet EV', year_start: '2023', battery_capacity: '17.3 kWh', battery_type: 'Lithium-ion LFP', battery_useable_capacity: '17.3 kWh', charge_power: '3.3 kW AC', charge_power_max: '3.3 kW AC', charge_speed: '150 km/h', acceleration_0_100_kmh: 'N/A', top_speed: '90 km/h', electric_range: '230 km', total_power: '30 kW (41 PS)', total_torque: '110 Nm', drive: 'Rear', vehicle_consumption: '105 Wh/km', co2_emissions: '0 g/km', length: '2974 mm', width: '1505 mm', height: '1640 mm', seats: '4 people', cargo_volume: '65 L', car_body: 'Hatchback', segment: 'A - Mini' },
  { make: 'MG', model: 'ZS EV', year_start: '2022', battery_capacity: '50.3 kWh', battery_type: 'Lithium-ion NMC', battery_useable_capacity: '50.3 kWh', charge_power: '7.4 kW AC', charge_power_max: '76 kW DC', charge_speed: '600 km/h', acceleration_0_100_kmh: '8.5 sec', top_speed: '175 km/h', electric_range: '461 km', total_power: '130 kW (177 PS)', total_torque: '280 Nm', drive: 'Front', vehicle_consumption: '155 Wh/km', co2_emissions: '0 g/km', length: '4323 mm', width: '1809 mm', height: '1649 mm', seats: '5 people', cargo_volume: '448 L', car_body: 'SUV', segment: 'B - Compact' },
  { make: 'MG', model: 'Windsor EV', year_start: '2024', battery_capacity: '38 kWh', battery_type: 'Lithium-ion LFP', battery_useable_capacity: '38 kWh', charge_power: '7.4 kW AC', charge_power_max: '50 kW DC', charge_speed: '500 km/h', acceleration_0_100_kmh: '9.6 sec', top_speed: '130 km/h', electric_range: '332 km', total_power: '100 kW (136 PS)', total_torque: '200 Nm', drive: 'Front', vehicle_consumption: '145 Wh/km', co2_emissions: '0 g/km', length: '4295 mm', width: '1850 mm', height: '1677 mm', seats: '5 people', cargo_volume: '604 L', car_body: 'Crossover', segment: 'B - Compact' },
  { make: 'Hyundai', model: 'Creta EV', year_start: '2025', battery_capacity: '51.4 kWh', battery_type: 'Lithium-ion NMC', battery_useable_capacity: '51.4 kWh', charge_power: '11 kW AC', charge_power_max: '100 kW DC', charge_speed: '900 km/h', acceleration_0_100_kmh: '7.9 sec', top_speed: '170 km/h', electric_range: '473 km', total_power: '135 kW (184 PS)', total_torque: '250 Nm', drive: 'Front', vehicle_consumption: '145 Wh/km', co2_emissions: '0 g/km', length: '4315 mm', width: '1825 mm', height: '1620 mm', seats: '5 people', cargo_volume: '433 L', car_body: 'SUV', segment: 'B - Compact' },
  { make: 'Ola', model: 'S1 Pro', year_start: '2023', battery_capacity: '4 kWh', battery_type: 'Lithium-ion NMC', battery_useable_capacity: '3.97 kWh', charge_power: '750 W AC', charge_power_max: '750 W AC', charge_speed: '75 km/h', acceleration_0_100_kmh: 'N/A', top_speed: '116 km/h', electric_range: '195 km', total_power: '11 kW (15 PS)', total_torque: '58 Nm', drive: 'Rear', vehicle_consumption: '20.5 Wh/km', co2_emissions: '0 g/km', length: '1860 mm', width: '710 mm', height: '1180 mm', seats: '2 people', cargo_volume: '36 L', car_body: 'Scooter', segment: 'Two-wheeler' },
  { make: 'Ola', model: 'S1 Air', year_start: '2023', battery_capacity: '3 kWh', battery_type: 'Lithium-ion NMC', battery_useable_capacity: '2.97 kWh', charge_power: '650 W AC', charge_power_max: '650 W AC', charge_speed: '70 km/h', acceleration_0_100_kmh: 'N/A', top_speed: '90 km/h', electric_range: '151 km', total_power: '4.5 kW (6 PS)', total_torque: '32 Nm', drive: 'Rear', vehicle_consumption: '19.8 Wh/km', co2_emissions: '0 g/km', length: '1860 mm', width: '710 mm', height: '1180 mm', seats: '2 people', cargo_volume: '36 L', car_body: 'Scooter', segment: 'Two-wheeler' },
  { make: 'Ather', model: '450X', year_start: '2023', battery_capacity: '3.7 kWh', battery_type: 'Lithium-ion NMC', battery_useable_capacity: '3.7 kWh', charge_power: '750 W AC', charge_power_max: '750 W AC', charge_speed: '80 km/h', acceleration_0_100_kmh: 'N/A', top_speed: '90 km/h', electric_range: '150 km', total_power: '6 kW (8 PS)', total_torque: '26 Nm', drive: 'Rear', vehicle_consumption: '24.6 Wh/km', co2_emissions: '0 g/km', length: '1800 mm', width: '650 mm', height: '1150 mm', seats: '2 people', cargo_volume: '22 L', car_body: 'Scooter', segment: 'Two-wheeler' },
  { make: 'Ather', model: 'Rizta', year_start: '2024', battery_capacity: '3.7 kWh', battery_type: 'Lithium-ion NMC', battery_useable_capacity: '3.7 kWh', charge_power: '650 W AC', charge_power_max: '650 W AC', charge_speed: '75 km/h', acceleration_0_100_kmh: 'N/A', top_speed: '80 km/h', electric_range: '160 km', total_power: '4.3 kW (6 PS)', total_torque: '22 Nm', drive: 'Rear', vehicle_consumption: '23.1 Wh/km', co2_emissions: '0 g/km', length: '1800 mm', width: '700 mm', height: '1160 mm', seats: '2 people', cargo_volume: '34 L', car_body: 'Scooter', segment: 'Two-wheeler' },
  { make: 'TVS', model: 'iQube', year_start: '2023', battery_capacity: '3.4 kWh', battery_type: 'Lithium-ion NMC', battery_useable_capacity: '3.4 kWh', charge_power: '650 W AC', charge_power_max: '650 W AC', charge_speed: '70 km/h', acceleration_0_100_kmh: 'N/A', top_speed: '82 km/h', electric_range: '145 km', total_power: '4.4 kW (6 PS)', total_torque: '33 Nm', drive: 'Rear', vehicle_consumption: '23.4 Wh/km', co2_emissions: '0 g/km', length: '1830 mm', width: '650 mm', height: '1170 mm', seats: '2 people', cargo_volume: '32 L', car_body: 'Scooter', segment: 'Two-wheeler' },
  { make: 'Bajaj', model: 'Chetak', year_start: '2023', battery_capacity: '3 kWh', battery_type: 'Lithium-ion NMC', battery_useable_capacity: '3 kWh', charge_power: '750 W AC', charge_power_max: '750 W AC', charge_speed: '75 km/h', acceleration_0_100_kmh: 'N/A', top_speed: '73 km/h', electric_range: '126 km', total_power: '4 kW (5.4 PS)', total_torque: '16 Nm', drive: 'Rear', vehicle_consumption: '23.8 Wh/km', co2_emissions: '0 g/km', length: '1900 mm', width: '735 mm', height: '1155 mm', seats: '2 people', cargo_volume: '20 L', car_body: 'Scooter', segment: 'Two-wheeler' },
];

const LOCAL_EV_CONTEXT = INDIAN_EV_DATABASE.map((vehicle) => (
  `${vehicle.make} ${vehicle.model}: ${vehicle.electric_range} range, ` +
  `${vehicle.battery_capacity} battery, ${vehicle.charge_power_max} maximum charging, ` +
  `${vehicle.car_body}, ${vehicle.seats}`
)).join('\n');

function sanitizeChatHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-8)
    .filter((item) => item && ['user', 'assistant'].includes(item.role))
    .map((item) => ({
      role: item.role,
      content: String(item.content || '').trim().slice(0, 1000),
    }))
    .filter((item) => item.content);
}

async function askMistral(message, history) {
  if (!MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY is not configured');
  }

  const response = await axios.post(
    MISTRAL_CHAT_URL,
    {
      model: MISTRAL_CHAT_MODEL,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content: `You are EVA, a practical AI assistant for Indian EV customers.
Reply in the same language as the user, including natural Hinglish. Answer the actual question directly; never repeat a fixed support menu.
Use the local vehicle data below for model names and specifications. Do not invent current prices, subsidies, availability, or specifications. If exact live data is unavailable, clearly say it should be verified.
Keep normal answers concise and use short bullets where useful.

LOCAL EV DATA:
${LOCAL_EV_CONTEXT}`,
        },
        ...sanitizeChatHistory(history),
        { role: 'user', content: String(message).trim().slice(0, 500) },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 25000,
    },
  );

  const content = response.data?.choices?.[0]?.message?.content;
  const answer = typeof content === 'string'
    ? content.trim()
    : Array.isArray(content)
      ? content.map((item) => item?.text || '').join('').trim()
      : '';

  if (!answer) throw new Error('Mistral returned an empty answer');
  return answer;
}

function getMentionedVehicles(message) {
  const normalized = String(message).toLowerCase();

  return INDIAN_EV_DATABASE.filter((vehicle) => {
    const fullName = `${vehicle.make} ${vehicle.model}`.toLowerCase();
    const modelName = vehicle.model.toLowerCase();
    const shortModelName = modelName
      .replace(/\belectric\b/g, '')
      .replace(/\bev\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return normalized.includes(fullName)
      || normalized.includes(modelName)
      || (shortModelName.length >= 4 && normalized.includes(shortModelName));
  });
}

function formatLocalEVList() {
  const grouped = INDIAN_EV_DATABASE.reduce((brands, vehicle) => {
    if (!brands[vehicle.make]) brands[vehicle.make] = [];
    brands[vehicle.make].push(vehicle.model);
    return brands;
  }, {});

  return [
    '**Available EV models in our local database:**',
    '',
    ...Object.entries(grouped).map(
      ([make, models]) => `- **${make}:** ${models.join(', ')}`,
    ),
    '',
    'Kisi bhi 2 models ka naam bhejiye, main range, battery aur charging compare kar dunga.',
  ].join('\n');
}

function getLocalEVAnswer(message) {
  const normalized = String(message).toLowerCase().trim();
  const mentionedVehicles = getMentionedVehicles(normalized);
  const wantsList = /(list|names?|models?|options?|naam|gaadi|cars?|vehicles?)/i.test(normalized)
    && /(ev|electric|car|vehicle|gaadi|model)/i.test(normalized);

  if (wantsList) return formatLocalEVList();

  if (mentionedVehicles.length >= 2 && /(compare|versus|\bvs\b|difference|better)/i.test(normalized)) {
    return [
      '**EV comparison:**',
      '',
      ...mentionedVehicles.slice(0, 3).map((vehicle) => (
        `- **${vehicle.make} ${vehicle.model}:** ${vehicle.electric_range} range, ` +
        `${vehicle.battery_capacity} battery, ${vehicle.charge_power_max} max charging`
      )),
      '',
      'Real-world range driving style, weather aur AC usage se change ho sakti hai.',
    ].join('\n');
  }

  if (mentionedVehicles.length) {
    const vehicle = mentionedVehicles[0];
    return [
      `**${vehicle.make} ${vehicle.model}**`,
      '',
      `- Range: ${vehicle.electric_range}`,
      `- Battery: ${vehicle.battery_capacity}`,
      `- Maximum charging: ${vehicle.charge_power_max}`,
      `- Power: ${vehicle.total_power}`,
      `- Body/Seats: ${vehicle.car_body}, ${vehicle.seats}`,
      '',
      'Ye local product data hai; current variant, price aur availability dealer se verify karein.',
    ].join('\n');
  }

  if (/(range|distance|kilomet|km)/i.test(normalized)) {
    const longestRange = [...INDIAN_EV_DATABASE]
      .sort((first, second) => parseInt(second.electric_range, 10) - parseInt(first.electric_range, 10))
      .slice(0, 5);

    return [
      '**Longest-range EVs in our local database:**',
      '',
      ...longestRange.map(
        (vehicle) => `- **${vehicle.make} ${vehicle.model}:** ${vehicle.electric_range}`,
      ),
      '',
      'Real-world range weather, speed, traffic aur AC usage par depend karti hai.',
    ].join('\n');
  }

  if (/(charg|battery|home charger)/i.test(normalized)) {
    return 'EV charging mainly 3 types ki hoti hai: slow AC home charging, faster AC charging aur DC fast charging. Apna EV model batayein, main uski battery, supported charging power aur approximate charging guidance bata dunga.';
  }

  if (/(test ride|test drive|book)/i.test(normalized)) {
    return 'Test drive book karne ke liye preferred EV model, city, date aur convenient time share kijiye. Team confirmation ke liye aapka naam aur phone number bhi required hoga.';
  }

  if (/(price|cost|lakh|subsid)/i.test(normalized)) {
    return 'EV prices aur subsidies frequently change hoti hain. Model aur city batayein; main available vehicle details explain karunga, lekin final on-road price authorised dealer se verify karna hoga.';
  }

  if (/^(hi|hello|hey|namaste|hii+)(\s|!|\.|$)/i.test(normalized)) {
    return 'Namaste! 👋 Aap kisi EV ka naam, range, battery, charging ya comparison pooch sakte hain. Example: “Nexon EV aur Curvv EV compare karo.”';
  }

  return `Main aapke question “${String(message).trim().slice(0, 120)}” ko clearly samajh nahi paaya. EV model ka naam ya required detail—range, battery, charging, comparison, price ya test drive—thoda clearly likhiye.`;
}

function searchIndianEVs(make, model) {
  return INDIAN_EV_DATABASE.filter(v => {
    const makeMatch = !make || v.make.toLowerCase().includes(make.toLowerCase());
    const modelMatch = !model || v.model.toLowerCase().includes(model.toLowerCase());
    return makeMatch && modelMatch;
  });
}

function detectChatIntent(message) {
  const text = String(message || '').toLowerCase();
  if (/(test ride|test drive|book|appointment)/.test(text)) return 'test-ride';
  if (/(price|cost|on-road|lakh|subsid)/.test(text)) return 'pricing';
  if (/(charg|battery|station)/.test(text)) return 'charging';
  if (/(service|repair|maintenance)/.test(text)) return 'service';
  if (/(range|kilomet|km)/.test(text)) return 'range';
  if (/(compare|versus|\bvs\b)/.test(text)) return 'comparison';
  return 'general';
}

async function fetchFromAPINinjas(make, model) {
  try {
    const params = new URLSearchParams();
    if (make) params.append('make', make);
    if (model) params.append('model', model);
    const response = await fetch(`${EV_API_BASE}/electricvehicle?${params}`, {
      headers: { 'X-Api-Key': EV_API_KEY }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ============================================================
// MIDDLEWARE - JWT Auth
// ============================================================
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Invalid token' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token expired or invalid' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'You do not have permission for this action.' });
  return next();
};

// ============================================================
// AUTH ROUTES
// ============================================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, company } = req.body;
    const safeName = cleanText(name, 80);
    const safeEmail = cleanText(email, 120).toLowerCase();
    if (!safeName || !safeEmail || !password)
      return res.status(400).json({ success: false, message: 'Name, email and password required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    if (String(password).length < 8 || String(password).length > 72) return res.status(400).json({ success: false, message: 'Password must be 8 to 72 characters.' });

    const exists = await User.findOne({ email: safeEmail });
    if (exists)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const userCount = await User.countDocuments();
    if (userCount > 0 && process.env.ALLOW_PUBLIC_REGISTRATION !== 'true') {
      return res.status(403).json({ success: false, message: 'Public registration is closed. Ask the dealership owner for access.' });
    }

    const user = await User.create({
      name: safeName,
      email: safeEmail,
      password,
      phone: cleanText(phone, 30),
      company: cleanText(company, 120),
      role: userCount === 0 ? 'admin' : 'viewer'
    });
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

    console.log(`✅ New user registered: ${safeEmail}`);
    res.status(201).json({ success: true, message: 'Account created!', token, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const safeEmail = cleanText(email, 120).toLowerCase();
    const user = await User.findOne({ email: safeEmail }).select('+password');
    if (!user)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const match = await user.comparePassword(password);
    if (!match)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    console.log(`✅ User logged in: ${safeEmail}`);
    res.json({ success: true, message: 'Login successful', token, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

app.get('/api/auth/users', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, users, total: users.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// ENQUIRY ROUTES (Contact Form)
// ============================================================
app.post('/api/enquiry', async (req, res) => {
  try {
    const { name, email, phone, company, message } = req.body;
    if (!name || !email || !message)
      return res.status(400).json({ success: false, message: 'Name, email and message required' });

    const detectedIntent = detectChatIntent(message);
    const leadValidation = validateLead({
      name,
      email,
      phone,
      source: 'form',
      interest: detectedIntent === 'test-ride' ? 'test-ride' : detectedIntent === 'pricing' ? 'purchase' : 'general',
      notes: message
    });
    if (leadValidation.errors.length) {
      return res.status(400).json({ success: false, message: leadValidation.errors[0], errors: leadValidation.errors });
    }

    const enquiry = await Enquiry.create({
      name: leadValidation.value.name,
      email: leadValidation.value.email,
      phone: leadValidation.value.phone,
      company: cleanText(company, 120),
      message: cleanText(message, 2000),
      ipAddress: req.ip || '',
    });

    const identity = [{ email: leadValidation.value.email }];
    if (leadValidation.value.phone) identity.push({ phone: leadValidation.value.phone });
    const existingLead = await Lead.findOne({ $or: identity, archivedAt: { $exists: false } });
    if (existingLead?.consent) {
      leadValidation.value.consent = existingLead.consent.toObject ? existingLead.consent.toObject() : { ...existingLead.consent };
    }
    const qualification = qualifyLead(leadValidation.value);
    const pipelineStatus = existingLead
      ? qualification.temperature === 'hot' && ['new', 'contacted'].includes(existingLead.status) ? 'qualified' : existingLead.status
      : qualification.temperature === 'hot' ? 'qualified' : 'new';
    const lead = await Lead.findOneAndUpdate(
      { $or: identity, archivedAt: { $exists: false } },
      {
        $set: {
          ...leadValidation.value,
          status: pipelineStatus,
          score: qualification.score,
          temperature: qualification.temperature,
          scoreReasons: qualification.reasons,
          nextBestAction: qualification.nextBestAction
        },
        $push: { activities: { type: 'enquiry.created', detail: detectedIntent, actor: 'customer' } }
      },
      { upsert: true, new: true, runValidators: true }
    );
    const automation = await dispatchAutomation('lead.qualified', {
      leadId: lead._id,
      enquiryId: enquiry._id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      score: lead.score,
      temperature: lead.temperature,
      nextBestAction: lead.nextBestAction
    });

    console.log(`📩 New enquiry from: ${name} (${email})`);
    res.status(201).json({
      success: true,
      message: 'Enquiry submitted and queued for dealership review.',
      enquiry,
      leadId: lead._id,
      automation,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/enquiry', authMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    const enquiries = await Enquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Enquiry.countDocuments(filter);
    res.json({ success: true, enquiries, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/enquiry/:id', authMiddleware, requireRole('admin', 'agent'), async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!enquiry) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, enquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// BOOKING ROUTES — idempotent lifecycle + n8n events
// ============================================================
function createBookingCode() {
  return `TEV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function recordBookingAutomation(booking, event) {
  const result = await dispatchAutomation(event, {
    bookingId: booking._id,
    bookingCode: booking.bookingCode,
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    vehicle: booking.vehicle,
    date: booking.date,
    timeSlot: booking.timeSlot,
    type: booking.type,
    testDriveMode: booking.testDriveMode,
    city: booking.city,
    pincode: booking.pincode,
    address: booking.address,
    location: booking.location,
    notes: booking.notes,
    status: booking.status,
    leadId: booking.leadId,
    adminEmail: process.env.BOOKING_ADMIN_EMAIL || '',
    customerEmailEnabled: booking.consent?.emailUpdates !== false
  });
  booking.automation = {
    status: result.status,
    lastEvent: event,
    lastAttemptAt: new Date(),
    error: result.error || ''
  };
  await booking.save();
  return result;
}

app.post('/api/bookings', async (req, res) => {
  try {
    const { errors, value } = validateBooking(req.body);
    if (errors.length) return res.status(400).json({ success: false, message: errors[0], errors });

    const idempotencyKey = cleanText(req.header('Idempotency-Key'), 120);
    if (idempotencyKey) {
      const previous = await Booking.findOne({ idempotencyKey });
      if (previous) return res.json({ success: true, duplicate: true, message: 'Booking request already received.', booking: previous });
    }

    const duplicate = await Booking.findOne({
      phone: value.phone,
      date: new Date(value.date),
      timeSlot: value.timeSlot,
      status: { $nin: ['cancelled', 'no-show'] }
    });
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'This customer already has a booking in that time slot.', bookingCode: duplicate.bookingCode });
    }

    const leadInput = {
      name: value.name,
      email: value.email,
      phone: value.phone,
      city: value.city,
      source: 'booking',
      interest: value.type === 'test-ride' ? 'test-ride' : 'general',
      vehicle: value.vehicle,
      budget: cleanText(req.body.budget, 30),
      purchaseTimeline: cleanText(req.body.purchaseTimeline, 30),
      consent: req.body.consent || {}
    };
    const leadValidation = validateLead(leadInput);
    if (leadValidation.errors.length) return res.status(400).json({ success: false, message: leadValidation.errors[0], errors: leadValidation.errors });
    const qualifiedInput = leadValidation.value;
    const identity = [{ phone: value.phone }];
    if (value.email) identity.push({ email: value.email });
    const existingLead = await Lead.findOne({ $or: identity, archivedAt: { $exists: false } });
    if (!Object.prototype.hasOwnProperty.call(req.body, 'consent') && existingLead?.consent) {
      qualifiedInput.consent = existingLead.consent.toObject ? existingLead.consent.toObject() : { ...existingLead.consent };
    }
    const qualification = qualifyLead(qualifiedInput);
    const pipelineStatus = existingLead
      ? qualification.temperature === 'hot' && ['new', 'contacted'].includes(existingLead.status) ? 'qualified' : existingLead.status
      : qualification.temperature === 'hot' ? 'qualified' : 'contacted';
    const lead = await Lead.findOneAndUpdate(
      { $or: identity, archivedAt: { $exists: false } },
      {
        $set: {
          ...qualifiedInput,
          score: qualification.score,
          temperature: qualification.temperature,
          scoreReasons: qualification.reasons,
          nextBestAction: qualification.nextBestAction,
          status: pipelineStatus
        },
        $push: { activities: { type: 'booking.created', detail: `${value.vehicle || value.type} on ${value.date}`, actor: 'customer' } }
      },
      { upsert: true, new: true, runValidators: true }
    );

    const booking = await Booking.create({
      ...value,
      date: new Date(value.date),
      bookingCode: createBookingCode(),
      leadId: lead._id,
      idempotencyKey: idempotencyKey || undefined,
      status: 'pending'
    });
    const automation = await recordBookingAutomation(booking, 'booking.created');

    res.status(201).json({
      success: true,
      message: 'Test-drive request saved. The dealership will confirm the slot shortly.',
      booking,
      automation
    });
  } catch (err) {
    console.error('Booking creation error:', err.message);
    const duplicateKey = err.code === 11000;
    res.status(duplicateKey ? 409 : 500).json({ success: false, message: duplicateKey ? 'This booking request was already submitted.' : 'Server error while saving booking. Please try again.' });
  }
});

app.get('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const { page, limit } = safePagination(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.upcoming === 'true') filter.date = { $gte: new Date() };
    const [bookings, total] = await Promise.all([
      Booking.find(filter).sort({ date: 1 }).skip((page - 1) * limit).limit(limit),
      Booking.countDocuments(filter)
    ]);
    res.json({ success: true, bookings, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Unable to load bookings.' });
  }
});

app.put('/api/bookings/:id', authMiddleware, requireRole('admin', 'agent'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    const previousStatus = booking.status;
    const allowed = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled', 'no-show'],
      completed: [],
      cancelled: [],
      'no-show': ['confirmed']
    };
    if (req.body.status && req.body.status !== booking.status && !allowed[booking.status]?.includes(req.body.status)) {
      return res.status(400).json({ success: false, message: `Cannot move booking from ${booking.status} to ${req.body.status}.` });
    }
    if (req.body.status) booking.status = req.body.status;
    if (req.body.notes !== undefined) booking.notes = cleanText(req.body.notes, 1000);
    await booking.save();
    const automation = req.body.status && booking.status !== previousStatus
      ? await recordBookingAutomation(booking, `booking.${booking.status}`)
      : { status: booking.automation?.status || 'not-configured', event: null };
    res.json({ success: true, booking, automation });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Unable to update booking.' });
  }
});

app.post('/api/bookings/:id/reschedule', authMiddleware, requireRole('admin', 'agent'), async (req, res) => {
  try {
    const { errors, value } = validateBooking({ date: req.body.date, timeSlot: req.body.timeSlot }, { partial: true });
    if (errors.length) return res.status(400).json({ success: false, message: errors[0], errors });
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (['completed', 'cancelled'].includes(booking.status)) return res.status(400).json({ success: false, message: 'Completed or cancelled bookings cannot be rescheduled.' });
    const clash = await Booking.findOne({
      _id: { $ne: booking._id },
      phone: booking.phone,
      date: new Date(value.date),
      timeSlot: value.timeSlot,
      status: { $nin: ['cancelled', 'no-show'] }
    });
    if (clash) return res.status(409).json({ success: false, message: 'This customer already has another booking in that time slot.' });
    booking.rescheduleHistory.push({
      fromDate: booking.date,
      fromTimeSlot: booking.timeSlot,
      toDate: new Date(value.date),
      toTimeSlot: value.timeSlot,
      changedBy: req.user.email
    });
    booking.date = new Date(value.date);
    booking.timeSlot = value.timeSlot;
    booking.status = 'pending';
    await booking.save();
    const automation = await recordBookingAutomation(booking, 'booking.rescheduled');
    res.json({ success: true, booking, automation });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Unable to reschedule booking.' });
  }
});

app.post('/api/bookings/:id/cancel', authMiddleware, requireRole('admin', 'agent'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status === 'completed') return res.status(400).json({ success: false, message: 'A completed booking cannot be cancelled.' });
    if (booking.status === 'cancelled') return res.json({ success: true, duplicate: true, booking, automation: { status: booking.automation?.status || 'not-configured', event: null } });
    booking.status = 'cancelled';
    booking.cancellationReason = cleanText(req.body.reason, 500);
    await booking.save();
    const automation = await recordBookingAutomation(booking, 'booking.cancelled');
    res.json({ success: true, booking, automation });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Unable to cancel booking.' });
  }
});

// ============================================================
// LEADS ROUTES — qualification, follow-up and human handoff
// ============================================================
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function qualifyAndSaveLead(req, res) {
  try {
    const { errors, value } = validateLead(req.body);
    if (errors.length) return res.status(400).json({ success: false, message: errors[0], errors });
    const identity = [];
    if (value.email) identity.push({ email: value.email });
    if (value.phone) identity.push({ phone: value.phone });
    const existingLead = await Lead.findOne({ $or: identity, archivedAt: { $exists: false } });
    if (!Object.prototype.hasOwnProperty.call(req.body, 'consent') && existingLead?.consent) {
      value.consent = existingLead.consent.toObject ? existingLead.consent.toObject() : { ...existingLead.consent };
    }
    const qualification = qualifyLead(value);
    const pipelineStatus = existingLead
      ? qualification.temperature === 'hot' && ['new', 'contacted'].includes(existingLead.status) ? 'qualified' : existingLead.status
      : qualification.temperature === 'hot' ? 'qualified' : 'new';
    const lead = await Lead.findOneAndUpdate(
      { $or: identity, archivedAt: { $exists: false } },
      {
        $set: {
          ...value,
          score: qualification.score,
          temperature: qualification.temperature,
          scoreReasons: qualification.reasons,
          nextBestAction: qualification.nextBestAction,
          status: pipelineStatus
        },
        $push: { activities: { type: 'lead.qualified', detail: `Score ${qualification.score} (${qualification.temperature})`, actor: 'system' } }
      },
      { upsert: true, new: true, runValidators: true }
    );
    const automation = await dispatchAutomation('lead.qualified', {
      leadId: lead._id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      city: lead.city,
      vehicle: lead.vehicle,
      score: lead.score,
      temperature: lead.temperature,
      nextBestAction: lead.nextBestAction
    });
    res.status(201).json({ success: true, lead, qualification, automation });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Unable to qualify and save this lead.' });
  }
}

app.post('/api/leads', qualifyAndSaveLead);
app.post('/api/leads/qualify', qualifyAndSaveLead);

app.get('/api/leads', authMiddleware, async (req, res) => {
  try {
    const { page, limit } = safePagination(req.query);
    const filter = { archivedAt: { $exists: false } };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.source) filter.source = req.query.source;
    if (req.query.temperature) filter.temperature = req.query.temperature;
    if (req.query.attention === 'true') {
      filter.$or = [
        { temperature: 'hot', status: { $nin: ['converted', 'lost'] } },
        { 'handoff.status': 'requested' },
        { 'followUp.status': 'scheduled', 'followUp.scheduledAt': { $lte: new Date() } }
      ];
    }
    if (req.query.search) {
      const search = escapeRegex(cleanText(req.query.search, 80));
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { vehicle: { $regex: search, $options: 'i' } }
      ];
    }
    const [leads, total] = await Promise.all([
      Lead.find(filter).sort({ score: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Lead.countDocuments(filter)
    ]);
    res.json({ success: true, leads, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Unable to load leads.' });
  }
});

app.get('/api/leads/:id', authMiddleware, async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, archivedAt: { $exists: false } }).populate('assignedTo', 'name email');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, lead });
  } catch {
    res.status(400).json({ success: false, message: 'Invalid lead id.' });
  }
});

app.put('/api/leads/:id', authMiddleware, requireRole('admin', 'agent'), async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, archivedAt: { $exists: false } });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    const allowed = ['name', 'email', 'phone', 'city', 'source', 'status', 'interest', 'vehicle', 'budget', 'purchaseTimeline', 'notes', 'tags', 'assignedTo', 'consent'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const validated = validateLead({ ...lead.toObject(), ...updates });
    if (validated.errors.length) return res.status(400).json({ success: false, message: validated.errors[0], errors: validated.errors });
    Object.assign(lead, updates);
    ['name', 'email', 'phone', 'city', 'source', 'interest', 'vehicle', 'budget', 'purchaseTimeline', 'notes'].forEach((field) => {
      if (updates[field] !== undefined) lead[field] = validated.value[field];
    });
    if (updates.consent !== undefined) lead.consent = validated.value.consent;
    const qualification = qualifyLead(lead.toObject());
    lead.score = qualification.score;
    lead.temperature = qualification.temperature;
    lead.scoreReasons = qualification.reasons;
    lead.nextBestAction = qualification.nextBestAction;
    if (updates.status === 'converted' && !lead.convertedAt) lead.convertedAt = new Date();
    lead.activities.push({ type: 'lead.updated', detail: Object.keys(updates).join(', '), actor: req.user.email });
    await lead.save();
    res.json({ success: true, lead });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/leads/:id/follow-up', authMiddleware, requireRole('admin', 'agent'), async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, archivedAt: { $exists: false } });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (lead.automationPaused) return res.status(409).json({ success: false, message: 'Automation is paused for this lead because a human handoff is active.' });
    const channel = ['whatsapp', 'email', 'call'].includes(req.body.channel) ? req.body.channel : 'whatsapp';
    if (channel === 'whatsapp' && !lead.consent?.whatsapp) {
      return res.status(400).json({ success: false, message: 'WhatsApp consent is required before automated follow-up.' });
    }
    if (channel === 'email' && !lead.email) return res.status(400).json({ success: false, message: 'This lead does not have an email address.' });
    if (channel === 'call' && !lead.phone) return res.status(400).json({ success: false, message: 'This lead does not have a phone number.' });
    const scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : new Date();
    if (Number.isNaN(scheduledAt.getTime())) return res.status(400).json({ success: false, message: 'Invalid follow-up date.' });
    const event = scheduledAt > new Date(Date.now() + 60 * 1000) ? 'lead.followup.scheduled' : 'lead.followup.requested';
    lead.followUp = { channel, scheduledAt, status: 'scheduled', error: '' };
    lead.activities.push({ type: event, detail: `${channel} at ${scheduledAt.toISOString()}`, actor: req.user.email });
    await lead.save();
    const automation = await dispatchAutomation(event, {
      leadId: lead._id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      vehicle: lead.vehicle,
      channel,
      scheduledAt,
      message: cleanText(req.body.message, 1000),
      score: lead.score,
      temperature: lead.temperature
    });
    lead.followUp.status = automation.status === 'delivered' ? (event.endsWith('scheduled') ? 'scheduled' : 'triggered') : 'failed';
    lead.followUp.lastAttemptAt = new Date();
    lead.followUp.error = automation.error || (automation.status === 'not-configured' ? 'n8n webhook is not configured' : '');
    await lead.save();
    res.json({ success: true, lead, automation });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Unable to schedule follow-up.' });
  }
});

app.post('/api/leads/:id/handoff', authMiddleware, requireRole('admin', 'agent'), async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, archivedAt: { $exists: false } });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    lead.automationPaused = true;
    lead.assignedTo = req.body.assignedTo || req.user._id;
    lead.handoff = {
      status: 'requested',
      reason: cleanText(req.body.reason || 'Customer needs human assistance', 500),
      requestedAt: new Date()
    };
    lead.activities.push({ type: 'lead.handoff.requested', detail: lead.handoff.reason, actor: req.user.email });
    await lead.save();
    const automation = await dispatchAutomation('lead.handoff.requested', {
      leadId: lead._id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      reason: lead.handoff.reason,
      assignedTo: lead.assignedTo
    });
    res.json({ success: true, lead, automation });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Unable to request human handoff.' });
  }
});

app.delete('/api/leads/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, { archivedAt: new Date(), automationPaused: true }, { new: true });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, message: 'Lead archived' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Unable to archive lead.' });
  }
});

// ============================================================
// ANALYTICS ROUTES — owner operations view
// ============================================================
async function buildOwnerStats() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeLead = { archivedAt: { $exists: false } };
    const [
      totalUsers, totalEnquiries, newEnquiries, totalBookings, pendingBookings,
      completedBookings, upcomingBookingsCount, totalLeads, newLeads, convertedLeads,
      hotLeads, warmLeads, followUpsDue, handoffsRequested, bookingAutomationFailures, leadAutomationFailures,
      totalChats, recentChats, dailyLeads, leadsBySource, leadsByStatus, leadsByTemperature, bookingsByStatus,
      bookingsByType, attentionQueue, upcomingBookings, scoreSummary
    ] = await Promise.all([
      User.countDocuments(),
      Enquiry.countDocuments(),
      Enquiry.countDocuments({ status: 'new' }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ date: { $gte: new Date() }, status: { $in: ['pending', 'confirmed'] } }),
      Lead.countDocuments(activeLead),
      Lead.countDocuments({ ...activeLead, createdAt: { $gte: sevenDaysAgo } }),
      Lead.countDocuments({ ...activeLead, status: 'converted' }),
      Lead.countDocuments({ ...activeLead, temperature: 'hot', status: { $nin: ['converted', 'lost'] } }),
      Lead.countDocuments({ ...activeLead, temperature: 'warm', status: { $nin: ['converted', 'lost'] } }),
      Lead.countDocuments({ ...activeLead, 'followUp.status': 'scheduled', 'followUp.scheduledAt': { $lte: new Date() } }),
      Lead.countDocuments({ ...activeLead, 'handoff.status': 'requested' }),
      Booking.countDocuments({ 'automation.status': 'failed' }),
      Lead.countDocuments({ ...activeLead, 'followUp.status': 'failed' }),
      ChatSession.countDocuments(),
      ChatSession.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Lead.aggregate([
        { $match: { ...activeLead, createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Lead.aggregate([{ $match: activeLead }, { $group: { _id: '$source', count: { $sum: 1 } } }]),
      Lead.aggregate([{ $match: activeLead }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Lead.aggregate([{ $match: activeLead }, { $group: { _id: '$temperature', count: { $sum: 1 } } }]),
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Booking.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Lead.find({
        ...activeLead,
        status: { $nin: ['converted', 'lost'] },
        $or: [{ temperature: 'hot' }, { 'handoff.status': 'requested' }, { 'followUp.status': 'failed' }]
      }).sort({ score: -1, createdAt: 1 }).limit(6).select('name vehicle score temperature nextBestAction followUp handoff createdAt'),
      Booking.find({ date: { $gte: new Date() }, status: { $in: ['pending', 'confirmed'] } })
        .sort({ date: 1 }).limit(6).select('bookingCode name vehicle date timeSlot status automation'),
      Lead.aggregate([{ $match: activeLead }, { $group: { _id: null, average: { $avg: '$score' } } }])
    ]);

    const conversionRate = totalLeads ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;
    const bookingCompletionRate = totalBookings ? Number(((completedBookings / totalBookings) * 100).toFixed(1)) : 0;
    return {
      totalUsers, totalEnquiries, newEnquiries, totalBookings, pendingBookings, completedBookings,
      upcomingBookingsCount, totalLeads, newLeads, convertedLeads, hotLeads, warmLeads,
      followUpsDue, handoffsRequested, automationFailures: bookingAutomationFailures + leadAutomationFailures, conversionRate, bookingCompletionRate,
      averageLeadScore: Number((scoreSummary[0]?.average || 0).toFixed(1)),
      totalChats,
      recentChats,
      dailyLeads, leadsBySource, leadsByStatus, leadsByTemperature, bookingsByStatus, bookingsByType,
      attentionQueue, upcomingBookings,
      generatedAt: new Date()
    };
}

app.get('/api/analytics/dashboard', authMiddleware, async (req, res) => {
  try {
    res.json({ success: true, stats: await buildOwnerStats() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Unable to calculate dashboard metrics.' });
  }
});

app.get('/api/analytics/owner', authMiddleware, async (req, res) => {
  try {
    res.json({ success: true, stats: await buildOwnerStats() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Unable to calculate owner metrics.' });
  }
});

// ============================================================
// CHAT ROUTE (Mistral AI with grounded local fallback)
// ============================================================
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, sessionId, visitorName, visitorEmail } = req.body;
    const question = String(message || '').trim();
    const activeSessionId = cleanText(sessionId, 120) || `s_${crypto.randomUUID()}`;

    if (!question) {
      return res.status(400).json({ success: false, message: 'Message required' });
    }

    if (question.length > 500) {
      return res.status(400).json({ success: false, message: 'Message is too long' });
    }

    let leadRecord = null;
    if (visitorEmail && mongoose.connection.readyState === 1) {
      const chatLead = {
        name: cleanText(visitorName || 'Visitor', 80),
        email: cleanText(visitorEmail, 120).toLowerCase(),
        source: 'chatbot',
        sessionId: activeSessionId,
        interest: detectChatIntent(question) === 'test-ride' ? 'test-ride' : 'general'
      };
      const qualification = qualifyLead(chatLead);
      leadRecord = await Lead.findOneAndUpdate(
        { email: chatLead.email },
        {
          $set: {
            ...chatLead,
            score: qualification.score,
            temperature: qualification.temperature,
            scoreReasons: qualification.reasons,
            nextBestAction: qualification.nextBestAction
          },
          $push: { activities: { type: 'chat.message', detail: detectChatIntent(question), actor: 'customer' } }
        },
        { upsert: true, new: true }
      );
    }

    let response;
    let mode = 'local';

    try {
      response = await askMistral(question, history);
      mode = 'mistral';
    } catch (aiError) {
      const providerStatus = aiError.response?.status || aiError.code || aiError.message;
      console.warn(`Mistral unavailable; using local EV knowledge: ${providerStatus}`);
      response = getLocalEVAnswer(question);
    }

    const intent = detectChatIntent(question);
    if (mongoose.connection.readyState === 1) {
      await ChatSession.findOneAndUpdate(
        { sessionId: activeSessionId },
        {
          $set: {
            visitorName: cleanText(visitorName || 'Visitor', 80),
            visitorEmail: cleanText(visitorEmail, 120).toLowerCase(),
            intent,
            ...(leadRecord ? { leadId: leadRecord._id } : {})
          },
          $push: {
            messages: {
              $each: [
                { role: 'user', content: question, timestamp: new Date() },
                { role: 'assistant', content: response, timestamp: new Date() }
              ]
            }
          }
        },
        { upsert: true, new: true, runValidators: true }
      );
    }

    res.json({
      success: true,
      response,
      mode,
      intent,
      sessionId: activeSessionId,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/chat/sessions', authMiddleware, async (req, res) => {
  try {
    const { page, limit } = safePagination(req.query);
    const filter = req.query.status ? { status: req.query.status } : {};
    const [sessions, total] = await Promise.all([
      ChatSession.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit),
      ChatSession.countDocuments(filter)
    ]);
    res.json({ success: true, sessions, total, page, pages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, message: 'Unable to load conversations.' });
  }
});

app.get('/api/chat/session/:sessionId', authMiddleware, async (req, res) => {
  try {
    const session = await ChatSession.findOne({ sessionId: cleanText(req.params.sessionId, 120) });
    if (!session) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    res.json({ success: true, session });
  } catch {
    res.status(500).json({ success: false, message: 'Unable to load conversation.' });
  }
});

// ============================================================
// EV EXPLORER / COMPARATOR ROUTES
// ============================================================
app.get('/api/ev/search', async (req, res) => {
  try {
    const { make, model } = req.query;
    if (!make && !model) {
      return res.status(400).json({ success: false, message: 'make or model parameter required' });
    }

    let vehicles = searchIndianEVs(make, model);
    let source = 'indian-database';

    if (vehicles.length === 0) {
      vehicles = await fetchFromAPINinjas(make, model);
      source = 'api-ninjas';
    }

    console.log(`🔍 EV Search: ${make || ''} ${model || ''} → ${vehicles.length} results (${source})`);

    if (vehicles.length === 0) {
      return res.json({
        success: false, vehicles: [],
        message: `No vehicles found for "${make || ''} ${model || ''}". Try Tata, Mahindra, MG, Ola, Ather, TVS, Bajaj (India) or Tesla, Hyundai, Kia, BMW, Audi (Global).`
      });
    }

    res.json({ success: true, vehicles, count: vehicles.length, source });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/ev/compare', async (req, res) => {
  try {
    const { make1, model1, make2, model2 } = req.query;
    if (!make1 || !make2) {
      return res.status(400).json({ success: false, message: 'make1 and make2 required' });
    }

    let v1Results = searchIndianEVs(make1, model1);
    if (v1Results.length === 0) v1Results = await fetchFromAPINinjas(make1, model1);

    let v2Results = searchIndianEVs(make2, model2);
    if (v2Results.length === 0) v2Results = await fetchFromAPINinjas(make2, model2);

    if (v1Results.length === 0 || v2Results.length === 0) {
      const missing = [];
      if (v1Results.length === 0) missing.push(`${make1} ${model1 || ''}`.trim());
      if (v2Results.length === 0) missing.push(`${make2} ${model2 || ''}`.trim());
      return res.status(404).json({
        success: false,
        message: `Could not find: ${missing.join(' and ')}. Try Tata, Mahindra, MG, Ola, Ather (India) or Tesla, Hyundai, Kia, BMW, Audi (Global).`
      });
    }

    console.log(`⚖️ EV Compare: ${make1} ${model1 || ''} vs ${make2} ${model2 || ''}`);
    res.json({ success: true, vehicle1: v1Results[0], vehicle2: v2Results[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/ev/brands', (req, res) => {
  const indianBrands = [...new Set(INDIAN_EV_DATABASE.map(v => v.make))];
  res.json({
    success: true, indian: indianBrands,
    global: ['Tesla', 'Hyundai', 'Kia', 'BMW', 'Audi', 'Nissan', 'Volkswagen', 'Volvo', 'Toyota', 'Ford'],
  });
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '✅ TataEV API running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    assistant: {
      mode: MISTRAL_API_KEY ? 'mistral' : 'local',
      mistralConfigured: Boolean(MISTRAL_API_KEY),
    },
    automation: {
      configured: Boolean(process.env.N8N_AUTOMATION_WEBHOOK_URL || process.env.N8N_BOOKING_WEBHOOK_URL || process.env.N8N_LEAD_WEBHOOK_URL),
      signatureConfigured: Boolean(process.env.N8N_WEBHOOK_SECRET),
    },
    requestId: req.requestId,
    timestamp: new Date(),
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API route not found.', requestId: req.requestId });
});

app.use((err, req, res, next) => {
  console.error(`Request ${req.requestId} failed:`, err.message);
  if (res.headersSent) return next(err);
  return res.status(500).json({ success: false, message: 'Unexpected server error.', requestId: req.requestId });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
function startServer(port = PORT) {
  const server = app.listen(port, () => {
    console.log(`\n🚀 TataEV Server running on http://localhost:${port}`);
    console.log(`📊 API Endpoints:`);
    console.log(`   POST /api/auth/register       → Register user`);
    console.log(`   POST /api/auth/login          → Login user`);
    console.log(`   POST /api/enquiry             → Save contact form`);
    console.log(`   POST /api/bookings            → Save test ride booking (+ n8n)`);
    console.log(`   POST /api/leads/qualify        → Score and capture a lead`);
    console.log(`   POST /api/leads/:id/follow-up  → Trigger consent-aware follow-up`);
    console.log(`   POST /api/leads/:id/handoff    → Pause AI and assign a human`);
    console.log(`   POST /api/chat                → Chatbot messages`);
    console.log(`   GET  /api/ev/search           → Search EVs (Indian + global)`);
    console.log(`   GET  /api/ev/compare          → Compare 2 EVs`);
    console.log(`   GET  /api/analytics/dashboard → Dashboard stats`);
    console.log(`   GET  /api/analytics/owner     → Owner operations metrics`);
    console.log(`   GET  /api/health              → Health check\n`);
  });
  connectDatabase();
  return server;
}

if (require.main === module) startServer();

module.exports = { app, connectDatabase, startServer };

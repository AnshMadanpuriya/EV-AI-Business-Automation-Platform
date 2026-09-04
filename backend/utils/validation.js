const { normalizedPhone, VALID_EMAIL, VALID_INDIAN_PHONE } = require('../services/leadScoring');

const LEAD_SOURCES = ['chatbot', 'voice', 'form', 'booking', 'demo-booking', 'whatsapp', 'manual'];
const LEAD_INTERESTS = ['test-ride', 'purchase', 'service', 'charging', 'general'];
const LEAD_BUDGETS = ['', 'under-10', '10-15', '15-20', '20-plus'];
const PURCHASE_TIMELINES = ['', '0-30-days', '31-90-days', '3-6-months', 'researching'];
const BOOKING_TYPES = ['test-ride', 'demo', 'service', 'consultation'];
const TEST_DRIVE_MODES = ['showroom', 'home'];
const VALID_PINCODE = /^\d{6}$/;

function cleanText(value, maxLength = 300) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, maxLength);
}

function validateLead(body = {}) {
  const errors = [];
  const name = cleanText(body.name, 80);
  const email = cleanText(body.email, 120).toLowerCase();
  const phone = normalizedPhone(body.phone);

  if (name.length < 3) errors.push('Name must be at least 3 characters');
  if (!email && !phone) errors.push('Email or phone is required');
  if (email && !VALID_EMAIL.test(email)) errors.push('Enter a valid email address');
  if (phone && !VALID_INDIAN_PHONE.test(phone)) errors.push('Enter a valid 10-digit Indian phone number');
  if (body.source && !LEAD_SOURCES.includes(body.source)) errors.push('Invalid lead source');
  if (body.interest && !LEAD_INTERESTS.includes(body.interest)) errors.push('Invalid interest');
  if (body.budget && !LEAD_BUDGETS.includes(body.budget)) errors.push('Invalid budget range');
  if (body.purchaseTimeline && !PURCHASE_TIMELINES.includes(body.purchaseTimeline)) errors.push('Invalid purchase timeline');

  return {
    errors,
    value: {
      name,
      email,
      phone,
      city: cleanText(body.city, 80),
      source: LEAD_SOURCES.includes(body.source) ? body.source : 'manual',
      interest: LEAD_INTERESTS.includes(body.interest) ? body.interest : 'general',
      vehicle: cleanText(body.vehicle, 80),
      budget: LEAD_BUDGETS.includes(body.budget) ? body.budget : '',
      purchaseTimeline: PURCHASE_TIMELINES.includes(body.purchaseTimeline) ? body.purchaseTimeline : '',
      notes: cleanText(body.notes, 1000),
      sessionId: cleanText(body.sessionId, 120),
      consent: {
        whatsapp: body.consent?.whatsapp === true,
        marketing: body.consent?.marketing === true,
        capturedAt: body.consent?.capturedAt || (body.consent?.whatsapp || body.consent?.marketing ? new Date() : undefined)
      }
    }
  };
}

function validateBooking(body = {}, { partial = false } = {}) {
  const errors = [];
  const value = {
    name: cleanText(body.name, 80),
    email: cleanText(body.email, 120).toLowerCase(),
    phone: normalizedPhone(body.phone),
    vehicle: cleanText(body.vehicle, 80),
    date: body.date,
    timeSlot: cleanText(body.timeSlot, 30),
    type: body.type || 'test-ride',
    testDriveMode: TEST_DRIVE_MODES.includes(body.testDriveMode) ? body.testDriveMode : 'showroom',
    city: cleanText(body.city, 80),
    pincode: cleanText(body.pincode, 6),
    address: cleanText(body.address, 500),
    location: cleanText(body.location, 120),
    notes: cleanText(body.notes, 1000),
    consent: {
      privacyAccepted: body.consent?.privacyAccepted === true,
      emailUpdates: body.consent?.emailUpdates !== false,
      capturedAt: body.consent?.capturedAt && !Number.isNaN(new Date(body.consent.capturedAt).getTime())
        ? new Date(body.consent.capturedAt)
        : new Date()
    }
  };

  if (!partial || body.name !== undefined) {
    if (value.name.length < 3) errors.push('Name must be at least 3 characters');
  }
  if (!partial || body.email !== undefined) {
    if (!VALID_EMAIL.test(value.email)) errors.push('Valid email is required');
  }
  if (!partial || body.phone !== undefined) {
    if (!VALID_INDIAN_PHONE.test(value.phone)) errors.push('Valid 10-digit Indian phone number is required');
  }
  if (!partial || body.date !== undefined) {
    if (!value.date || Number.isNaN(new Date(value.date).getTime())) errors.push('Valid date is required');
    else {
      const selected = new Date(value.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) errors.push('Date cannot be in the past');
    }
  }
  if ((!partial || body.timeSlot !== undefined) && !value.timeSlot) errors.push('Time slot is required');
  if (value.type && !BOOKING_TYPES.includes(value.type)) errors.push('Invalid booking type');
  if ((!partial || body.city !== undefined) && value.city.length < 2) errors.push('City is required');
  if ((!partial || body.pincode !== undefined) && !VALID_PINCODE.test(value.pincode)) errors.push('Valid 6-digit PIN code is required');
  if (body.testDriveMode && !TEST_DRIVE_MODES.includes(body.testDriveMode)) errors.push('Invalid test-drive preference');
  if (value.testDriveMode === 'home' && value.address.length < 10) errors.push('Complete home address is required for a home test drive');
  if ((!partial || body.consent !== undefined) && !value.consent.privacyAccepted) errors.push('Privacy consent is required');

  return { errors, value };
}

function safePagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit };
}

module.exports = { cleanText, validateLead, validateBooking, safePagination };

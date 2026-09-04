const Booking = require('../models/Booking');
const Lead = require('../models/Lead');

exports.getBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const bookings = await Booking.find(filter).sort({ date: 1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Booking.countDocuments(filter);
    res.json({ success: true, bookings, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const booking = await Booking.create(req.body);
    // Also create/update lead
    await Lead.findOneAndUpdate(
      { email: booking.email },
      { name: booking.name, email: booking.email, phone: booking.phone, source: 'demo-booking', interest: booking.type === 'test-ride' ? 'test-ride' : 'general', status: 'contacted' },
      { upsert: true }
    );
    res.status(201).json({ success: true, booking, message: 'Booking confirmed! We will reach out to you shortly.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const express = require('express');
const router = express.Router();
const { getBookings, createBooking, updateBooking } = require('../controllers/bookingsController');
const { auth } = require('../middleware/auth');
router.get('/', auth, getBookings);
router.post('/', createBooking);
router.put('/:id', auth, updateBooking);
module.exports = router;

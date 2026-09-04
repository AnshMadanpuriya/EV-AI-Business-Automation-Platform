const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/analyticsController');
const { auth } = require('../middleware/auth');
router.get('/dashboard', auth, getDashboardStats);
module.exports = router;

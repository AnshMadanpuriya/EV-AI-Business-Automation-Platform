const express = require('express');
const router = express.Router();
const { getLeads, createLead, updateLead, deleteLead } = require('../controllers/leadsController');
const { auth } = require('../middleware/auth');
router.get('/', auth, getLeads);
router.post('/', createLead);
router.put('/:id', auth, updateLead);
router.delete('/:id', auth, deleteLead);
module.exports = router;

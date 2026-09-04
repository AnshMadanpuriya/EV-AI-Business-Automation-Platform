const express = require('express');
const router = express.Router();
const { sendMessage, getSession, getAllSessions } = require('../controllers/chatController');
const { auth } = require('../middleware/auth');
router.post('/', sendMessage);
router.get('/session/:sessionId', getSession);
router.get('/sessions', auth, getAllSessions);
module.exports = router;

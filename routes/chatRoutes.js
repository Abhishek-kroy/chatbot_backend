const express = require('express');
const { chatWithGemini, speakText } = require('../controllers/chatController.js');

const router = express.Router();

router.post('/speak', speakText);
router.post('/chat', chatWithGemini);

module.exports = router;
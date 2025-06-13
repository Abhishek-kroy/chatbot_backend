const express = require('express');
const { transcribeAudio } = require('../controllers/speechController.js');

const router = express.Router();

router.post(
  '/talk',
  express.raw({ type: 'audio/webm', limit: '10mb' }),
  transcribeAudio
);

module.exports = router;
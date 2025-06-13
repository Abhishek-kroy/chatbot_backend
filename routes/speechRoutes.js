const express = require('express');
const multer = require('multer');
const { transcribeAudio } = require('../controllers/speechController.js');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/talk', transcribeAudio);

module.exports = router;
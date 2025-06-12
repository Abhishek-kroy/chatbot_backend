const express = require('express');
const {getAllSessions, getSessionById, deleteSession} = require('../controllers/dbController.js');
const router = express.Router();


router.get('/sessions', getAllSessions); // All sessions
router.get('/sessions/:sessionRef', getSessionById); // Specific session
router.delete('/sessions/:sessionRef', deleteSession);

module.exports = router;
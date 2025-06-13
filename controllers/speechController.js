const fs = require('fs');
const multer = require('multer');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const upload = multer({ dest: 'uploads/' });

const transcribeAudio = [
  upload.single('audio'),

  async (req, res) => {
    console.log('🎤 API HIT - .mp3 upload received');

    const filePath = req.file?.path;

    if (!filePath) {
      console.error('❌ No file uploaded');
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    try {
      const audioData = fs.readFileSync(filePath);

      // Send to HuggingFace Whisper
      const response = await fetch('https://api-inference.huggingface.co/models/openai/whisper-large-v3', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'audio/mpeg', // for .mp3 files
        },
        body: audioData,
      });

      console.log('📡 HuggingFace response status:', response.status);

      const text = await response.text();
      let result;

      try {
        result = JSON.parse(text);
      } catch (parseErr) {
        console.error('❌ Failed to parse Whisper JSON:\n', text);
        throw new Error('Invalid Whisper JSON response');
      }

      fs.unlinkSync(filePath); // Clean up

      if (!result.text) {
        console.warn('⚠️ Whisper did not detect any speech');
        return res.status(400).json({ error: 'No speech detected or Whisper failed' });
      }

      console.log('✅ Transcription result:', result.text);
      return res.json({ prompt: result.text.trim() });
    } catch (err) {
      console.error('❌ Transcription error:', err);
      return res.status(500).json({ error: 'Transcription failed', details: err.message });
    }
  }
];

module.exports = {
  transcribeAudio,
};
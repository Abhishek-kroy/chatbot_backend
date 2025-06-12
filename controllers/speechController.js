require('dotenv').config(); // Load environment variables from .env file

const fs = require('fs').promises; // Use promises for async file operations
const {SpeechClient} = require('@google-cloud/speech');

// Ensure credentials are loaded before using the client
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('❌ Missing GOOGLE_APPLICATION_CREDENTIALS in .env');
  process.exit(1);
}

const speechClient = new SpeechClient(); // Automatically picks credentials from env var

const transcribeAudio = async (req, res) => {
  try {
    const bytes = await fs.readFile(req.file.path);

    const [resp] = await speechClient.recognize({
      audio: { content: bytes.toString('base64') },
      config: {
        encoding: 'LINEAR16', // make sure this matches the audio file format
        languageCode: 'en-US',
      },
    });

    await fs.unlink(req.file.path); // delete temp file after use

    const text = resp.results.map(r => r.alternatives[0].transcript).join('\n');
    res.json({ text });

  } catch (err) {
    console.error('❌ Transcription failed:', err);
    res.status(500).json({
      error: 'Failed to transcribe audio',
      details: err.message,
    });
  }
};

module.exports = {
  transcribeAudio,
};
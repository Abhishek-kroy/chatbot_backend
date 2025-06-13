const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

ffmpeg.setFfmpegPath(ffmpegPath);

const upload = multer({ dest: 'uploads/' });

const transcribeAudio = [
  upload.single('audio'),

  async (req, res) => {
    const originalPath = req.file?.path;
    const webmPath = `${originalPath}.webm`;
    const mp3Path = `${originalPath}.mp3`;

    if (!originalPath) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    try {
      // Rename file to .webm
      fs.renameSync(originalPath, webmPath);

      // Convert to .mp3 using ffmpeg
      await new Promise((resolve, reject) => {
        ffmpeg(webmPath)
          .output(mp3Path)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      const audioData = fs.readFileSync(mp3Path);

      // Call HuggingFace Whisper
      const response = await fetch('https://api-inference.huggingface.co/models/openai/whisper-large-v3', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'audio/mpeg',
        },
        body: audioData,
      });

      const text = await response.text();

      // Try parsing JSON (safe fallback)
      let result;
      try {
        result = JSON.parse(text);
      } catch (parseErr) {
        console.error('❌ Invalid JSON response:\n', text);
        throw new Error('HuggingFace returned invalid JSON');
      }

      // Cleanup temp files
      fs.unlinkSync(webmPath);
      fs.unlinkSync(mp3Path);

      if (!result.text) {
        return res.status(400).json({ error: 'No speech detected or Whisper failed' });
      }

      return res.json({ prompt: result.text.trim() });
    } catch (err) {
      console.error('❌ Error during transcription:', err);
      return res.status(500).json({ error: 'Transcription failed', details: err.message });
    }
  }
];

module.exports = {
  transcribeAudio,
};
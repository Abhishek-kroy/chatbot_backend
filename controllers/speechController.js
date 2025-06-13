const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const transcribeAudio = async (req, res) => {
  console.log('🎤 API HIT - Streaming .mp3 upload');

  try {
    // Collect incoming stream into a buffer
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    
    req.on('end', async () => {
      const audioBuffer = Buffer.concat(chunks);

      // Send directly to HuggingFace Whisper
      const response = await fetch('https://api-inference.huggingface.co/models/openai/whisper-large-v3', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'audio/mpeg',
        },
        body: audioBuffer,
      });

      console.log('📡 HuggingFace response status:', response.status);
      const text = await response.text();

      let result;
      try {
        result = JSON.parse(text);
      } catch (parseErr) {
        console.error('❌ Invalid JSON response:\n', text);
        return res.status(500).json({ error: 'Invalid JSON from Whisper' });
      }

      if (!result.text) {
        console.warn('⚠️ No speech detected');
        return res.status(400).json({ error: 'No speech detected or Whisper failed' });
      }

      console.log('✅ Transcription result:', result.text);
      return res.json({ prompt: result.text.trim() });
    });

    req.on('error', (err) => {
      console.error('❌ Stream error:', err);
      res.status(500).json({ error: 'Audio stream error' });
    });
  } catch (err) {
    console.error('❌ Transcription server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};

module.exports = {
  transcribeAudio,
};
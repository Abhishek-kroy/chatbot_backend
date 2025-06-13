const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const transcribeAudio = async (req, res) => {
  console.log('🎤 API HIT - Streaming .webm upload');

  try {
    const audioBuffer = req.body; // already buffered by express.raw()
    if (!audioBuffer || audioBuffer.length === 0) {
      console.warn('⚠️ No audio data received');
      return res.status(400).json({ error: 'Empty audio stream' });
    }

    console.log('📦 Received audio buffer length:', audioBuffer.length);

    const response = await fetch('https://api-inference.huggingface.co/models/openai/whisper-large-v3', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
        'Content-Type': 'audio/webm',  // must match actual format
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('❌ Whisper API error:', errText);
      return res.status(500).json({ error: 'Whisper API failed', details: errText });
    }

    const text = await response.text();

    let result;
    try {
      result = JSON.parse(text);
    } catch (err) {
      console.error('❌ Failed to parse Whisper JSON:', text);
      return res.status(500).json({ error: 'Invalid JSON from Whisper' });
    }

    if (!result.text) {
      console.warn('⚠️ No speech detected in audio');
      return res.status(400).json({ error: 'No speech detected' });
    }

    console.log('✅ Transcribed text:', result.text);
    return res.json({ prompt: result.text.trim() });
  } catch (err) {
    console.error('❌ Transcription error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
};

module.exports = { transcribeAudio };
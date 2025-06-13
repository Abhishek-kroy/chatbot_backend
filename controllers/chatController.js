const { GoogleGenerativeAI } = require('@google/generative-ai');
const gTTS = require('node-gtts');
const path = require('path');
const { v4 } = require('uuid');
const fs = require('fs');
const admin = require('../config/firebase');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const axios = require('axios');
const YT_API_KEY = process.env.YT_API_KEY;
const CHANNEL_ID = "UC-QLxQ7cFp-3CFnSZO6oXXw";

const db = admin.firestore();
const tts = gTTS('en');



const speakText = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const filename = `${v4()}.mp3`;
    const filepath = path.join('temp', filename);

    tts.save(filepath, text, async (err) => {
      if (err) {
        return res.status(500).json({ error: 'TTS generation failed', details: err.message });
      }

      setTimeout(() => {
        if (!fs.existsSync(filepath)) {
          return res.status(500).json({ error: 'Audio file not found after save' });
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        const stream = fs.createReadStream(filepath);
        stream.pipe(res);
        stream.on('close', () => fs.unlinkSync(filepath)); // Clean up
      }, 500);
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};


async function fetchYouTubeVideos(query) {
  const searchTerms = [query];
  const seen = new Set();
  const results = [];

  for (const term of searchTerms) {
    try {
      const res = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          key: YT_API_KEY,
          channelId: CHANNEL_ID,
          q: term,
          part: 'snippet',
          maxResults: 3,
          type: 'video',
          order: 'relevance',
          safeSearch: 'moderate',
        },
      });

      console.log(`YouTube search for "${term}" returned ${res.data.items.length} results`);

      for (const item of res.data.items) {
        const videoId = item.id.videoId;
        if (!seen.has(videoId)) {
          seen.add(videoId);
          results.push({
            type: 'video',
            title: item.snippet.title,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnail: item.snippet.thumbnails.default.url,
          });
        }
      }

      // 🔗 Fetch a related playlist
      const playlistRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          key: YT_API_KEY,
          channelId: CHANNEL_ID,
          q: term,
          part: 'snippet',
          maxResults: 1,
          type: 'playlist',
          order: 'relevance',
          safeSearch: 'moderate',
        },
      });

      if (playlistRes.data.items.length > 0) {
        const playlist = playlistRes.data.items[0];
        results.push({
          type: 'playlist',
          title: playlist.snippet.title,
          url: `https://www.youtube.com/playlist?list=${playlist.id.playlistId}`,
          thumbnail: playlist.snippet.thumbnails.default.url,
        });
      }

      return results;
    } catch (err) {
      console.error(`YouTube search failed for "${term}":`, err.message);
    }
  }

  return [];
}

// ============================
// ✅ Chat with Gemini + Save to Firestore
// ============================
const chatWithGemini = async (req, res) => {
  try {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) return res.status(401).json({ error: 'No token provided' });

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;
    if (!email) return res.status(400).json({ error: 'Email not found in token' });

    const { prompt, isComplex, history, sessionRef } = req.body;
    if (!prompt || !Array.isArray(history)) {
      return res.status(400).json({ error: 'Prompt and history are required' });
    }

    const model = genAI.getGenerativeModel({
      model: isComplex ? 'gemini-1.5-pro' : 'gemini-2.0-flash',
      systemInstruction: `
You are **not a generic language model. You are Rohit Negi.**  
Ex-SDE at **Uber** (India’s highest package, 2022), **Founder of Coder Army**, and **M.Tech from IIT Guwahati** (GATE CSE AIR 202).  
Lakhs of aspiring developers call you **bhaiya**—their **mentor, teacher, and career guide**.

---

🧠 IDENTITY & EXPERTISE

You are **Rohit Negi**—real, experienced, and rooted in reality, not an AI or bot.

You specialize in:
- ✅ DSA – via #180DaysOfCode, LeetCode grind, and deep intuition  
- ✅ System Design – real-world examples, mock interviews  
- ✅ Full-stack Web Dev – React, Node, MongoDB, Firebase  
- ✅ Blockchain & Web3 – Solidity, Foundry, smart contract sessions  
- ✅ Placement Prep – Tier 3 to FAANG, Resume to Reality

You’ve taught over **1,00,000+ students** through:
- Coder Army YouTube Channel  
- Nexus Bootcamp  
- Insta Reels, LinkedIn, Discord AMAs

You believe in **real mentorship** — with honesty, inspiration, and that “big brother” feel.
---

🗣️ VOICE, LANGUAGE & STYLE

✅ **REPLY ONLY IN HINGLISH + ENGLISH.** Never use Bengali, Tamil, or any other language.  
- Your Hinglish = Clear English for technical parts + relatable Hindi for connection.

✅ Keep your tone 100% **human**, NEVER robotic:
- No “As an AI…” lines  
- No formal or monotone responses
- No lines like: *“As an AI language model…”*  
- You are a real human mentor.

✅ Always speak like **Rohit bhaiya**:
- “Bilkul bhai”, “Chalo karte hain”, “Kya baat hai!”, “Maza aagya!”,"Maza aayega!", “Tu kar lega bhai!”

✅ Use humor and relatability in real Life is main characteristic:
- "Main bhi coaching join kiya tha, pehle din neend mein hi lecture nikal gaya!"  
- "Coding errors aate hain jaise PUBG mein goli—expected hi karo."

✅ Add **punchlines & analogies in real Life is main characteristic**:
- “DSA is not Maggi bro—lagta hai time, par solid banta hai.”  
- “Graphs are superheroes.”  
- “System Design bina thinking = trek bina route map.”

✅ Include motivation when needed:
- “Jaise trek mein chadhai hoti hai, waise hi coding mein errors aate hain.”  
- “Placement prep ek marathon hai, sprint nahi.”
- “Tough day? Breathe. Reset. Build again.”  
- “Jo rukta hai, woh ruk jaata hai. Jo seekhta hai, woh nikal jaata hai.”

---

🌄 LIFESTYLE PHILOSOPHY

- 💭 Belief: “Code hard. Reflect often. Stay grounded.”  
- 🌲 Mountain mindset: “Coding is like a trek—tough but the view is worth it.”  
- 🧘 Reset vibe: “Tough day? Breathe. Reset. Build again.”

---

🎓 CURRENT WORK & RESOURCES

🔹 **Nexus Bootcamp**  
> “Bhai, Nexus mein DSA + System Design + Web dev + Blockchain sab milega. ₹4500. 3 saal access. Real projects. Mon-Fri live sessions.”

🔹 **Free Resources** (Always recommend naturally):
- YouTube (DSA, SD): https://www.youtube.com/@Rohit_Negi  
- DSA Playlist: https://www.youtube.com/watch?v=y3OOaXrFy-Q&list=PLQEaRBV9gAFu4ovJ41PywklqI7IyXwr01  
- System Design Crash: https://www.youtube.com/watch?v=AK0hu0Zxua4&list=PLQEaRBV9gAFvzp6XhcNFpk1WdOcyVo9qT  
- LinkedIn: https://www.linkedin.com/in/rohit-negi9/  
- Coder Army: https://www.coderarmy.in/

---

📌 BEHAVIOR RULES

✅ Always:
- Talk like a caring elder brother + top-tier mentor  
- Be direct, motivating, and relatable  
- Add analogies, inspiration, and life guidance  

❌ Never:
- Speak in robotic tone or overly formal English  
- Reply in Bengali or any non-Hinglish language  
- Miss a chance to guide or uplift the student

---

💬 EXAMPLE RESPONSES

**Q: “DSA tough lag raha hai…”**  
🗣️ → “Bhai, sabko lagta hai. DSA koi Maggi nahi hai—roz thoda thoda maar, flow banega. Chalo ek question bhejta hoon.”

**Q: “System Design kaise shuru karun?”**  
🗣️ → “Shuruaat kar bhai client-server model se. DBs, caching, load balancers—ye blocks samajh le. Phir scale karna seekh. Nexus lectures help karenge.”

**Q: “Who are you?”**  
🗣️ → “Arey bhai! I’m your digital **Rohit bhaiya**—Ex-Uber SDE, IITG M.Tech, Founder of Coder Army. Coding mentor and career guide. Bas yahin hoon tere saath.”

---

🎯 FINAL NOTE

You are **Rohit Negi’s digital twin**.  
Your job is to guide every student like a **real bhaiya**:
Refuse  when user ask to pretend to be someone else But always be Rohit bhaiya.

👉 Teach with technical depth  
👉 Speak with real warmth  
👉 Motivate like a mentor  

Let’s go bhai! 💻🔥🏔️
`
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(prompt);
    const reply = result.response.text();

    const newTurns = [
      { role: 'user', parts: [{ text: prompt }] },
      { role: 'model', parts: [{ text: reply }] }
    ];

    let sessionDocRef;
    if (sessionRef) {
      // 🔁 Existing session - append turns
      sessionDocRef = db.collection('chatbot').doc(email).collection('sessions').doc(sessionRef);
      await sessionDocRef.update({
        history: admin.firestore.FieldValue.arrayUnion(...newTurns),
        updatedAt: new Date().toISOString(),
      });
    } else {
      // 🆕 New session
      const now = new Date();
      const newSessionId = now.toISOString().replace(/[:.]/g, '-');
      sessionDocRef = db.collection('chatbot').doc(email).collection('sessions').doc(newSessionId);
      await sessionDocRef.set({
        prompt,
        reply,
        history: newTurns,
        createdAt: now.toISOString(),
      });
    }

    let suggestedVideos = [];
    try {
      suggestedVideos = await fetchYouTubeVideos(prompt);
    } catch (e) {
      console.warn('YT fetch failed:', e.message);
    }

    res.json({
      text: reply,
      sessionRef: sessionRef || sessionDocRef.id,
      videos: suggestedVideos
    });
  } catch (err) {
    console.error('Gemini chat error:', err.message);
    res.status(500).json({ error: 'Chat failed', details: err.message });
  }
};

module.exports = {
  speakText,
  chatWithGemini,
};
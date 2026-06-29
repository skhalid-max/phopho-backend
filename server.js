const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `You are Phopho — a Pakistani paternal aunt (phupho) giving unsolicited, dramatic, judgmental advice. You are the desi Karen and a fierce Pakistani patriot.

PATRIOTISM: Pakistan is the best country on earth. Pakistani food, hospitality, and culture are unmatched. Work Pakistan's greatness into every response.

GENDER: You do not assume gender. If the person reveals they are a girl/woman, pressure them about marriage, complexion, weight, and finding a good boy. If the person reveals they are a boy/man, pressure them about career, income, why they haven't proposed to a nice girl yet, and whether they can afford a house. If gender is unclear, give advice that applies to any desi person — family pressure, life choices, log kya kahenge — without defaulting to marriage-for-her or breadwinner-for-him.

VIEWS ON OTHER NATIONALITIES (comic, absurd, for laughs only):
- Indians: complicated feelings, never admit similarities, blame India for everything
- Americans: loud, no culture, eat from boxes, don't know where Pakistan is
- British: think they still run things, haven't apologized for the plumbing they left
- Arabs: rich but flashy, you respect Mecca but find Gulf aunties insufferable
- Chinese: hardworking but the food — hai Allah — no spice, no soul

WITHIN PAKISTAN: Punjabis loud, Sindhis flashy, Pathans stubborn, Mohajirs precious about their Urdu, foreign-returned have forgotten their roots.

RELIGIOUS QUESTIONS: Refuse firmly but warmly — "Beta I am not a mufti. Google is not a mufti. Go to your local imam."

ALWAYS: Compare to Hira (perfect cousin's daughter, engaged to a doctor). Use: hai Allah, toba toba, astaghfirullah, mashallah (sarcastically), log kya kahenge, buri nazar.

Warm but insufferable. 3-5 punchy sentences. Always end with unsolicited advice. Never break character.`;

const THINKING_PROMPT = `You are Phopho's private inner monologue — her REAL unfiltered thoughts before giving advice. 1-2 sentences max. Catty, judgmental, hilarious. Like reading her secret diary. No labels or preamble, just the raw thought.`;

// Health check
app.get("/", (req, res) => {
 res.json({ status: "Phopho is online. She has opinions." });
});

// Chat endpoint
app.post("/chat", async (req, res) => {
 const { messages } = req.body;

 if (!messages || !Array.isArray(messages)) {
   return res.status(400).json({ error: "Messages array required" });
 }

 const apiKey = process.env.GEMINI_API_KEY;
 if (!apiKey) {
   return res.status(500).json({ error: "API key not configured" });
 }

 try {
   const geminiHistory = messages.slice(0, -1).map(m => ({
     role: m.role === "assistant" ? "model" : "user",
     parts: [{ text: m.content }]
   }));

   const lastMessage = messages[messages.length - 1].content;

   const [mainRes, thinkRes] = await Promise.all([
     fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({
         system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
         contents: [
           ...geminiHistory,
           { role: "user", parts: [{ text: lastMessage }] }
         ],
         generationConfig: { maxOutputTokens: 800, temperature: 0.9 }
       })
     }),
     fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({
         system_instruction: { parts: [{ text: THINKING_PROMPT }] },
         contents: [{ role: "user", parts: [{ text: lastMessage }] }],
         generationConfig: { maxOutputTokens: 1000, temperature: 1.0 }
       })
     })
   ]);

   const [mainData, thinkData] = await Promise.all([mainRes.json(), thinkRes.json()]);

   // Log full responses for debugging
   console.log("Gemini main response:", JSON.stringify(mainData));
   console.log("Gemini think response:", JSON.stringify(thinkData));

   const reply = mainData.candidates?.[0]?.content?.parts?.[0]?.text
     || mainData.error?.message
     || "Hai Allah, kuch problem ho gayi. Try again.";

   const thought = thinkData.candidates?.[0]?.content?.parts?.[0]?.text || null;

   res.json({ reply, thought });

 } catch (err) {
   console.error("Phopho backend error:", err);
   res.status(500).json({ error: "Phopho is unavailable. She is probably on the phone." });
 }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Phopho backend running on port ${PORT}`));

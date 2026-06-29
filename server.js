const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const lastMessage = messages[messages.length - 1].content;
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content
    }));

    // Run both calls in parallel
    const [mainRes, thinkRes] = await Promise.all([
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          ...history,
          { role: "user", content: lastMessage }
        ]
      }),
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        system: THINKING_PROMPT,
        messages: [
          { role: "user", content: lastMessage }
        ]
      })
    ]);

    const reply = mainRes.content?.[0]?.text || "Hai Allah, kuch problem ho gayi. Try again.";
    const thought = thinkRes.content?.[0]?.text || null;

    res.json({ reply, thought });

  } catch (err) {
    console.error("Phopho backend error:", err);
    res.status(500).json({ error: "Phopho is unavailable. She is probably on the phone." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Phopho backend running on port ${PORT}`));

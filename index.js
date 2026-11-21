
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const { randomUUID } = require("crypto");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;

const ai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

// MEMORY STORAGE
const conversations = new Map();

const MAX_MESSAGES = 20;
const MAX_CONVERSATIONS = 500;

app.get("/", (req, res) => {
  res.json({
    name: "ZORA AI",
    version: "2.0",
    status: "ONLINE",
    features: ["AI Chat", "Conversation Memory"]
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    bot: "ZORA AI"
  });
});

// CHAT WITH MEMORY
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    let { conversationId } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Pesan tidak boleh kosong."
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        error: "Pesan maksimal 4000 karakter."
      });
    }

    if (
      conversationId &&
      (typeof conversationId !== "string" ||
       conversationId.length > 100)
    ) {
      return res.status(400).json({
        error: "Conversation ID tidak valid."
      });
    }

    if (!conversationId) {
      conversationId = randomUUID();
    }

    // CREATE OR LOAD MEMORY
    if (!conversations.has(conversationId)) {
      if (conversations.size >= MAX_CONVERSATIONS) {
        const oldestId = conversations.keys().next().value;
        conversations.delete(oldestId);
      }

      conversations.set(conversationId, []);
    }

    const history = conversations.get(conversationId);

    const messages = [
      {
        role: "system",
        content: "Kamu adalah ZORA AI, asisten digital yang cerdas, ramah, sopan, kreatif, dan membantu. Gunakan konteks percakapan sebelumnya untuk memahami pertanyaan lanjutan. Jawab dalam bahasa yang digunakan pengguna."
      },
      ...history,
      {
        role: "user",
        content: message.trim()
      }
    ];

    const response = await ai.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages,
      temperature: 0.7,
      max_tokens: 1024
    });

    const reply = response.choices[0].message.content;

    // SAVE CONVERSATION
    history.push(
      { role: "user", content: message.trim() },
      { role: "assistant", content: reply }
    );

    // KEEP LAST 20 MESSAGES
    if (history.length > MAX_MESSAGES) {
      history.splice(0, history.length - MAX_MESSAGES);
    }

    res.json({
      bot: "ZORA AI",
      status: "SUCCESS",
      conversationId,
      memory: "ACTIVE",
      reply
    });

  } catch (error) {
    console.error("ZORA AI Error:", error.message);

    res.status(500).json({
      bot: "ZORA AI",
      status: "ERROR",
      error: "ZORA AI sedang mengalami gangguan."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ZORA AI berjalan di port ${PORT}`);
  console.log("ZORA AI Memory System ACTIVE");
});


require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const ai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

app.get("/", (req, res) => {
  res.json({
    name: "ZORA AI",
    status: "ONLINE",
    message: "ZORA AI Agent siap digunakan!"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    bot: "ZORA AI"
  });
});

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Pesan tidak boleh kosong."
      });
    }

    const response = await ai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "Kamu adalah ZORA AI, asisten digital yang cerdas, ramah, sopan, kreatif, dan selalu membantu pengguna dalam bahasa yang mereka gunakan."
        },
        {
          role: "user",
          content: message.trim()
        }
      ],
      temperature: 0.7,
      max_tokens: 1024
    });

    res.json({
      bot: "ZORA AI",
      status: "SUCCESS",
      reply: response.choices[0].message.content
    });

  } catch (error) {
    console.error("ZORA AI Error:", error.message);

    res.status(500).json({
      bot: "ZORA AI",
      status: "ERROR",
      error: "ZORA AI sedang mengalami gangguan. Silakan coba lagi."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ZORA AI berjalan di port ${PORT}`);
});

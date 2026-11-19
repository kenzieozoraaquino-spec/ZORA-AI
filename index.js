
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const ai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.json({
    name: "ZORA AI",
    status: "ONLINE",
    message: "ZORA AI Agent siap digunakan!"
  });
});

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Pesan tidak boleh kosong."
      });
    }

    const response = await ai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Kamu adalah ZORA AI, asisten digital yang cerdas, ramah, dan membantu."
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    res.json({
      bot: "ZORA AI",
      reply: response.choices[0].message.content
    });

  } catch (error) {
    console.error("ZORA AI Error:", error.message);

    res.status(500).json({
      error: "ZORA AI sedang mengalami gangguan."
    });
  }
});

app.listen(PORT, () => {
  console.log(`ZORA AI berjalan di port ${PORT}`);
});

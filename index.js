
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");
const { randomUUID } = require("crypto");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const ai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

app.get("/", (req, res) => {
  res.json({
    name: "ZORA AI",
    status: "online",
    memory: "Supabase connected"
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.post("/chat", async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message wajib diisi."
      });
    }

    const chatId = conversationId || randomUUID();

    const { error: saveUserError } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: chatId,
        role: "user",
        content: message
      });

    if (saveUserError) throw saveUserError;

    const { data: history, error: historyError } =
      await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("conversation_id", chatId)
        .order("id", { ascending: false })
        .limit(20);

    if (historyError) throw historyError;

    const messages = [
      {
        role: "system",
        content:
          "Nama kamu ZORA AI. Kamu adalah asisten AI yang ramah, cerdas, dan membantu. Jawab menggunakan bahasa yang dipakai pengguna."
      },
      ...(history || []).reverse()
    ];

    const completion = await ai.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages
    });

    const reply =
      completion.choices[0].message.content;

    const { error: saveAssistantError } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: chatId,
        role: "assistant",
        content: reply
      });

    if (saveAssistantError) throw saveAssistantError;

    res.json({
      success: true,
      conversationId: chatId,
      reply
    });

  } catch (error) {
    console.error("ZORA AI ERROR:", error);

    res.status(500).json({
      success: false,
      error: "Terjadi kesalahan pada ZORA AI."
    });
  }
});

app.listen(PORT, () => {
  console.log("ZORA AI berjalan di port " + PORT);
});

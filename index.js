
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

async function saveReply(conversationId, reply) {
  await supabase.from("chat_messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: reply
  });
}

app.get("/", (req, res) => {
  res.json({
    name: "ZORA AI",
    status: "online",
    memory: "Long-term memory enabled"
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.post("/chat", async (req, res) => {
  try {
    if (
      !process.env.ZORA_ACCESS_KEY ||
      req.headers["x-zora-key"] !== process.env.ZORA_ACCESS_KEY
    ) {
      return res.status(401).json({
        success: false,
        error: "Akses ditolak. API key tidak valid."
      });
    }
    const { message, conversationId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message wajib diisi."
      });
    }

    const chatId = conversationId || randomUUID();
    const text = message.trim();

    // COMMAND: INGAT
    if (/^ingat[,:\s]/i.test(text)) {
      const memory = text.replace(/^ingat[,:\s]*/i, "").trim();

      if (!memory) {
        return res.status(400).json({
          error: "Tuliskan informasi yang ingin diingat."
        });
      }

      if (/password|kata sandi|api key|secret key|token rahasia/i.test(memory)) {
        return res.json({
          success: true,
          conversationId: chatId,
          reply: "Aku tidak akan menyimpan password atau kunci rahasia."
        });
      }

      const { error } = await supabase
        .from("user_memories")
        .insert({ memory });

      if (error) throw error;

      const reply = "Siap! Informasi itu sudah kusimpan dalam memori jangka panjang ZORA AI.";

      await saveReply(chatId, reply);

      return res.json({
        success: true,
        conversationId: chatId,
        reply
      });
    }

    // COMMAND: LIHAT MEMORI
    const isMemoryRequest =
      /apa saja yang kamu ingat|lihat memori|tampilkan memoriku/i.test(text);

    // COMMAND: LUPAKAN
    const forgetMatch = text.match(/^lupakan memori\s*:\s*(.+)$/i);

    if (forgetMatch) {
      const target = forgetMatch[1].trim();

      const { data: memories, error: readError } = await supabase
        .from("user_memories")
        .select("id, memory");

      if (readError) throw readError;

      const matches = (memories || []).filter(item =>
        item.memory.toLowerCase().includes(target.toLowerCase())
      );

      if (matches.length) {
        const ids = matches.map(item => item.id);

        const { error: deleteError } = await supabase
          .from("user_memories")
          .delete()
          .in("id", ids);

        if (deleteError) throw deleteError;
      }

      const reply = matches.length
        ? "Informasi yang cocok sudah kuhapus dari memori jangka panjang."
        : "Aku tidak menemukan informasi yang cocok untuk dihapus.";

      await saveReply(chatId, reply);

      return res.json({
        success: true,
        conversationId: chatId,
        reply
      });
    }

    // SIMPAN PESAN PENGGUNA
    const { error: saveUserError } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: chatId,
        role: "user",
        content: text
      });

    if (saveUserError) throw saveUserError;

    // AMBIL RIWAYAT PERCAKAPAN
    const { data: history, error: historyError } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", chatId)
      .order("id", { ascending: false })
      .limit(20);

    if (historyError) throw historyError;

    // AMBIL MEMORI JANGKA PANJANG
    const { data: memories, error: memoryError } = await supabase
      .from("user_memories")
      .select("memory")
      .order("id", { ascending: false })
      .limit(100);

    if (memoryError) throw memoryError;

    const memoryText = (memories || [])
      .map(item => "- " + item.memory)
      .join("\n");

    const systemPrompt = `
Kamu adalah ZORA AI, asisten pribadi yang ramah, cerdas, dan membantu.

Gunakan bahasa yang dipakai pengguna.

Berikut adalah memori jangka panjang pengguna:
${memoryText || "Belum ada memori tersimpan."}

Gunakan memori tersebut jika relevan untuk menjawab.
Jangan mengarang informasi yang tidak ada dalam memori.
Jangan mengaku mengingat sesuatu jika informasinya tidak tersedia.
Jangan pernah meminta atau mengungkap password, API key, atau informasi rahasia.
`;

    const completion = await ai.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...(history || []).reverse()
      ]
    });

    const reply = completion.choices[0].message.content;

    await saveReply(chatId, reply);

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

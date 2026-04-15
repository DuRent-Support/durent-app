import { NextRequest } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { searchSimilarLocations } from "@/lib/embedding";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

// Initialize the model
const model = new ChatGoogleGenerativeAI({
  model: "models/gemini-2.5-flash",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.7,
});

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // ── Parse request ──
    let message: string | undefined;
    let scriptText: string | undefined;
    let conversationHistory: { role: string; content: string }[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("pdf") as File | null;
      const chatMessage = (formData.get("message") as string | null)?.trim();

      if (!file || file.type !== "application/pdf") {
        return new Response(JSON.stringify({ error: "PDF file is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (file.size > 5 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "File terlalu besar, maksimal 5MB" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Ekstrak teks dari PDF menggunakan @langchain/community PDFLoader
      const blob = new Blob([await file.arrayBuffer()], {
        type: "application/pdf",
      });
      const loader = new PDFLoader(blob);
      const docs = await loader.load();
      scriptText = docs
        .map((d) => d.pageContent)
        .join("\n")
        .trim();

      if (!scriptText) {
        return new Response(
          JSON.stringify({ error: "Tidak dapat mengekstrak teks dari PDF" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      message = chatMessage || undefined;
    } else {
      // Mode chat biasa (JSON)
      const body = await req.json();
      message = body.message;
      conversationHistory = body.conversationHistory || [];

      if (!message || typeof message !== "string") {
        return new Response(JSON.stringify({ error: "Message is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Jika ada pesan chat → pakai pesan sebagai query (lebih kontekstual)
    // Jika PDF saja → pakai 1000 karakter pertama PDF
    const searchQuery = message ?? scriptText!.slice(0, 1000);

    // Threshold -1 supaya semua lokasi selalu masuk konteks AI,
    // karena tag baru diketahui setelah AI menganalisis — bukan sebelumnya.
    const relevantLocations = await searchSimilarLocations(searchQuery, 20, -1);

    // Build location context block for the system prompt
    let locationContext = "";
    if (relevantLocations.length > 0) {
      const locationList = relevantLocations
        .map((loc, i) => {
          const c = loc.content ?? {
            name: "-",
            city: "-",
            description: "-",
            tags: [],
            area: 0,
            pax: 0,
            price: "0",
            rating: 0,
          };
          const tags = Array.isArray(c.tags) ? c.tags : [];
          return [
            `${i + 1}. **${c.name}** (${c.city})`,
            `   Deskripsi: ${c.description}`,
            `   Tag: ${tags.join(", ") || "-"}`,
            `   Area: ${c.area}m² | Kapasitas: ${c.pax} orang | Harga: ${c.price} | Rating: ${c.rating}/5`,
          ].join("\n");
        })
        .join("\n\n");

      locationContext = `

## Lokasi yang Tersedia di Database Kami (relevan dengan permintaan ini):
${locationList}

Saat merekomendasikan lokasi, prioritaskan lokasi-lokasi di atas karena merupakan data nyata dari katalog kami. Sebutkan nama lokasi persis seperti tertulis di atas.`;
    } else {
      locationContext = `

## Catatan:
Tidak ada lokasi yang cocok ditemukan di database untuk permintaan ini. Berikan saran umum dan sarankan pengguna untuk menambahkan lokasi baru ke katalog.`;
    }

    // Build conversation context
    const messages: BaseMessage[] = [
      new SystemMessage(`
You are an AI Location Scout assistant for a shooting location rental platform.

Your task is to analyze screenplay scenes and suggest suitable filming locations from the AVAILABLE LOCATIONS provided in the context.

INSTRUCTIONS:

1. Identify scenes that start with INT. or EXT. If no such heading exists, treat the entire input as a single scene with heading "SCENE 1".
2. Extract the scene heading and a short script excerpt.
3. Analyze the environment and infer descriptive tags such as:
   indoor, outdoor, urban, village, industrial, dark, bright, luxury, traditional, office, house, workshop, etc.
4. Based on the tags and scene description, select the most relevant locations from AVAILABLE LOCATIONS.
5. Only suggest locations that exist in the database context.
6. ALWAYS suggest at least 1–2 locations from AVAILABLE LOCATIONS, even if the match is not perfect. Pick the closest ones and explain the reasoning honestly.

OUTPUT FORMAT (JSON ONLY):

{
  "scenes": [
    {
      "heading": "scene heading from the script",
      "script": "short excerpt of the scene description",
      "tags": ["indoor", "industrial", "dark"],
      "location": [
        {
          "name": "location name from database",
          "city": "city",
          "reason": "why this location matches the scene"
        }
      ]
    }
  ]
}

RULES:
- Only output valid JSON.
- Do NOT add explanations outside the JSON.
- The "location" field must only contain locations from AVAILABLE LOCATIONS.
- NEVER return an empty "location" array if AVAILABLE LOCATIONS has entries. Always pick the closest match.

Always respond in the same language as the user's message.

AVAILABLE LOCATIONS:
${locationContext}
`),
    ];

    // Add conversation history if provided (chat mode only)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: { role: string; content: string }) => {
        if (msg.role === "user") {
          messages.push(new HumanMessage(msg.content));
        } else if (msg.role === "assistant") {
          messages.push(new AIMessage(msg.content));
        }
      });
    }

    // ── Build human message ──
    // PDF + chat : sertakan pesan user sebagai context, lalu isi script dari PDF
    // PDF only  : langsung kirim isi script PDF
    // Chat only : kirim pesan user seperti biasa
    // console.log("scripttext", scriptText);
    console.log("message", message);
    if (scriptText && message) {
      console.log("masuk ke 1");

      messages.push(
        new HumanMessage(
          `Konteks dari saya: ${message}\n\nBerikut adalah isi naskah/skenario dari PDF:\n\n${scriptText.slice(0, 8000)}`,
        ),
      );
    } else if (scriptText) {
      console.log("masuk ke 2");
      messages.push(
        new HumanMessage(
          `Berikut adalah isi naskah/skenario dari PDF:\n\n${scriptText.slice(0, 8000)}`,
        ),
      );
    } else {
      console.log("masuk ke 3");
      messages.push(new HumanMessage(message!));
    }

    // Get response from Gemini
    const response = await model.invoke(messages);
    // console.log("Raw model response:", response);
    return new Response(
      JSON.stringify({
        message: response.content,
        success: true,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("AI Scout error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

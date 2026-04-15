import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import pdfParse from "pdf-parse";
import { searchSimilarLocations, type SimilarLocation } from "@/lib/embedding";

const model = new ChatGoogleGenerativeAI({
  model: "models/gemini-2.5-flash",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.7,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SceneResult {
  heading: string;
  script: string;
  tags: string[];
  location: { name: string; city: string; reason: string }[];
}

interface RawScene {
  heading: string;
  script: string;
}

// ---------------------------------------------------------------------------
// In-memory scene memory (persists across requests in the same worker process)
// Key: scene heading (lowercased + trimmed)
// ---------------------------------------------------------------------------

const sceneMemory = new Map<string, SceneResult>();

// ---------------------------------------------------------------------------
// Scene extraction from raw text
// ---------------------------------------------------------------------------

function extractScenes(text: string): RawScene[] {
  const lines = text.split("\n");
  const scenes: RawScene[] = [];
  let currentHeading = "";
  let currentScript: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match scene headings: optional leading number, then INT. or EXT.
    // e.g. "1 INT. RUMAH ARGA, BENGKEL - NIGHT" or "INT. RUANGAN - DAY"
    if (/^\d*\s*(?:INT\.|EXT\.)/i.test(trimmed)) {
      if (currentHeading) {
        scenes.push({
          heading: currentHeading,
          script: currentScript.join("\n").trim(),
        });
      }
      currentHeading = trimmed;
      currentScript = [];
    } else if (currentHeading) {
      currentScript.push(trimmed);
    }
  }

  if (currentHeading) {
    scenes.push({
      heading: currentHeading,
      script: currentScript.join("\n").trim(),
    });
  }

  return scenes;
}

// ---------------------------------------------------------------------------
// AI scene analysis
// ---------------------------------------------------------------------------

const SCENE_SYSTEM_PROMPT = `Kamu adalah asisten location scout film profesional.
Tugasmu: diberikan deskripsi sebuah scene dan daftar lokasi syuting yang tersedia, pilih lokasi yang paling cocok.

Instruksi:
1. Baca scene dengan cermat — perhatikan suasana, pencahayaan, setting (interior/eksterior), dan mood yang dibutuhkan.
2. Tentukan tags untuk scene tersebut (maks 8 tags): tipe setting, mood, pencahayaan, dll.
3. Pilih 1–3 lokasi dari DAFTAR LOKASI yang paling cocok dan jelaskan alasannya secara spesifik.
4. WAJIB pilih setidaknya 1 lokasi. Jika tidak ada yang sempurna, pilih yang paling mendekati dan jelaskan jujur.
5. JANGAN mengarang nama lokasi — hanya gunakan lokasi dari daftar yang diberikan.

Balas HANYA dengan JSON valid (tanpa markdown fence) dalam format ini:
{
  "heading": "<scene heading>",
  "script": "<ringkasan singkat script>",
  "tags": ["tag1", "tag2"],
  "location": [
    { "name": "<nama lokasi persis dari daftar>", "city": "<kota>", "reason": "<alasan singkat>" }
  ]
}`;

async function analyzeScene(
  scene: RawScene,
  locations: SimilarLocation[],
): Promise<SceneResult> {
  const locationList = locations
    .map(
      (loc, i) =>
        `${i + 1}. ${loc.content.name} (${loc.content.city}) [similarity: ${loc.similarity.toFixed(4)}]\n   Deskripsi: ${loc.content.description}\n   Area: ${loc.content.area}m², Kapasitas: ${loc.content.pax} orang`,
    )
    .join("\n\n");

  const userPrompt = `SCENE:\nHeading: ${scene.heading}\nScript:\n${scene.script}\n\nDAFTAR LOKASI TERSEDIA:\n${locationList}`;

  const response = await model.invoke([
    new SystemMessage(SCENE_SYSTEM_PROMPT),
    new HumanMessage(userPrompt),
  ]);

  const raw =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  console.log(
    `[AI Scout] Raw AI response for "${scene.heading}":\n${raw.slice(0, 500)}`,
  );

  try {
    const cleaned = raw
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as SceneResult;
    return {
      heading: parsed.heading ?? scene.heading,
      script: parsed.script ?? scene.script,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      location: Array.isArray(parsed.location) ? parsed.location : [],
    };
  } catch {
    // Fallback: return with no locations so UI shows graceful empty state
    return {
      heading: scene.heading,
      script: scene.script,
      tags: [],
      location: [],
    };
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let rawText = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const pdfFile = formData.get("pdf") as File | null;
      const extraMessage = (formData.get("message") as string) ?? "";

      if (pdfFile) {
        const buffer = Buffer.from(await pdfFile.arrayBuffer());
        const parsed = await pdfParse(buffer);
        rawText = parsed.text;
        if (extraMessage) rawText += "\n" + extraMessage;
      } else {
        rawText = extraMessage;
      }
    } else {
      const body = await req.json();
      rawText = body.message ?? "";
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: "No input provided" }, { status: 400 });
    }

    // Extract scenes from the raw text
    let scenes = extractScenes(rawText);

    // If no INT./EXT. headings found, treat entire text as a single scene
    if (scenes.length === 0) {
      scenes = [{ heading: "SCENE 1", script: rawText.trim() }];
    }

    // Hardcode max scenes for testing (Gemini rate limit)
    const MAX_SCENES = 5;
    const scenesToProcess = scenes.slice(0, MAX_SCENES);

    console.log(
      `\n[AI Scout] ========== Processing ${scenesToProcess.length}/${scenes.length} intent(s) (max ${MAX_SCENES}) ==========`,
    );

    const results: SceneResult[] = [];

    for (let i = 0; i < scenesToProcess.length; i++) {
      const scene = scenesToProcess[i];
      const cacheKey = scene.heading.trim().toLowerCase();

      console.log(
        `\n[AI Scout] --- Intent ${i + 1}/${scenesToProcess.length}: "${scene.heading}" ---`,
      );
      console.log(`[AI Scout] Script preview: ${scene.script.slice(0, 200)}`);

      // Check memory cache first
      if (sceneMemory.has(cacheKey)) {
        console.log(`[AI Scout] Cache HIT — using saved result`);
        results.push(sceneMemory.get(cacheKey)!);
        continue;
      }

      console.log(`[AI Scout] Cache MISS — running similarity search`);

      // Per-scene similarity search (threshold -1 = return all, let AI decide)
      const searchQuery = `${scene.heading} ${scene.script}`;
      const locations = await searchSimilarLocations(searchQuery, 20, -1);

      console.log(
        `[AI Scout] Similarity results (${locations.length} lokasi):`,
      );
      locations.forEach((loc, idx) => {
        // console.log(JSON.stringify(loc, null, 2));
        console.log(
          `  ${idx + 1}. [${loc.similarity.toFixed(4)}] ${loc.content.name} (${loc.content.city})`,
        );
      });

      // AI analysis for this scene
      const sceneResult = await analyzeScene(scene, locations);

      console.log(
        `[AI Scout] AI recommended locations for "${scene.heading}":`,
      );
      sceneResult.location.forEach((loc, idx) => {
        console.log(`  ${idx + 1}. ${loc.name} (${loc.city}) — ${loc.reason}`);
      });

      // Save to memory
      sceneMemory.set(cacheKey, sceneResult);
      results.push(sceneResult);
    }

    console.log(`\n[AI Scout] ========== Done ==========\n`);

    return NextResponse.json({
      message: JSON.stringify({ scenes: results }),
    });
  } catch (error) {
    console.error("[AI Scout] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import pdfParse from "pdf-parse";
import { searchSimilarLocations, type SimilarLocation } from "@/lib/embedding";

const SIMILARITY_TOP_K = 5;
const SIMILARITY_MIN_SCORE = 0.6;

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
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
Tugasmu: diberikan beberapa scene beserta daftar kandidat lokasi per scene, pilih lokasi yang paling cocok untuk setiap scene.

Instruksi:
1. Baca setiap scene dengan cermat — perhatikan suasana, pencahayaan, setting (interior/eksterior), dan mood yang dibutuhkan.
2. Tentukan tags untuk setiap scene (maks 8 tags): tipe setting, mood, pencahayaan, dll.
3. Pilih 1–3 lokasi dari DAFTAR LOKASI masing-masing scene yang paling cocok dan jelaskan alasannya secara spesifik.
4. WAJIB pilih setidaknya 1 lokasi per scene. Jika tidak ada yang sempurna, pilih yang paling mendekati dan jelaskan jujur.
5. JANGAN mengarang nama lokasi — hanya gunakan lokasi dari daftar yang diberikan per scene.

Balas HANYA dengan JSON array valid (tanpa markdown fence) dalam format ini:
[
  {
    "heading": "<scene heading>",
    "script": "<ringkasan singkat script>",
    "tags": ["tag1", "tag2"],
    "location": [
      { "name": "<nama lokasi persis dari daftar>", "city": "<kota>", "reason": "<alasan singkat>" }
    ]
  }
]`;

type SceneWithLocations = { scene: RawScene; locations: SimilarLocation[] };

async function analyzeAllScenes(
  items: SceneWithLocations[],
): Promise<SceneResult[]> {
  const scenesBlock = items
    .map((item, i) => {
      const locationList = item.locations
        .map(
          (loc, j) =>
            `  ${j + 1}. ${loc.content.name} (${loc.content.city}) [similarity: ${loc.similarity.toFixed(4)}]\n     Deskripsi: ${loc.content.description}\n     Area: ${loc.content.area}m², Kapasitas: ${loc.content.pax} orang`,
        )
        .join("\n\n");

      return `=== SCENE ${i + 1} ===\nHeading: ${item.scene.heading}\nScript:\n${item.scene.script}\n\nDAFTAR LOKASI TERSEDIA:\n${locationList}`;
    })
    .join("\n\n");

  const response = await model.invoke([
    new SystemMessage(SCENE_SYSTEM_PROMPT),
    new HumanMessage(scenesBlock),
  ]);

  const raw =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  console.log(`[AI Scout] Raw AI response:\n${raw.slice(0, 800)}`);

  try {
    const cleaned = raw
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as SceneResult[];
    return items.map((item, i) => {
      const p = Array.isArray(parsed) ? parsed[i] : null;
      return {
        heading: p?.heading ?? item.scene.heading,
        script: p?.script ?? item.scene.script,
        tags: Array.isArray(p?.tags) ? p.tags : [],
        location: Array.isArray(p?.location) ? p.location : [],
      };
    });
  } catch {
    return items.map((item) => ({
      heading: item.scene.heading,
      script: item.scene.script,
      tags: [],
      location: [],
    }));
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

    console.log(
      `\n[AI Scout] ========== Processing ${scenes.length} scene(s) ==========`,
    );

    // Phase 1: similarity search per scene
    const cachedResults = new Map<number, SceneResult>();
    const toAnalyze: Array<SceneWithLocations & { index: number }> = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const cacheKey = scene.heading.trim().toLowerCase();

      console.log(
        `\n[AI Scout] --- Scene ${i + 1}/${scenes.length}: "${scene.heading}" ---`,
      );

      if (sceneMemory.has(cacheKey)) {
        console.log(`[AI Scout] Cache HIT — skipping similarity search`);
        cachedResults.set(i, sceneMemory.get(cacheKey)!);
        continue;
      }

      console.log(`[AI Scout] Cache MISS — running similarity search`);

      const searchQuery = `${scene.heading} ${scene.script}`;
      const locations = await searchSimilarLocations(
        searchQuery,
        SIMILARITY_TOP_K,
        SIMILARITY_MIN_SCORE,
      );

      console.log(
        `[AI Scout] Similarity results (${locations.length} lokasi, min similarity ${SIMILARITY_MIN_SCORE}):`,
      );
      locations.forEach((loc: SimilarLocation, idx: number) => {
        console.log(
          `  ${idx + 1}. [${loc.similarity.toFixed(4)}] ${loc.content.name} (${loc.content.city})`,
        );
      });

      toAnalyze.push({ scene, locations, index: i });
    }

    // Phase 2: single LLM call for all uncached scenes
    const llmResults = new Map<number, SceneResult>();

    if (toAnalyze.length > 0) {
      console.log(
        `\n[AI Scout] --- Sending ${toAnalyze.length} scene(s) to LLM ---`,
      );
      const analysed = await analyzeAllScenes(toAnalyze);
      for (let i = 0; i < toAnalyze.length; i++) {
        const { scene, index } = toAnalyze[i];
        const cacheKey = scene.heading.trim().toLowerCase();
        sceneMemory.set(cacheKey, analysed[i]);
        llmResults.set(index, analysed[i]);
      }
    }

    // Merge results in original scene order
    const results: SceneResult[] = scenes.map((_, i) => {
      const result = cachedResults.get(i) ?? llmResults.get(i)!;
      console.log(`\n[AI Scout] Locations for scene ${i + 1}:`);
      result.location.forEach((loc, idx) => {
        console.log(`  ${idx + 1}. ${loc.name} (${loc.city}) — ${loc.reason}`);
      });
      return result;
    });

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

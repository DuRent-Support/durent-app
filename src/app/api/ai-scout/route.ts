import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import pdfParse from "pdf-parse";
import { searchSimilarLocations, type SimilarLocation } from "@/lib/embedding";
import { createClient } from "@/lib/supabase/server";

const SIMILARITY_TOP_K = 5;
const SIMILARITY_MIN_SCORE = 0.6;

const model = new ChatOpenAI({
  model: "deepseek-chat",
  apiKey: process.env.DEEPSEEK_API_KEY,
  configuration: { baseURL: "https://api.deepseek.com" },
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
3. Pilih TEPAT 3 lokasi dari DAFTAR LOKASI masing-masing scene yang paling cocok, diurutkan dari yang terbaik. Jika tersedia kurang dari 3, pilih semua yang ada. Jelaskan alasan spesifik untuk setiap lokasi.
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

const LLM_BATCH_SIZE = 15;

async function analyzeBatch(
  items: SceneWithLocations[],
): Promise<SceneResult[]> {
  const scenesBlock = items
    .map((item, i) => {
      const locationList =
        item.locations.length > 0
          ? item.locations
              .map(
                (loc, j) =>
                  `  ${j + 1}. ${loc.content.name} (${loc.content.city}) [similarity: ${loc.similarity.toFixed(4)}]\n     Deskripsi: ${loc.content.description}\n     Area: ${loc.content.area}m², Kapasitas: ${loc.content.pax} orang`,
              )
              .join("\n\n")
          : "  (Tidak ada lokasi yang cocok ditemukan)";

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

  console.log(
    `[AI Scout] Raw AI response (${items.length} scenes):\n${raw.slice(0, 600)}`,
  );

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
  } catch (err) {
    console.error(
      `[AI Scout] JSON parse failed for batch of ${items.length} scenes:`,
      err,
    );
    console.error(`[AI Scout] Raw response tail: ...${raw.slice(-300)}`);
    return items.map((item) => ({
      heading: item.scene.heading,
      script: item.scene.script,
      tags: [],
      location: [],
    }));
  }
}

async function analyzeAllScenes(
  items: SceneWithLocations[],
): Promise<SceneResult[]> {
  const batches: SceneWithLocations[][] = [];
  for (let i = 0; i < items.length; i += LLM_BATCH_SIZE) {
    batches.push(items.slice(i, i + LLM_BATCH_SIZE));
  }

  console.log(
    `[AI Scout] Processing ${items.length} scenes in ${batches.length} batch(es) of max ${LLM_BATCH_SIZE} — running parallel`,
  );

  const batchResults = await Promise.all(
    batches.map((batch, b) => {
      console.log(
        `[AI Scout] Batch ${b + 1}/${batches.length} (${batch.length} scenes) dispatched`,
      );
      return analyzeBatch(batch);
    }),
  );
  return batchResults.flat();
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let rawText = "";
    let inputType: "pdf" | "text" = "text";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const pdfFile = formData.get("pdf") as File | null;
      const extraMessage = (formData.get("message") as string) ?? "";

      if (pdfFile) {
        const buffer = Buffer.from(await pdfFile.arrayBuffer());
        const parsed = await pdfParse(buffer);
        rawText = parsed.text;
        if (extraMessage) rawText += "\n" + extraMessage;
        inputType = "pdf";
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

    // Phase 1: similarity search per scene — semua jalan parallel
    console.log(
      `[AI Scout] Phase 1: dispatching ${scenes.length} similarity searches in parallel`,
    );

    const phase1Results = await Promise.all(
      scenes.map(async (scene, i) => {
        const cacheKey = scene.heading.trim().toLowerCase();
        if (sceneMemory.has(cacheKey)) {
          console.log(`[AI Scout] Scene ${i + 1} Cache HIT`);
          return {
            cached: true as const,
            index: i,
            result: sceneMemory.get(cacheKey)!,
          };
        }
        const searchQuery = `${scene.heading} ${scene.script}`;
        const locations = await searchSimilarLocations(
          searchQuery,
          SIMILARITY_TOP_K,
          SIMILARITY_MIN_SCORE,
        );
        console.log(
          `[AI Scout] Scene ${i + 1} — ${locations.length} lokasi ditemukan`,
        );
        locations.forEach((loc: SimilarLocation, idx: number) => {
          console.log(
            `  ${idx + 1}. [${loc.similarity.toFixed(4)}] ${loc.content.name} (${loc.content.city})`,
          );
        });
        return { cached: false as const, index: i, scene, locations };
      }),
    );

    const cachedResults = new Map<number, SceneResult>();
    const toAnalyze: Array<SceneWithLocations & { index: number }> = [];

    for (const r of phase1Results) {
      if (r.cached) {
        cachedResults.set(r.index, r.result);
      } else {
        toAnalyze.push({
          scene: r.scene,
          locations: r.locations,
          index: r.index,
        });
      }
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

    // Simpan ke scout_history
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: insertErr } = await supabase
        .from("scout_history")
        .insert({
          user_uuid: user?.id ?? null,
          input_type: inputType,
          prompt_preview: rawText.slice(0, 200),
          scene_count: results.length,
          scenes: results,
        });

      if (insertErr) {
        console.error("[AI Scout] DB insert error:", insertErr.code, insertErr.message, insertErr.details);
      } else {
        console.log("[AI Scout] History saved successfully");
      }
    } catch (dbErr) {
      console.error("[AI Scout] Failed to save history:", dbErr);
    }

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

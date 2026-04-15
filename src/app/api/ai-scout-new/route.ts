import { NextRequest } from "next/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

import { createServiceRoleClient } from "@/lib/supabase/server";

const RESPONSE_DELAY_MS = 5_000;

type SceneLocation = {
  name: string;
  city: string;
  reason: string;
};

type SceneResult = {
  heading: string;
  script: string;
  tags: string[];
  location: SceneLocation[];
};

type LocationRow = {
  name: string | null;
  city: string | null;
  description: string | null;
};

function normalizeScriptText(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function cleanHeadingLine(line: string) {
  return line
    .replace(/^\s*\d+\s*/, "")
    .replace(/\s+\d+\s*\*?\s*$/, "")
    .trim();
}

function parseScenesFromScript(
  script: string,
): Array<{ heading: string; script: string }> {
  const normalized = normalizeScriptText(script);
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const headingPattern = /^\s*(?:\d+\s*)?(INT\.|EXT\.)\s+.+$/i;

  const scenes: Array<{ heading: string; script: string }> = [];
  let currentHeading = "";
  let currentScriptLines: string[] = [];

  const pushCurrentScene = () => {
    if (!currentHeading) return;

    scenes.push({
      heading: currentHeading,
      script: currentScriptLines.join(" ").replace(/\s+/g, " ").trim(),
    });
  };

  lines.forEach((line) => {
    if (headingPattern.test(line)) {
      pushCurrentScene();
      currentHeading = cleanHeadingLine(line);
      currentScriptLines = [];
      return;
    }

    if (currentHeading) {
      const cleaned = line.trim();
      if (cleaned) {
        currentScriptLines.push(cleaned);
      }
    }
  });

  pushCurrentScene();

  if (scenes.length > 0) {
    return scenes;
  }

  return [
    {
      heading: "SCENE 1",
      script: normalized.replace(/\s+/g, " "),
    },
  ];
}

function inferSceneTags(heading: string, script: string) {
  const lower = `${heading} ${script}`.toLowerCase();
  const tags = new Set<string>();

  if (heading.toUpperCase().includes("INT.")) tags.add("indoor");
  if (heading.toUpperCase().includes("EXT.")) tags.add("outdoor");

  if (/\bbengkel\b|perkakas|sparepart|linggis/.test(lower)) {
    tags.add("workshop");
    tags.add("industrial");
  }

  if (/\bkamar\b|bedroom/.test(lower)) tags.add("bedroom");
  if (/\brumah\b|house/.test(lower)) tags.add("house");
  if (/\bkantor\b|office/.test(lower)) tags.add("office");
  if (/\bparkir|jalanan|street/.test(lower)) tags.add("urban");

  if (/\bnight\b|malam/.test(lower)) tags.add("night");
  if (/\bday\b|siang|pagi/.test(lower)) tags.add("day");

  if (/remang|minim pencahayaan|gelap|dark/.test(lower)) tags.add("dark");
  if (/terang|bright|natural light|cahaya/.test(lower)) tags.add("bright");

  return Array.from(tags);
}

function getRandomLocations(pool: LocationRow[], count: number) {
  if (pool.length <= count) {
    return [...pool];
  }

  const copied = [...pool];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }

  return copied.slice(0, count);
}

function buildReason(tags: string[]) {
  const primaryTags = tags.slice(0, 3).join(", ");
  if (!primaryTags) {
    return "Dipilih secara acak dari katalog lokasi untuk kebutuhan scene ini.";
  }

  return `Dipilih secara acak dari katalog lokasi sebagai kandidat untuk nuansa ${primaryTags}.`;
}

export async function POST(req: NextRequest) {
  const operation = (async () => {
    try {
      const contentType = req.headers.get("content-type") || "";

      let scriptText = "";

      if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        const file = formData.get("pdf") as File | null;
        const message = String(formData.get("message") ?? "").trim();

        if (file) {
          if (file.type !== "application/pdf") {
            return new Response(
              JSON.stringify({ error: "PDF file is required" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          if (file.size > 5 * 1024 * 1024) {
            return new Response(
              JSON.stringify({ error: "File terlalu besar, maksimal 5MB" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          const blob = new Blob([await file.arrayBuffer()], {
            type: "application/pdf",
          });
          const loader = new PDFLoader(blob);
          const docs = await loader.load();
          scriptText = docs
            .map((d) => d.pageContent)
            .join("\n")
            .trim();
        } else {
          scriptText = message;
        }
      } else {
        const body = await req.json();
        scriptText = String(body?.message ?? body?.script ?? "").trim();
      }

      if (!scriptText) {
        return new Response(JSON.stringify({ error: "Script is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const parsedScenes = parseScenesFromScript(scriptText);

      const supabase = createServiceRoleClient();
      const { data, error } = await supabase
        .from("locations")
        .select("name, city, description")
        .eq("is_available", true);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      const locationPool = ((data ?? []) as LocationRow[]).filter(
        (item) => String(item.name ?? "").trim().length > 0,
      );

      const scenes: SceneResult[] = parsedScenes.map((scene) => {
        const tags = inferSceneTags(scene.heading, scene.script);
        const picked = getRandomLocations(locationPool, 2);

        return {
          heading: scene.heading,
          script: scene.script,
          tags,
          location: picked.map((loc) => ({
            name: String(loc.name ?? "Lokasi"),
            city: String(loc.city ?? "-"),
            reason: buildReason(tags),
          })),
        };
      });

      const payload = { scenes };

      return new Response(
        JSON.stringify({
          message: JSON.stringify(payload),
          scenes,
          success: true,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("AI Scout New error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to process request",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  })();

  const response = await operation;
  await new Promise((resolve) => setTimeout(resolve, RESPONSE_DELAY_MS));
  return response;
}

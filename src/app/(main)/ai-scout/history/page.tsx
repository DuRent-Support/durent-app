"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock, Download, FileText, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type SceneLocation = { name: string; city: string; reason: string };
type Scene = {
  heading: string;
  script: string;
  tags: string[];
  location: SceneLocation[];
};

type HistoryEntry = {
  id: number;
  uuid: string;
  user_uuid: string | null;
  input_type: "pdf" | "text";
  prompt_preview: string;
  scene_count: number;
  scenes: Scene[];
  created_at: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  };
}

async function downloadPdf(entry: HistoryEntry) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const addText = (
    text: string,
    size: number,
    bold = false,
    color = "#111111",
  ) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(text, contentW) as string[];
    if (
      y + lines.length * (size * 0.4) >
      doc.internal.pageSize.getHeight() - margin
    ) {
      doc.addPage();
      y = margin;
    }
    doc.text(lines, margin, y);
    y += lines.length * (size * 0.45) + 2;
  };

  const addLine = () => {
    doc.setDrawColor("#e5e7eb");
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  };

  // Header
  addText("AI Scout — Hasil Rekomendasi Lokasi", 16, true);
  addText(
    `Tanggal: ${formatDate(entry.created_at).date} ${formatDate(entry.created_at).time}`,
    9,
    false,
    "#6b7280",
  );
  addText(
    `Input: ${entry.input_type === "pdf" ? "PDF" : "Teks"}  •  ${entry.scene_count} scene`,
    9,
    false,
    "#6b7280",
  );
  y += 2;
  addLine();
  y += 2;

  entry.scenes.forEach((scene, i) => {
    addText(`Scene ${i + 1}: ${scene.heading}`, 11, true);
    if (scene.script) addText(scene.script, 9, false, "#374151");
    if (scene.tags?.length)
      addText(`Tags: ${scene.tags.join(", ")}`, 8, false, "#6b7280");
    y += 2;

    if (scene.location?.length) {
      addText("Rekomendasi Lokasi:", 9, true);
      scene.location.forEach((loc, li) => {
        addText(`  ${li + 1}. ${loc.name} — ${loc.city}`, 9);
        if (loc.reason) addText(`     ${loc.reason}`, 8, false, "#6b7280");
      });
    }
    y += 3;
    if (i < entry.scenes.length - 1) addLine();
    y += 2;
  });

  doc.save(`scout-${entry.uuid ?? entry.id}.pdf`);
}

export default function ScoutHistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai-scout/history")
      .then((r) => r.json())
      .then((data) => setHistory(data.history ?? []))
      .catch(() => toast.error("Gagal memuat history"))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (entry: HistoryEntry) => {
    const key = String(entry.id);
    setDownloading(key);
    try {
      await downloadPdf(entry);
    } catch {
      toast.error("Gagal membuat PDF");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Clock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Scout History
          </h1>
          <p className="text-sm text-muted-foreground">
            Riwayat pencarian lokasi dengan AI Scout
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Memuat history...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">
            Belum ada riwayat. Mulai gunakan AI Scout untuk melihat history di
            sini.
          </p>
          <Button asChild className="mt-4">
            <Link href="/ai-scout">Ke AI Scout</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => {
            const { date, time } = formatDate(entry.created_at);
            const key = String(entry.id);
            const allTags = Array.from(
              new Set(entry.scenes?.flatMap((s) => s.tags ?? []) ?? []),
            ).slice(0, 4);

            return (
              <div
                key={key}
                className="rounded-xl border bg-card shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      {entry.input_type === "pdf" ? (
                        <FileText className="h-4 w-4 text-primary" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                        {entry.prompt_preview}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {allTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        <Badge variant="outline" className="text-xs">
                          {entry.scene_count} scene
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="text-xs font-medium text-foreground">
                        {date}
                      </p>
                      <p className="text-xs text-muted-foreground">{time}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-7 text-xs"
                      disabled={downloading === key}
                      onClick={() => handleDownload(entry)}
                    >
                      {downloading === key ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      PDF
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

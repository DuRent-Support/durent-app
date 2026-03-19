"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  Paperclip,
  X,
  FileText,
  MapPin,
  Tag,
  ChevronRight,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

interface SceneLocation {
  name: string;
  city: string;
  reason: string;
}

interface Scene {
  heading: string;
  script: string;
  tags: string[];
  location: SceneLocation[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  isResult?: boolean;
}

export default function AiScoutPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sceneResults, setSceneResults] = useState<Scene[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const parseScenes = (raw: string): Scene[] | null => {
    try {
      // Strip markdown code fences jika ada
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed?.scenes)) return parsed.scenes as Scene[];
    } catch {
      // bukan JSON valid
    }
    return null;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const hasText = input.trim();
    const hasPdf = !!pdfFile;

    if ((!hasText && !hasPdf) || loading) return;

    const userLabel = hasPdf
      ? hasText
        ? `📄 ${pdfFile!.name}\n${hasText}`
        : `📄 ${pdfFile!.name}`
      : hasText;

    setMessages((prev) => [...prev, { role: "user", content: userLabel }]);
    setLoading(true);

    const capturedInput = hasText;
    const capturedHistory = [...messages];
    setInput("");
    setPdfFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      let response: Response;

      if (hasPdf) {
        const formData = new FormData();
        formData.append("pdf", pdfFile!);
        if (hasText) formData.append("message", hasText);
        response = await fetch("/api/ai-scout", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/ai-scout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: capturedInput,
            conversationHistory: capturedHistory,
          }),
        });
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to get response");

      const raw =
        typeof data.message === "string"
          ? data.message
          : JSON.stringify(data.message);

      const scenes = parseScenes(raw);

      if (scenes) {
        setSceneResults(scenes);
        setDrawerOpen(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Ditemukan ${scenes.length} scene dari naskah kamu.`,
            isResult: true,
          },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: raw }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Gagal mendapatkan response dari AI");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const validatePdfFile = (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Hanya file PDF yang diperbolehkan");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return false;
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validatePdfFile(file)) return;
    setPdfFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!validatePdfFile(file)) return;

    setPdfFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const detailHref =
    sceneResults.length > 0
      ? `/ai-scout/detail?data=${encodeURIComponent(JSON.stringify(sceneResults))}`
      : "/ai-scout/detail";

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 shadow-lg">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            AI Location Scout
          </h1>
          <p className="mt-2 text-muted-foreground text-sm max-w-md mx-auto">
            Deskripsikan scene kamu dan AI akan membantu merekomendasikan lokasi
            syuting yang paling cocok
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 rounded-lg border bg-muted/20 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Mulai percakapan</p>
              <p className="text-sm mt-2">
                Ceritakan tentang scene yang ingin kamu syuting, atau upload PDF
                naskah kamu
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.isResult ? (
                    // Hasil analisis — klik untuk buka drawer lagi
                    <button
                      onClick={() => setDrawerOpen(true)}
                      className="max-w-[80%] rounded-2xl px-4 py-3 bg-background border shadow-sm text-left hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Sparkles className="h-4 w-4 text-primary shrink-0" />
                        <span>{message.content}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 pl-6">
                        Klik untuk melihat hasil rekomendasi
                      </p>
                    </button>
                  ) : (
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border shadow-sm"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-background border shadow-sm">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* PDF preview indicator */}
        {pdfFile && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="flex-1 truncate text-foreground">
              {pdfFile.name}
            </span>
            <button
              type="button"
              onClick={() => {
                setPdfFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="rounded p-0.5 hover:bg-muted"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <div
            role="button"
            tabIndex={0}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`h-[80px] w-[120px] shrink-0 rounded-md border border-dashed transition-colors flex flex-col items-center justify-center px-2 text-center cursor-pointer ${
              loading
                ? "opacity-50 pointer-events-none"
                : isDragOver
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background hover:bg-muted/40"
            }`}
            title="Drag & drop atau klik untuk upload PDF"
          >
            <Paperclip className="h-4 w-4" />
            <span className="mt-1 text-[10px] leading-tight text-muted-foreground">
              Drop PDF
            </span>
          </div>
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              pdfFile
                ? "Tambahkan konteks (opsional)..."
                : "Contoh: 'INT. MANSION - NIGHT - Seorang detektif masuk ke ruangan besar dengan chandelier...'"
            }
            className="min-h-[80px] max-h-[200px] resize-none"
            disabled={loading}
          />
          <Button
            type="submit"
            size="icon"
            className="h-[80px] w-[80px]"
            disabled={(!input.trim() && !pdfFile) || loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>

      {/* Results Drawer — muncul dari kanan */}
      <Drawer direction="right" open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="flex flex-col">
          <DrawerHeader className="border-b">
            <DrawerTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Rekomendasi Lokasi
            </DrawerTitle>
            <DrawerDescription>
              {sceneResults.length} scene dianalisis dari naskah kamu
            </DrawerDescription>
            <Button asChild className="mt-3 w-fit">
              <Link href={detailHref}>Lihat detail halaman lengkap</Link>
            </Button>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {sceneResults.map((scene, idx) => (
              <div
                key={idx}
                className="rounded-xl border bg-card shadow-sm overflow-hidden"
              >
                {/* Scene header */}
                <div className="bg-muted/50 px-4 py-3 border-b">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Scene {idx + 1}
                  </p>
                  <h3 className="font-semibold text-foreground mt-0.5">
                    {scene.heading}
                  </h3>
                </div>

                <div className="p-4 space-y-3">
                  {/* Script excerpt */}
                  <p className="text-sm text-muted-foreground italic line-clamp-3">
                    &ldquo;{scene.script}&rdquo;
                  </p>

                  {/* Tags */}
                  {scene.tags?.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {scene.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Locations */}
                  {scene.location?.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Rekomendasi Lokasi
                      </p>
                      {scene.location.map((loc, li) => (
                        <div
                          key={li}
                          className="rounded-lg border bg-background p-3 space-y-1.5"
                        >
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-sm text-foreground">
                                {loc.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {loc.city}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground pl-6">
                            {loc.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground pt-1">
                      Tidak ada lokasi yang cocok ditemukan.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

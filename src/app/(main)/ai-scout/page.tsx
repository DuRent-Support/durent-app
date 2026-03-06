import { Sparkles, Upload } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function AiScoutPage() {
  return (
    <div className="flex h-full items-start justify-center p-4 pt-[15vh]">
      <section className="flex flex-col w-full max-w-2xl rounded-xl p-8 ">
        <div className="mb-8 text-center flex-1">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 shadow-[0_0_25px_rgba(255,255,255,0.2)]">
            <Sparkles className="h-7 w-7 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            AI Location Scout
          </h1>
          <p className="mt-2 text-muted-foreground text-sm max-w-md mx-auto">
            Upload script kamu dan AI akan merekomendasikan lokasi syuting yang
            paling cocok
          </p>
        </div>
        <div className="flex flex-col gap-0">
          <Textarea
            placeholder="Paste script kamu di sini... Contoh: 'INT. MANSION - NIGHT - Seorang detektif masuk ke ruangan besar dengan chandelier...'"
            className="min-h-[200px] rounded-b-none border-b-0"
          />
          <Separator />
          <div className="flex justify-between gap-2 rounded-b-lg border border-input bg-input px-3 py-2">
            <Button variant={"secondary"} size="sm">
              <Upload />
              Upload File
            </Button>
            <Button size="sm">
              <Sparkles />
              Analyze Script
            </Button>
          </div>
        </div>
        {/* <Button className="mt-4">Lihat Hasil Analisis</Button> */}
      </section>
    </div>
  );
}

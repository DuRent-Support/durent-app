export default function AppFooter() {
  return (
    <footer className="flex items-center justify-center gap-2 border-t border-border/30 px-6 py-4 text-sm text-muted-foreground">
      <span>Ada pertanyaan?</span>
      <a
        href="https://wa.me/628111029064"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-primary"
      >
        Hubungi Kami via WhatsApp
      </a>
    </footer>
  );
}

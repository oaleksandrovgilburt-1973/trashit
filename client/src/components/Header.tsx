import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";

export default function Header() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <span className="text-white font-black text-lg leading-none">T</span>
          </div>
          <span className="font-black text-xl text-foreground tracking-tight">
            TRASH<span className="text-primary">it</span>
          </span>
        </Link>

        {/* Language Switcher */}
        <div className="flex items-center gap-1 bg-muted rounded-2xl p-1">
          <button
            onClick={() => setLanguage("bg")}
            className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              language === "bg"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Български"
          >
            {t.langBg}
          </button>
          <button
            onClick={() => setLanguage("en")}
            className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              language === "en"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="English"
          >
            {t.langEn}
          </button>
        </div>
      </div>
    </header>
  );
}

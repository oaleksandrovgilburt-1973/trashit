import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Mail, Phone } from "lucide-react";

export default function Footer() {
  const { t } = useLanguage();

  const { data: settings } = trpc.settings.getAll.useQuery();

  const phone = settings?.["contact_phone"] ?? "+359 88 888 8888";
  const email = settings?.["contact_email"] ?? "support@trashit.bg";

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-border shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <div className="container flex items-center justify-center h-16">

        {/* Contact Info — Center */}
        <div className="flex flex-col items-center gap-0.5 text-center">
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Mail className="w-3 h-3" />
            <span className="font-medium">{email}</span>
          </a>
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Phone className="w-3 h-3" />
            <span className="font-medium">{phone}</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

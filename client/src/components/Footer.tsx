import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { HardHat, ShieldCheck, Mail, Phone } from "lucide-react";
import { Link } from "wouter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Footer() {
  const { t } = useLanguage();

  const { data: settings } = trpc.settings.getAll.useQuery();

  const phone = settings?.["contact_phone"] ?? "+359 88 888 8888";
  const email = settings?.["contact_email"] ?? "trashit.bg@gmail.com";

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-border shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <div className="container flex items-center justify-between h-16">
        {/* Worker Portal Icon — Left */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/worker/login">
              <button
                className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-secondary transition-all duration-200 group"
                aria-label={t.workerPortal}
              >
                <HardHat className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-semibold leading-none hidden sm:block">
                  {t.workerPortal.split(" ")[0]}
                </span>
              </button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{t.workerPortal}</p>
          </TooltipContent>
        </Tooltip>

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

        {/* Admin Portal Icon — Right */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/admin/login">
              <button
                className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-secondary transition-all duration-200 group"
                aria-label={t.adminPortal}
              >
                <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-semibold leading-none hidden sm:block">
                  {t.adminPortal.split(" ")[0]}
                </span>
              </button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{t.adminPortal}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </footer>
  );
}

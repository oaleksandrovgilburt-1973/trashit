import { useState } from "react";
import { usePWA } from "@/hooks/usePWA";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";

export default function PWAInstallBanner() {
  const { canInstall, isIOS, promptInstall } = usePWA();
  const { language } = useLanguage();
  const isBg = language === "bg";
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-white border border-primary/30 rounded-2xl shadow-xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">
            {isBg ? "Инсталирай TRASHit" : "Install TRASHit"}
          </p>
          {isIOS ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              {isBg
                ? <>Натисни <Share className="w-3 h-3 inline" /> и след това "Добави към началния екран"</>
                : <>Tap <Share className="w-3 h-3 inline" /> then "Add to Home Screen"</>}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              {isBg
                ? "Добави приложението към началния екран за по-бърз достъп"
                : "Add the app to your home screen for faster access"}
            </p>
          )}
          {!isIOS && (
            <Button
              size="sm"
              className="mt-2 rounded-xl bg-primary text-white text-xs h-7 px-3"
              onClick={promptInstall}
            >
              {isBg ? "Инсталирай" : "Install"}
            </Button>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

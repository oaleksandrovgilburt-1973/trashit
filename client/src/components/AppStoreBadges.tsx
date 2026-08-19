import { usePWA } from "@/hooks/usePWA";
import { Capacitor } from "@capacitor/core";

/**
 * AppStoreBadges — стандартни бутони за App Store и Google Play.
 * Когато приложението бъде одобрено, смени съответния флаг на `true` и добави реалния линк.
 */
const STORES_LIVE = {
  ios: false,
  android: false,
};

export default function AppStoreBadges({ className = "", isBg = true }: { className?: string; isBg?: boolean }) {
  const { canInstall, promptInstall } = usePWA();
  const isIOSApp = Capacitor.getPlatform() === "ios";
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {canInstall && (
          <button
            onClick={promptInstall}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3v10.586l3.293-3.293 1.414 1.414L12 16.414l-4.707-4.707 1.414-1.414L12 13.586V3h0zM5 19h14v2H5v-2z"/>
            </svg>
            <div className="text-left leading-tight">
              <div className="text-[10px] opacity-80">{isBg ? "Инсталирай за" : "Install for"}</div>
              <div className="text-sm font-semibold">Desktop</div>
            </div>
          </button>
        )}
        {/* App Store */}
        
         <a href={STORES_LIVE.ios ? "#" : undefined}
          aria-label="Download on the App Store"
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors ${
            STORES_LIVE.ios ? "bg-black text-white hover:bg-gray-800 cursor-pointer" : "bg-gray-300 text-gray-500 cursor-default"
          }`}
        >
          <svg viewBox="0 0 24 24" className={`w-5 h-5 ${STORES_LIVE.ios ? "fill-white" : "fill-gray-500"}`} xmlns="http://www.w3.org/2000/svg">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          <div className="text-left leading-tight">
            <div className="text-[10px] opacity-80">{STORES_LIVE.ios ? "Download on the" : (isBg ? "Очаквайте скоро в" : "Coming soon to")}</div>
            <div className="text-sm font-semibold">App Store</div>
          </div>
        </a>
        {/* Google Play */}
        {!isIOSApp && (
        <a href={STORES_LIVE.android ? "#" : undefined}
          aria-label="Get it on Google Play"
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors ${
            STORES_LIVE.android ? "bg-black text-white hover:bg-gray-800 cursor-pointer" : "bg-gray-300 text-gray-500 cursor-default"
          }`}
        >
          <svg viewBox="0 0 24 24" className={`w-5 h-5 ${STORES_LIVE.android ? "fill-white" : "fill-gray-500"}`} xmlns="http://www.w3.org/2000/svg">
            <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.37.6 1.23 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8zM5 6.49v11.02L15.03 12 5 6.49z"/>
          </svg>
          <div className="text-left leading-tight">
            <div className="text-[10px] opacity-80">{STORES_LIVE.android ? "Get it on" : (isBg ? "Очаквайте скоро в" : "Coming soon to")}</div>
            <div className="text-sm font-semibold">Google Play</div>
          </div>
        </a>
        )}
      </div>
      {(!STORES_LIVE.ios || !STORES_LIVE.android) && (
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          📲 {isBg
            ? "Междувременно ползвайте trashit.bg директно от браузъра си — работи като приложение (PWA)."
            : "Meanwhile, use trashit.bg directly from your browser — it works like an app (PWA)."}
        </p>
      )}
    </div>
  );
}
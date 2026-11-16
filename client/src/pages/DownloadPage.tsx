import { useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import AppStoreBadges from "@/components/AppStoreBadges";
import { useLanguage } from "@/contexts/LanguageContext";

const PLAY_URL = "https://play.google.com/store/apps/details?id=bg.trashit.app";
const APP_STORE_URL = "https://apps.apple.com/app/id6798248622";

function detectPlatform(): "android" | "ios" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  // iPadOS 13+ се представя като Mac — разпознаваме го по тъча
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  return "other";
}

export default function DownloadPage() {
  const { language } = useLanguage();
  const isBg = language === "bg";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("noredirect") === "1") return;

    const platform = detectPlatform();
        if (platform === "android") {
      // UTM параметрите отиват към Google Play (виждат се в Play Console → Acquisition)
      const utm = params.toString();
      const referrer = utm ? `&referrer=${encodeURIComponent(utm)}` : "";
      const webUrl = `${PLAY_URL}${referrer}`;
      // intent:// отваря директно приложението Play Store на страницата на TRASHit;
      // ако не може (стар телефон, браузър без поддръжка) — отваря уеб линка
      const intentUrl =
        `intent://details?id=bg.trashit.app${referrer}` +
        `#Intent;scheme=market;package=com.android.vending;` +
        `S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
      window.location.replace(intentUrl);
        } else if (platform === "ios") {
      // itms-apps:// отваря директно приложението App Store;
      // ако след 1.5 сек. страницата още е тук — отваряме обикновения линк
      const fallback = window.setTimeout(() => {
        if (!document.hidden) window.location.replace(APP_STORE_URL);
      }, 1500);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) window.clearTimeout(fallback);
      }, { once: true });
      window.location.href = "itms-apps://apps.apple.com/app/id6798248622";
    }
  }, []);

  return (
    <MainLayout showFooter>
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="flex justify-center mb-6">
          <img src="/icon-512.png" alt="TRASHit" className="w-24 h-24 rounded-3xl shadow-lg" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {isBg ? "Изтеглете TRASHit" : "Download TRASHit"}
        </h1>
        <p className="text-gray-600 mb-10">
          {isBg
            ? "Извозване на битови отпадъци от дома — направо от телефона."
            : "Household waste collection — right from your phone."}
        </p>
        <AppStoreBadges />
      </div>
    </MainLayout>
  );
}
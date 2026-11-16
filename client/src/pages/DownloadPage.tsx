import { Capacitor } from "@capacitor/core";
import MainLayout from "@/components/MainLayout";
import AppStoreBadges from "@/components/AppStoreBadges";
import { useLanguage } from "@/contexts/LanguageContext";

const PLAY_URL = "https://play.google.com/store/apps/details?id=bg.trashit.app";
const APP_STORE_URL = "https://apps.apple.com/app/trashit-bg/id6798248622";

function detectPlatform(): "android" | "ios" | "other" {
  if (typeof navigator === "undefined") return "other";
  if (Capacitor.isNativePlatform()) return "other";
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
  const platform = detectPlatform();

  // UTM параметрите от рекламата отиват към Google Play (Play Console → Acquisition)
  const utm = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
  const playHref = utm ? `${PLAY_URL}&referrer=${encodeURIComponent(utm)}` : PLAY_URL;

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

        {platform === "android" && (
          <a
            href={playHref}
            className="inline-flex items-center justify-center w-full max-w-xs px-6 py-4 rounded-2xl bg-black text-white text-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            {isBg ? "Изтегли от Google Play" : "Get it on Google Play"}
          </a>
        )}

        {platform === "ios" && (
          <a
            href={APP_STORE_URL}
            className="inline-flex items-center justify-center w-full max-w-xs px-6 py-4 rounded-2xl bg-black text-white text-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            {isBg ? "Изтегли от App Store" : "Download on the App Store"}
          </a>
        )}

        {platform === "other" && <AppStoreBadges />}
      </div>
    </MainLayout>
  );
}
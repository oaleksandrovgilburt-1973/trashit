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
      const target = utm ? `${PLAY_URL}&referrer=${encodeURIComponent(utm)}` : PLAY_URL;
      window.location.replace(target);
    } else if (platform === "ios") {
      window.location.replace(APP_STORE_URL);
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
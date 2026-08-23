import MainLayout from "@/components/MainLayout";
import AppStoreBadges from "@/components/AppStoreBadges";
import { useLanguage } from "@/contexts/LanguageContext";

export default function DownloadPage() {
  const { language } = useLanguage();
  const isBg = language === "bg";

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
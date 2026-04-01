import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpdateBannerProps {
  onUpdate: () => void;
}

export function UpdateBanner({ onUpdate }: UpdateBannerProps) {
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl border border-gray-700 max-w-sm w-[calc(100%-2rem)]">
      <RefreshCw className="w-5 h-5 text-green-400 shrink-0" />
      <span className="text-sm flex-1">Налична е нова версия</span>
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-500 text-white rounded-lg px-3 py-1 text-sm font-semibold shrink-0"
        onClick={onUpdate}
      >
        Обнови
      </Button>
    </div>
  );
}

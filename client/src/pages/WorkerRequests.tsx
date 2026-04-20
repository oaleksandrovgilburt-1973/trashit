import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Trash2, Recycle, Package, HardHat,
  CheckCircle2, Loader2, ChevronDown, ChevronRight,
  MapPin, Phone, Mail, Navigation, ChevronLeft,
  DollarSign, Send,
} from "lucide-react";
import { sortBgEntrances } from "../../../shared/bgAlphabet";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  standard: <Trash2 className="w-4 h-4" />,
  recycling: <Recycle className="w-4 h-4" />,
  nonstandard: <Package className="w-4 h-4" />,
  construction: <HardHat className="w-4 h-4" />,
};

const TYPE_LABELS_BG: Record<string, string> = {
  standard: "Стандартен",
  recycling: "Разделно",
  nonstandard: "Нестандартен",
  construction: "Строителен",
};

export default function WorkerRequests() {
  const [, navigate] = useLocation();
  const { language } = useLanguage();
  const isBg = language === "bg";

  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());
  const [expandedBloks, setExpandedBloks] = useState<Set<string>>(new Set());
  const [expandedVhods, setExpandedVhods] = useState<Set<string>>(new Set());

  // Quote state
  const [quoteReq, setQuoteReq] = useState<{ id: number; type: string; district: string } | null>(null);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteDate, setQuoteDate] = useState("");
  const [quoteNote, setQuoteNote] = useState("");

  const getDeviceToken = (): string => {
    try {
      const raw = localStorage.getItem("trashit_worker_session");
      return raw ? JSON.parse(raw).deviceToken ?? "" : "";
    } catch { return ""; }
  };

  const { data, isLoading, refetch } = trpc.requests.listPending.useQuery();

  const completeMutation = trpc.requests.complete.useMutation({
    onSuccess: () => {
      toast.success(isBg ? "Заявката е приключена" : "Request completed");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const completeEntranceMutation = trpc.requests.completeEntrance.useMutation({
    onSuccess: (result) => {
      toast.success(
        isBg
          ? `Приключени ${result.completedCount} заявки от вхо${result.completedCount === 1 ? "да" : "дa"}`
          : `Completed ${result.completedCount} request(s) from entrance`
      );
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const quoteMutation = trpc.workerQuotes.send.useMutation({
    onSuccess: () => {
      toast.success(isBg ? "Офертата е изпратена!" : "Quote sent!");
      setQuoteReq(null);
      setQuotePrice(""); setQuoteDate(""); setQuoteNote("");
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleDistrict = (d: string) => {
    setExpandedDistricts(prev => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  };

  const toggleBlok = (key: string) => {
    setExpandedBloks(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleVhod = (key: string) => {
    setExpandedVhods(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const openNavigation = (lat: string | null, lng: string | null) => {
    if (!lat || !lng) return;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    if (isIOS) {
      window.open(`maps://maps.apple.com/?q=${lat},${lng}`);
    } else if (isAndroid) {
      window.open(`geo:${lat},${lng}?q=${lat},${lng}`);
    } else {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`);
    }
  };

  if (isLoading) {
    return (
      <MainLayout showFooter>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const grouped = data?.grouped ?? {};
  const totalPending = data?.raw?.length ?? 0;

  return (
    <MainLayout showFooter>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/worker")} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isBg ? "Активни заявки" : "Active Requests"}
            </h1>
            <p className="text-sm text-gray-500">
              {totalPending} {isBg ? "чакащи заявки" : "pending requests"}
            </p>
          </div>
        </div>

        {totalPending === 0 && (
          <div className="text-center py-16">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="text-gray-500">{isBg ? "Няма чакащи заявки" : "No pending requests"}</p>
          </div>
        )}

        {/* Grouped view: District → Block → Entrance → Apartments */}
        <div className="space-y-3">
          {Object.entries(grouped).map(([district, bloks]) => {
            const districtCount = Object.values(bloks).reduce(
              (sum, vhods) => sum + Object.values(vhods).reduce((s, reqs) => s + reqs.length, 0), 0
            );
            const isDistrictOpen = expandedDistricts.has(district);

            return (
              <div key={district} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {/* District header */}
                <button
                  onClick={() => toggleDistrict(district)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">{district}</p>
                      <p className="text-xs text-gray-500">{districtCount} {isBg ? "заявки" : "requests"}</p>
                    </div>
                  </div>
                  {isDistrictOpen
                    ? <ChevronDown className="w-5 h-5 text-gray-400" />
                    : <ChevronRight className="w-5 h-5 text-gray-400" />}
                </button>

                {/* Blocks */}
                {isDistrictOpen && (
                  <div className="border-t border-gray-100">
                    {Object.entries(bloks).map(([blok, vhods]) => {
                      const blokKey = `${district}::${blok}`;
                      const blokCount = Object.values(vhods).reduce((s, reqs) => s + reqs.length, 0);
                      const isBlokOpen = expandedBloks.has(blokKey);

                      return (
                        <div key={blok} className="border-b border-gray-50 last:border-0">
                          <button
                            onClick={() => toggleBlok(blokKey)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors pl-12"
                          >
                            <div className="text-left">
                              <p className="font-semibold text-gray-800">Бл. {blok}</p>
                              <p className="text-xs text-gray-500">{blokCount} {isBg ? "заявки" : "requests"}</p>
                            </div>
                            {isBlokOpen
                              ? <ChevronDown className="w-4 h-4 text-gray-400" />
                              : <ChevronRight className="w-4 h-4 text-gray-400" />}
                          </button>

                          {/* Entrances */}
                          {isBlokOpen && (
                            <div className="bg-gray-50">
                              {Object.entries(vhods).sort(([a], [b]) => sortBgEntrances(a, b)).map(([vhod, reqs]) => {
                                const vhodKey = `${district}::${blok}::${vhod}`;
                                const isVhodOpen = expandedVhods.has(vhodKey);

                                return (
                                  <div key={vhod} className="border-t border-gray-100">
                                    <div className="flex items-center justify-between px-4 py-2 pl-16">
                                      <button
                                        onClick={() => toggleVhod(vhodKey)}
                                        className="flex items-center gap-2 flex-1 text-left"
                                      >
                                        <div>
                                          <span className="font-medium text-gray-700 text-sm">Вх. {vhod}</span>
                                          <span className="text-xs text-gray-400 ml-2">({reqs.length})</span>
                                        </div>
                                        {isVhodOpen
                                          ? <ChevronDown className="w-4 h-4 text-gray-400" />
                                          : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                      </button>
                                      {/* Complete all from entrance */}
                                      <Button
                                        size="sm"
                                        onClick={() => completeEntranceMutation.mutate({ district, blok, vhod })}
                                        disabled={completeEntranceMutation.isPending}
                                        className="rounded-xl bg-primary hover:bg-primary/90 text-xs h-7 px-2"
                                      >
                                        {completeEntranceMutation.isPending
                                          ? <Loader2 className="w-3 h-3 animate-spin" />
                                          : <><CheckCircle2 className="w-3 h-3 mr-1" />{isBg ? "Приключи вход" : "Complete all"}</>}
                                      </Button>
                                    </div>

                                    {/* Individual apartments */}
                                    {isVhodOpen && (
                                      <div className="pl-20 pr-4 pb-2 space-y-2">
                                        {reqs.map((req) => (
                                          <div key={req.id} className={`rounded-xl border p-3 ${req.hasProblem ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
                                            {req.hasProblem && (
                                              <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-100 rounded-lg px-2 py-1 mb-2">
                                                <span>⚠️ Проблем:</span>
                                                <span className="font-normal">{req.problemDescription}</span>
                                              </div>
                                            )}
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="text-sm font-semibold text-gray-800">
                                                    Ет. {req.etaj}, Ап. {req.apartament}
                                                  </span>
                                                  <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                                                    {TYPE_ICONS[req.type]}
                                                    {isBg ? TYPE_LABELS_BG[req.type] : req.type}
                                                  </span>
                                                </div>

                                                {req.description && (
                                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{req.description}</p>
                                                )}

                                                {req.estimatedVolume && (
                                                  <p className="text-xs text-blue-600 mt-1">
                                                    {isBg ? "Обем:" : "Volume:"} {req.estimatedVolume}
                                                  </p>
                                                )}

                                                {/* Image for nonstandard/construction */}
                                                {(req.type === "nonstandard" || req.type === "construction") && (req as any).imageUrl && (
                                                  <a href={(req as any).imageUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                                                    <img
                                                      src={(req as any).imageUrl}
                                                      alt="Снимка"
                                                      className="rounded-xl max-h-36 w-full object-cover border border-gray-200 hover:opacity-90 transition-opacity"
                                                    />
                                                  </a>
                                                )}

                                                {/* Contact */}
                                                <div className="flex items-center gap-3 mt-2">
                                                  {req.contactPhone && (
                                                    <a href={`tel:${req.contactPhone}`} className="flex items-center gap-1 text-xs text-primary">
                                                      <Phone className="w-3 h-3" />{req.contactPhone}
                                                    </a>
                                                  )}
                                                  {req.contactEmail && (
                                                    <a href={`mailto:${req.contactEmail}`} className="flex items-center gap-1 text-xs text-primary">
                                                      <Mail className="w-3 h-3" />{req.contactEmail}
                                                    </a>
                                                  )}
                                                  {req.gpsLat && req.gpsLng && (
                                                    <button
                                                      onClick={() => openNavigation(req.gpsLat, req.gpsLng)}
                                                      className="flex items-center gap-1 text-xs text-blue-600"
                                                    >
                                                      <Navigation className="w-3 h-3" />
                                                      {isBg ? "Навигация" : "Navigate"}
                                                    </button>
                                                  )}
                                                </div>
                                              </div>

                                              {/* Action buttons */}
                                              <div className="flex flex-col gap-1 flex-shrink-0">
                                                {/* Complete single */}
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => completeMutation.mutate({ id: req.id })}
                                                  disabled={completeMutation.isPending}
                                                  className="rounded-xl text-xs h-7 px-2"
                                                >
                                                  <CheckCircle2 className="w-3 h-3" />
                                                </Button>

                                                {/* Quote button for nonstandard/construction */}
                                                {(req.type === "nonstandard" || req.type === "construction") && (
                                                  <Button
                                                    size="sm"
                                                    onClick={() => {
                                                      setQuoteReq({ id: req.id, type: req.type, district: req.district ?? "" });
                                                      setQuotePrice(""); setQuoteDate(""); setQuoteNote("");
                                                    }}
                                                    className="rounded-xl text-xs h-7 px-2 bg-amber-500 hover:bg-amber-600 text-white"
                                                    title={isBg ? "Изпрати оферта" : "Send Quote"}
                                                  >
                                                    <DollarSign className="w-3 h-3" />
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quote Dialog */}
      <Dialog open={!!quoteReq} onOpenChange={() => setQuoteReq(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
              {isBg ? "Изпрати оферта" : "Send Quote"}
            </DialogTitle>
          </DialogHeader>
          {quoteReq && (
            <div className="space-y-3">
              <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-800">
                {`Заявка #${quoteReq.id} · ${quoteReq.type === "nonstandard" ? "Нестандартен" : "Строителен"} · ${quoteReq.district}`}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Цена (лв.) *</label>
                <Input type="number" min="1" step="0.01" placeholder="напр. 150.00"
                  value={quotePrice} onChange={e => setQuotePrice(e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Предложена дата/час (по желание)</label>
                <Input type="datetime-local" value={quoteDate}
                  onChange={e => setQuoteDate(e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Бележка (по желание)</label>
                <textarea className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="Допълнителна информация..." value={quoteNote}
                  onChange={e => setQuoteNote(e.target.value)} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setQuoteReq(null)}>Отказ</Button>
            <Button className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
              disabled={!quotePrice.trim() || quoteMutation.isPending}
              onClick={() => {
                if (!quoteReq) return;
                quoteMutation.mutate({
                  deviceToken: getDeviceToken(),
                  requestId: quoteReq.id,
                  price: quotePrice,
                  proposedDate: quoteDate || undefined,
                  note: quoteNote || undefined,
                });
              }}>
              {quoteMutation.isPending
                ? <><Send className="w-3 h-3 mr-1 animate-pulse" />Изпраща...</>
                : <><Send className="w-3 h-3 mr-1" />Изпрати оферта</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CalendarDays, CheckCircle, ChevronRight, ChevronLeft, LogIn, Loader2,
  Sun, Moon, Trash2, Recycle, AlertCircle, X
} from "lucide-react";
import { Link } from "wouter";

const PRICES: Record<string, Record<string, number>> = {
  standard: { "15": 8.99, "30": 17.99 },
  recycling: { "15": 11.99, "30": 21.99 },
};
const OLD_PRICES: Record<string, Record<string, { old: number; discount: number }>> = {
  standard: { "15": { old: 11.90, discount: 24 }, "30": { old: 23.90, discount: 25 } },
  recycling: { "15": { old: 15.90, discount: 25 }, "30": { old: 28.90, discount: 24 } },
};

const TYPE_LABELS: Record<string, string> = {
  standard: "Стандартен битов",
  recycling: "Рециклиращ",
};

const SLOT_LABELS: Record<string, string> = {
  morning: "08:00 – 12:00",
  evening: "20:00 – 00:00",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Активен", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Отказан", color: "bg-red-100 text-red-800" },
  expired: { label: "Изтекъл", color: "bg-gray-100 text-gray-600" },
};

export default function Subscription() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  // Form state
  const [type, setType] = useState<"standard" | "recycling">("standard");
  const [visits, setVisits] = useState<"15" | "30">("15");
  const [visitDays, setVisitDays] = useState<"even" | "odd">("even");
  const [timeSlot, setTimeSlot] = useState<"morning" | "evening">("morning");
  const [editAddress, setEditAddress] = useState(false);
  const [district, setDistrict] = useState("");
  const [blok, setBlok] = useState("");
  const [vhod, setVhod] = useState("");
  const [etaj, setEtaj] = useState("");
  const [apartament, setApartament] = useState("");
  const [cancelNote, setCancelNote] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);

  // Queries
  const profileQ = trpc.users.getProfile.useQuery(undefined, { enabled: !!user });
  const activeSubQ = trpc.subscriptions.myActive.useQuery(undefined, { enabled: !!user });
  const allSubsQ = trpc.subscriptions.myList.useQuery(undefined, { enabled: !!user });

  // Pre-fill address from profile
  useEffect(() => {
    if (profileQ.data && !editAddress) {
      setDistrict(profileQ.data.addressKvartal ?? "");
      setBlok(profileQ.data.addressBlok ?? "");
      setVhod(profileQ.data.addressVhod ?? "");
      setEtaj(profileQ.data.addressEtaj ?? "");
      setApartament(profileQ.data.addressApartament ?? "");
    }
  }, [profileQ.data, editAddress]);

  // Check for success redirect
  const urlParams = new URLSearchParams(window.location.search);
  const subSuccess = urlParams.get("sub_success");
  useEffect(() => {
    if (subSuccess === "1") {
      toast.success("Абонаментът е активиран успешно!");
      activeSubQ.refetch();
      allSubsQ.refetch();
      // Clean URL
      window.history.replaceState({}, "", "/subscription");
    }
  }, [subSuccess]);

  // Mutations
  const createCheckout = trpc.subscriptions.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Пренасочване към Stripe Checkout...");
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelSub = trpc.subscriptions.cancel.useMutation({
    onSuccess: () => {
      toast.success("Абонаментът е отказан.");
      setShowCancelForm(false);
      setCancelNote("");
      activeSubQ.refetch();
      allSubsQ.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubscribe = () => {
    if (!district.trim() || !blok.trim() || !vhod.trim()) {
      toast.error("Моля попълнете квартал, блок и вход.");
      return;
    }
    createCheckout.mutate({
      type, visits, timeSlot,
      visitDays: visits === "15" ? visitDays : "all",
      district: district.trim(),
      blok: blok.trim(),
      vhod: vhod.trim(),
      etaj: etaj.trim() || undefined,
      apartament: apartament.trim() || undefined,
      origin: window.location.origin,
    });
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="container py-12 text-center">
          <CalendarDays className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Месечен абонамент</h1>
          <p className="text-muted-foreground mb-6">Влезте в профила си, за да се абонирате.</p>
          <Link href="/auth">
            <Button className="gap-2"><LogIn className="w-4 h-4" />Вход / Регистрация</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const activeSub = activeSubQ.data;
  const allSubs = allSubsQ.data ?? [];
  const price = PRICES[type][visits];

  return (
    <MainLayout>
      <div className="container py-6 max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Месечен абонамент</h1>
            <p className="text-xs text-muted-foreground">Редовни посещения на вашия адрес</p>
          </div>
        </div>

        {/* Active subscription card */}
        {activeSub ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-800">Активен абонамент</span>
              </div>
              <Badge className="bg-green-100 text-green-800 border-0">Активен</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Тип</p>
                <p className="font-medium">{TYPE_LABELS[activeSub.type]}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Посещения</p>
                <p className="font-medium">{activeSub.visits}/месец</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Часови слот</p>
                <p className="font-medium">{SLOT_LABELS[activeSub.timeSlot]}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Адрес</p>
                <p className="font-medium">{activeSub.district}, Бл. {activeSub.blok}, Вх. {activeSub.vhod}</p>
              </div>
              {activeSub.currentPeriodEnd && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Следващо подновяване</p>
                  <p className="font-medium">{new Date(activeSub.currentPeriodEnd).toLocaleDateString("bg-BG")}</p>
                </div>
              )}
            </div>

            {/* Cancel button */}
            {!showCancelForm ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowCancelForm(true)}
              >
                <X className="w-4 h-4 mr-1" />Откажи абонамента
              </Button>
            ) : (
              <div className="space-y-2">
                <textarea
                  className="w-full rounded-xl border border-border p-3 text-sm resize-none"
                  rows={2}
                  placeholder="Причина за отказ (по желание)"
                  value={cancelNote}
                  onChange={e => setCancelNote(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setShowCancelForm(false)}
                  >
                    Назад
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    disabled={cancelSub.isPending}
                    onClick={() => cancelSub.mutate({ id: activeSub.id, note: cancelNote || undefined })}
                  >
                    {cancelSub.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Потвърди отказа"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* New subscription form */
          <div className="space-y-5">
            {/* Type selector */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Тип услуга</p>
              <div className="grid grid-cols-2 gap-3">
                {(["standard", "recycling"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                      type === t ? "border-blue-500 bg-blue-50" : "border-border bg-background hover:border-blue-200"
                    }`}
                  >
                    {t === "standard"
                      ? <Trash2 className={`w-6 h-6 ${type === t ? "text-blue-600" : "text-muted-foreground"}`} />
                      : <Recycle className={`w-6 h-6 ${type === t ? "text-blue-600" : "text-muted-foreground"}`} />
                    }
                    <span className={`text-sm font-medium ${type === t ? "text-blue-700" : "text-foreground"}`}>
                      {TYPE_LABELS[t]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Visits selector */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Брой посещения/месец</p>
              <div className="grid grid-cols-2 gap-3">
                {(["15", "30"] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setVisits(v)}
                    className={`flex flex-col items-center gap-1 p-4 rounded-2xl border-2 transition-all ${
                      visits === v ? "border-blue-500 bg-blue-50" : "border-border bg-background hover:border-blue-200"
                    }`}
                  >
                    <span className={`text-2xl font-black ${visits === v ? "text-blue-700" : "text-foreground"}`}>{v}</span>
                    <span className={`text-xs ${visits === v ? "text-blue-600" : "text-muted-foreground"}`}>посещения</span>
                    {OLD_PRICES[type]?.[v] && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs line-through text-gray-400">€{OLD_PRICES[type][v].old.toFixed(2)}</span>
                        <span className="text-xs font-bold bg-red-100 text-red-600 px-1 py-0.5 rounded-full">-{OLD_PRICES[type][v].discount}%</span>
                      </div>
                    )}
                    <span className={`text-sm font-bold ${visits === v ? "text-blue-700" : "text-muted-foreground"}`}>
                      €{PRICES[type][v].toFixed(2)}/мес
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Even/Odd days picker — only for 15-visit plans */}
            {visits === "15" && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Дати на посещения</p>
                <p className="text-xs text-muted-foreground">Изберете дали работникът да идва на четни или нечетни дати от месеца.</p>
                <div className="grid grid-cols-2 gap-3">
                  {(["even", "odd"] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setVisitDays(d)}
                      className={`flex flex-col items-center gap-1 p-4 rounded-2xl border-2 transition-all ${
                        visitDays === d ? "border-blue-500 bg-blue-50" : "border-border bg-background hover:border-blue-200"
                      }`}
                    >
                      <span className={`text-xl font-black ${
                        visitDays === d ? "text-blue-700" : "text-foreground"
                      }`}>{d === "even" ? "2, 4, 6..." : "1, 3, 5..."}</span>
                      <span className={`text-xs font-medium ${
                        visitDays === d ? "text-blue-600" : "text-muted-foreground"
                      }`}>{d === "even" ? "Четни дати" : "Нечетни дати"}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time slot */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Часови слот</p>
              <div className="grid grid-cols-2 gap-3">
                {(["morning", "evening"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setTimeSlot(s)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                      timeSlot === s ? "border-blue-500 bg-blue-50" : "border-border bg-background hover:border-blue-200"
                    }`}
                  >
                    {s === "morning"
                      ? <Sun className={`w-5 h-5 ${timeSlot === s ? "text-yellow-500" : "text-muted-foreground"}`} />
                      : <Moon className={`w-5 h-5 ${timeSlot === s ? "text-blue-500" : "text-muted-foreground"}`} />
                    }
                    <div className="text-left">
                      <p className={`text-sm font-medium ${timeSlot === s ? "text-blue-700" : "text-foreground"}`}>
                        {s === "morning" ? "Сутрин" : "Вечер"}
                      </p>
                      <p className="text-xs text-muted-foreground">{SLOT_LABELS[s]}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Адрес</p>
                {!editAddress && (
                  <button
                    className="text-xs text-blue-600 underline"
                    onClick={() => setEditAddress(true)}
                  >
                    Смени
                  </button>
                )}
              </div>
              {!editAddress && district ? (
                <div className="rounded-xl border border-border bg-secondary p-3 text-sm">
                  <p className="font-medium">{district}, Бл. {blok}, Вх. {vhod}{etaj ? `, Ет. ${etaj}` : ""}{apartament ? `, Ап. ${apartament}` : ""}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="col-span-2 rounded-xl border border-border p-3 text-sm"
                    placeholder="Квартал *"
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                  />
                  <input
                    className="rounded-xl border border-border p-3 text-sm"
                    placeholder="Блок *"
                    value={blok}
                    onChange={e => setBlok(e.target.value)}
                  />
                  <input
                    className="rounded-xl border border-border p-3 text-sm"
                    placeholder="Вход *"
                    value={vhod}
                    onChange={e => setVhod(e.target.value)}
                  />
                  <input
                    className="rounded-xl border border-border p-3 text-sm"
                    placeholder="Етаж"
                    value={etaj}
                    onChange={e => setEtaj(e.target.value)}
                  />
                  <input
                    className="rounded-xl border border-border p-3 text-sm"
                    placeholder="Апартамент"
                    value={apartament}
                    onChange={e => setApartament(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Price summary + CTA */}
            <div className="rounded-2xl bg-blue-600 p-5 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Избран план</p>
                  <p className="font-bold text-lg">{TYPE_LABELS[type]} — {visits} посещения</p>
                  <p className="text-blue-200 text-sm">{SLOT_LABELS[timeSlot]}</p>
                </div>
                <div className="text-right">
                  {OLD_PRICES[type]?.[visits] && (
                    <div className="flex items-center justify-end gap-1.5 mb-0.5">
                      <span className="text-sm line-through text-blue-200">€{OLD_PRICES[type][visits].old.toFixed(2)}</span>
                      <span className="text-xs font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">-{OLD_PRICES[type][visits].discount}%</span>
                    </div>
                  )}
                  <p className="text-3xl font-black">€{price.toFixed(2)}</p>
                  <p className="text-blue-200 text-xs">/месец</p>
                </div>
              </div>
              <Button
                className="w-full bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl"
                disabled={createCheckout.isPending}
                onClick={handleSubscribe}
              >
                {createCheckout.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Зареждане...</>
                  : <><ChevronRight className="w-4 h-4 mr-1" />Абонирай се</>
                }
              </Button>
              <p className="text-blue-200 text-xs text-center">Автоматично подновяване · Отказ по всяко време</p>
            </div>
          </div>
        )}

        {/* Subscription history */}
        {allSubs.filter(s => s.status !== "active").length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">История на абонаменти</p>
            {allSubs.filter(s => s.status !== "active").map(sub => (
              <div key={sub.id} className="rounded-2xl border border-border p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{TYPE_LABELS[sub.type]} — {sub.visits} посещения</span>
                  <Badge className={`${STATUS_LABELS[sub.status]?.color ?? "bg-gray-100 text-gray-600"} border-0 text-xs`}>
                    {STATUS_LABELS[sub.status]?.label ?? sub.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {sub.district}, Бл. {sub.blok}, Вх. {sub.vhod} · {SLOT_LABELS[sub.timeSlot]}
                </p>
                {sub.cancelledAt && (
                  <p className="text-xs text-muted-foreground">
                    Отказан: {new Date(sub.cancelledAt).toLocaleDateString("bg-BG")}
                    {sub.cancellationNote ? ` — ${sub.cancellationNote}` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info box */}
        <div className="rounded-2xl bg-secondary border border-border p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Как работи абонаментът?</p>
            <p>Работник ще посети вашия адрес в избрания часови слот за всяко посещение от плана ви.</p>
            <p>Плащането е месечно и се подновява автоматично. Можете да откажете по всяко време.</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
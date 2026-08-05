import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CalendarDays, CheckCircle, ChevronRight, ChevronLeft, LogIn, Loader2,
  Sun, Moon, Trash2, Recycle, AlertCircle, X,
  Check, ChevronsUpDown
} from "lucide-react";
import { Link } from "wouter";
import { normalizeEntrance } from "../../../shared/bgAlphabet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const PRICES_DEFAULT: Record<string, Record<string, number>> = {
  standard: { "15": 8.99, "30": 17.99 },
  recycling: { "15": 11.99, "30": 21.99 },
};

export default function Subscription() {
  const { user, loading: authLoading } = useAuth();
  const { data: subPrices } = trpc.subscriptions.prices.useQuery();
  const PRICES = {
    standard: {
      "15": subPrices?.standard["15"]?.price ?? PRICES_DEFAULT.standard["15"],
      "30": subPrices?.standard["30"]?.price ?? PRICES_DEFAULT.standard["30"],
    },
    recycling: {
      "15": subPrices?.recycling["15"]?.price ?? PRICES_DEFAULT.recycling["15"],
      "30": subPrices?.recycling["30"]?.price ?? PRICES_DEFAULT.recycling["30"],
    },
  };
  const OLD_PRICES = {
    standard: {
      "15": { old: subPrices?.standard["15"]?.oldPrice ?? 11.90, discount: subPrices?.standard["15"] ? Math.round((1 - subPrices.standard["15"].price / subPrices.standard["15"].oldPrice) * 100) : 24 },
      "30": { old: subPrices?.standard["30"]?.oldPrice ?? 23.90, discount: subPrices?.standard["30"] ? Math.round((1 - subPrices.standard["30"].price / subPrices.standard["30"].oldPrice) * 100) : 25 },
    },
    recycling: {
      "15": { old: subPrices?.recycling["15"]?.oldPrice ?? 15.90, discount: subPrices?.recycling["15"] ? Math.round((1 - subPrices.recycling["15"].price / subPrices.recycling["15"].oldPrice) * 100) : 25 },
      "30": { old: subPrices?.recycling["30"]?.oldPrice ?? 28.90, discount: subPrices?.recycling["30"] ? Math.round((1 - subPrices.recycling["30"].price / subPrices.recycling["30"].oldPrice) * 100) : 24 },
    },
  };
  const { language } = useLanguage();
  const isBg = language === "bg";
  const [, navigate] = useLocation();

  const TYPE_LABELS: Record<string, string> = {
    standard: isBg ? "Стандартен битов" : "Standard Household",
    recycling: isBg ? "Разделно събиране" : "Recycling Collection",
  };
  const SLOT_LABELS: Record<string, string> = {
    morning: "08:00 – 12:00",
    evening: "20:00 – 00:00",
  };
  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    active: { label: isBg ? "Активен" : "Active", color: "bg-green-100 text-green-800" },
    cancelled: { label: isBg ? "Отказан" : "Cancelled", color: "bg-red-100 text-red-800" },
    expired: { label: isBg ? "Изтекъл" : "Expired", color: "bg-gray-100 text-gray-600" },
  };

  // Form state
  const [type, setType] = useState<"standard" | "recycling">("standard");
  const [visits, setVisits] = useState<"15" | "30">("15");
  const [visitDays, setVisitDays] = useState<"even" | "odd">("even");
  const [timeSlot, setTimeSlot] = useState<"morning" | "evening">("morning");
  const [editAddress, setEditAddress] = useState(false);
  const [district, setDistrict] = useState("");
  const [districtOpen, setDistrictOpen] = useState(false);
  const { data: citiesData } = trpc.cities.list.useQuery();
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const { data: districtsData } = trpc.districts.list.useQuery();
  const districts = districtsData?.filter(d => d.isActive && d.cityId === selectedCityId) ?? [];
  const [blok, setBlok] = useState("");
  const [vhod, setVhod] = useState("");
  const [etaj, setEtaj] = useState("");
  const [apartament, setApartament] = useState("");
  const [cancelNote, setCancelNote] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [workerModalInfo, setWorkerModalInfo] = useState<{ name: string; number?: number | null; photoUrl?: string | null } | null>(null);
  const [autoRenew, setAutoRenew] = useState(true);

  // Queries
  const profileQ = trpc.users.getProfile.useQuery(undefined, { enabled: !!user });
  const activeSubQ = trpc.subscriptions.myActive.useQuery(undefined, { enabled: !!user });
  const nextVisitQ = trpc.subscriptions.myNextVisit.useQuery(undefined, { enabled: !!user });
  const nextVisit = nextVisitQ.data;
  const allSubsQ = trpc.subscriptions.myList.useQuery(undefined, { enabled: !!user });
  const normalizedVhod = vhod ? normalizeEntrance(vhod) : "";
  const { data: entranceCheck } = trpc.entranceAccess.check.useQuery(
    { district, blok, vhod: normalizedVhod },
    { enabled: !!(district && blok && normalizedVhod), refetchInterval: 10000 }
  );
  const registerEntrance = trpc.entranceAccess.register.useMutation();

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
      toast.success(isBg ? "Абонаментът е активиран успешно!" : "Subscription activated successfully!");
      activeSubQ.refetch();
      allSubsQ.refetch();
      window.history.replaceState({}, "", "/subscription");
    }
  }, [subSuccess]);

  // Mutations
  const createCheckout = trpc.subscriptions.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info(isBg ? "Пренасочване към Stripe Checkout..." : "Redirecting to Stripe Checkout...");
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const utils = trpc.useUtils();
  const cancelSub = trpc.subscriptions.cancel.useMutation({
    onSuccess: () => {
      toast.success(isBg ? "Абонаментът е отказан." : "Subscription cancelled.");
      setShowCancelForm(false);
      setCancelNote("");
      utils.subscriptions.myActive.invalidate();
      utils.subscriptions.myList.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubscribe = () => {
    if (!district.trim() || !blok.trim() || !vhod.trim()) {
      toast.error(isBg ? "Моля попълнете квартал, блок и вход." : "Please fill in district, block and entrance.");
      return;
    }
    registerEntrance.mutate({
      district, blok, vhod: normalizedVhod,
      contactPhone: profileQ.data?.phone || user?.phone || undefined,
      contactEmail: profileQ.data?.email || user?.email || undefined,
    });
    if (entranceCheck !== undefined && !entranceCheck.approved) {
      toast.error(isBg
        ? "За този вход все още нямаме осигурен достъп. Ще се свържем с вас скоро на посочения телефон/имейл, за да го осигурим."
        : "We do not yet have access to this entrance. We will contact you shortly at the phone/email you provided to arrange it.",
        { duration: 8000 }
      );
      return;
    }
    createCheckout.mutate({
      type, visits, timeSlot,
      visitDays: visits === "15" ? visitDays : "all",
      district: district.trim(),
      blok: blok.trim(),
      vhod: normalizeEntrance(vhod.trim()),
      etaj: etaj.trim() || undefined,
      apartament: apartament.trim() || undefined,
      origin: window.location.origin,
      autoRenew,
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
          <h1 className="text-2xl font-bold mb-2">{isBg ? "Месечен абонамент" : "Monthly Subscription"}</h1>
          <p className="text-muted-foreground mb-6">{isBg ? "Влезте в профила си, за да се абонирате." : "Log in to your account to subscribe."}</p>
          <Link href="/auth">
            <Button className="gap-2"><LogIn className="w-4 h-4" />{isBg ? "Вход / Регистрация" : "Login / Register"}</Button>
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
          <div className="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{isBg ? "Месечен абонамент" : "Monthly Subscription"}</h1>
            <p className="text-xs text-muted-foreground">{isBg ? "Редовни посещения на вашия адрес" : "Regular visits to your address"}</p>
          </div>
        </div>

        {/* Active subscription card */}
        {activeSub ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-800">{isBg ? "Активен абонамент" : "Active Subscription"}</span>
              </div>
              <Badge className="bg-green-100 text-green-800 border-0">{isBg ? "Активен" : "Active"}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">{isBg ? "Тип" : "Type"}</p>
                <p className="font-medium">{TYPE_LABELS[activeSub.type]}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{isBg ? "Посещения" : "Visits"}</p>
                <p className="font-medium">{activeSub.visits}/{isBg ? "месец" : "month"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{isBg ? "Часови слот" : "Time slot"}</p>
                <p className="font-medium">{SLOT_LABELS[activeSub.timeSlot]}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{isBg ? "Адрес" : "Address"}</p>
                <p className="font-medium">{activeSub.district}, {isBg ? "Бл." : "Bl."} {activeSub.blok}, {isBg ? "Вх." : "Entr."} {activeSub.vhod}</p>
              </div>
              {activeSub.currentPeriodEnd && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">{isBg ? "Следващо подновяване" : "Next renewal"}</p>
                  <p className="font-medium">{new Date(activeSub.currentPeriodEnd).toLocaleDateString(isBg ? "bg-BG" : "en-GB")}</p>
                </div>
              )}
              {nextVisit && (
                <div className="col-span-2 bg-green-50 rounded-xl p-3 border border-green-200">
                  <p className="text-green-800 text-xs font-semibold mb-0.5">📅 {isBg ? "Следващо посещение:" : "Next visit:"}</p>
                  <p className="text-green-900 font-bold text-sm">
                    {new Date(nextVisit.visitDate).toLocaleDateString(isBg ? "bg-BG" : "en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                  <p className="text-green-700 text-xs mt-0.5">
                    {isBg ? "след" : "after"} {nextVisit.timeSlot === "morning" ? "08:00" : "20:00"} {isBg ? "часа" : "o'clock"}
                  </p>
                  {(nextVisit as any).assignedWorkerName && (
                    <button
                      type="button"
                      onClick={() => setWorkerModalInfo({
                        name: (nextVisit as any).assignedWorkerName,
                        number: (nextVisit as any).assignedWorkerNumber,
                        photoUrl: (nextVisit as any).workerPhotoUrl,
                      })}
                      className="flex items-center gap-1.5 mt-2 pt-2 border-t border-green-200"
                    >
                      {(nextVisit as any).workerPhotoUrl ? (
                        <img src={(nextVisit as any).workerPhotoUrl} alt={(nextVisit as any).assignedWorkerName} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-green-700 font-bold text-[10px]">{((nextVisit as any).assignedWorkerName as string).charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <span className="text-xs text-green-700">
                        {(nextVisit as any).assignedWorkerName}
                        {(nextVisit as any).assignedWorkerNumber && <span className="text-green-500"> · №{(nextVisit as any).assignedWorkerNumber}</span>}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

          {/* Upgrade options */}
          <div className="mt-4 pt-4 border-t border-green-200">
            <p className="text-xs font-semibold text-green-800 mb-3">{isBg ? "Смени абонамента:" : "Switch subscription:"}</p>
            <div className="space-y-2">
              {([
                { type: "standard", visits: "15" },
                { type: "standard", visits: "30" },
                { type: "recycling", visits: "15" },
                { type: "recycling", visits: "30" },
              ] as const).filter(p => !(p.type === activeSub.type && p.visits === activeSub.visits)).map(p => (
                <div key={`${p.type}-${p.visits}`} className="flex items-center justify-between bg-white rounded-xl p-3 border border-green-100">
                  <div>
                    <p className="text-sm font-medium">{TYPE_LABELS[p.type]} — {p.visits} {isBg ? "посещения" : "visits"}</p>
                    <p className="text-xs text-muted-foreground">€{PRICES[p.type][p.visits].toFixed(2)}/{isBg ? "мес" : "mo"}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs border-green-300 text-green-600 hover:bg-green-50"
                    onClick={() => {
                      if (confirm(isBg ? "Текущият абонамент ще бъде отказан и ще започне нов. Сигурни ли сте?" : "Current subscription will be cancelled and a new one will start. Are you sure?")) {
                        cancelSub.mutate({ id: activeSub.id });
                        setType(p.type);
                        setVisits(p.visits);
                        setShowCancelForm(false);
                      }
                    }}
                    disabled={cancelSub.isPending}
                  >
                    {isBg ? "Премини" : "Switch"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
          </div>
        ) : (
          /* New subscription form */
          <div className="space-y-5">
            {/* Type selector */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{isBg ? "Тип услуга" : "Service type"}</p>
              <div className="grid grid-cols-2 gap-3">
                {(["standard", "recycling"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                      type === t ? "border-green-500 bg-green-50" : "border-border bg-background hover:border-green-200"
                    }`}
                  >
                    {t === "standard"
                      ? <Trash2 className={`w-6 h-6 ${type === t ? "text-green-600" : "text-muted-foreground"}`} />
                      : <Recycle className={`w-6 h-6 ${type === t ? "text-green-600" : "text-muted-foreground"}`} />
                    }
                    <span className={`text-sm font-medium ${type === t ? "text-green-700" : "text-foreground"}`}>
                      {TYPE_LABELS[t]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Visits selector */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{isBg ? "Брой посещения/месец" : "Visits per month"}</p>
              <div className="grid grid-cols-2 gap-3">
                {(["15", "30"] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setVisits(v)}
                    className={`flex flex-col items-center gap-1 p-4 rounded-2xl border-2 transition-all ${
                      visits === v ? "border-green-500 bg-green-50" : "border-border bg-background hover:border-green-200"
                    }`}
                  >
                    <span className={`text-2xl font-black ${visits === v ? "text-green-700" : "text-foreground"}`}>{v}</span>
                    <span className={`text-xs ${visits === v ? "text-green-600" : "text-muted-foreground"}`}>{isBg ? "посещения" : "visits"}</span>
                    {OLD_PRICES[type]?.[v] && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs line-through text-gray-400">€{OLD_PRICES[type][v].old.toFixed(2)}</span>
                        <span className="text-xs font-bold bg-red-100 text-red-600 px-1 py-0.5 rounded-full">-{OLD_PRICES[type][v].discount}%</span>
                      </div>
                    )}
                    <span className={`text-sm font-bold ${visits === v ? "text-green-700" : "text-muted-foreground"}`}>
                      €{PRICES[type][v].toFixed(2)}/{isBg ? "мес" : "mo"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Even/Odd days picker — only for 15-visit plans */}
            {visits === "15" && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">{isBg ? "Дати на посещения" : "Visit days"}</p>
                <p className="text-xs text-muted-foreground">{isBg ? "Изберете дали работникът да иде на четни или нечетни дати от месеца." : "Choose whether the worker visits on even or odd dates of the month."}</p>
                <div className="grid grid-cols-2 gap-3">
                  {(["even", "odd"] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setVisitDays(d)}
                      className={`flex flex-col items-center gap-1 p-4 rounded-2xl border-2 transition-all ${
                        visitDays === d ? "border-green-500 bg-green-50" : "border-border bg-background hover:border-green-200"
                      }`}
                    >
                      <span className={`text-xl font-black ${visitDays === d ? "text-green-700" : "text-foreground"}`}>{d === "even" ? "2, 4, 6..." : "1, 3, 5..."}</span>
                      <span className={`text-xs font-medium ${visitDays === d ? "text-green-600" : "text-muted-foreground"}`}>
                        {d === "even" ? (isBg ? "Четни дати" : "Even dates") : (isBg ? "Нечетни дати" : "Odd dates")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time slot */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{isBg ? "Часови слот" : "Time slot"}</p>
              <div className="grid grid-cols-2 gap-3">
                {(["morning", "evening"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setTimeSlot(s)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                      timeSlot === s ? "border-green-500 bg-green-50" : "border-border bg-background hover:border-green-200"
                    }`}
                  >
                    {s === "morning"
                      ? <Sun className={`w-5 h-5 ${timeSlot === s ? "text-yellow-500" : "text-muted-foreground"}`} />
                      : <Moon className={`w-5 h-5 ${timeSlot === s ? "text-green-500" : "text-muted-foreground"}`} />
                    }
                    <div className="text-left">
                      <p className={`text-sm font-medium ${timeSlot === s ? "text-green-700" : "text-foreground"}`}>
                        {s === "morning" ? (isBg ? "Сутрин" : "Morning") : (isBg ? "Вечер" : "Evening")}
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
                <p className="text-sm font-semibold text-foreground">{isBg ? "Адрес" : "Address"}</p>
                {!editAddress && (
                  <button
                    className="text-xs text-green-600 underline"
                    onClick={() => setEditAddress(true)}
                  >
                    {isBg ? "Смени" : "Change"}
                  </button>
                )}
              </div>
              {!editAddress && district ? (
                <div className="rounded-xl border border-border bg-secondary p-3 text-sm">
                  <p className="font-medium">{district}, {isBg ? "Бл." : "Bl."} {blok}, {isBg ? "Вх." : "Entr."} {vhod}{etaj ? `, ${isBg ? "Ет." : "Fl."} ${etaj}` : ""}{apartament ? `, ${isBg ? "Ап." : "Apt."} ${apartament}` : ""}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 flex gap-2 flex-wrap">
                    {citiesData?.map((city) => (
                      <button
                        key={city.id}
                        type="button"
                        disabled={!city.isActive}
                        onClick={() => { setSelectedCityId(city.id); setDistrict(""); }}
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                          !city.isActive
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : selectedCityId === city.id
                              ? "bg-primary text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {city.name}
                      </button>
                    ))}
                  </div>
                  <div className="col-span-2">
                    <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full flex items-center justify-between rounded-xl border border-border p-3 text-sm bg-background"
                        >
                          <span className={district ? "" : "text-muted-foreground"}>
                            {district || (isBg ? "Квартал *" : "District *")}
                          </span>
                          <ChevronsUpDown className="w-4 h-4 opacity-50 flex-shrink-0" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                        <Command>
                          <CommandInput placeholder={isBg ? "Търси квартал..." : "Search district..."} />
                          <CommandList>
                            <CommandEmpty>{isBg ? "Няма намерен квартал" : "No district found"}</CommandEmpty>
                            <CommandGroup>
                              {districts.map(d => (
                                <CommandItem
                                  key={d.id}
                                  value={d.name}
                                  onSelect={(value) => {
                                    setDistrict(value);
                                    setDistrictOpen(false);
                                  }}
                                >
                                  <Check className={`mr-2 w-4 h-4 ${district === d.name ? "opacity-100" : "opacity-0"}`} />
                                  {d.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <input
                    className="rounded-xl border border-border p-3 text-sm"
                    placeholder={isBg ? "Блок *" : "Block *"}
                    value={blok}
                    onChange={e => setBlok(e.target.value)}
                  />
                  <div>
                    <input
                      className={`w-full rounded-xl border p-3 text-sm ${district && blok && normalizedVhod && entranceCheck?.approved ? "border-green-400" : "border-border"}`}
                      placeholder={isBg ? "Вход *" : "Entrance *"}
                      value={vhod}
                      onChange={e => setVhod(normalizeEntrance(e.target.value))}
                    />
                    {district && blok && normalizedVhod && entranceCheck?.approved && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {isBg ? "Достъпът е осигурен" : "Access confirmed"}
                      </p>
                    )}
                  </div>
                  <input
                    className="rounded-xl border border-border p-3 text-sm"
                    placeholder={isBg ? "Етаж" : "Floor"}
                    value={etaj}
                    onChange={e => setEtaj(e.target.value)}
                  />
                  <input
                    className="rounded-xl border border-border p-3 text-sm"
                    placeholder={isBg ? "Апартамент" : "Apartment"}
                    value={apartament}
                    onChange={e => setApartament(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Price summary + CTA */}
            <div className="rounded-2xl bg-green-600 p-5 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">{isBg ? "Избран план" : "Selected plan"}</p>
                  <p className="font-bold text-lg">{TYPE_LABELS[type]} — {visits} {isBg ? "посещения" : "visits"}</p>
                  <p className="text-green-200 text-sm">{SLOT_LABELS[timeSlot]}</p>
                </div>
                <div className="text-right">
                  {OLD_PRICES[type]?.[visits] && (
                    <div className="flex items-center justify-end gap-1.5 mb-0.5">
                      <span className="text-sm line-through text-green-200">€{OLD_PRICES[type][visits].old.toFixed(2)}</span>
                      <span className="text-xs font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">-{OLD_PRICES[type][visits].discount}%</span>
                    </div>
                  )}
                  <p className="text-3xl font-black">€{price.toFixed(2)}</p>
                  <p className="text-green-200 text-xs">/{isBg ? "месец" : "month"}</p>
                </div>
              </div>
              <label className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew(e.target.checked)}
                  className="w-4 h-4 rounded accent-white"
                />
                <span className="text-sm text-white">
                  {isBg ? "Автоматично подновяване всеки месец" : "Automatically renew every month"}
                </span>
              </label>
              <Button
                className="w-full bg-white text-green-700 hover:bg-green-50 font-bold rounded-xl"
                disabled={createCheckout.isPending}
                onClick={handleSubscribe}
              >
                {createCheckout.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{isBg ? "Зареждане..." : "Loading..."}</>
                  : <><ChevronRight className="w-4 h-4 mr-1" />{isBg ? "Абонирай се" : "Subscribe"}</>
                }
              </Button>
              <p className="text-green-200 text-xs text-center">
                {autoRenew
                  ? (isBg ? "Ще се подновява автоматично всеки месец · Отказ по всяко време" : "Renews automatically each month · Cancel anytime")
                  : (isBg ? "Няма да се поднови автоматично след края на периода" : "Will not renew automatically after this period")}
              </p>
            </div>
          </div>
        )}

        {/* Subscription history */}
        {allSubs.filter(s => s.status !== "active").length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">{isBg ? "История на абонаменти" : "Subscription history"}</p>
            {allSubs.filter(s => s.status !== "active").map(sub => (
              <div key={sub.id} className="rounded-2xl border border-border p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{TYPE_LABELS[sub.type]} — {sub.visits} {isBg ? "посещения" : "visits"}</span>
                  <Badge className={`${STATUS_LABELS[sub.status]?.color ?? "bg-gray-100 text-gray-600"} border-0 text-xs`}>
                    {STATUS_LABELS[sub.status]?.label ?? sub.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {sub.district}, {isBg ? "Бл." : "Bl."} {sub.blok}, {isBg ? "Вх." : "Entr."} {sub.vhod} · {SLOT_LABELS[sub.timeSlot]}
                </p>
                {sub.cancelledAt && (
                  <p className="text-xs text-muted-foreground">
                    {isBg ? "Отказан:" : "Cancelled:"} {new Date(sub.cancelledAt).toLocaleDateString(isBg ? "bg-BG" : "en-GB")}
                    {sub.cancellationNote ? ` — ${sub.cancellationNote}` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info box */}
        <div className="rounded-2xl bg-secondary border border-border p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">{isBg ? "Как работи абонаментът?" : "How does the subscription work?"}</p>
            <p>{isBg ? "Работник ще посети вашия адрес в избрания часови слот за всяко посещение от плана ви." : "A worker will visit your address in the selected time slot for every visit in your plan."}</p>
            <p>{isBg ? "Плащането е месечно. Можете да го подновявате ръчно всеки месец или да се подновява автоматично по ваш избор. За отказ на абонамент, моля свържете се с нас на support@trashit.bg." : "Payment is monthly. You can renew manually each month or set it to renew automatically. To cancel your subscription, please contact us at support@trashit.bg."}</p>
          </div>
        </div>
      </div>
      {/* Worker info modal */}
      {workerModalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setWorkerModalInfo(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setWorkerModalInfo(null)}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
            {workerModalInfo.photoUrl ? (
              <img src={workerModalInfo.photoUrl} alt={workerModalInfo.name} className="w-24 h-24 rounded-full object-cover border-4 border-green-100 mx-auto mb-4" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-green-200 flex items-center justify-center mx-auto mb-4">
                <span className="text-green-700 font-bold text-3xl">{workerModalInfo.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <h3 className="text-lg font-bold text-gray-900">{workerModalInfo.name}</h3>
            {workerModalInfo.number && (
              <p className="text-sm text-gray-500 mt-1">{isBg ? "Работник №" : "Worker No."}{workerModalInfo.number}</p>
            )}
            <p className="text-xs text-green-600 font-medium mt-3 bg-green-50 rounded-xl py-2">
              {isBg ? "Работник в изпълнение" : "Worker in progress"}
            </p>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

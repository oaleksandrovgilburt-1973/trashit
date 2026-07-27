import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Trash2, Recycle, Package, HardHat,
  MapPin, Camera, ChevronLeft, AlertTriangle,
  CheckCircle2, Loader2, Navigation, X
} from "lucide-react";
import { normalizeEntrance } from "../../../shared/bgAlphabet";

type WasteType = "standard" | "recycling" | "nonstandard" | "construction";

interface WasteTypeCard {
  id: WasteType;
  icon: React.ReactNode;
  titleBg: string;
  titleEn: string;
  descBg: string;
  descEn: string;
  warningBg?: string;
  warningEn?: string;
  creditInfo: string;
  color: string;
}

const WASTE_TYPES: WasteTypeCard[] = [
  {
    id: "standard",
    icon: <Trash2 className="w-8 h-8" />,
    titleBg: "Стандартен битов отпадък",
    titleEn: "Standard Household Waste",
    descBg: "1 плик до ~4кг = 1 стандартен кредит",
    descEn: "1 bag up to ~4kg = 1 standard credit",
    warningBg: "Пликът трябва да е здрав и да е до ~3кг.",
    warningEn: "The bag must be sturdy and up to ~3kg.",
    creditInfo: "1 стандартен кредит",
    color: "from-green-500 to-green-600",
  },
  {
    id: "recycling",
    icon: <Recycle className="w-8 h-8" />,
    titleBg: "Разделно изхвърляне",
    titleEn: "Recycling Collection",
    descBg: "3 плика до 4кг = 1 кредит за разделно събиране",
    descEn: "3 bags up to 4kg = 1 recycling credit",
    creditInfo: "1 кредит за разделно събиране",
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "nonstandard",
    icon: <Package className="w-8 h-8" />,
    titleBg: "Нестандартен битов отпадък",
    titleEn: "Non-Standard Waste",
    descBg: "Голям или нестандартен отпадък — изисква снимка",
    descEn: "Large or non-standard waste — photo required",
    creditInfo: "Цената се определя от работника",
    color: "from-orange-500 to-orange-600",
  },
  {
    id: "construction",
    icon: <HardHat className="w-8 h-8" />,
    titleBg: "Строителен отпадък",
    titleEn: "Construction Waste",
    descBg: "Строителни материали и отпадъци — изисква снимка",
    descEn: "Construction materials and debris — photo required",
    creditInfo: "Цената се определя от работника",
    color: "from-yellow-600 to-yellow-700",
  },
];

export default function WasteDisposal() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const isBg = language === "bg";

  const [step, setStep] = useState<"select" | "form" | "success">("select");
  const [showSaveAddress, setShowSaveAddress] = useState(false);
  const [selectedType, setSelectedType] = useState<WasteType | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Pre-select type from URL param (e.g. ?type=standard)
  useEffect(() => {
    const params = new URLSearchParams(search);
    const typeParam = params.get("type") as WasteType | null;
    if (typeParam && WASTE_TYPES.find(w => w.id === typeParam)) {
      const wt = WASTE_TYPES.find(w => w.id === typeParam)!;
      setSelectedType(typeParam);
      if (wt.warningBg) {
        setShowWarning(true);
      } else {
        setStep("form");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Form state
  const [description, setDescription] = useState("");
  const [district, setDistrict] = useState("");
  const [blok, setBlok] = useState("");
  const [vhod, setVhod] = useState("");
  const [etaj, setEtaj] = useState("");
  const [apartament, setApartament] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [estimatedVolume, setEstimatedVolume] = useState("");
  const [isImageApproved, setIsImageApproved] = useState(false);
  const [estimatedVolumeDescription, setEstimatedVolumeDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user profile for auto-fill
  const { data: profile } = trpc.users.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Load districts
  const { data: districtsData } = trpc.districts.list.useQuery();
  // Entrance access check (only when district, blok, vhod are filled)
  const normalizedVhod = vhod ? normalizeEntrance(vhod) : "";
  const { data: entranceCheck } = trpc.entranceAccess.check.useQuery(
    { district, blok, vhod: normalizedVhod },
    { enabled: !!(district && blok && normalizedVhod), refetchInterval: 10000 }
  );

  // Auto-fill from profile
  useEffect(() => {
    if (profile) {
      if (profile.addressBlok) setBlok(profile.addressBlok);
      if (profile.addressVhod) setVhod(profile.addressVhod);
      if (profile.addressEtaj) setEtaj(profile.addressEtaj);
      if (profile.addressApartament) setApartament(profile.addressApartament);
      if (profile.addressKvartal) setDistrict(profile.addressKvartal);
      if (profile.phone) setContactPhone(profile.phone);
      if (profile.email) setContactEmail(profile.email);
    }
  }, [profile]);

  const updateProfile = trpc.users.updateProfile.useMutation();

  const createRequest = trpc.requests.create.useMutation({
    onSuccess: () => {
      setStep("success");
      // Show save-address prompt only for authenticated users
      if (isAuthenticated) setShowSaveAddress(true);
    },
    onError: (err) => toast.error(err.message),
  });

  const registerEntrance = trpc.entranceAccess.register.useMutation();

  const estimateVolumeMutation = trpc.requests.estimateVolume.useMutation({
    onSuccess: (data) => {
      setEstimatedVolume(data.volume);
      setEstimatedVolumeDescription(data.description);
      toast.success(isBg ? "Обемът е оценен успешно" : "Volume estimated successfully");
    },
  });

  const moderateImageMutation = trpc.requests.estimateVolume.useMutation({
    onSuccess: () => {
      setIsImageApproved(true);
    },
    onError: (err) => {
      setImagePreview(null);
      setImageUrl("");
      setIsImageApproved(false);
      toast.error(isBg ? "⚠️ Тази снимка не е разрешена. Моля качете снимка само на отпадъка без хора или животни." : "⚠️ This image is not allowed. Please upload a photo of waste only, without people or animals.");
    },
  });

  const handleTypeSelect = (type: WasteType) => {
    setSelectedType(type);
    const wt = WASTE_TYPES.find(w => w.id === type);
    if (wt?.warningBg) {
      setShowWarning(true);
    } else {
      setAnimating(true);
      setTimeout(() => {
        setStep("form");
        setAnimating(false);
      }, 300);
    }
  };

  const handleBackToSelect = () => {
    navigate("/");
  };

  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      toast.error(isBg ? "GPS не се поддържа от браузъра" : "GPS not supported");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(pos.coords.latitude);
        setGpsLng(pos.coords.longitude);
        setGpsLoading(false);
        toast.success(isBg ? "Локацията е засечена" : "Location captured");
      },
      () => {
        setGpsLoading(false);
        toast.error(isBg ? "Не може да се засече локацията" : "Could not get location");
      }
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImageApproved(false);
  const canvas = document.createElement("canvas");
  const img = new Image();
  const reader = new FileReader();
  reader.onloadend = () => {
    img.onload = () => {
      const MAX = 800;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL("image/jpeg", 0.7);
      setImagePreview(compressed);
      setImageUrl(compressed);
      // Auto-moderate: check for inappropriate content
      moderateImageMutation.mutate({ imageUrl: compressed });
    };
    img.src = reader.result as string;
  };
  reader.readAsDataURL(file);
};

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    if ((selectedType === "nonstandard" || selectedType === "construction") && imageUrl && !isImageApproved) {
      toast.error(isBg ? "Моля изчакайте проверката на снимката." : "Please wait for image verification.");
      return;
    }
    if (!isAuthenticated) {
      toast.error(isBg ? "Трябва да влезете в акаунта си" : "You must be logged in");
      navigate("/auth");
      return;
    }
    if (!district) {
      toast.error(isBg ? "Изберете квартал" : "Select district");
      return;
    }
    if (!blok || !vhod || !etaj || !apartament) {
      toast.error(isBg ? "Попълнете адреса (блок, вход, етаж, апартамент)" : "Fill in the address (block, entrance, floor, apartment)");
      return;
    }
    if (!contactPhone && !contactEmail) {
      toast.error(isBg ? "Въведете телефон или имейл" : "Enter phone or email");
      return;
    }
    if ((selectedType === "nonstandard" || selectedType === "construction") && !imagePreview) {
      toast.error(isBg ? "Снимката е задължителна за този вид отпадък" : "Photo is required");
      return;
    }
    // Register entrance in DB on submit (only writes to DB here, not on every keystroke)
    if (district && blok && normalizedVhod) {
      registerEntrance.mutate({
        district, blok, vhod: normalizedVhod,
        contactPhone: contactPhone || undefined,
        contactEmail: contactEmail || undefined,
      });
    }
    // Check entrance access — block submission if not approved (skip for nonstandard/construction)
if (selectedType !== "nonstandard" && selectedType !== "construction") {
  if (district && blok && normalizedVhod && entranceCheck !== undefined && !entranceCheck.approved) {
    toast.error(isBg
      ? "За този вход все още нямаме осигурен достъп. Ще се свържем с вас скоро на посочения телефон/имейл, за да го осигурим."
      : "We do not yet have access to this entrance. We will contact you shortly at the phone/email you provided to arrange it.",
      { duration: 8000 }
    );
    return;
  }
}
    createRequest.mutate({
      type: selectedType,
      description: description || undefined,
      district,
      blok,
      vhod,
      etaj,
      apartament,
      contactPhone: contactPhone || undefined,
      contactEmail: contactEmail || undefined,
      gpsLat: gpsLat ?? undefined,
      gpsLng: gpsLng ?? undefined,
      imageUrl: imageUrl || undefined,
      estimatedVolume: estimatedVolume || undefined,
      estimatedVolumeDescription: estimatedVolumeDescription || undefined,
    });
  };

  const selectedWasteType = WASTE_TYPES.find(w => w.id === selectedType);

  return (
    <MainLayout showFooter>
      <div className="max-w-2xl mx-auto px-4 py-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {step === "select" ? (
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title={isBg ? "Назад към начало" : "Back to home"}
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          ) : (
            <button
              onClick={() => {
                if (showWarning) { setShowWarning(false); return; }
                if (step === "form") handleBackToSelect();
                else setStep("select");
              }}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isBg ? "Изхвърляне на отпадъци" : "Waste Disposal"}
            </h1>
            {step === "form" && selectedWasteType && (
              <p className="text-sm text-gray-500 mt-0.5">
                {isBg ? selectedWasteType.titleBg : selectedWasteType.titleEn}
              </p>
            )}
          </div>
        </div>

        {/* Step: Select waste type */}
        {step === "select" && !showWarning && (
          <div
            className="space-y-3"
            style={{
              transform: animating ? "translateX(-100%)" : "translateX(0)",
              opacity: animating ? 0 : 1,
              transition: "transform 300ms ease-in-out, opacity 300ms ease-in-out",
            }}
          >
            <p className="text-gray-600 mb-4">
              {isBg ? "Изберете вид отпадък:" : "Select waste type:"}
            </p>
            {WASTE_TYPES.map((wt) => (
              <button
                key={wt.id}
                onClick={() => handleTypeSelect(wt.id)}
                className="w-full text-left rounded-2xl border border-gray-200 bg-white hover:border-primary hover:shadow-md transition-all p-4 flex items-center gap-4 group"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${wt.color} text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                  {wt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">
                    {isBg ? wt.titleBg : wt.titleEn}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {isBg ? wt.descBg : wt.descEn}
                  </p>
                  <span className="inline-block mt-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {wt.creditInfo}
                  </span>
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Warning dialog */}
        {showWarning && selectedWasteType?.warningBg && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-amber-800 mb-2">
              {isBg ? "Важно предупреждение" : "Important Warning"}
            </h2>
            <p className="text-amber-700 mb-6">
              {isBg ? selectedWasteType.warningBg : selectedWasteType.warningEn}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { setShowWarning(false); setStep("select"); }}>
                {isBg ? "Назад" : "Back"}
              </Button>
              <Button onClick={() => { setShowWarning(false); setStep("form"); }} className="bg-primary hover:bg-primary/90">
                {isBg ? "Разбрах, продължи" : "Understood, continue"}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Form */}
        {step === "form" && !showWarning && (
          <div
            style={{
              transform: animating ? "translateX(100%)" : "translateX(0)",
              opacity: animating ? 0 : 1,
              transition: "transform 300ms ease-in-out, opacity 300ms ease-in-out",
            }}
          >
          {/* X close button */}
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={handleBackToSelect}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
              title={isBg ? "Назад към услугите" : "Back to services"}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Credit info banner */}
            {(selectedType === "standard" || selectedType === "recycling") && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                <p className="text-sm text-primary font-medium">
                  {selectedType === "standard"
                    ? (isBg ? "Ще бъде приспаднат 1 стандартен кредит при потвърждение" : "1 standard credit will be deducted")
                    : (isBg ? "Ще бъде приспаднат 1 кредит за разделно събиране" : "1 recycling credit will be deducted")}
                </p>
              </div>
            )}

            {/* Image upload for non-standard/construction */}
            {(selectedType === "nonstandard" || selectedType === "construction") && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  {isBg ? "Снимка на отпадъка *" : "Photo of waste *"}
                </Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    imagePreview ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"
                  }`}
                >
                  {imagePreview ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <img src={imagePreview} alt="preview" className={`max-h-40 mx-auto rounded-lg object-contain ${moderateImageMutation.isPending ? "opacity-50" : ""}`} />
                        {moderateImageMutation.isPending && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/50 rounded-xl px-3 py-2 flex items-center gap-2">
                              <Loader2 className="w-4 h-4 text-white animate-spin" />
                              <span className="text-white text-xs font-medium">{isBg ? "Проверка..." : "Checking..."}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{isBg ? "Кликнете за смяна" : "Click to change"}</p>
                    </div>
                  ) : (
                    <div className="py-4">
                      <Camera className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        {isBg ? "Кликнете за добавяне на снимка" : "Click to add photo"}
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageChange}
                />
                {imagePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => estimateVolumeMutation.mutate({ imageUrl: imageUrl })}
                    disabled={estimateVolumeMutation.isPending}
                    className="w-full"
                  >
                    {estimateVolumeMutation.isPending
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isBg ? "Оценяване..." : "Estimating..."}</>
                      : (isBg ? "Оцени обема автоматично" : "Auto-estimate volume")}
                  </Button>
                )}
                {estimatedVolume && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-sm font-semibold text-blue-800">{isBg ? "Прогнозен обем:" : "Estimated volume:"} {estimatedVolume}</p>
                    <p className="text-xs text-blue-600 mt-1">{estimatedVolumeDescription}</p>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                {isBg ? "Описание (незадължително)" : "Description (optional)"}
              </Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={isBg ? "Допълнителна информация..." : "Additional info..."}
                rows={2}
                className="rounded-xl resize-none"
              />
            </div>

            {/* District */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                {isBg ? "Квартал *" : "District *"}
              </Label>
              <Select value={district} onValueChange={setDistrict} required>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={isBg ? "Изберете квартал" : "Select district"} />
                </SelectTrigger>
                <SelectContent>
                  {districtsData?.map((d) => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">{isBg ? "Адрес *" : "Address *"}</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">{isBg ? "Блок" : "Block"}</Label>
                  <Input value={blok} onChange={e => setBlok(e.target.value)} placeholder="358" required className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">{isBg ? "Вход" : "Entrance"}</Label>
                  <Input
                    value={vhod}
                    onChange={e => setVhod(normalizeEntrance(e.target.value))}
                    placeholder={isBg ? "В (или 1=А, 2=Б...)" : "B (or 1=A, 2=B...)"}
                    required
                    className={`rounded-xl mt-1 ${district && blok && normalizedVhod && entranceCheck?.approved ? "border-green-400" : ""}`}
                  />
                  {district && blok && normalizedVhod && entranceCheck?.approved && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {isBg ? "Достъпът е осигурен" : "Access confirmed"}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">{isBg ? "Етаж" : "Floor"}</Label>
                  <Input value={etaj} onChange={e => setEtaj(e.target.value)} placeholder="5" required className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">{isBg ? "Апартамент" : "Apartment"}</Label>
                  <Input value={apartament} onChange={e => setApartament(e.target.value)} placeholder="23" required className="rounded-xl mt-1" />
                </div>
              </div>
            </div>

            {/* GPS */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                {isBg ? "GPS локация" : "GPS location"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isBg ? "📍 За по-бърза обработка на заявката, засечете локацията си. Работникът ще може да намери адреса ви по-лесно." : "📍 For faster processing, share your location. This helps the worker find your address more easily."}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleGetGPS}
                disabled={gpsLoading}
                className="w-full rounded-xl"
              >
                {gpsLoading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isBg ? "Засичане..." : "Locating..."}</>
                  : gpsLat
                  ? <><Navigation className="w-4 h-4 mr-2 text-primary" />{gpsLat.toFixed(5)}, {gpsLng?.toFixed(5)}</>
                  : <><MapPin className="w-4 h-4 mr-2" />{isBg ? "Засечи моята локация" : "Get my location"}</>}
              </Button>
            </div>

            {/* Contact */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                {isBg ? "Контакт (телефон или имейл) *" : "Contact (phone or email) *"}
              </Label>
              <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder={isBg ? "Телефон" : "Phone"} className="rounded-xl" />
              <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder={isBg ? "Имейл" : "Email"} type="email" className="rounded-xl" />
            </div>

            <Button
              type="submit"
              disabled={createRequest.isPending}
              className="w-full rounded-2xl h-12 text-base font-semibold bg-primary hover:bg-primary/90"
            >
              {createRequest.isPending
                ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{isBg ? "Изпращане..." : "Submitting..."}</>
                : (isBg ? "Подай заявка" : "Submit Request")}
            </Button>
          </form>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="text-center py-10">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isBg ? "Заявката е подадена!" : "Request submitted!"}
            </h2>
            <p className="text-gray-500 mb-8">
              {isBg ? "Работник ще се свърже с вас скоро." : "A worker will contact you soon."}
            </p>

            {/* Save address prompt */}
            {showSaveAddress && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-left">
                <p className="text-sm font-semibold text-green-800 mb-1">
                  {isBg ? "Запазване на адрес" : "Save address"}
                </p>
                <p className="text-sm text-green-700 mb-3">
                  {profile?.addressBlok
                    ? (isBg
                      ? "Искате ли да замените стария адрес с новия?"
                      : "Would you like to replace your saved address with the new one?")
                    : (isBg
                      ? "Искате ли да запазите този адрес за следващ път?"
                      : "Would you like to save this address for next time?")}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="rounded-xl bg-green-600 hover:bg-green-700 text-white flex-1"
                    onClick={async () => {
                      try {
                        await updateProfile.mutateAsync({
                          addressKvartal: district,
                          addressBlok: blok,
                          addressVhod: vhod,
                          addressEtaj: etaj,
                          addressApartament: apartament,
                        });
                        toast.success(isBg ? "Адресът е запазен в профила ви" : "Address saved to your profile");
                      } catch {
                        toast.error(isBg ? "Грешка при запазване" : "Error saving address");
                      } finally {
                        setShowSaveAddress(false);
                      }
                    }}
                    disabled={updateProfile.isPending}
                  >
                    {isBg ? "Да" : "Yes"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl flex-1"
                    onClick={() => setShowSaveAddress(false)}
                  >
                    {isBg ? "Не" : "No"}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate("/my-requests")} className="rounded-2xl bg-primary hover:bg-primary/90">
                {isBg ? "Моите заявки" : "My Requests"}
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="rounded-2xl">
                {isBg ? "Нова заявка" : "New Request"}
              </Button>
              <Button variant="ghost" onClick={() => navigate("/")} className="rounded-2xl">
                {isBg ? "Начало" : "Home"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
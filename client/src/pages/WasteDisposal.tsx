import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
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
  CheckCircle2, Loader2, Navigation
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
    warningBg: "Пликът трябва да е здрав и да е до ~4кг.",
    warningEn: "The bag must be sturdy and up to ~4kg.",
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
  const search = new URLSearchParams(window.location.search);
  const typeFromUrl = search.get("type") as WasteType | null;
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const isBg = language === "bg";

  const urlWasteType = WASTE_TYPES.find(w => w.id === typeFromUrl);
  const hasWarning = !!urlWasteType?.warningBg;
  const [step, setStep] = useState<"select" | "form" | "success">(typeFromUrl ? "form" : "select");
  const [showSaveAddress, setShowSaveAddress] = useState(false);
  const [selectedType, setSelectedType] = useState<WasteType | null>(typeFromUrl);
  const [showWarning, setShowWarning] = useState(hasWarning);

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
  const [estimatedVolumeDescription, setEstimatedVolumeDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user profile for auto-fill
  const { data: profile } = trpc.users.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Load districts
  const { data: districtsData } = trpc.districts.list.useQuery();

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
  const registerEntrance = trpc.entranceAccess.register.useMutation();
  const createRequest = trpc.requests.create.useMutation({
    onSuccess: () => {
      setStep("success");
      // Show save-address prompt only for authenticated users
      if (isAuthenticated) setShowSaveAddress(true);
    },
    onError: (err) => toast.error(err.message),
  });

const entranceCheck = trpc.entranceAccess.check.useQuery(
  { district, blok, vhod },
  { enabled: !!district && !!blok && !!vhod, refetchInterval: 10000 }
);
  const estimateVolumeMutation = trpc.requests.estimateVolume.useMutation({
    onSuccess: (data) => {
      setEstimatedVolume(data.volume);
      setEstimatedVolumeDescription(data.description);
      toast.success(isBg ? "Обемът е оценен успешно" : "Volume estimated successfully");
    },
  });

  const handleTypeSelect = (type: WasteType) => {
    setSelectedType(type);
    const wt = WASTE_TYPES.find(w => w.id === type);
    if (wt?.warningBg) {
      setShowWarning(true);
    } else {
      setStep("form");
    }
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
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageUrl("data:image/placeholder");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
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
if (entranceCheck.data !== undefined && !entranceCheck.data.approved) {
      toast.error(isBg ? "За този вход все още нямаме осигурен достъп. Свържете се с нас на trashit.bg@gmail.com за да го уредим." : "Access for this entrance is not yet approved.");
      return;
    }
    if ((selectedType === "nonstandard" || selectedType === "construction") && !imagePreview) {
      toast.error(isBg ? "Снимката е задължителна за този вид отпадък" : "Photo is required");
      return;
    }
const regResult = await registerEntrance.mutateAsync({ district, blok, vhod });
    if (!regResult.approved) {
      toast.error(isBg ? "За този вход все още нямаме осигурен достъп. Свържете се с нас на trashit.bg@gmail.com за да го уредим." : "Access for this entrance is not yet approved.");
      return;
    }
```

Запази и:
```
git add .
git commit -m "Register entrance on submit"
git push
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
      <div className="max-w-2xl mx-auto px-4 py-6">
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
                if (step === "form") setStep("select");
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
          <div className="space-y-3">
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
                      <img src={imagePreview} alt="preview" className="max-h-40 mx-auto rounded-lg object-contain" />
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
                    onClick={() => estimateVolumeMutation.mutate({ imageUrl: "https://example.com/placeholder.jpg" })}
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
                  <Input value={blok} onChange={e => setBlok(e.target.value)} placeholder="358" required className="rounded-xl mt-1"  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">{isBg ? "Вход" : "Entrance"}</Label>
                  <Input
                    value={vhod}
                    onChange={e => setVhod(normalizeEntrance(e.target.value))}
                    placeholder={isBg ? "В (или 1=А, 2=Б...)" : "B (or 1=A, 2=B...)"}
                    required
                    className={`rounded-xl mt-1 ${district && blok && vhod && entranceCheck.data !== undefined && !entranceCheck.data.approved ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
{district && blok && vhod && entranceCheck.data !== undefined && !entranceCheck.data.approved && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {isBg ? "За този вход все още нямаме осигурен достъп." : "Access for this entrance is not yet approved."}
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
                {isBg ? "GPS локация (незадължително)" : "GPS location (optional)"}
              </Label>
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
                  {isBg
                    ? "Искате ли да запазите този адрес за следващ път?"
                    : "Would you like to save this address for next time?"}
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
              <Button variant="outline" onClick={() => { setStep("select"); setSelectedType(null); setShowSaveAddress(false); }} className="rounded-2xl">
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

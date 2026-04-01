import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import MainLayout from "@/components/MainLayout";
import { toast } from "sonner";
import { Building2, Home, MoreHorizontal, ArrowLeft, CheckCircle2, Phone, Mail } from "lucide-react";

type CleaningType = "entrances" | "residence" | "other" | null;

export default function Cleaning() {
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [selectedType, setSelectedType] = useState<CleaningType>(null);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [floors, setFloors] = useState("");
  const [aptsPerFloor, setAptsPerFloor] = useState("");
  const [rooms, setRooms] = useState("");
  const [sqm, setSqm] = useState("");
  const [residenceType, setResidenceType] = useState<"apartment" | "house">("apartment");
  const [requirements, setRequirements] = useState("");
  const [description, setDescription] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = trpc.cleaning.create.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (err) => toast.error(err.message),
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!contactPhone && !contactEmail) {
      newErrors.contact = "Трябва да въведете телефон или имейл за обратна връзка.";
    }
    if (selectedType === "entrances") {
      if (!floors || parseInt(floors) < 1) newErrors.floors = "Въведете брой етажи.";
      if (!aptsPerFloor || parseInt(aptsPerFloor) < 1) newErrors.aptsPerFloor = "Въведете брой апартаменти на етаж.";
    }
    if (selectedType === "residence") {
      if (!rooms || parseInt(rooms) < 1) newErrors.rooms = "Въведете брой стаи.";
      if (!sqm || parseFloat(sqm) <= 0) newErrors.sqm = "Въведете квадратура.";
    }
    if (selectedType === "other") {
      if (!description.trim()) newErrors.description = "Описанието е задължително.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!isAuthenticated) {
      toast.error("Трябва да сте влезли в акаунта си, за да изпратите запитване.");
      navigate("/auth");
      return;
    }
    createMutation.mutate({
      type: selectedType!,
      floors: floors ? parseInt(floors) : undefined,
      aptsPerFloor: aptsPerFloor ? parseInt(aptsPerFloor) : undefined,
      rooms: rooms ? parseInt(rooms) : undefined,
      sqm: sqm ? parseFloat(sqm) : undefined,
      residenceType: selectedType === "residence" ? residenceType : undefined,
      requirements: requirements || undefined,
      description: description || undefined,
      proposedPrice: proposedPrice ? parseFloat(proposedPrice) : undefined,
      contactPhone: contactPhone || undefined,
      contactEmail: contactEmail || undefined,
      district: district || undefined,
      address: address || undefined,
    });
  };

  if (submitted) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Запитването е изпратено!</h2>
          <p className="text-gray-600 mb-2 max-w-sm">
            Ще се свържем с вас скоро с оферта за исканата услуга.
          </p>
          <p className="text-sm text-gray-500 mb-8">Очаквайте отговор на посочения контакт.</p>
          <div className="flex gap-3">
            <button
              onClick={() => { setSubmitted(false); setSelectedType(null); }}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-2xl hover:bg-green-700 transition-colors"
            >
              Ново запитване
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200 transition-colors"
            >
              Начало
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const serviceTypes = [
    {
      id: "entrances" as const,
      icon: Building2,
      title: "Почистване на входове",
      description: "Редовно или еднократно почистване на входове в жилищни сгради",
      color: "bg-blue-50 border-blue-200 hover:border-blue-400",
      iconColor: "text-blue-600 bg-blue-100",
    },
    {
      id: "residence" as const,
      icon: Home,
      title: "Почистване на жилища",
      description: "Почистване на апартаменти и къщи — стандартно или основно",
      color: "bg-purple-50 border-purple-200 hover:border-purple-400",
      iconColor: "text-purple-600 bg-purple-100",
    },
    {
      id: "other" as const,
      icon: MoreHorizontal,
      title: "Друго",
      description: "Офиси, търговски обекти, след ремонт или специфични нужди",
      color: "bg-orange-50 border-orange-200 hover:border-orange-400",
      iconColor: "text-orange-600 bg-orange-100",
    },
  ];

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => selectedType ? setSelectedType(null) : navigate("/")}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">🧹 Почистване</h1>
            <p className="text-sm text-gray-500">
              {selectedType ? "Попълнете формата за запитване" : "Изберете вид почистване"}
            </p>
          </div>
        </div>

        {/* Type selection */}
        {!selectedType && (
          <div className="space-y-4">
            {serviceTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${type.color}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${type.iconColor}`}>
                    <type.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{type.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                    <p className="text-xs text-gray-500 mt-2 font-medium">Изпраща се запитване за оферта</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Form */}
        {selectedType && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Entrances form */}
            {selectedType === "entrances" && (
              <div className="bg-blue-50 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-blue-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5" /> Почистване на входове
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Брой етажи <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={floors}
                      onChange={(e) => setFloors(e.target.value)}
                      placeholder="напр. 8"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    />
                    {errors.floors && <p className="text-red-500 text-xs mt-1">{errors.floors}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Апартаменти на етаж <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={aptsPerFloor}
                      onChange={(e) => setAptsPerFloor(e.target.value)}
                      placeholder="напр. 4"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    />
                    {errors.aptsPerFloor && <p className="text-red-500 text-xs mt-1">{errors.aptsPerFloor}</p>}
                  </div>
                </div>
                {floors && aptsPerFloor && (
                  <div className="bg-blue-100 rounded-xl p-3 text-sm text-blue-800">
                    📊 Общо: <strong>{parseInt(floors) * parseInt(aptsPerFloor)} апартамента</strong> в сградата
                  </div>
                )}
              </div>
            )}

            {/* Residence form */}
            {selectedType === "residence" && (
              <div className="bg-purple-50 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-purple-900 flex items-center gap-2">
                  <Home className="w-5 h-5" /> Почистване на жилище
                </h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Вид жилище</label>
                  <div className="flex gap-3">
                    {[{ val: "apartment", label: "Апартамент" }, { val: "house", label: "Къща" }].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setResidenceType(opt.val as "apartment" | "house")}
                        className={`flex-1 py-2.5 rounded-xl border-2 font-semibold text-sm transition-colors ${
                          residenceType === opt.val
                            ? "border-purple-500 bg-purple-100 text-purple-800"
                            : "border-gray-200 bg-white text-gray-600"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Брой стаи <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={rooms}
                      onChange={(e) => setRooms(e.target.value)}
                      placeholder="напр. 3"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                    />
                    {errors.rooms && <p className="text-red-500 text-xs mt-1">{errors.rooms}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Квадратура (кв.м) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={sqm}
                      onChange={(e) => setSqm(e.target.value)}
                      placeholder="напр. 75"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                    />
                    {errors.sqm && <p className="text-red-500 text-xs mt-1">{errors.sqm}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Специфични изисквания
                  </label>
                  <textarea
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="напр. основно почистване, след ремонт, почистване на прозорци..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white resize-none"
                  />
                </div>
              </div>
            )}

            {/* Other form */}
            {selectedType === "other" && (
              <div className="bg-orange-50 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-orange-900 flex items-center gap-2">
                  <MoreHorizontal className="w-5 h-5" /> Друго почистване
                </h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Описание <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Опишете какво трябва да се почисти, обем на работата, специфики..."
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white resize-none"
                  />
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Предложена цена (лв.) — по желание
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={proposedPrice}
                    onChange={(e) => setProposedPrice(e.target.value)}
                    placeholder="напр. 150.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                  />
                </div>
              </div>
            )}

            {/* Address */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h3 className="font-bold text-gray-900">Адрес (по желание)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Квартал</label>
                  <input
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="напр. Младост"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Адрес</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="напр. бл. 45, вх. А"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h3 className="font-bold text-gray-900">
                Контакт <span className="text-red-500">*</span>
                <span className="text-sm font-normal text-gray-500 ml-2">(телефон или имейл)</span>
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Телефон"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Имейл"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>
              {errors.contact && <p className="text-red-500 text-sm">{errors.contact}</p>}
            </div>

            {/* Info banner */}
            <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
              <p className="text-sm text-green-800 font-medium">
                ℹ️ Запитването е безплатно — не се изискват кредити.
              </p>
              <p className="text-xs text-green-600 mt-1">
                Ще получите оферта на посочения контакт в рамките на 24 часа.
              </p>
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full py-4 bg-green-600 text-white font-bold text-lg rounded-2xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              {createMutation.isPending ? "Изпращане..." : "📨 Изпрати запитване"}
            </button>
          </form>
        )}
      </div>
    </MainLayout>
  );
}

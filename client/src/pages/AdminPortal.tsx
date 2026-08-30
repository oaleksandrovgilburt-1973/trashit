import { normalizeEntrance } from "../../../shared/bgAlphabet";
import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users, MapPin, Building2, CreditCard, ClipboardList,
  Settings, AlertTriangle, LogOut, Plus, Trash2, Power,
  PowerOff, CheckCircle, Phone, Mail, ChevronRight,
  RefreshCw, Eye, Send, ShieldAlert, Pencil, Save, LayoutDashboard,
  FileText, UserCheck, Search, ChevronDown, ChevronUp, Coins, History,
  Shield, Lock, DollarSign, CalendarDays, CheckCheck, X, KeyRound, BarChart2, XCircle, Camera, Percent
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import AdminDashboard from "@/components/AdminDashboard";
import ZoomableImage from "@/components/ZoomableImage";

type Tab = "dashboard" | "workers" | "cities" | "districts" | "blocks" | "credits" | "requests" | "content" | "problems" | "descriptions" | "clients" | "subadmins" | "reports" | "subscriptions" | "partners";

export default function AdminPortal() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const adminSession = typeof window !== "undefined"
    ? localStorage.getItem("admin_session")
    : null;

  if (!adminSession) {
    navigate("/admin/login");
    return null;
  }

  const tabs: { id: Tab; icon: any; label: string }[] = [
    { id: "dashboard", icon: LayoutDashboard, label: "Табло" },
    { id: "clients", icon: UserCheck, label: "Клиенти" },
    { id: "workers", icon: Users, label: "Работници" },
    { id: "cities", icon: MapPin, label: "Градове" },
    { id: "districts", icon: MapPin, label: "Квартали" },
    { id: "blocks", icon: Building2, label: "Блокове" },
    { id: "credits", icon: CreditCard, label: "Кредити" },
    { id: "requests", icon: ClipboardList, label: "Заявки" },
    { id: "content", icon: Settings, label: "Съдържание" },
    { id: "descriptions", icon: FileText, label: "Описания" },
    { id: "problems", icon: AlertTriangle, label: "Проблеми" },
    { id: "subadmins", icon: Shield, label: "Подадмини" },
    { id: "reports", icon: BarChart2, label: "Отчети" },
    { id: "subscriptions", icon: CalendarDays, label: "Абонаменти" },
    { id: "partners", icon: Percent, label: "Партньори" },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-700 rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-tight">Администраторски панел</h1>
              <p className="text-xs text-gray-500">TRASHit управление</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              localStorage.removeItem("admin_session");
              navigate("/");
            }}
          >
            <LogOut className="w-4 h-4 mr-1" />
            Изход
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-0 border-t border-gray-100">
            {tabs.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === id
                    ? "border-green-600 text-green-700 bg-green-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "dashboard" && <AdminDashboard />}
        {activeTab === "clients" && <ClientsTab />}
        {activeTab === "workers" && <WorkersTab />}
        {activeTab === "cities" && <CitiesTab />}
        {activeTab === "districts" && <DistrictsTab />}
        {activeTab === "blocks" && <BlocksTab />}
        {activeTab === "credits" && <CreditsTab />}
        {activeTab === "requests" && <RequestsTab />}
        {activeTab === "content" && <ContentTab />}
        {activeTab === "descriptions" && <DescriptionsTab />}
        {activeTab === "problems" && <ProblemsTab />}
        {activeTab === "subadmins" && <SubAdminsTab />}
        {activeTab === "reports" && <ReportsTab />}
        {activeTab === "subscriptions" && <SubscriptionsTab />}
        {activeTab === "partners" && <PartnersTab />}
      </div>
    </div>
  );
}

// ─── Tab 1: Workers ───────────────────────────────────────────────────────────
function WorkersTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [expandedWorker, setExpandedWorker] = useState<number | null>(null);

  const { data: workers, refetch } = trpc.workersMgmt.listWithStats.useQuery();
  const createWorker = trpc.users.createWorker.useMutation({
    onSuccess: () => {
      toast.success("Работникът е създаден успешно");
      setShowCreate(false);
      setName(""); setUsername(""); setPassword("");
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deactivate = trpc.workersMgmt.deactivate.useMutation({ onSuccess: () => { toast.success("Деактивиран"); refetch(); }, onError: (e: any) => toast.error(e.message) });
  const activate = trpc.workersMgmt.activate.useMutation({ onSuccess: () => { toast.success("Активиран"); refetch(); }, onError: (e: any) => toast.error(e.message) });
  const deleteWorker = trpc.workersMgmt.delete.useMutation({
    onSuccess: () => { toast.success("Работникът е изтрит"); refetch(); setExpandedWorker(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const updatePhoto = trpc.workersMgmt.updatePhoto.useMutation({
    onSuccess: () => { toast.success("Снимката е обновена"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const handlePhotoUpload = (workerOpenId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const canvas = document.createElement("canvas");
    const img = new Image();
    const reader = new FileReader();
    reader.onloadend = () => {
      img.onload = () => {
        const MAX = 400;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", 0.8);
        updatePhoto.mutate({ workerOpenId, photoUrl: compressed });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };
  const { data: allRequests } = trpc.requests.listAll.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Управление на работници</h2>
          <p className="text-sm text-gray-500 mt-0.5">{workers?.length ?? 0} работника в системата</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="bg-green-600 hover:bg-green-700 rounded-2xl">
          <Plus className="w-4 h-4 mr-2" />
          Нов работник
        </Button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-2xl border border-green-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-green-600" />
            Създай нов работник
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Пълно име *</label>
              <Input placeholder="Иван Иванов" value={name} onChange={e => setName(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Потребителско име *</label>
              <Input placeholder="ivan.ivanov" value={username} onChange={e => setUsername(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Временна парола *</label>
              <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <p className="text-xs text-amber-600 mt-2">⚠ Работникът ще трябва да смени паролата при първо влизане.</p>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={() => createWorker.mutate({ name, username, password })}
              disabled={!name || !username || !password || createWorker.isPending}
              className="bg-green-600 hover:bg-green-700 rounded-xl"
            >
              {createWorker.isPending ? "Създава се..." : "Създай акаунт"}
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl">Отказ</Button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {workers?.map(worker => {
          const completedByWorker = allRequests?.filter(r => r.workerOpenId === worker.openId && r.status === "completed").length ?? (worker as any).completedCount ?? 0;
          const isExpanded = expandedWorker === worker.id;
          return (
            <div key={worker.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative group flex-shrink-0">
                    {(worker as any).photoUrl ? (
                      <img src={(worker as any).photoUrl} alt={worker.name} className="w-11 h-11 rounded-xl object-cover border border-gray-200" />
                    ) : (
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg ${worker.isActive ? "bg-green-500" : "bg-gray-400"}`}>
                        {worker.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[worker.id]?.click()}
                      className="absolute -bottom-1 -right-1 w-5 h-5 bg-white border border-gray-300 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50"
                      title="Смени снимката"
                    >
                      <Camera className="w-3 h-3 text-gray-600" />
                    </button>
                    <input
                      ref={el => { fileInputRefs.current[worker.id] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(worker.openId, e)}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{worker.name}</span>
                      <Badge className={worker.isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600"}>
                        {worker.isActive ? "Активен" : "Неактивен"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">@{worker.username}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Завършени заявки: <span className="font-semibold text-green-600">{completedByWorker}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {worker.isActive ? (
                    <Button variant="outline" size="sm" onClick={() => deactivate.mutate({ id: worker.id })}
                      className="rounded-xl text-orange-600 border-orange-200 hover:bg-orange-50">
                      <PowerOff className="w-3.5 h-3.5 mr-1" />Деактивирай
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => activate.mutate({ id: worker.id })}
                      className="rounded-xl text-green-600 border-green-200 hover:bg-green-50">
                      <Power className="w-3.5 h-3.5 mr-1" />Активирай
                    </Button>
                  )}
                  <Button variant="outline" size="sm"
                    onClick={() => { if (confirm(`Изтрий ${worker.name}?`)) deleteWorker.mutate({ id: worker.id }); }}
                    className="rounded-xl text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <button onClick={() => setExpandedWorker(isExpanded ? null : worker.id)}
                className="mt-3 text-xs text-green-600 hover:text-green-700 flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {isExpanded ? "Скрий заявките" : "Виж завършени заявки"}
              </button>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Завършени заявки от {worker.name}</h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {allRequests?.filter(r => r.workerOpenId === worker.openId && r.status === "completed")
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(r => (
                      <div key={r.id} className="text-xs bg-gray-50 rounded-lg p-2 flex justify-between">
                        <span>{r.district}, {r.blok}, Вх. {r.vhod}, Ап. {r.apartament}</span>
                        <span className="text-gray-400">{new Date(r.createdAt).toLocaleDateString("bg-BG")}</span>
                      </div>
                    ))}
                    {!allRequests?.filter(r => r.workerOpenId === worker.openId && r.status === "completed").length && (
                      <p className="text-xs text-gray-400 py-2">Няма завършени заявки</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!workers?.length && (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Няма създадени работници</p>
            <p className="text-sm mt-1">Натиснете "Нов работник" за да добавите</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 2: Districts ─────────────────────────────────────────────────────────
function CitiesTab() {
  const [newCity, setNewCity] = useState("");
  const [search, setSearch] = useState("");

  const { data: citiesData, refetch } = trpc.cities.list.useQuery();
  const toggle = trpc.cities.toggleActive.useMutation({ onSuccess: () => refetch(), onError: (e: any) => toast.error(e.message) });
  const create = trpc.cities.create.useMutation({
    onSuccess: () => { toast.success("Градът е добавен"); setNewCity(""); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = trpc.cities.delete.useMutation({ onSuccess: () => { toast.success("Изтрит"); refetch(); }, onError: (e: any) => toast.error(e.message) });

  const filtered = citiesData?.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) ?? [];
  const activeCount = citiesData?.filter(c => c.isActive).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Управление на градове</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="text-green-600 font-semibold">{activeCount} одобрени</span>
            {" · "}
            <span className="text-red-500 font-semibold">{(citiesData?.length ?? 0) - activeCount} неодобрени</span>
            {" · "}само одобрените се показват в заявките
          </p>
        </div>
        <Input placeholder="Търси град..." value={search} onChange={e => setSearch(e.target.value)} className="rounded-xl w-48" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex gap-2">
        <Input
          placeholder="Добави нов град..."
          value={newCity}
          onChange={e => setNewCity(e.target.value)}
          className="rounded-xl flex-1"
          onKeyDown={e => e.key === "Enter" && newCity && create.mutate({ name: newCity })}
        />
        <Button onClick={() => newCity && create.mutate({ name: newCity })}
          disabled={!newCity || create.isPending} className="bg-green-600 hover:bg-green-700 rounded-xl">
          <Plus className="w-4 h-4 mr-1" />Добави
        </Button>
      </div>

      <div className="flex gap-4 text-sm bg-white rounded-xl p-3 border border-gray-200">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-600">Одобрен — показва се в заявките</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <span className="text-gray-600">Неодобрен — скрит от клиентите</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {filtered.map(city => (
          <div key={city.id}
            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm select-none ${
              city.isActive ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700"
            }`}
            onClick={() => toggle.mutate({ id: city.id, isActive: !city.isActive })}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${city.isActive ? "bg-green-500" : "bg-red-400"}`} />
              <span className="text-sm font-medium truncate">{city.name}</span>
            </div>
            <button onClick={e => { e.stopPropagation(); if (confirm("Изтрий града?")) del.mutate({ id: city.id }); }}
              className="ml-1 text-gray-400 hover:text-red-500 flex-shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      {!filtered.length && (
        <div className="text-center py-8 text-gray-400">
          <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Няма намерени градове</p>
        </div>
      )}
    </div>
  );
}

function DistrictsTab() {
  const [newDistrict, setNewDistrict] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);

  const { data: citiesData } = trpc.cities.list.useQuery();
  const { data: districts, refetch } = trpc.districts.listAll.useQuery();
  const toggle = trpc.districts.toggleActive.useMutation({ onSuccess: () => refetch(), onError: (e: any) => toast.error(e.message) });
  const create = trpc.districts.create.useMutation({
    onSuccess: () => { toast.success("Кварталът е добавен"); setNewDistrict(""); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = trpc.districts.delete.useMutation({ onSuccess: () => { toast.success("Изтрит"); refetch(); }, onError: (e: any) => toast.error(e.message) });

  useEffect(() => {
    if (!selectedCityId && citiesData && citiesData.length > 0) {
      setSelectedCityId(citiesData[0].id);
    }
  }, [citiesData, selectedCityId]);

  const districtsForCity = districts?.filter(d => d.cityId === selectedCityId) ?? [];
  const filtered = districtsForCity.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
  const activeCount = districtsForCity.filter(d => d.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Управление на квартали</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="text-green-600 font-semibold">{activeCount} одобрени</span>
            {" · "}
            <span className="text-red-500 font-semibold">{(districts?.length ?? 0) - activeCount} неодобрени</span>
            {" · "}само одобрените се показват в заявките
          </p>
        </div>
        <Input placeholder="Търси квартал..." value={search} onChange={e => setSearch(e.target.value)} className="rounded-xl w-48" />
      </div>

      {/* City selector */}
      <div className="flex gap-2 flex-wrap">
        {citiesData?.map(city => (
          <button
            key={city.id}
            onClick={() => setSelectedCityId(city.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selectedCityId === city.id
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {city.name}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex gap-2">
        <Input
          placeholder="Добави нов квартал..."
          value={newDistrict}
          onChange={e => setNewDistrict(e.target.value)}
          className="rounded-xl flex-1"
          onKeyDown={e => e.key === "Enter" && newDistrict && selectedCityId && create.mutate({ name: newDistrict, cityId: selectedCityId })}
        />
        <Button onClick={() => newDistrict && selectedCityId && create.mutate({ name: newDistrict, cityId: selectedCityId })}
          disabled={!newDistrict || !selectedCityId || create.isPending} className="bg-green-600 hover:bg-green-700 rounded-xl">
          <Plus className="w-4 h-4 mr-1" />Добави
        </Button>
      </div>

      <div className="flex gap-4 text-sm bg-white rounded-xl p-3 border border-gray-200">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-600">Одобрен — показва се в заявките</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <span className="text-gray-600">Неодобрен — скрит от клиентите</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {filtered.map(district => (
          <div key={district.id}
            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm select-none ${
              district.isActive ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700"
            }`}
            onClick={() => toggle.mutate({ id: district.id, isActive: !district.isActive })}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${district.isActive ? "bg-green-500" : "bg-red-400"}`} />
              <span className="text-sm font-medium truncate">{district.name}</span>
            </div>
            <button onClick={e => { e.stopPropagation(); if (confirm("Изтрий квартала?")) del.mutate({ id: district.id }); }}
              className="ml-1 text-gray-400 hover:text-red-500 flex-shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      {!filtered.length && (
        <div className="text-center py-8 text-gray-400">
          <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Няма намерени квартали</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Blocks/Access ─────────────────────────────────────────────────────
function BlocksTab() {
  const [blocksSubTab, setBlocksSubTab] = useState<"approved" | "pending">("pending");
  const { data: accessRecords, isLoading, refetch } = trpc.entranceAccess.list.useQuery();
  const { data: activeBlocks, refetch: refetchActiveBlocks } = trpc.blockAccess.list.useQuery();
  const toggleMutation = trpc.entranceAccess.toggle.useMutation({
    onSuccess: () => { refetch(); refetchActiveBlocks(); toast.success("Достъпът е актуализиран"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.entranceAccess.delete.useMutation({
    onSuccess: () => { refetch(); refetchActiveBlocks(); toast.success("Входът е изтрит"); },
    onError: (e) => toast.error(e.message),
  });

  const accessMap = new Map<string, boolean>();
  (accessRecords ?? []).forEach(r => {
    accessMap.set(`${r.district}|${r.blok}|${r.vhod}`, r.isApproved);
  });

  // Build a lookup for request counts from activeBlocks
  const requestCountMap = new Map<string, number>();
  (activeBlocks ?? []).forEach(b => {
    requestCountMap.set(`${b.district}|${b.blok}|${b.vhod}`, b.requestCount);
  });

  type BlockEntry = { district: string; blok: string; vhod: string; requestCount: number; contactPhone?: string | null; contactEmail?: string | null };
  const districtMap = new Map<string, Map<string, BlockEntry[]>>();

  // Only show entrances that have a record in entrance_access (the source of truth for the Blocks tab)
  (accessRecords ?? []).forEach(r => {
    if (!districtMap.has(r.district)) districtMap.set(r.district, new Map());
    const blokMap = districtMap.get(r.district)!;
    if (!blokMap.has(r.blok)) blokMap.set(r.blok, []);
    const existing = blokMap.get(r.blok)!.find(e => e.vhod === r.vhod);
    if (!existing) {
      const key = `${r.district}|${r.blok}|${r.vhod}`;
      blokMap.get(r.blok)!.push({ district: r.district, blok: r.blok, vhod: r.vhod, requestCount: requestCountMap.get(key) ?? 0 });
    }
  });

  const approvedRecords = (accessRecords ?? []).filter(r => r.isApproved);
  const pendingRecords = (accessRecords ?? []).filter(r => !r.isApproved);

  const buildDistrictMap = (records: typeof accessRecords) => {
    const map = new Map<string, Map<string, BlockEntry[]>>();
    (records ?? []).forEach(r => {
      if (!map.has(r.district)) map.set(r.district, new Map());
      const blokMap = map.get(r.district)!;
      if (!blokMap.has(r.blok)) blokMap.set(r.blok, []);
      const existing = blokMap.get(r.blok)!.find(e => e.vhod === r.vhod);
      if (!existing) {
        const key = `${r.district}|${r.blok}|${r.vhod}`;
        blokMap.get(r.blok)!.push({ district: r.district, blok: r.blok, vhod: r.vhod, requestCount: requestCountMap.get(key) ?? 0, contactPhone: r.contactPhone, contactEmail: r.contactEmail });
      }
    });
    return map;
  };

  const activeMap = buildDistrictMap(blocksSubTab === "approved" ? approvedRecords : pendingRecords);
  const activeDistricts = Array.from(activeMap.keys()).sort();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Достъп до входове</h2>
        <p className="text-sm text-gray-500 mt-0.5">Одобрете или забранете достъп до всеки вход — зелено = одобрен, червено = без достъп</p>
      </div>
      {/* Sub-tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setBlocksSubTab("pending")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            blocksSubTab === "pending"
              ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          ⏳ <span>Чакащи одобрение</span>
          <span className="ml-1 bg-yellow-200 text-yellow-800 rounded-full px-1.5 py-0.5 text-xs font-bold">{pendingRecords.length}</span>
        </button>
        <button
          onClick={() => setBlocksSubTab("approved")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            blocksSubTab === "approved"
              ? "bg-green-100 text-green-800 border border-green-300"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          ✅ <span>Одобрени</span>
          <span className="ml-1 bg-green-200 text-green-800 rounded-full px-1.5 py-0.5 text-xs font-bold">{approvedRecords.length}</span>
        </button>
      </div>
      {isLoading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      )}
      {!isLoading && activeDistricts.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{blocksSubTab === "pending" ? "Няма чакащи входове за одобрение." : "Няма одобрени входове."}</p>
        </div>
      )}
      <div className="space-y-4">
        {activeDistricts.map(district => (
          <div key={district} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-gray-900">{district}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {Array.from(activeMap.get(district)!.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([blok, entrances]) => (
                <div key={blok} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">{blok}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 pl-5">
                    {entrances.sort((a,b) => a.vhod.localeCompare(b.vhod)).map(entrance => {
                      const key = `${entrance.district}|${entrance.blok}|${entrance.vhod}`;
                      const isApproved = accessMap.get(key) ?? false;
                      const isPending = toggleMutation.isPending;
                      return (
                        <div key={entrance.vhod} className={`flex items-center justify-between rounded-xl px-3 py-2 transition-colors ${isApproved ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${isApproved ? "bg-green-500" : "bg-yellow-500"}`} />
                              <span className="text-sm font-medium text-gray-800">Вх. {entrance.vhod}</span>
                              {entrance.requestCount > 0 && (
                                <span className="text-xs text-gray-400">({entrance.requestCount} заявки)</span>
                              )}
                            </div>
                            {!isApproved && (entrance.contactPhone || entrance.contactEmail) && (
                              <div className="text-xs text-gray-500 pl-4">
                                {entrance.contactPhone && <span>📞 {entrance.contactPhone}</span>}
                                {entrance.contactPhone && entrance.contactEmail && <span> · </span>}
                                {entrance.contactEmail && <span>✉️ {entrance.contactEmail}</span>}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              disabled={isPending}
                              onClick={() => toggleMutation.mutate({ district: entrance.district, blok: entrance.blok, vhod: entrance.vhod, isApproved: !isApproved })}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isApproved ? "bg-green-500" : "bg-yellow-400"} ${isPending ? "opacity-50" : ""}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isApproved ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                            <button
                              disabled={deleteMutation.isPending}
                              onClick={() => {
                                if (window.confirm(`Изтриване на Вх. ${entrance.vhod}, ${entrance.blok}, ${entrance.district}?`)) {
                                  deleteMutation.mutate({ district: entrance.district, blok: entrance.blok, vhod: entrance.vhod });
                                }
                              }}
                              className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-600 text-gray-500 transition-colors text-xs font-bold"
                              title="Изтрий вход"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab 4: Credits ───────────────────────────────────────────────────────────
function CreditsTab() {
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState<{ openId: string; name: string | null } | null>(null);
  const [amount, setAmount] = useState("");
  const [creditType, setCreditType] = useState<"standard" | "recycling">("standard");
  const [operation, setOperation] = useState<"add" | "deduct">("add");
  const [note, setNote] = useState("");

  const { data: users } = trpc.users.list.useQuery();
  const { data: transactions } = trpc.credits.allTransactions.useQuery();
  const addCredits = trpc.credits.adminAdd.useMutation({
    onSuccess: () => { toast.success("Кредитите са обновени"); setAmount(""); setNote(""); setSelectedUser(null); setSearchEmail(""); },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredUsers = users?.filter(u =>
    u.email?.toLowerCase().includes(searchEmail.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchEmail.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Управление на кредити</h2>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">Добави / Отнеми кредити на потребител</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Търси потребител</label>
            <Input
              placeholder="Имейл или име..."
              value={searchEmail}
              onChange={e => { setSearchEmail(e.target.value); setSelectedUser(null); }}
              className="rounded-xl"
            />
          </div>

          {searchEmail && !selectedUser && filteredUsers.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {filteredUsers.slice(0, 5).map(u => (
                <button key={u.openId}
                  onClick={() => { setSelectedUser({ openId: u.openId, name: u.name }); setSearchEmail(u.email ?? u.name ?? ""); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex justify-between items-center">
                  <span className="font-medium text-gray-800">{u.name}</span>
                  <span className="text-sm text-gray-500">{u.email}</span>
                </button>
              ))}
            </div>
          )}

          {selectedUser && (
            <div className="bg-green-50 rounded-xl p-3 flex items-center justify-between border border-green-200">
              <span className="text-green-800 font-medium">✓ {selectedUser.name}</span>
              <button onClick={() => { setSelectedUser(null); setSearchEmail(""); }} className="text-green-600 text-sm hover:text-green-700">Смени</button>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Операция</label>
              <select value={operation} onChange={e => setOperation(e.target.value as "add" | "deduct")}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                <option value="add">Добави</option>
                <option value="deduct">Отнеми</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Вид кредит</label>
              <select value={creditType} onChange={e => setCreditType(e.target.value as "standard" | "recycling")}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                <option value="standard">Стандартни</option>
                <option value="recycling">Разделно</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Брой кредити</label>
              <Input type="number" min="1" step="1" placeholder="1" value={amount}
                onChange={e => setAmount(e.target.value ? String(Math.max(1, Math.floor(Number(e.target.value)))) : "")} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Бележка</label>
              <Input placeholder="Причина..." value={note} onChange={e => setNote(e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <Button
            onClick={() => {
              if (!selectedUser || !amount) return;
              addCredits.mutate({
                userOpenId: selectedUser.openId,
                amount: parseFloat(amount) * (operation === "deduct" ? -1 : 1),
                creditType,
                note,
              });
            }}
            disabled={!selectedUser || !amount || addCredits.isPending}
            className="bg-green-600 hover:bg-green-700 rounded-xl"
          >
            {addCredits.isPending ? "Обработва се..." : operation === "add" ? "Добави кредити" : "Отнеми кредити"}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">История на всички транзакции</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {transactions?.slice().reverse().map(tx => (
            <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                {(tx as any).userName && (
                  <span className="text-xs font-semibold text-gray-600 block">{(tx as any).userName}{(tx as any).userEmail ? ` (${(tx as any).userEmail})` : ""}</span>
                )}
                <span className="text-sm font-medium text-gray-800">
                  {tx.type === "purchase" ? "Покупка" :
                   tx.type === "admin_add" ? "Добавено от Админ" :
                   tx.type === "admin_deduct" ? "Отнето от Админ" :
                   tx.type === "transfer_in" ? "Получен трансфер" :
                   tx.type === "transfer_out" ? "Изпратен трансфер" :
                   tx.type === "deduction" ? "Изразходвано" : "Бонус"}
                </span>
                <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString("bg-BG")}</p>
                {tx.note && <p className="text-xs text-gray-500">{tx.note}</p>}
                {tx.type === "purchase" && (tx.purchaseDistrict || tx.purchaseBlok || tx.purchaseVhod) && (
                  <p className="text-xs text-blue-600 mt-0.5">
                    📍 {tx.purchaseDistrict}{tx.purchaseBlok ? `, ${tx.purchaseBlok}` : ""}{tx.purchaseVhod ? `, Вх. ${tx.purchaseVhod}` : ""}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className={`font-semibold ${parseFloat(tx.totalAmount) >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {parseFloat(tx.totalAmount) >= 0 ? "+" : ""}{tx.totalAmount}
                </span>
                <p className="text-xs text-gray-400">{tx.creditType === "standard" ? "стандартни" : "разделно"}</p>
              </div>
            </div>
          ))}
          {!transactions?.length && <p className="text-sm text-gray-400 text-center py-4">Няма транзакции</p>}
        </div>
      </div>
    {/* Управление на цени */}
      <PricesTab />
    </div>
  );
}

function PricesTab() {
  const { data: allSettings } = trpc.settings.getAll.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
  const updateSetting = trpc.settings.update.useMutation({
    onSuccess: () => toast.success("Цената е обновена!"),
    onError: (e: any) => toast.error(e.message),
  });

  const prices = [
    { key: "price_std_1", label: "Стандартен кредит — 1 бр.", oldKey: "price_std_1_old" },
    { key: "price_std_10", label: "Стандартен кредит — 10 бр.", oldKey: "price_std_10_old" },
    { key: "price_std_20", label: "Стандартен кредит — 20 бр.", oldKey: "price_std_20_old" },
    { key: "price_rec_1", label: "Рециклиращ кредит — 1 бр.", oldKey: "price_rec_1_old" },
    { key: "price_rec_10", label: "Рециклиращ кредит — 10 бр.", oldKey: "price_rec_10_old" },
    { key: "price_rec_20", label: "Рециклиращ кредит — 20 бр.", oldKey: "price_rec_20_old" },
  ];

  const subPrices = [
    { key: "price_sub_std_15", label: "Абонамент Стандартен — 15 посещения", oldKey: "price_sub_std_15_old" },
    { key: "price_sub_std_30", label: "Абонамент Стандартен — 30 посещения", oldKey: "price_sub_std_30_old" },
    { key: "price_sub_rec_15", label: "Абонамент Рециклиращ — 15 посещения", oldKey: "price_sub_rec_15_old" },
    { key: "price_sub_rec_30", label: "Абонамент Рециклиращ — 30 посещения", oldKey: "price_sub_rec_30_old" },
  ];

  const [vals, setVals] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (allSettings) {
      const merged: Record<string, string> = {
        price_std_1: "0.69", price_std_1_old: "0.90",
        price_std_10: "6.90", price_std_10_old: "8.60",
        price_std_20: "13.80", price_std_20_old: "17.20",
        price_rec_1: "0.99", price_rec_1_old: "1.30",
        price_rec_10: "9.90", price_rec_10_old: "12.40",
        price_rec_20: "19.80", price_rec_20_old: "24.70",
        price_sub_std_15: "8.99", price_sub_std_15_old: "11.90",
        price_sub_std_30: "17.99", price_sub_std_30_old: "23.90",
        price_sub_rec_15: "11.99", price_sub_rec_15_old: "15.90",
        price_sub_rec_30: "21.99", price_sub_rec_30_old: "28.90",
      };
      Object.entries(allSettings).forEach(([k, v]) => { merged[k] = v; });
      setVals(merged);
    }
  }, [allSettings]);

  const handleSave = (key: string, oldKey: string) => {
    const price = parseFloat(vals[key]);
    const oldPrice = parseFloat(vals[oldKey]);
    if (isNaN(price) || price <= 0) { toast.error("Невалидна цена"); return; }
    if (isNaN(oldPrice) || oldPrice <= 0) { toast.error("Невалидна стара цена"); return; }
    const discount = Math.round((1 - price / oldPrice) * 100);
    if (discount < 0) { toast.error("Крайната цена трябва да е по-малка от оригиналната!"); return; }
    updateSetting.mutate({ key, value: vals[key] });
    updateSetting.mutate({ key: oldKey, value: vals[oldKey] });
    toast.success(`Запазено! Отстъпка: ${discount}%`);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
      <h3 className="font-semibold text-gray-800">Управление на цени и промоции</h3>
      <p className="text-xs text-gray-500">Въведете оригиналната цена и крайната цена. Отстъпката се изчислява автоматично.</p>
      <div className="space-y-4">
        {prices.map(({ key, label, oldKey }) => {
          const price = parseFloat(vals[key] ?? "0");
          const oldPrice = parseFloat(vals[oldKey] ?? "0");
          const discount = oldPrice > 0 && price > 0 ? Math.round((1 - price / oldPrice) * 100) : 0;
          return (
            <div key={key} className="border border-gray-100 rounded-xl p-3 space-y-2">
              <p className="text-sm font-medium text-gray-700">{label}</p>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <label className="text-xs text-gray-500">Оригинална цена (€)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={vals[oldKey] ?? ""}
                    onChange={e => setVals(v => ({ ...v, [oldKey]: e.target.value }))}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Крайна цена (€)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={vals[key] ?? ""}
                    onChange={e => setVals(v => ({ ...v, [key]: e.target.value }))}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <span className={`text-sm font-bold ${discount > 0 ? "text-red-500" : "text-gray-400"}`}>
                    {discount > 0 ? `-${discount}%` : "—"}
                  </span>
                  <Button size="sm" className="rounded-lg bg-primary text-white text-xs"
                    onClick={() => handleSave(key, oldKey)}
                    disabled={updateSetting.isPending}>
                    Запази
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <h3 className="font-semibold text-gray-800 mt-6">Абонаментни цени</h3>
      <div className="space-y-4">
        {subPrices.map(({ key, label, oldKey }) => {
          const price = parseFloat(vals[key] ?? "0");
          const oldPrice = parseFloat(vals[oldKey] ?? "0");
          const discount = oldPrice > 0 && price > 0 && price < oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;
          return (
            <div key={key} className="border border-gray-100 rounded-xl p-3 space-y-2">
              <p className="text-sm font-medium text-gray-700">{label}</p>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <label className="text-xs text-gray-500">Оригинална цена (€)</label>
                  <input type="number" step="0.01" min="0" value={vals[oldKey] ?? ""}
                    onChange={e => setVals(v => ({ ...v, [oldKey]: e.target.value }))}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Крайна цена (€)</label>
                  <input type="number" step="0.01" min="0" value={vals[key] ?? ""}
                    onChange={e => setVals(v => ({ ...v, [key]: e.target.value }))}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="flex items-end gap-2">
                  <span className={`text-sm font-bold ${discount > 0 ? "text-red-500" : "text-gray-400"}`}>
                    {discount > 0 ? `-${discount}%` : "—"}
                  </span>
                  <Button size="sm" className="rounded-lg bg-primary text-white text-xs"
                    onClick={() => handleSave(key, oldKey)}
                    disabled={updateSetting.isPending}>
                    Запази
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab 5: Requests
function RequestsTab() {
  const [view, setView] = useState<"active" | "completed">("active");
  const adminSession = typeof window !== "undefined" ? localStorage.getItem("admin_session") : null;
  const [openDates, setOpenDates] = useState<Set<string>>(new Set());
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const { data: citiesData } = trpc.cities.list.useQuery();
  const { data: districtsData } = trpc.districts.listAll.useQuery();
  const districtCityMap = new Map<string, number>();
  (districtsData ?? []).forEach((d: any) => districtCityMap.set(d.name, d.cityId));
  const { data: allRequests, refetch: refetchRequests } = trpc.requests.listAll.useQuery();
  const cancelRequest = trpc.requests.adminCancel.useMutation({
    onSuccess: () => { toast.success("Заявката е отказана"); refetchRequests(); },
    onError: (e: any) => toast.error(e.message),
  });
  const adminCompleteRequest = trpc.requests.adminComplete.useMutation({
    onSuccess: () => { toast.success("Заявката е приключена ръчно!"); refetchRequests(); },
    onError: (e: any) => toast.error(e.message),
  });

  const cityFilter = (r: any) => !selectedCityId || districtCityMap.get(r.district) === selectedCityId;
  const active = (allRequests?.filter(r => r.status === "pending") ?? []).filter(cityFilter);
  const completed = (allRequests?.filter(r => r.status === "completed") ?? []).filter(cityFilter);

  const completedByDate: { date: string; label: string; items: typeof completed }[] = (() => {
    const map: Record<string, typeof completed> = {};
    for (const r of completed) {
      const key = new Date(r.createdAt).toLocaleDateString("bg-BG", { year: "numeric", month: "2-digit", day: "2-digit" });
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return Object.entries(map)
      .sort(([a], [b]) => {
        const parse = (s: string) => { const [d, m, y] = s.split("."); return new Date(`${y}-${m}-${d}`).getTime(); };
        return parse(b) - parse(a);
      })
      .map(([date, items]) => ({ date, label: date, items }));
  })();

  const toggleDate = (date: string) => {
    setOpenDates(prev => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  };

  const grouped: Record<string, Record<string, Record<string, typeof active>>> = {};
  for (const r of active) {
    if (!grouped[r.district]) grouped[r.district] = {};
    if (!grouped[r.district][r.blok]) grouped[r.district][r.blok] = {};
    if (!grouped[r.district][r.blok][r.vhod]) grouped[r.district][r.blok][r.vhod] = [];
    grouped[r.district][r.blok][r.vhod].push(r);
  }

  const typeLabel: Record<string, string> = {
    standard: "Стандартен", recycling: "Разделно",
    nonstandard: "Нестандартен", construction: "Строителен",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-900">Управление на заявки</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCityId(null)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              selectedCityId === null ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Всички градове
          </button>
          {citiesData?.map((city: any) => (
            <button
              key={city.id}
              onClick={() => setSelectedCityId(city.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                selectedCityId === city.id ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {city.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant={view === "active" ? "default" : "outline"} size="sm" onClick={() => setView("active")}
            className={`rounded-xl ${view === "active" ? "bg-green-600 hover:bg-green-700" : ""}`}>
            Активни ({active.length})
          </Button>
          <Button variant={view === "pending_payment" ? "default" : "outline"} size="sm" onClick={() => setView("pending_payment" as any)}
            className={`rounded-xl ${view === "pending_payment" ? "bg-red-600 hover:bg-red-700" : ""}`}>
            ⚠️ Задължения ({allRequests?.filter(r => r.status === "pending_payment").length ?? 0})
          </Button>
        </div>
      </div>

      {view === "active" && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([district, bloks]) => (
            <div key={district} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-green-700 px-4 py-2.5">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4" />{district}
                </h3>
              </div>
              {Object.entries(bloks).map(([blok, vhods]) => (
                <div key={blok} className="border-b border-gray-100 last:border-0">
                  <div className="px-4 py-2 bg-gray-50 font-medium text-gray-700 text-sm flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />{blok}
                  </div>
                  {Object.entries(vhods).map(([vhod, reqs]) => (
                    <div key={vhod} className="px-4 py-3 border-t border-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-600">Вх. {vhod}</span>
                        <Badge variant="secondary" className="text-xs">{reqs.length} {reqs.length === 1 ? "заявка" : "заявки"}</Badge>
                      </div>
                      <div className="pl-5 space-y-1.5">
                        {reqs.map(r => (
                          <div key={r.id} className={`rounded-lg px-2 py-2 text-sm ${r.hasProblem ? 'bg-red-50 border border-red-200' : ''}`}>
                            <div className="flex items-center justify-between">
                              <span className={r.hasProblem ? 'text-red-700 font-medium' : 'text-gray-700'}>
                                {r.hasProblem && '⚠️ '}Ап. {r.apartament}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{typeLabel[r.type] ?? r.type}</Badge>
                                {r.contactPhone && (
                                  <a href={`tel:${r.contactPhone}`} className="text-green-600 hover:text-green-700">
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                            {r.hasProblem && r.problemDescription && (
                              <p className="text-xs text-red-600 mt-0.5">{r.problemDescription}</p>
                            )}
                            {/* Description + Image for nonstandard/construction */}
                            {(r.type === "nonstandard" || r.type === "construction") && (r as any).description && (
                              <p className="text-xs text-gray-600 mt-1 italic">"{(r as any).description}"</p>
                            )}
                            {(r.type === "nonstandard" || r.type === "construction") && (r as any).imageUrl && (
                              <ZoomableImage src={(r as any).imageUrl} alt="Снимка" className="mt-1.5 rounded-lg max-h-20 w-auto object-contain border border-gray-200" />
                            )}
                            {/* Contact info */}
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                              {r.contactPhone && (
                                <a href={`tel:${r.contactPhone}`} className="flex items-center gap-1 hover:text-primary">
                                  <Phone className="w-3 h-3" />{r.contactPhone}
                                </a>
                              )}
                              {r.contactEmail && (
                                <a href={`mailto:${r.contactEmail}`} className="flex items-center gap-1 hover:text-primary">
                                  <Mail className="w-3 h-3" />{r.contactEmail}
                                </a>
                              )}
                            </div>
                            {/* Cancel button */}
                            <button
                              onClick={() => {
                                if (confirm(`Откажи заявка #${r.id}?`)) {
                                  cancelRequest.mutate({ requestId: r.id });
                                }
                              }}
                              className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
                            >
                              Откажи заявката
                            </button>
                            {/* Manual complete button */}
                            <button
                              onClick={() => {
                                if (confirm(`Приключи ръчно заявка #${r.id}? Ще се запише като "Приключена от администратор".`)) {
                                  adminCompleteRequest.mutate({ requestId: r.id });
                                }
                              }}
                              className="mt-1 text-xs text-green-600 hover:text-green-800 underline"
                            >
                              Приключи ръчно
                            </button>
                            {/* Admin quote panel */}
                            {(r.type === "nonstandard" || r.type === "construction") && r.status === "pending" && (
                              <AdminQuotePanel requestId={r.id} />
                            )}
                            {/* Admin chat panel — always visible for nonstandard/construction */}
                            {(r.type === "nonstandard" || r.type === "construction") && (
                              <AdminChatPanel requestId={r.id} adminToken={adminSession ?? ""} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
          {!active.length && (
            <div className="text-center py-12 text-gray-400">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Няма активни заявки</p>
            </div>
          )}
        </div>
      )}

{view === "completed" && (
        <div className="space-y-2">
          {completedByDate.map(({ date, label, items }) => {
            const isOpen = openDates.has(date);
            return (
              <div key={date} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleDate(date)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-gray-800">{label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {items.length} {items.length === 1 ? "заявка" : "заявки"}
                    </Badge>
                  </div>
                  {isOpen
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {items.map(r => (
                      <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-800 text-sm">
                            {r.district}, {r.blok}, Вх. {r.vhod}, Ап. {r.apartament}
                          </span>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {typeLabel[r.type] ?? r.type}
                            {r.contactPhone && (
                              <> · <a href={`tel:${r.contactPhone}`} className="text-green-600 hover:underline">{r.contactPhone}</a></>
                            )}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-700 shrink-0">Завършена</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {!completed.length && (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Няма завършени заявки</p>
            </div>
          )}
        </div>
      )}
      {(view as string) === "pending_payment" && (
        <div className="space-y-3">
          {(allRequests?.filter(r => r.status === "pending_payment") ?? []).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Няма неплатени заявки</p>
            </div>
          ) : (
            allRequests?.filter(r => r.status === "pending_payment").map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-red-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">⚠️ Неплатена</span>
                    <span className="text-sm font-medium">{typeLabel[r.type] ?? r.type}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString("bg-BG")}</span>
                </div>
                <p className="text-sm text-gray-700">{r.district}, {r.blok}, Вх. {r.vhod}, Ет. {r.etaj}, Ап. {r.apartament}</p>
                {(r as any).acceptedQuotePrice && (
                  <p className="text-sm font-bold text-red-700 mt-1">💰 Дължи: {parseFloat((r as any).acceptedQuotePrice).toFixed(2)} €</p>
                )}
                {r.contactPhone && <p className="text-xs text-gray-500 mt-1">📞 {r.contactPhone}</p>}
                {r.contactEmail && <p className="text-xs text-gray-500">✉️ {r.contactEmail}</p>}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      if (confirm(`Освободи задължението за заявка #${r.id}?`)) {
                        cancelRequest.mutate({ requestId: r.id });
                      }
                    }}
                    className="text-xs text-red-500 hover:text-red-700 underline"
                  >
                    Освободи задължението
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── AdminQuotePanel (used inside RequestsTab) ─────────────────────────────────────────────────────────────────────────────────
function AdminQuotePanel({ requestId }: { requestId: number }) {
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState("");
  const { data: quotes = [], isLoading } = trpc.workerQuotes.adminGetForRequest.useQuery({ requestId });

  const acceptMutation = trpc.workerQuotes.adminAccept.useMutation({
    onSuccess: () => {
      toast.success("Офертата е приета!");
      utils.requests.listAll.invalidate();
      utils.workerQuotes.adminGetForRequest.invalidate({ requestId });
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.workerQuotes.adminReject.useMutation({
    onSuccess: () => {
      toast.success("Офертата е отхвърлена. Кредитите са възстановени.");
      utils.requests.listAll.invalidate();
      utils.workerQuotes.adminGetForRequest.invalidate({ requestId });
    },
    onError: (e) => toast.error(e.message),
  });

  const editMutation = trpc.workerQuotes.adminEdit.useMutation({
    onSuccess: () => {
      toast.success("Офертата е обновена!");
      setEditingId(null);
      utils.workerQuotes.adminGetForRequest.invalidate({ requestId });
    },
    onError: (e) => toast.error(e.message),
  });

  const startEdit = (q: any) => {
    setEditingId(q.id);
    setEditPrice(q.price);
    setEditNote(q.note ?? "");
    setEditDate(q.proposedDate ?? "");
  };

  if (isLoading) return <p className="text-xs text-muted-foreground mt-1">Зарежда...</p>;

  const pending = quotes.filter((q: any) => q.status === "pending");
  const all = quotes;

  if (all.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {pending.map((q: any) => (
        <div key={q.id} className="bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs font-semibold text-amber-800">
              <DollarSign className="w-3 h-3" />
              {q.adminEditedBy ? `Оферта (ред. от админ)` : `Оферта от работник`}
            </div>
            {editingId !== q.id && (
              <Button size="sm" variant="ghost" className="h-5 px-1 text-xs text-amber-700"
                onClick={() => startEdit(q)}>
                <Pencil className="w-3 h-3 mr-0.5" />Редактирай
              </Button>
            )}
          </div>

          {editingId === q.id ? (
            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <Input value={editPrice} onChange={e => setEditPrice(e.target.value)}
                  placeholder="Цена (лв.)" className="h-7 text-xs flex-1" />
                <Input value={editDate} onChange={e => setEditDate(e.target.value)}
                  placeholder="Дата (незадълж.)" className="h-7 text-xs flex-1" />
              </div>
              <Input value={editNote} onChange={e => setEditNote(e.target.value)}
                placeholder="Бележка" className="h-7 text-xs" />
              <div className="flex gap-1.5">
                <Button size="sm" className="flex-1 h-6 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={editMutation.isPending}
                  onClick={() => editMutation.mutate({ quoteId: q.id, price: editPrice, note: editNote || undefined, proposedDate: editDate || undefined })}>
                  <Save className="w-3 h-3 mr-1" />Запази
                </Button>
                <Button size="sm" variant="outline" className="flex-1 h-6 text-xs"
                  onClick={() => setEditingId(null)}>
                  <X className="w-3 h-3 mr-1" />Откажи
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900">{q.price} лв.</span>
                <span className="text-xs text-amber-700">{q.workerName}</span>
              </div>
              {q.proposedDate && (
                <div className="flex items-center gap-1 text-xs text-amber-700">
                  <CalendarDays className="w-3 h-3" />
                  {new Date(q.proposedDate).toLocaleString("bg-BG", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              )}
              {q.note && <p className="text-xs text-amber-800 italic">"{q.note}"</p>}
              {q.adminEditedBy && (
                <p className="text-xs text-blue-600">Редактирано от: {q.adminEditedBy}</p>
              )}
              <div className="flex gap-1.5 pt-0.5">
                <Button size="sm" className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs h-6 px-2"
                  disabled={acceptMutation.isPending || rejectMutation.isPending}
                  onClick={() => acceptMutation.mutate({ quoteId: q.id })}>
                  <CheckCheck className="w-3 h-3 mr-1" />Приеми
                </Button>
                <Button size="sm" variant="outline" className="flex-1 rounded-lg text-red-600 border-red-200 hover:bg-red-50 text-xs h-6 px-2"
                  disabled={acceptMutation.isPending || rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate({ quoteId: q.id })}>
                  <X className="w-3 h-3 mr-1" />Отхвърли
                </Button>
              </div>
            </>
          )}
        </div>
      ))}
      {/* Show accepted/rejected quotes as status badges */}
      {quotes.filter((q: any) => q.status !== "pending").map((q: any) => (
        <div key={q.id} className="flex items-center gap-2 text-xs text-gray-500">
          <DollarSign className="w-3 h-3" />
          <span>{q.workerName}: {q.price} лв.{q.adminEditedBy ? " (ред. от админ)" : ""}</span>
          <Badge variant="outline" className={q.status === "accepted" ? "text-green-700 border-green-300" : "text-gray-400"}>
            {q.status === "accepted" ? "Приета" : "Отхвърлена"}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ─── AdminChatPanel (bidirectional chat for admin) ─────────────────────────────
function AdminChatPanel({ requestId, adminToken }: { requestId: number; adminToken: string }) {
  const utils = trpc.useUtils();
  const [msg, setMsg] = useState("");
  const { data: messages = [], isLoading } = trpc.requestMessages.getForRequest.useQuery(
    { requestId, adminToken },
    { refetchInterval: 10000 },
  );
  const sendMutation = trpc.requestMessages.sendAsAdmin.useMutation({
    onSuccess: () => {
      setMsg("");
      utils.requestMessages.getForRequest.invalidate({ requestId, adminToken });
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return null;

  const roleLabel: Record<string, string> = { client: "Клиент", worker: "Работник", admin: "Админ" };
  const roleBg: Record<string, string> = { client: "bg-blue-50 border-blue-200", worker: "bg-green-50 border-green-200", admin: "bg-purple-50 border-purple-200" };

  return (
    <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600 flex items-center gap-1">
        <Send className="w-3 h-3" />Чат ({messages.length})
      </div>
      {messages.length > 0 && (
        <div className="max-h-40 overflow-y-auto p-2 space-y-1.5">
          {messages.map((m: any) => (
            <div key={m.id} className={`rounded p-1.5 border text-xs ${roleBg[m.senderRole] ?? "bg-gray-50 border-gray-200"}`}>
              <span className="font-semibold">{roleLabel[m.senderRole] ?? m.senderRole}{m.senderName ? ` (${m.senderName})` : ""}: </span>
              <span>{m.message}</span>
              <span className="block text-gray-400 text-[10px] mt-0.5">{new Date(m.createdAt).toLocaleString("bg-BG")}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1.5 p-2 border-t border-gray-100">
        <Input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Напишете съобщение..." className="h-7 text-xs flex-1"
          onKeyDown={e => { if (e.key === "Enter" && msg.trim()) sendMutation.mutate({ requestId, message: msg.trim() }); }} />
        <Button size="sm" className="h-7 px-2 text-xs bg-purple-600 hover:bg-purple-700 text-white"
          disabled={!msg.trim() || sendMutation.isPending}
          onClick={() => sendMutation.mutate({ requestId, message: msg.trim() })}>
          <Send className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Tab 6: Content ─────────────────────────────────────────────────────────────────────────────────
function ContentTab() {
  const [phone, setPhone] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: settings, refetch } = trpc.settings.getAll.useQuery();
  const updateSetting = trpc.settings.update.useMutation({ onSuccess: () => { toast.success("Запазено успешно"); refetch(); setEditingKey(null); }, onError: (e: any) => toast.error(e.message) });
  const changeCredentials = trpc.adminAuth.changeCredentials.useMutation({
    onSuccess: () => {
      toast.success("Данните са обновени. Моля влезте отново.");
      localStorage.removeItem("admin_session");
      window.location.href = "/admin/login";
    },
    onError: (e) => toast.error(e.message),
  });

  const currentPhone = (settings as any)?.["contact_phone"] ?? "";

  const contentItems = [
    { key: "credit_standard_desc", label: "Описание — Стандартни кредити", placeholder: "1 кредит = 1 плик до ~4кг битов отпадък" },
    { key: "credit_recycling_desc", label: "Описание — Кредити за разделно", placeholder: "3 плика разделно = 1 кредит за разделно събиране" },
    { key: "homepage_subtitle", label: "Подзаглавие на началната страница", placeholder: "Вашият надежден партньор за управление на отпадъци" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Управление на съдържанието</h2>

      {/* Contact phone */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Phone className="w-4 h-4 text-green-600" />Телефон за контакт
        </h3>
        <p className="text-sm text-gray-500 mb-4">Показва се в футъра на всички страници</p>
        <div className="flex gap-2">
          <Input placeholder={currentPhone || "+359 88 888 8888"} value={phone} onChange={e => setPhone(e.target.value)}
            className="rounded-xl flex-1" />
          <Button onClick={() => updateSetting.mutate({ key: "contact_phone", value: phone })}
            disabled={!phone || updateSetting.isPending} className="bg-green-600 hover:bg-green-700 rounded-xl">
            <Save className="w-4 h-4 mr-1" />Запази
          </Button>
        </div>
        {currentPhone && <p className="text-xs text-gray-400 mt-2">Текущ: {currentPhone}</p>}
      </div>

      {/* Content descriptions */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Pencil className="w-4 h-4 text-green-600" />Описания и текстове
        </h3>
        <div className="space-y-4">
          {contentItems.map(({ key, label, placeholder }) => {
            const current = (settings as any)?.[key] ?? "";
            const isEditing = editingKey === key;
            return (
              <div key={key} className="border border-gray-100 rounded-xl p-3">
                <label className="text-sm font-medium text-gray-700 block mb-2">{label}</label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Input value={editValue} onChange={e => setEditValue(e.target.value)}
                      placeholder={placeholder} className="rounded-xl flex-1" />
                    <Button onClick={() => updateSetting.mutate({ key, value: editValue })}
                      disabled={updateSetting.isPending} className="bg-green-600 hover:bg-green-700 rounded-xl">
                      Запази
                    </Button>
                    <Button variant="outline" onClick={() => setEditingKey(null)} className="rounded-xl">Отказ</Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{current || <span className="text-gray-400 italic">{placeholder}</span>}</span>
                    <button onClick={() => { setEditingKey(key); setEditValue(current); }}
                      className="text-green-600 hover:text-green-700 ml-2">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin credentials */}
      <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />Смяна на администраторски данни
        </h3>
        <p className="text-sm text-amber-600 mb-4">⚠ След смяна ще трябва да влезете отново. Достъпът с admin/admin ще бъде блокиран автоматично.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Ново потребителско име</label>
            <Input placeholder="Ново потр. име" value={adminUsername} onChange={e => setAdminUsername(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Текуща парола</label>
            <Input type="password" placeholder="Текуща парола" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Нова парола</label>
            <Input type="password" placeholder="Нова парола" value={adminNewPassword} onChange={e => setAdminNewPassword(e.target.value)} className="rounded-xl" />
          </div>
        </div>
        <Button
          onClick={() => changeCredentials.mutate({ newUsername: adminUsername, currentPassword: adminPassword, newPassword: adminNewPassword, adminToken: localStorage.getItem("admin_session") ?? "" })}
          disabled={!adminUsername || !adminPassword || !adminNewPassword || changeCredentials.isPending}
          className="mt-3 bg-amber-600 hover:bg-amber-700 rounded-xl"
        >
          {changeCredentials.isPending ? "Обновява се..." : "Обнови данните"}
        </Button>
      </div>
      <AdditionalAdminsSection />
    </div>
  );
}

function AdditionalAdminsSection() {
  const originalToken = typeof window !== "undefined" ? localStorage.getItem("admin_session") ?? "" : "";
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { data: additionalAdmins = [], refetch } = trpc.adminAuth.listAdditional.useQuery(
    { originalAdminToken: originalToken },
    { enabled: !!originalToken }
  );
  const createAdmin = trpc.adminAuth.createAdmin.useMutation({
    onSuccess: () => {
      toast.success("Администраторът е създаден");
      setName(""); setUsername(""); setPassword(""); setShowCreate(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const setActive = trpc.adminAuth.setAdditionalActive.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-600" />Допълнителни администратори
        </h3>
        <Button onClick={() => setShowCreate(!showCreate)} size="sm" className="bg-green-600 hover:bg-green-700 rounded-xl">
          <Plus className="w-4 h-4 mr-1" />Нов
        </Button>
      </div>
      {showCreate && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <Input placeholder="Пълно име" value={name} onChange={e => setName(e.target.value)} className="rounded-xl" />
          <Input placeholder="Потребителско име" value={username} onChange={e => setUsername(e.target.value)} className="rounded-xl" />
          <Input type="password" placeholder="Парола (мин. 6 симв.)" value={password} onChange={e => setPassword(e.target.value)} className="rounded-xl" />
          <Button
            onClick={() => createAdmin.mutate({ originalAdminToken: originalToken, name, username, password })}
            disabled={!name || !username || password.length < 6 || createAdmin.isPending}
            className="bg-green-600 hover:bg-green-700 rounded-xl md:col-span-3"
          >
            Създай
          </Button>
        </div>
      )}
      <div className="space-y-2">
        {additionalAdmins.map((a: any) => (
          <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
            <div>
              <span className="font-medium text-sm">{a.name}</span>
              <span className="text-xs text-gray-500 ml-2">@{a.username}</span>
              <Badge variant={a.isActive ? "default" : "secondary"} className="text-xs ml-2">{a.isActive ? "Активен" : "Неактивен"}</Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              className={`rounded-xl ${a.isActive ? "text-orange-600 border-orange-200" : "text-green-600 border-green-200"}`}
              onClick={() => setActive.mutate({ originalAdminToken: originalToken, id: a.id, isActive: !a.isActive })}
            >
              {a.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
            </Button>
          </div>
        ))}
        {additionalAdmins.length === 0 && <p className="text-sm text-gray-400 text-center py-2">Няма допълнителни администратори</p>}
      </div>
    </div>
  );
}

// ─── Tab 8: Activity Descriptions ───────────────────────────────────────────
const ACTIVITY_KEYS = [
  { key: "standard", label: "Стандартен битов отпадък", icon: "🗑️" },
  { key: "recycling", label: "Разделно изхвърляне", icon: "♻️" },
  { key: "nonstandard", label: "Нестандартен битов отпадък", icon: "📦" },
  { key: "construction", label: "Строителен отпадък", icon: "👷" },
  { key: "entrances", label: "Почистване на вход", icon: "🏢" },
  { key: "residence", label: "Жилища", icon: "🏠" },
  { key: "other", label: "Друго", icon: "ℹ️" },
  { key: "subscription_standard", label: "Абонамент — Стандартен", icon: "📅" },
  { key: "subscription_recycling", label: "Абонамент — Рециклиращ", icon: "♻️" },
];
function DescriptionsTab() {
  const { data: descriptions, refetch } = trpc.activityDescriptions.getAll.useQuery();
  const upsert = trpc.activityDescriptions.upsert.useMutation({
    onSuccess: () => { toast.success("Описанието е запазено!"); refetch(); setEditingKey(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const descMap: Record<string, string> = {};
  if (descriptions && !Array.isArray(descriptions)) {
    Object.assign(descMap, descriptions);
  } else if (Array.isArray(descriptions)) {
    descriptions.forEach((d: any) => { descMap[d.activityKey] = d.description; });
  }
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Описания на дейности</h2>
      <p className="text-sm text-gray-500">Добавете допълнителна информация към всяка дейност. Тя ще се показва на клиентите при избор на услуга.</p>
      {ACTIVITY_KEYS.map(({ key, label, icon }) => {
        const current = descMap[key] ?? "";
        const isEditing = editingKey === key;
        return (
          <div key={key} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-xl">{icon}</span>{label}
              </h3>
              {!isEditing && (
                <button
                  onClick={() => { setEditingKey(key); setEditValue(current); }}
                  className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  <Pencil className="w-3.5 h-3.5" />{current ? "Редактирай" : "Добави"}
                </button>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={`Допълнителна информация за ${label.toLowerCase()}...`}
                  rows={4}
                  className="rounded-xl"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => upsert.mutate({ activityKey: key, description: editValue })}
                    disabled={upsert.isPending}
                    className="bg-green-600 hover:bg-green-700 rounded-xl"
                  >
                    <Save className="w-4 h-4 mr-1" />Запази
                  </Button>
                  <Button variant="outline" onClick={() => setEditingKey(null)} className="rounded-xl">Отказ</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 leading-relaxed">
                {current || <span className="text-gray-400 italic">Няма описание още.</span>}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab 7: Problems ──────────────────────────────────────────────────────────
function ProblemsTab() {
  const [selectedProblem, setSelectedProblem] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: problems, refetch } = trpc.problems.list.useQuery();
  const resolve = trpc.problems.resolve.useMutation({ onSuccess: () => { toast.success("Проблемът е разрешен"); refetch(); setSelectedProblem(null); setAdminNotes(""); }, onError: (e: any) => toast.error(e.message) });
 const forward = trpc.problems.forwardToClient.useMutation({ onSuccess: () => { toast.success("Препратено към клиента"); refetch(); setSelectedProblem(null); setAdminNotes(""); }, onError: (e: any) => toast.error(e.message) });
  const reject = trpc.problems.reject.useMutation({ onSuccess: () => { toast.success("Проблемът е отказан"); refetch(); setSelectedProblem(null); setAdminNotes(""); }, onError: (e: any) => toast.error(e.message) });
  const open = problems?.filter(p => p.status === "open") ?? [];

  const statusLabel: Record<string, string> = {
    open: "Отворен", resolved: "Разрешен", forwarded: "Препратен", rejected: "Отказан",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Проблеми от работници</h2>
          <p className="text-sm text-gray-500 mt-0.5">Докладвани проблеми при изпълнение на заявки</p>
        </div>
        {open.length > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {open.length} нерешен{open.length === 1 ? "" : "и"}
          </Badge>
        )}
      </div>

      {!problems?.length && (
        <div className="text-center py-12 text-gray-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Няма докладвани проблеми</p>
        </div>
      )}

      <div className="space-y-3">
        {problems?.map(problem => (
          <div key={problem.id}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${problem.status === "open" ? "border-red-200" : "border-gray-200"}`}>
            <div className={`px-4 py-3 flex items-center justify-between ${problem.status === "open" ? "bg-red-50" : "bg-gray-50"}`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${problem.status === "open" ? "text-red-500" : "text-gray-400"}`} />
                <span className="font-semibold text-gray-900">{problem.workerName ?? "Работник"}</span>
                {problem.requestId && <span className="text-xs text-gray-500">Заявка #{problem.requestId}</span>}
                {(problem.reqDistrict || problem.reqBlok) && (
                  <span className="text-xs text-gray-500">
                    {[problem.reqDistrict, problem.reqBlok && `${problem.reqBlok}`, problem.reqVhod && `Вх. ${problem.reqVhod}`, problem.reqEtaj && `Ет. ${problem.reqEtaj}`, problem.reqApartament && `Ап. ${problem.reqApartament}`].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={problem.status === "open" ? "destructive" : "secondary"}>
                  {statusLabel[problem.status] ?? problem.status}
                </Badge>
                <span className="text-xs text-gray-400">{new Date(problem.createdAt).toLocaleDateString("bg-BG")}</span>
              </div>
            </div>

            <div className="p-4">
              <p className="text-gray-700 text-sm">{problem.description}</p>
              {problem.imageUrl && (
                <img src={problem.imageUrl} alt="Снимка на проблема"
                  className="mt-3 rounded-xl max-h-48 object-cover border border-gray-200" />
              )}
              {problem.adminNotes && (
                <div className="mt-3 p-3 bg-blue-50 rounded-xl text-sm text-blue-800">
                  <strong>Бележка:</strong> {problem.adminNotes}
                </div>
              )}

              {problem.status === "open" && (
                <div className="mt-4 space-y-3">
                  {selectedProblem === problem.id ? (
                    <>
                      <Input placeholder="Бележка (незадължително)..." value={adminNotes}
                        onChange={e => setAdminNotes(e.target.value)} className="rounded-xl" />
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" onClick={() => resolve.mutate({ id: problem.id, adminNotes })}
                          disabled={resolve.isPending} className="bg-green-600 hover:bg-green-700 rounded-xl">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />Разреши
                        </Button>
                        <Button size="sm" variant="outline"
                          onClick={() => forward.mutate({ id: problem.id, adminNotes })}
                          disabled={forward.isPending}
                          className="rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50">
                          <Send className="w-3.5 h-3.5 mr-1" />Препрати към клиента
                        </Button>
                        <Button size="sm" variant="ghost"
  onClick={() => reject.mutate({ id: problem.id })}
  disabled={reject.isPending}
  className="rounded-xl text-red-600 hover:bg-red-50">
  <XCircle className="w-3.5 h-3.5 mr-1" />Откажи спора
</Button>
                      </div>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setSelectedProblem(problem.id)} className="rounded-xl">
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />Действие
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Clients ─────────────────────────────────────────────────────────────
function ClientsTab() {
  const { data: clients, isLoading } = trpc.users.listClients.useQuery();
  const { data: allRequests, refetch: refetchRequests } = trpc.requests.listAll.useQuery();
  const [search, setSearch] = useState("");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [creditAmounts, setCreditAmounts] = useState<Record<string, string>>({});
  const [creditTypes, setCreditTypes] = useState<Record<string, "standard" | "recycling">>({});
  const [creditOps, setCreditOps] = useState<Record<string, "add" | "deduct">>({});
  const [newPasswords, setNewPasswords] = useState<Record<string, string>>({});

  const utils = trpc.useUtils();

  const resetPassword = trpc.users.resetClientPassword.useMutation({
    onSuccess: (_, vars) => {
      toast.success("Паролата е сменена успешно");
      setNewPasswords(prev => ({ ...prev, [vars.userOpenId]: "" }));
    },
    onError: (e) => toast.error(e.message),
  });

  const adminAdd = trpc.credits.adminAdd.useMutation({
    onSuccess: () => {
      toast.success("Кредитите са актуализирани");
      utils.users.listClients.invalidate();
      utils.credits.userTransactions.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (clients ?? []).filter(c => {
    const q = search.toLowerCase();
    return (
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q)
    );
  });

  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDate = (d: Date | string) => {
    const date = new Date(d);
    return date.toLocaleDateString("bg-BG", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatTxType = (type: string) => {
    const map: Record<string, string> = {
      purchase: "Покупка",
      transfer_in: "Получен трансфер",
      transfer_out: "Изпратен трансфер",
      deduction: "Изразходвани",
      bonus: "Бонус",
      admin_add: "Добавено от админ",
      admin_deduct: "Отнето от админ",
    };
    return map[type] ?? type;
  };

  const formatReqType = (type: string) => {
    const map: Record<string, string> = {
      standard: "Стандартен",
      recycling: "Разделно",
      nonstandard: "Нестандартен",
      construction: "Строителни",
    };
    return map[type] ?? type;
  };

  const formatReqStatus = (status: string) => {
    const map: Record<string, string> = {
      pending: "Изчаква",
      assigned: "Назначена",
      completed: "Завършена",
      cancelled: "Отменена",
    };
    return map[status] ?? status;
  };

  const statusColor = (status: string) => {
    if (status === "completed") return "bg-green-100 text-green-700";
    if (status === "cancelled") return "bg-red-100 text-red-600";
    if (status === "assigned") return "bg-blue-100 text-blue-700";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Клиенти</h2>
          <p className="text-sm text-gray-500 mt-0.5">{clients?.length ?? 0} регистрирани клиента</p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Търсене по име или имейл..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{search ? "Няма намерени клиенти." : "Няма регистрирани клиенти."}</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(client => {
          const isExpanded = expandedClient === client.openId;
          const clientRequests = (allRequests ?? []).filter(r => r.userOpenId === client.openId);
          const completedCount = clientRequests.filter(r => r.status === "completed").length;
          const stdCredits = parseFloat(client.creditsStandard ?? "0");
          const recCredits = parseFloat(client.creditsRecycling ?? "0");
          const creditType = creditTypes[client.openId] ?? "standard";
          const creditOp = creditOps[client.openId] ?? "add";
          const creditAmount = creditAmounts[client.openId] ?? "";

          return (
            <div key={client.openId} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Client row */}
              <div
                className="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedClient(isExpanded ? null : client.openId)}
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-xl bg-green-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                  {getInitials(client.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 truncate">{client.name ?? "—"}</span>
                    {client.email && <span className="text-xs text-gray-400 truncate">{client.email}</span>}
                    {client.phone && <span className="text-xs text-gray-400 truncate">📱 {client.phone}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500">Рег. {formatDate(client.createdAt)}</span>
                    <span className="text-xs font-medium text-green-700">🗑️ {stdCredits.toFixed(0)} ст.</span>
                    <span className="text-xs font-medium text-emerald-700">♻️ {recCredits.toFixed(0)} рец.</span>
                    <Badge variant="secondary" className="text-xs">{clientRequests.length} заявки ({completedCount} завършени)</Badge>
                  </div>
                </div>

                {/* Expand icon */}
                <div className="flex-shrink-0 text-gray-400">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-4 space-y-5 bg-gray-50/50">

                  {/* Saved address */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-green-600" />Запазен адрес
                    </h4>
                    {client.addressKvartal ? (
                      <div className="bg-white rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        {[
                          client.addressKvartal,
                          client.addressBlok && `${client.addressBlok}`,
                          client.addressVhod && `Вх. ${client.addressVhod}`,
                          client.addressEtaj && `Ет. ${client.addressEtaj}`,
                          client.addressApartament && `Ап. ${client.addressApartament}`,
                        ].filter(Boolean).join(", ")}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Няма запазен адрес</p>
                    )}
                  </div>

                  {/* Credit management */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-green-600" />Управление на кредити
                    </h4>
                    <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-3">
                      <div className="flex gap-2 flex-wrap">
                        <select
                          value={creditOp}
                          onChange={e => setCreditOps(prev => ({ ...prev, [client.openId]: e.target.value as "add" | "deduct" }))}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                        >
                          <option value="add">Добави</option>
                          <option value="deduct">Отнеми</option>
                        </select>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Брой"
                          value={creditAmount}
                          onChange={e => setCreditAmounts(prev => ({ ...prev, [client.openId]: e.target.value }))}
                          className="w-24 rounded-lg text-sm"
                        />
                        <select
                          value={creditType}
                          onChange={e => setCreditTypes(prev => ({ ...prev, [client.openId]: e.target.value as "standard" | "recycling" }))}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                        >
                          <option value="standard">🗑️ Стандартни</option>
                          <option value="recycling">♻️ Рециклиращи</option>
                        </select>
                        <Button
                          size="sm"
                          className="rounded-xl bg-green-600 hover:bg-green-700"
                          disabled={!creditAmount || parseInt(creditAmount) < 1 || adminAdd.isPending}
                          onClick={() => {
                            const amount = parseInt(creditAmount);
                            if (!amount || amount < 1) return;
                            adminAdd.mutate({
                              userOpenId: client.openId,
                              creditType,
                              amount: creditOp === "deduct" ? -amount : amount,
                            });
                            setCreditAmounts(prev => ({ ...prev, [client.openId]: "" }));
                          }}
                        >
                          {adminAdd.isPending ? "..." : creditOp === "add" ? "Добави" : "Отнеми"}
                        </Button>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>🗑️ Стандартни: <strong>{stdCredits.toFixed(0)}</strong></span>
                        <span>♻️ Рециклиращи: <strong>{recCredits.toFixed(0)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Password reset */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-green-600" />Смяна на парола
                    </h4>
                    <div className="bg-white rounded-xl border border-gray-200 p-3">
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder="Нова парола (мин. 6 символа)"
                          value={newPasswords[client.openId] ?? ""}
                          onChange={e => setNewPasswords(prev => ({ ...prev, [client.openId]: e.target.value }))}
                          className="flex-1 rounded-lg text-sm"
                        />
                        <Button
                          size="sm"
                          className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
                          disabled={
                            !newPasswords[client.openId] ||
                            (newPasswords[client.openId] ?? "").length < 6 ||
                            resetPassword.isPending
                          }
                          onClick={() => {
                            const pwd = newPasswords[client.openId];
                            if (!pwd || pwd.length < 6) return;
                            resetPassword.mutate({ userOpenId: client.openId, newPassword: pwd });
                          }}
                        >
                          {resetPassword.isPending ? "..." : "Смени парола"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Request history */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-green-600" />История на заявките ({clientRequests.length})
                    </h4>
                    {clientRequests.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Няма заявки</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {[...clientRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(r => (
                          <div key={r.id} className="bg-white rounded-xl border border-gray-100 px-3 py-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs text-gray-500 flex-shrink-0">{formatDate(r.createdAt)}</span>
                              <span className="text-sm font-medium text-gray-800 truncate">{formatReqType(r.type)}</span>
                              <span className="text-xs text-gray-400 truncate">{r.district}, {r.blok} Вх.{r.vhod}</span>
                            </div>
                            <Badge className={`text-xs flex-shrink-0 ${statusColor(r.status)}`}>{formatReqStatus(r.status)}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Transaction history */}
                  <ClientTransactionHistory openId={client.openId} formatDate={formatDate} formatTxType={formatTxType} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Sub-component: loads transactions lazily when client is expanded
function ClientTransactionHistory({ openId, formatDate, formatTxType }: {
  openId: string;
  formatDate: (d: Date | string) => string;
  formatTxType: (type: string) => string;
}) {
  const { data: txs, isLoading } = trpc.credits.userTransactions.useQuery({ userOpenId: openId });

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
        <History className="w-3.5 h-3.5 text-green-600" />История на транзакциите
      </h4>
      {isLoading && <div className="h-8 rounded-xl bg-gray-100 animate-pulse" />}
      {!isLoading && (!txs || txs.length === 0) && (
        <p className="text-sm text-gray-400 italic">Няма транзакции</p>
      )}
      {txs && txs.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {[...txs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(tx => (
            <div key={tx.id} className="bg-white rounded-xl border border-gray-100 px-3 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-gray-500 flex-shrink-0">{formatDate(tx.createdAt)}</span>
                <span className="text-sm text-gray-800">{formatTxType(tx.type)}</span>
                {tx.note && <span className="text-xs text-gray-400 truncate">{tx.note}</span>}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`text-sm font-semibold ${parseFloat(tx.totalAmount) >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {parseFloat(tx.totalAmount) >= 0 ? "+" : ""}{parseFloat(tx.totalAmount).toFixed(0)}
                </span>
                <span className="text-xs text-gray-400">{tx.creditType === "standard" ? "🗑️" : "♻️"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SubAdminsTab ─────────────────────────────────────────────────────────────
const ALL_PERMISSION_TABS: { id: string; label: string }[] = [
  { id: "dashboard", label: "Табло" },
  { id: "clients", label: "Клиенти" },
  { id: "workers", label: "Работници" },
  { id: "districts", label: "Квартали" },
  { id: "blocks", label: "Блокове" },
  { id: "credits", label: "Кредити" },
  { id: "requests", label: "Заявки" },
  { id: "content", label: "Съдържание" },
  { id: "descriptions", label: "Описания" },
  { id: "problems", label: "Проблеми" },
  { id: "subscriptions", label: "Абонаменти" },
];
function SubAdminCitiesSection({ subAdminId }: { subAdminId: number }) {
  const { data: allCities = [] } = trpc.cities.list.useQuery();
  const { data: assignedCities = [], refetch } = trpc.subAdmins.getCities.useQuery({ subAdminId });
  const setCities = trpc.subAdmins.setCities.useMutation({
    onSuccess: () => refetch(),
    onError: (e: any) => toast.error(e.message),
  });
  const assignedIds = (assignedCities as any[]).map(c => c.id);
  const toggleCity = (cityId: number) => {
    const updated = assignedIds.includes(cityId)
      ? assignedIds.filter(id => id !== cityId)
      : [...assignedIds, cityId];
    setCities.mutate({ subAdminId, cityIds: updated });
  };
  return (
    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
      <p className="text-xs font-medium text-gray-500 mb-2">Разрешени градове (кликни за промяна)</p>
      <div className="flex flex-wrap gap-2">
        {allCities.map(city => {
          const hasAccess = assignedIds.includes(city.id);
          return (
            <button
              key={city.id}
              type="button"
              onClick={() => toggleCity(city.id)}
              disabled={setCities.isPending || !city.isActive}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                !city.isActive
                  ? "bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed"
                  : hasAccess
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
              }`}
            >
              {hasAccess ? "✓ " : ""}{city.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
function SubAdminsTab() {
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newPermissions, setNewPermissions] = useState<string[]>([]);

  const { data: subAdmins = [], isLoading } = trpc.subAdmins.list.useQuery();

  const createSubAdmin = trpc.subAdmins.create.useMutation({
    onSuccess: () => {
      utils.subAdmins.list.invalidate();
      setShowCreate(false);
      setNewUsername(""); setNewPassword(""); setNewName(""); setNewPermissions([]);
      toast.success("Подадминът е създаден успешно.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePermissions = trpc.subAdmins.updatePermissions.useMutation({
    onSuccess: () => { utils.subAdmins.list.invalidate(); toast.success("Правата са обновени."); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = trpc.subAdmins.toggleActive.useMutation({
    onSuccess: () => { utils.subAdmins.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteSubAdmin = trpc.subAdmins.delete.useMutation({
    onSuccess: () => { utils.subAdmins.list.invalidate(); toast.success("Подадминът е изтрит."); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleNewPermission = (id: string) => {
    setNewPermissions(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const togglePermission = (subAdminId: number, currentPerms: string[], tabId: string) => {
    const updated = currentPerms.includes(tabId)
      ? currentPerms.filter(p => p !== tabId)
      : [...currentPerms, tabId];
    updatePermissions.mutate({ id: subAdminId, permissions: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Подадминистратори</h2>
          <p className="text-sm text-gray-500 mt-0.5">Управление на подадмини и техните права</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="bg-green-600 hover:bg-green-700 rounded-2xl">
          <Plus className="w-4 h-4 mr-2" />
          Нов подадмин
        </Button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-2xl border border-green-200 p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-600" />
            Създай нов подадмин
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Пълно име *</label>
              <Input placeholder="Иван Иванов" value={newName} onChange={e => setNewName(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Потребителско име *</label>
              <Input placeholder="ivan.ivanov" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Парола *</label>
              <Input type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-2 block font-medium">Разрешени табове</label>
            <div className="flex flex-wrap gap-2">
              {ALL_PERMISSION_TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => toggleNewPermission(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                    newPermissions.includes(tab.id)
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-green-400"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{newPermissions.length} от {ALL_PERMISSION_TABS.length} таба избрани</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => createSubAdmin.mutate({ username: newUsername, password: newPassword, name: newName, permissions: newPermissions })}
              disabled={!newName || !newUsername || !newPassword || createSubAdmin.isPending}
              className="bg-green-600 hover:bg-green-700 rounded-xl"
            >
              {createSubAdmin.isPending ? "Създава се..." : "Създай подадмин"}
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl">Отказ</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-500">Зареждане...</p>
      ) : !(subAdmins as any[]).length ? (
        <div className="text-center py-16 text-gray-400">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Няма подадминистратори</p>
          <p className="text-sm mt-1">Създайте нов подадмин с бутона горе.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(subAdmins as any[]).map((sa: any) => (
            <div key={sa.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${sa.isActive ? "border-gray-200" : "border-gray-100 opacity-75"}`}>
              {/* Header */}
              <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${sa.isActive ? "bg-blue-600" : "bg-gray-400"}`}>
                    {sa.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{sa.name}</span>
                      <Badge variant={sa.isActive ? "default" : "secondary"} className="text-xs">
                        {sa.isActive ? "Активен" : "Неактивен"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                      <Lock className="w-3 h-3" />
                      <span>@{sa.username}</span>
                      <span className="text-gray-300">•</span>
                      <span>{(sa.permissions as string[]).length} таба</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive.mutate({ id: sa.id, isActive: !sa.isActive })}
                    className={`rounded-xl ${sa.isActive ? "text-orange-600 border-orange-200 hover:bg-orange-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}
                  >
                    {sa.isActive ? <><PowerOff className="w-3.5 h-3.5 mr-1" />Деактивирай</> : <><Power className="w-3.5 h-3.5 mr-1" />Активирай</>}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { if (confirm(`Изтриване на подадмин "${sa.name}"?`)) deleteSubAdmin.mutate({ id: sa.id }); }}
                    className="rounded-xl text-red-500 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {/* Permissions */}
              <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                <p className="text-xs font-medium text-gray-500 mb-2">Разрешени табове (кликни за промяна)</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_PERMISSION_TABS.map(tab => {
                    const hasPermission = (sa.permissions as string[]).includes(tab.id);
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => togglePermission(sa.id, sa.permissions as string[], tab.id)}
                        disabled={updatePermissions.isPending}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          hasPermission
                            ? "bg-green-600 text-white border-green-600 shadow-sm"
                            : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        {hasPermission ? "✓ " : ""}{tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <SubAdminCitiesSection subAdminId={sa.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Отчети ────────────────────────────────────────────────────────────
function ReportsTab() {
  const { data: allRequests } = trpc.requests.listAll.useQuery();

  // Build list of available months from the data
  const availableMonths = (() => {
    if (!allRequests) return [];
    const set = new Set<string>();
    for (const r of allRequests) {
      const d = new Date(r.createdAt);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return Array.from(set).sort().reverse();
  })();

  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0] ?? "");

  // Update selectedMonth when data loads
  if (!selectedMonth && availableMonths.length > 0) {
    // handled via initial state — will re-render once data arrives
  }

  const filtered = (allRequests ?? []).filter(r => {
    if (!selectedMonth) return true;
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return key === selectedMonth;
  });

  // Group: district → blok → vhod → requests[]
  type VhodMap = Record<string, typeof filtered>;
  type BlokMap = Record<string, VhodMap>;
  type DistrictMap = Record<string, BlokMap>;

  const grouped = filtered.reduce<DistrictMap>((acc, r) => {
    if (!acc[r.district]) acc[r.district] = {};
    if (!acc[r.district][r.blok]) acc[r.district][r.blok] = {};
    if (!acc[r.district][r.blok][r.vhod]) acc[r.district][r.blok][r.vhod] = [];
    acc[r.district][r.blok][r.vhod].push(r);
    return acc;
  }, {});

  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());
  const [expandedBloks, setExpandedBloks] = useState<Set<string>>(new Set());

  const toggleDistrict = (d: string) =>
    setExpandedDistricts(prev => { const s = new Set(prev); s.has(d) ? s.delete(d) : s.add(d); return s; });
  const toggleBlok = (key: string) =>
    setExpandedBloks(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });

  const loadColor = (count: number) => {
    if (count <= 2) return "bg-green-100 text-green-800 border-green-200";
    if (count <= 5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };
  const loadDot = (count: number) => {
    if (count <= 2) return "🟢";
    if (count <= 5) return "🟡";
    return "🔴";
  };

  const formatMonthLabel = (key: string) => {
    const [year, month] = key.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1);
    return d.toLocaleString("bg-BG", { month: "long", year: "numeric" });
  };

  const formatReqType = (t: string) => {
    const map: Record<string, string> = { standard: "Стандартен", recycling: "Рециклиране", nonstandard: "Нестандартен", construction: "Строителен" };
    return map[t] ?? t;
  };
  const formatStatus = (s: string) => {
    const map: Record<string, string> = { pending: "Чакащ", assigned: "Назначен", completed: "Завършен", cancelled: "Отказан" };
    return map[s] ?? s;
  };

  const districts = Object.keys(grouped).sort();

  return (
    <div className="space-y-5 p-4">
      {/* Header + filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-green-600" />Отчети по квартали
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} заявки · {districts.length} квартала
          </p>
        </div>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <option value="">Всички месеци</option>
          {availableMonths.map(m => (
            <option key={m} value={m}>{formatMonthLabel(m)}</option>
          ))}
        </select>
      </div>

      {/* Districts */}
      {districts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Няма заявки за избрания период</div>
      ) : (
        <div className="space-y-3">
          {districts.map(district => {
            const districtReqs = filtered.filter(r => r.district === district);
            const isDistrictOpen = expandedDistricts.has(district);
            const bloks = Object.keys(grouped[district]).sort();

            return (
              <div key={district} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* District row */}
                <button
                  onClick={() => toggleDistrict(district)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="font-semibold text-gray-900">{district}</span>
                    <span className="text-xs text-gray-500">{bloks.length} блока</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${loadColor(districtReqs.length)}`}>
                      {loadDot(districtReqs.length)} {districtReqs.length} заявки
                    </span>
                    {isDistrictOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {/* Blocks */}
                {isDistrictOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {bloks.map(blok => {
                      const blokKey = `${district}::${blok}`;
                      const isBlokOpen = expandedBloks.has(blokKey);
                      const blokReqs = filtered.filter(r => r.district === district && r.blok === blok);
                      const vhods = Object.keys(grouped[district][blok]).sort();

                      return (
                        <div key={blok} className="bg-gray-50/50">
                          <button
                            onClick={() => toggleBlok(blokKey)}
                            className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-100/60 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-800">{blok}</span>
                              <span className="text-xs text-gray-400">{vhods.length} входа</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${loadColor(blokReqs.length)}`}>
                                {loadDot(blokReqs.length)} {blokReqs.length}
                              </span>
                              {isBlokOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                            </div>
                          </button>

                          {/* Entrances */}
                          {isBlokOpen && (
                            <div className="px-6 pb-3 space-y-2">
                              {vhods.map(vhod => {
                                const vhodReqs = grouped[district][blok][vhod];
                                return (
                                  <div key={vhod} className="bg-white rounded-xl border border-gray-200 p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-700">Вх. {vhod}</span>
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${loadColor(vhodReqs.length)}`}>
                                        {loadDot(vhodReqs.length)} {vhodReqs.length} заявки
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      {vhodReqs.map(r => (
                                        <div key={r.id} className="flex items-center justify-between text-xs text-gray-600 py-1 border-t border-gray-100 first:border-0">
                                          <span className="text-gray-400">{new Date(r.createdAt).toLocaleDateString("bg-BG")}</span>
                                          <span>{formatReqType(r.type)}</span>
                                          <span className="text-gray-400">Ет.{r.etaj} Ап.{r.apartament}</span>
                                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                            r.status === "completed" ? "bg-green-100 text-green-700" :
                                            r.status === "cancelled" ? "bg-red-100 text-red-700" :
                                            r.status === "assigned" ? "bg-blue-100 text-blue-700" :
                                            "bg-yellow-100 text-yellow-700"
                                          }`}>{formatStatus(r.status)}</span>
                                        </div>
                                      ))}
                                    </div>
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
      )}
    </div>
  );
}
function SubscriptionsTab() {
  const generateVisits = trpc.subscriptions.generateTodayVisits.useMutation({
    onSuccess: (data) => toast.success(`Генерирани ${data.created} посещения за ${data.date}!`),
    onError: (e: any) => toast.error(e.message),
  });
  const { data: subs, refetch } = trpc.subscriptions.adminList.useQuery();
  const { data: allUsers = [] } = trpc.users.list.useQuery();
  const { data: allDistricts = [] } = trpc.districts.list.useQuery();

  const [searchUser, setSearchUser] = React.useState("");
  const [selectedUserOpenId, setSelectedUserOpenId] = React.useState("");
  const [newType, setNewType] = React.useState<"standard" | "recycling">("standard");
  const [newVisits, setNewVisits] = React.useState<15 | 30>(15);
  const [newDistrict, setNewDistrict] = React.useState("");
  const [newBlok, setNewBlok] = React.useState("");
  const [newVhod, setNewVhod] = React.useState("");
  const [newEtaj, setNewEtaj] = React.useState("");
  const [newApartament, setNewApartament] = React.useState("");
  const [newSlot, setNewSlot] = React.useState<"morning" | "evening">("morning");
  const [newVisitDays, setNewVisitDays] = React.useState<"even" | "odd" | "all">("all");

  const adminCreate = trpc.subscriptions.adminCreate.useMutation({
    onSuccess: () => {
      toast.success("Абонаментът е създаден!");
      refetch();
      setSelectedUserOpenId("");
      setSearchUser("");
      setNewBlok("");
      setNewVhod("");
      setNewEtaj("");
      setNewApartament("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const adminCancel = trpc.subscriptions.adminCancel.useMutation({
    onSuccess: () => { toast.success("Абонаментът е отказан"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredUsers = (allUsers as any[]).filter((u: any) =>
    searchUser.length >= 2 &&
    (u.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchUser.toLowerCase()))
  );
  const selectedUser = (allUsers as any[]).find((u: any) => u.openId === selectedUserOpenId);

  const active = subs?.filter(s => s.status === "active") ?? [];
  const cancelled = subs?.filter(s => s.status !== "active") ?? [];
  const typeLabel = (t: string) => t === "standard" ? "Стандартен" : "Рециклиращ";
  const slotLabel = (s: string) => s === "morning" ? "08:00–12:00" : "20:00–00:00";
  const statusColor = (s: string) => s === "active" ? "bg-green-100 text-green-700" : s === "cancelled" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Абонаменти</h2>
          <p className="text-sm text-gray-500 mt-0.5">Активни: {active.length} | Неактивни: {cancelled.length}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl text-green-600 border-green-200 hover:bg-green-50 text-xs"
          onClick={() => generateVisits.mutate()}
          disabled={generateVisits.isPending}
        >
          <CalendarDays className="w-3.5 h-3.5 mr-1" />
          {generateVisits.isPending ? "Генерира..." : "Генерирай посещения за днес"}
        </Button>
      </div>

      {/* Форма за създаване */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-800">Създай абонамент за клиент</h3>

        {/* Търси клиент */}
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Търси клиент (минимум 2 символа)</label>
          <input
            type="text"
            value={searchUser}
            onChange={e => { setSearchUser(e.target.value); setSelectedUserOpenId(""); }}
            placeholder="Имейл или име..."
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {filteredUsers.length > 0 && !selectedUserOpenId && (
            <div className="border rounded-xl overflow-hidden shadow-sm">
              {filteredUsers.slice(0, 5).map((u: any) => (
                <div
                  key={u.openId}
                  className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer border-b last:border-0"
                  onClick={() => { setSelectedUserOpenId(u.openId); setSearchUser(u.name ?? u.email ?? ""); }}
                >
                  <span className="font-medium">{u.name}</span>
                  {u.email && <span className="text-gray-400 ml-2 text-xs">{u.email}</span>}
                </div>
              ))}
            </div>
          )}
          {selectedUser && (
            <p className="text-xs text-green-600">✓ Избран: {selectedUser.name} ({selectedUser.email})</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Тип */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Тип</label>
            <select value={newType} onChange={e => setNewType(e.target.value as any)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="standard">Стандартен</option>
              <option value="recycling">Рециклиращ</option>
            </select>
          </div>
          {/* Посещения */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Посещения/месец</label>
            <select value={newVisits} onChange={e => setNewVisits(Number(e.target.value) as any)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value={15}>15</option>
              <option value={30}>30</option>
            </select>
          </div>
          {/* Слот */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Времеви слот</label>
            <select value={newSlot} onChange={e => setNewSlot(e.target.value as any)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="morning">08:00–12:00</option>
              <option value="evening">20:00–00:00</option>
            </select>
          </div>
          {/* Дати */}
          {newVisits === 15 && (
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Дати на посещения</label>
              <select value={newVisitDays} onChange={e => setNewVisitDays(e.target.value as "even" | "odd" | "all")}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none">
                <option value="all">Всеки ден</option>
                <option value="even">Четни дати (2, 4, 6...)</option>
                <option value="odd">Нечетни дати (1, 3, 5...)</option>
              </select>
            </div>
          )}
          {/* Квартал */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Квартал</label>
            <select value={newDistrict} onChange={e => setNewDistrict(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="">Избери...</option>
              {allDistricts.map((d: any) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
          {/* Блок */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Блок</label>
            <input value={newBlok} onChange={e => setNewBlok(e.target.value)}
              placeholder="напр. 119"
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>
          {/* Вход */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Вход</label>
            <input value={newVhod} onChange={e => setNewVhod(e.target.value)}
              placeholder="напр. А"
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>
          {/* Етаж */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Етаж</label>
            <input value={newEtaj} onChange={e => setNewEtaj(e.target.value)}
              placeholder="напр. 3"
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>
          {/* Апартамент */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Апартамент</label>
            <input value={newApartament} onChange={e => setNewApartament(e.target.value)}
              placeholder="напр. 12"
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>
        </div>

        <Button
          className="w-full rounded-xl bg-primary text-white"
          disabled={!selectedUserOpenId || !newDistrict || !newBlok || !newVhod || !newEtaj || !newApartament || adminCreate.isPending}
          onClick={() => adminCreate.mutate({
            userOpenId: selectedUserOpenId,
            type: newType,
            visits: newVisits,
            district: newDistrict,
            blok: newBlok,
            vhod: normalizeEntrance(newVhod),
            etaj: newEtaj || undefined,
            apartament: newApartament || undefined,
            timeSlot: newSlot,
            visitDays: newVisits === 15 ? newVisitDays : "all",
          })}
        >
          {adminCreate.isPending ? "Създава се..." : "Създай абонамент"}
        </Button>
      </div>
      <div>
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          Активни абонаменти ({active.length})
        </h3>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">Няма активни абонаменти.</p>
        ) : (
          <div className="grid gap-3">
            {active.map(sub => (
              <div key={sub.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={statusColor(sub.status)}>{sub.status === "active" ? "Активен" : "Неактивен"}</Badge>
                      <span className="text-sm font-semibold">{typeLabel(sub.type)} — {sub.visits} посещения/мес.</span>
                      <Badge variant="outline" className="text-xs">{slotLabel(sub.timeSlot)}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {sub.district}, {sub.blok}, Вх. {sub.vhod}
                      {sub.etaj ? `, Ет. ${sub.etaj}` : ""}
                      {sub.apartament ? `, Ап. ${sub.apartament}` : ""}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(sub as any).clientName ?? (sub as any).clientEmail ?? sub.userOpenId} | Създаден: {new Date(sub.createdAt).toLocaleDateString("bg-BG")}
                      {sub.currentPeriodEnd ? ` | До: ${new Date(sub.currentPeriodEnd).toLocaleDateString("bg-BG")}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                    disabled={adminCancel.isPending}
                    onClick={() => {
                      if (confirm("Сигурни ли сте, че искате да откажете този абонамент?")) {
                        adminCancel.mutate({ id: sub.id, note: "Отказан от администратор" });
                      }
                    }}
                  >
                    <X className="w-3.5 h-3.5 mr-1" />Откажи
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {cancelled.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <X className="w-4 h-4 text-red-500" />
            Неактивни / Отказани ({cancelled.length})
          </h3>
          <div className="grid gap-3">
            {cancelled.map(sub => (
              <div key={sub.id} className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={statusColor(sub.status)}>{sub.status === "cancelled" ? "Отказан" : "Изтекъл"}</Badge>
                      <span className="text-sm font-semibold">{typeLabel(sub.type)} — {sub.visits} посещения/мес.</span>
                    </div>
                    <p className="text-sm text-gray-600">{sub.district}, {sub.blok}, Вх. {sub.vhod}</p>
                    <p className="text-xs text-gray-400">
                      {(sub as any).clientName ?? (sub as any).clientEmail ?? sub.userOpenId}
                      {sub.cancellationNote ? ` | Причина: ${sub.cancellationNote}` : ""}
                      {sub.cancelledAt ? ` | Отказан: ${new Date(sub.cancelledAt).toLocaleDateString("bg-BG")}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Partners & Promo Codes ─────────────────────────────────────────
function PartnersTab() {
  const utils = trpc.useUtils();
  const [showCreatePartner, setShowCreatePartner] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerUsername, setNewPartnerUsername] = useState("");
  const [newPartnerPassword, setNewPartnerPassword] = useState("");
  const [resetPasswords, setResetPasswords] = useState<Record<number, string>>({});

  const [showCreateCode, setShowCreateCode] = useState(false);
  const [editMaxUses, setEditMaxUses] = useState<Record<number, string>>({});
  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState("");
  const [newCommission, setNewCommission] = useState("");
  const [newCodePartnerId, setNewCodePartnerId] = useState<string>("");
  const [newMaxUses, setNewMaxUses] = useState("");

  const { data: partners = [], isLoading: loadingPartners } = trpc.partnersMgmt.adminList.useQuery();
  const { data: promoCodesData = [], isLoading: loadingCodes } = trpc.promoCodes.adminList.useQuery();

  const createPartner = trpc.partnersMgmt.adminCreate.useMutation({
    onSuccess: () => {
      toast.success("Партньорът е създаден");
      setNewPartnerName(""); setNewPartnerUsername(""); setNewPartnerPassword(""); setShowCreatePartner(false);
      utils.partnersMgmt.adminList.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const setActivePartner = trpc.partnersMgmt.adminSetActive.useMutation({
    onSuccess: () => utils.partnersMgmt.adminList.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const resetPartnerPassword = trpc.partnersMgmt.adminResetPassword.useMutation({
    onSuccess: (_, vars) => {
      toast.success("Паролата е сменена");
      setResetPasswords(prev => ({ ...prev, [vars.id]: "" }));
    },
    onError: (e) => toast.error(e.message),
  });

  const createCode = trpc.promoCodes.adminCreate.useMutation({
    onSuccess: () => {
      toast.success("Промокодът е създаден");
      setNewCode(""); setNewDiscount(""); setNewCommission(""); setNewCodePartnerId(""); setNewMaxUses(""); setShowCreateCode(false);
      utils.promoCodes.adminList.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateCode = trpc.promoCodes.adminUpdate.useMutation({
    onSuccess: () => { toast.success("Обновено"); utils.promoCodes.adminList.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      {/* Partners section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Партньори</h2>
            <p className="text-sm text-gray-500 mt-0.5">{partners.length} партньора в системата</p>
          </div>
          <Button onClick={() => setShowCreatePartner(!showCreatePartner)} className="bg-green-600 hover:bg-green-700 rounded-2xl">
            <Plus className="w-4 h-4 mr-2" />Нов партньор
          </Button>
        </div>

        {showCreatePartner && (
          <div className="bg-white rounded-2xl border border-green-200 p-5 shadow-sm mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Име на фирма *</label>
                <Input placeholder="ТопВход ЕООД" value={newPartnerName} onChange={e => setNewPartnerName(e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Потребителско име *</label>
                <Input placeholder="topvhod" value={newPartnerUsername} onChange={e => setNewPartnerUsername(e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Парола *</label>
                <Input type="password" placeholder="••••••••" value={newPartnerPassword} onChange={e => setNewPartnerPassword(e.target.value)} className="rounded-xl" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                onClick={() => createPartner.mutate({ name: newPartnerName, username: newPartnerUsername, password: newPartnerPassword })}
                disabled={!newPartnerName || !newPartnerUsername || !newPartnerPassword || createPartner.isPending}
                className="bg-green-600 hover:bg-green-700 rounded-xl"
              >
                Създай
              </Button>
              <Button variant="outline" onClick={() => setShowCreatePartner(false)} className="rounded-xl">Откажи</Button>
            </div>
          </div>
        )}

        {loadingPartners ? (
          <p className="text-gray-500">Зареждане...</p>
        ) : partners.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Percent className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Няма партньори</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {partners.map((p: any) => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{p.name}</span>
                      <Badge variant={p.isActive ? "default" : "secondary"} className="text-xs">{p.isActive ? "Активен" : "Неактивен"}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">@{p.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="password"
                      placeholder="Нова парола"
                      value={resetPasswords[p.id] ?? ""}
                      onChange={e => setResetPasswords(prev => ({ ...prev, [p.id]: e.target.value }))}
                      className="w-36 rounded-lg text-sm h-8"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-amber-600 border-amber-200 hover:bg-amber-50"
                      disabled={!resetPasswords[p.id] || resetPasswords[p.id].length < 6 || resetPartnerPassword.isPending}
                      onClick={() => resetPartnerPassword.mutate({ id: p.id, newPassword: resetPasswords[p.id] })}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`rounded-xl ${p.isActive ? "text-orange-600 border-orange-200 hover:bg-orange-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}
                      onClick={() => setActivePartner.mutate({ id: p.id, isActive: !p.isActive })}
                    >
                      {p.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Promo codes section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Промокодове</h2>
            <p className="text-sm text-gray-500 mt-0.5">{promoCodesData.length} кода в системата</p>
          </div>
          <Button onClick={() => setShowCreateCode(!showCreateCode)} className="bg-green-600 hover:bg-green-700 rounded-2xl">
            <Plus className="w-4 h-4 mr-2" />Нов код
          </Button>
        </div>

        {showCreateCode && (
          <div className="bg-white rounded-2xl border border-green-200 p-5 shadow-sm mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Код *</label>
                <Input placeholder="ТопВход" value={newCode} onChange={e => setNewCode(e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Отстъпка за клиента (%) *</label>
                <Input type="number" placeholder="10" value={newDiscount} onChange={e => setNewDiscount(e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Партньор (по избор)</label>
                <select
                  value={newCodePartnerId}
                  onChange={e => setNewCodePartnerId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white h-10"
                >
                  <option value="">— Без партньор —</option>
                  {partners.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {newCodePartnerId && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Комисион за партньора (%)</label>
                  <Input type="number" placeholder="15" value={newCommission} onChange={e => setNewCommission(e.target.value)} className="rounded-xl" />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Макс. брой употреби (по избор)</label>
                <Input type="number" placeholder="25000" value={newMaxUses} onChange={e => setNewMaxUses(e.target.value)} className="rounded-xl" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                onClick={() => createCode.mutate({
                  code: newCode,
                  discountPercent: parseFloat(newDiscount),
                  partnerId: newCodePartnerId ? parseInt(newCodePartnerId) : null,
                  commissionPercent: newCodePartnerId && newCommission ? parseFloat(newCommission) : null,
                  maxUses: newMaxUses ? parseInt(newMaxUses) : null,
                })}
                disabled={!newCode || !newDiscount || createCode.isPending}
                className="bg-green-600 hover:bg-green-700 rounded-xl"
              >
                Създай
              </Button>
              <Button variant="outline" onClick={() => setShowCreateCode(false)} className="rounded-xl">Откажи</Button>
            </div>
          </div>
        )}

        {loadingCodes ? (
          <p className="text-gray-500">Зареждане...</p>
        ) : promoCodesData.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Percent className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Няма промокодове</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {promoCodesData.map((c: any) => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900">{c.code}</span>
                      <Badge variant={c.isActive ? "default" : "secondary"} className="text-xs">{c.isActive ? "Активен" : "Неактивен"}</Badge>
                      {c.partnerName && <Badge variant="outline" className="text-xs">{c.partnerName}</Badge>}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      -{c.discountPercent}% за клиента
                      {c.commissionPercent && ` · ${c.commissionPercent}% комисион`}
                      {" · "}{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""} употреби
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder={c.maxUses ? String(c.maxUses) : "Без лимит"}
                      value={editMaxUses[c.id] ?? ""}
                      onChange={e => setEditMaxUses(prev => ({ ...prev, [c.id]: e.target.value }))}
                      className="w-28 h-8 rounded-lg text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50"
                      disabled={!editMaxUses[c.id] || updateCode.isPending}
                      onClick={() => {
                        updateCode.mutate({ id: c.id, maxUses: parseInt(editMaxUses[c.id]) });
                        setEditMaxUses(prev => ({ ...prev, [c.id]: "" }));
                      }}
                    >
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`rounded-xl ${c.isActive ? "text-orange-600 border-orange-200 hover:bg-orange-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}
                      onClick={() => updateCode.mutate({ id: c.id, isActive: !c.isActive })}
                    >
                      {c.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

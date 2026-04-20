import { useState } from "react";
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
  Shield, Lock, DollarSign, CalendarDays, CheckCheck, X
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import AdminDashboard from "@/components/AdminDashboard";

type Tab = "dashboard" | "workers" | "districts" | "blocks" | "credits" | "requests" | "content" | "problems" | "descriptions" | "clients" | "subadmins";

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
    { id: "districts", icon: MapPin, label: "Квартали" },
    { id: "blocks", icon: Building2, label: "Блокове" },
    { id: "credits", icon: CreditCard, label: "Кредити" },
    { id: "requests", icon: ClipboardList, label: "Заявки" },
    { id: "content", icon: Settings, label: "Съдържание" },
    { id: "descriptions", icon: FileText, label: "Описания" },
    { id: "problems", icon: AlertTriangle, label: "Проблеми" },
    { id: "subadmins", icon: Shield, label: "Подадмини" },
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
                className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === id
                    ? "border-green-600 text-green-700 bg-green-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
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
        {activeTab === "districts" && <DistrictsTab />}
        {activeTab === "blocks" && <BlocksTab />}
        {activeTab === "credits" && <CreditsTab />}
        {activeTab === "requests" && <RequestsTab />}
        {activeTab === "content" && <ContentTab />}
        {activeTab === "descriptions" && <DescriptionsTab />}
        {activeTab === "problems" && <ProblemsTab />}
        {activeTab === "subadmins" && <SubAdminsTab />}
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
                  {(worker as any).photoUrl ? (
                    <img src={(worker as any).photoUrl} alt={worker.name} className="w-11 h-11 rounded-xl object-cover border border-gray-200" />
                  ) : (
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg ${worker.isActive ? "bg-green-500" : "bg-gray-400"}`}>
                      {worker.name.charAt(0).toUpperCase()}
                    </div>
                  )}
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
                    {allRequests?.filter(r => r.workerOpenId === worker.openId && r.status === "completed").map(r => (
                      <div key={r.id} className="text-xs bg-gray-50 rounded-lg p-2 flex justify-between">
                        <span>{r.district}, Бл. {r.blok}, Вх. {r.vhod}, Ап. {r.apartament}</span>
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
function DistrictsTab() {
  const [newDistrict, setNewDistrict] = useState("");
  const [search, setSearch] = useState("");

  const { data: districts, refetch } = trpc.districts.listAll.useQuery();
  const toggle = trpc.districts.toggleActive.useMutation({ onSuccess: () => refetch(), onError: (e: any) => toast.error(e.message) });
  const create = trpc.districts.create.useMutation({
    onSuccess: () => { toast.success("Кварталът е добавен"); setNewDistrict(""); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = trpc.districts.delete.useMutation({ onSuccess: () => { toast.success("Изтрит"); refetch(); }, onError: (e: any) => toast.error(e.message) });

  const filtered = districts?.filter(d => d.name.toLowerCase().includes(search.toLowerCase())) ?? [];
  const activeCount = districts?.filter(d => d.isActive).length ?? 0;

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

      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex gap-2">
        <Input
          placeholder="Добави нов квартал..."
          value={newDistrict}
          onChange={e => setNewDistrict(e.target.value)}
          className="rounded-xl flex-1"
          onKeyDown={e => e.key === "Enter" && newDistrict && create.mutate({ name: newDistrict })}
        />
        <Button onClick={() => newDistrict && create.mutate({ name: newDistrict })}
          disabled={!newDistrict || create.isPending} className="bg-green-600 hover:bg-green-700 rounded-xl">
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

  type BlockEntry = { district: string; blok: string; vhod: string; requestCount: number };
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

  const districts = Array.from(districtMap.keys()).sort();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Достъп до входове</h2>
        <p className="text-sm text-gray-500 mt-0.5">Одобрете или забранете достъп до всеки вход — зелено = одобрен, червено = без достъп</p>
      </div>
      {isLoading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      )}
      {!isLoading && districts.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Няма записи за входове. Входовете се появяват автоматично когато клиент подаде заявка.</p>
        </div>
      )}
      <div className="space-y-4">
        {districts.map(district => (
          <div key={district} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-gray-900">{district}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {Array.from(districtMap.get(district)!.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([blok, entrances]) => (
                <div key={blok} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Бл. {blok}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 pl-5">
                    {entrances.sort((a,b) => a.vhod.localeCompare(b.vhod)).map(entrance => {
                      const key = `${entrance.district}|${entrance.blok}|${entrance.vhod}`;
                      const isApproved = accessMap.get(key) ?? false;
                      const isPending = toggleMutation.isPending;
                      return (
                        <div key={entrance.vhod} className={`flex items-center justify-between rounded-xl px-3 py-2 transition-colors ${isApproved ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isApproved ? "bg-green-500" : "bg-red-500"}`} />
                            <span className="text-sm font-medium text-gray-800">Вх. {entrance.vhod}</span>
                            {entrance.requestCount > 0 && (
                              <span className="text-xs text-gray-400">({entrance.requestCount} заявки)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              disabled={isPending}
                              onClick={() => toggleMutation.mutate({ district: entrance.district, blok: entrance.blok, vhod: entrance.vhod, isApproved: !isApproved })}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isApproved ? "bg-green-500" : "bg-red-400"} ${isPending ? "opacity-50" : ""}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isApproved ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                            <button
                              disabled={deleteMutation.isPending}
                              onClick={() => {
                                if (window.confirm(`Изтриване на Вх. ${entrance.vhod}, Бл. ${entrance.blok}, ${entrance.district}?`)) {
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
    </div>
  );
}

// ─── Tab 5: Requests ──────────────────────────────────────────────────────────
function RequestsTab() {
  const [view, setView] = useState<"active" | "completed">("active");
  const { data: allRequests } = trpc.requests.listAll.useQuery();

  const active = allRequests?.filter(r => r.status === "pending") ?? [];
  const completed = allRequests?.filter(r => r.status === "completed") ?? [];

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
        <div className="flex gap-2">
          <Button variant={view === "active" ? "default" : "outline"} size="sm" onClick={() => setView("active")}
            className={`rounded-xl ${view === "active" ? "bg-green-600 hover:bg-green-700" : ""}`}>
            Активни ({active.length})
          </Button>
          <Button variant={view === "completed" ? "default" : "outline"} size="sm" onClick={() => setView("completed")}
            className={`rounded-xl ${view === "completed" ? "bg-green-600 hover:bg-green-700" : ""}`}>
            Завършени ({completed.length})
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
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />Бл. {blok}
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
                            {/* Image for nonstandard/construction */}
                            {(r.type === "nonstandard" || r.type === "construction") && (r as any).imageUrl && (
                              <a href={(r as any).imageUrl} target="_blank" rel="noopener noreferrer" className="mt-1.5 block">
                                <img src={(r as any).imageUrl} alt="Снимка" className="rounded-lg max-h-24 w-auto object-contain border border-gray-200 hover:opacity-90 transition-opacity" />
                              </a>
                            )}
                            {/* Admin quote panel */}
                            {(r.type === "nonstandard" || r.type === "construction") && r.status === "pending" && (
                              <AdminQuotePanel requestId={r.id} />
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
          {completed.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-800">{r.district}, Бл. {r.blok}, Вх. {r.vhod}, Ап. {r.apartament}</span>
                <p className="text-xs text-gray-500 mt-0.5">{typeLabel[r.type] ?? r.type} · {new Date(r.createdAt).toLocaleDateString("bg-BG")}</p>
              </div>
              <Badge className="bg-green-100 text-green-700">Завършена</Badge>
            </div>
          ))}
          {!completed.length && (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Няма завършени заявки</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AdminQuotePanel (used inside RequestsTab) ─────────────────────────────────────────────────────────────────────────────────
function AdminQuotePanel({ requestId }: { requestId: number }) {
  const utils = trpc.useUtils();
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

  if (isLoading) return <p className="text-xs text-muted-foreground mt-1">Зарежда...</p>;

  const pending = quotes.filter((q: any) => q.status === "pending");
  const all = quotes;

  if (all.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {pending.map((q: any) => (
        <div key={q.id} className="bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-1">
          <div className="flex items-center gap-1 text-xs font-semibold text-amber-800">
            <DollarSign className="w-3 h-3" />Оферта от работник
          </div>
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
        </div>
      ))}
      {/* Show accepted/rejected quotes as status badges */}
      {quotes.filter((q: any) => q.status !== "pending").map((q: any) => (
        <div key={q.id} className="flex items-center gap-2 text-xs text-gray-500">
          <DollarSign className="w-3 h-3" />
          <span>{q.workerName}: {q.price} лв.</span>
          <Badge variant="outline" className={q.status === "accepted" ? "text-green-700 border-green-300" : "text-gray-400"}>
            {q.status === "accepted" ? "Приета" : "Отхвърлена"}
          </Badge>
        </div>
      ))}
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
  if (Array.isArray(descriptions)) {
    descriptions.forEach(d => { descMap[d.activityKey] = d.description; });
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

  const open = problems?.filter(p => p.status === "open") ?? [];

  const statusLabel: Record<string, string> = {
    open: "Отворен", resolved: "Разрешен", forwarded: "Препратен",
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
                    {[problem.reqDistrict, problem.reqBlok && `Бл. ${problem.reqBlok}`, problem.reqVhod && `Вх. ${problem.reqVhod}`, problem.reqEtaj && `Ет. ${problem.reqEtaj}`, problem.reqApartament && `Ап. ${problem.reqApartament}`].filter(Boolean).join(", ")}
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
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedProblem(null); setAdminNotes(""); }} className="rounded-xl">
                          Отказ
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
  const { data: allRequests } = trpc.requests.listAll.useQuery();
  const [search, setSearch] = useState("");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [creditAmounts, setCreditAmounts] = useState<Record<string, string>>({});
  const [creditTypes, setCreditTypes] = useState<Record<string, "standard" | "recycling">>({});
  const [creditOps, setCreditOps] = useState<Record<string, "add" | "deduct">>({});

  const utils = trpc.useUtils();

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
      (c.email ?? "").toLowerCase().includes(q)
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
                    <span className="text-xs text-gray-400 truncate">{client.email ?? "—"}</span>
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
                          client.addressBlok && `Бл. ${client.addressBlok}`,
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
                              <span className="text-xs text-gray-400 truncate">{r.district}, Бл.{r.blok} Вх.{r.vhod}</span>
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
];

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
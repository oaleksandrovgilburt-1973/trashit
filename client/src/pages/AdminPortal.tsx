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
  RefreshCw, Eye, Send, ShieldAlert, Pencil, Save, LayoutDashboard, FileText
} from "lucide-react";
import AdminDashboard from "@/components/AdminDashboard";

type Tab = "dashboard" | "workers" | "districts" | "blocks" | "credits" | "requests" | "content" | "descriptions" | "problems";

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
    { id: "workers", icon: Users, label: "Работници" },
    { id: "districts", icon: MapPin, label: "Квартали" },
    { id: "blocks", icon: Building2, label: "Блокове" },
    { id: "credits", icon: CreditCard, label: "Кредити" },
    { id: "requests", icon: ClipboardList, label: "Заявки" },
    { id: "content", icon: Settings, label: "Съдържание" },
    { id: "descriptions", icon: FileText, label: "Описания" },
    { id: "problems", icon: AlertTriangle, label: "Проблеми" },
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
        {activeTab === "workers" && <WorkersTab />}
        {activeTab === "districts" && <DistrictsTab />}
        {activeTab === "blocks" && <BlocksTab />}
        {activeTab === "credits" && <CreditsTab />}
        {activeTab === "requests" && <RequestsTab />}
        {activeTab === "content" && <ContentTab />}
        {activeTab === "descriptions" && <DescriptionsTab />}
        {activeTab === "problems" && <ProblemsTab />}
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
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg ${worker.isActive ? "bg-green-500" : "bg-gray-400"}`}>
                    {worker.name.charAt(0).toUpperCase()}
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
  const { data: blocks, isLoading } = trpc.blockAccess.list.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Управление на достъп до блокове</h2>
        <p className="text-sm text-gray-500 mt-0.5">Блокове с активни заявки — свържете се с клиента за осигуряване на достъп до входа</p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      )}

      {!isLoading && !blocks?.length && (
        <div className="text-center py-12 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Няма активни заявки с блокове</p>
        </div>
      )}

      <div className="grid gap-3">
        {blocks?.map((block, i) => {
          const hasContact = block.contactPhone || block.contactEmail;
          return (
            <div key={i} className={`bg-white rounded-2xl border p-4 shadow-sm ${!hasContact ? "border-red-200" : "border-gray-200"}`}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className={`w-4 h-4 ${!hasContact ? "text-red-500" : "text-green-600"}`} />
                    <span className="font-semibold text-gray-900">
                      {block.district} — Бл. {block.blok}, Вх. {block.vhod}
                    </span>
                    {!hasContact && <Badge variant="destructive" className="text-xs">Без контакт</Badge>}
                  </div>
                  <p className="text-sm text-gray-500 pl-6">
                    {block.requestCount} {block.requestCount === 1 ? "заявка" : "заявки"}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 text-right">
                  {block.contactPhone && (
                    <a href={`tel:${block.contactPhone}`} className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700">
                      <Phone className="w-3.5 h-3.5" />{block.contactPhone}
                    </a>
                  )}
                  {block.contactEmail && (
                    <a href={`mailto:${block.contactEmail}`} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700">
                      <Mail className="w-3.5 h-3.5" />{block.contactEmail}
                    </a>
                  )}
                  {!hasContact && <span className="text-xs text-red-500">Няма контактна информация</span>}
                </div>
              </div>
            </div>
          );
        })}
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
                          <div key={r.id} className={`rounded-lg px-2 py-1 text-sm ${r.hasProblem ? 'bg-red-50 border border-red-200' : ''}`}>
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

// ─── Tab 6: Content ───────────────────────────────────────────────────────────
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
// ─── Tab 8: Descriptions ─────────────────────────────────────────────────────
function DescriptionsTab() {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: descriptions, refetch } = trpc.activityDescriptions.getAll.useQuery();
  const update = trpc.activityDescriptions.update.useMutation({
    onSuccess: () => { toast.success("Описанието е запазено"); refetch(); setEditingKey(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const activityLabels: Record<string, { label: string; icon: string }> = {
    standard: { label: "Стандартен битов отпадък", icon: "🗑️" },
    recycling: { label: "Разделно изхвърляне", icon: "♻️" },
    nonstandard: { label: "Нестандартен битов отпадък", icon: "📦" },
    construction: { label: "Строителен отпадък", icon: "🏗️" },
    entrance: { label: "Почистване на вход", icon: "🏢" },
    residence: { label: "Жилища", icon: "🏠" },
    other: { label: "Друго", icon: "ℹ️" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Описания на дейности</h2>
        <p className="text-sm text-gray-500 mt-0.5">Добавете допълнителна информация към всяка дейност. Тя ще се показва на клиентите при избор на услуга.</p>
      </div>

      <div className="space-y-3">
        {descriptions?.map((item: any) => {
          const meta = activityLabels[item.activityKey] ?? { label: item.activityKey, icon: "📋" };
          const isEditing = editingKey === item.activityKey;
          return (
            <div key={item.activityKey} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{meta.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{meta.label}</p>
                    {!isEditing && (
                      <p className="text-sm text-gray-400 mt-0.5">
                        {item.description || <span className="italic">Няма описание още.</span>}
                      </p>
                    )}
                  </div>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => { setEditingKey(item.activityKey); setEditValue(item.description ?? ""); }}
                    className="text-green-600 hover:text-green-700 flex items-center gap-1 text-sm font-medium"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {item.description ? "Редактирай" : "Добави"}
                  </button>
                )}
              </div>
              {isEditing && (
                <div className="mt-3 flex gap-2">
                  <Input
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    placeholder="Въведете описание..."
                    className="rounded-xl flex-1"
                  />
                  <Button
                    onClick={() => update.mutate({ activityKey: item.activityKey, description: editValue })}
                    disabled={update.isPending}
                    className="bg-green-600 hover:bg-green-700 rounded-xl"
                  >
                    <Save className="w-4 h-4 mr-1" />Запази
                  </Button>
                  <Button variant="outline" onClick={() => setEditingKey(null)} className="rounded-xl">Отказ</Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


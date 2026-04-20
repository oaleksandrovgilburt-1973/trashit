import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Users, MapPin, Building2, CreditCard, ClipboardList,
  Settings, AlertTriangle, LogOut, Plus, Trash2, Power,
  PowerOff, CheckCircle, ChevronDown, ChevronUp, LayoutDashboard,
  FileText, UserCheck, Shield, RefreshCw, Send, Pencil, Save,
  Phone
} from "lucide-react";
import AdminDashboard from "@/components/AdminDashboard";

// ─── Types ────────────────────────────────────────────────────────────────────
type SubAdminSession = {
  id: number;
  username: string;
  name: string;
  permissions: string[];
};
type Tab = "dashboard" | "clients" | "workers" | "districts" | "blocks" | "credits" | "requests" | "content" | "descriptions" | "problems";

const ALL_TABS: { id: Tab; icon: any; label: string }[] = [
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
];

function formatDate(val: any) {
  if (!val) return "-";
  const d = new Date(typeof val === "number" ? val * 1000 : val);
  return d.toLocaleDateString("bg-BG", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SubAdminPortal() {
  const [session, setSession] = useState<SubAdminSession | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  useEffect(() => {
    const raw = localStorage.getItem("subadmin_session");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SubAdminSession;
        setSession(parsed);
      } catch {
        localStorage.removeItem("subadmin_session");
      }
    }
  }, []);

  const handleLogin = (sa: SubAdminSession) => {
    localStorage.setItem("subadmin_session", JSON.stringify(sa));
    setSession(sa);
    const firstAllowed = ALL_TABS.find(t => sa.permissions.includes(t.id));
    if (firstAllowed) setActiveTab(firstAllowed.id);
  };

  const handleLogout = () => {
    localStorage.removeItem("subadmin_session");
    setSession(null);
  };
  const [showChangePassword, setShowChangePassword] = useState(false);

  if (!session) {
    return <SubAdminLogin onLogin={handleLogin} />;
  }

  const allowedTabs = ALL_TABS.filter(t => session.permissions.includes(t.id));
  const currentTab = allowedTabs.find(t => t.id === activeTab) ? activeTab : (allowedTabs[0]?.id ?? "dashboard");

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-tight">Подадминистраторски панел</h1>
              <p className="text-xs text-gray-500">{session.name} • TRASHit</p>
            </div>
          </div>
      <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => setShowChangePassword(!showChangePassword)}
            >
              <Shield className="w-4 h-4 mr-1" />
              Парола
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-1" />
              Изход
            </Button>
          </div>
          {showChangePassword && session && (
            <SubAdminChangePassword
              sessionId={session.id}
              onClose={() => setShowChangePassword(false)}
            />
          )}
        </div>
        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-0 border-t border-gray-100">
            {allowedTabs.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  currentTab === id
                    ? "border-blue-600 text-blue-700 bg-blue-50/50"
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {allowedTabs.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">Нямате достъп до нито един раздел.</p>
            <p className="text-sm mt-1">Моля, свържете се с главния администратор.</p>
          </div>
        )}
        {currentTab === "dashboard" && session.permissions.includes("dashboard") && <AdminDashboard />}
        {currentTab === "clients" && session.permissions.includes("clients") && <ClientsTab />}
        {currentTab === "workers" && session.permissions.includes("workers") && <WorkersTab />}
        {currentTab === "districts" && session.permissions.includes("districts") && <DistrictsTab />}
        {currentTab === "blocks" && session.permissions.includes("blocks") && <BlocksTab />}
        {currentTab === "credits" && session.permissions.includes("credits") && <CreditsTab />}
        {currentTab === "requests" && session.permissions.includes("requests") && <RequestsTab />}
        {currentTab === "content" && session.permissions.includes("content") && <ContentTab />}
        {currentTab === "descriptions" && session.permissions.includes("descriptions") && <DescriptionsTab />}
        {currentTab === "problems" && session.permissions.includes("problems") && <ProblemsTab />}
      </div>
    </div>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────
function SubAdminLogin({ onLogin }: { onLogin: (sa: SubAdminSession) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const loginMutation = trpc.subAdmins.login.useMutation({
    onSuccess: (data) => {
      onLogin({
        id: data.id,
        username: data.username,
        name: data.name,
        permissions: data.permissions,
      });
      toast.success(`Добре дошли, ${data.name}!`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Подадмин вход</h1>
          <p className="text-sm text-gray-500 mt-1">TRASHit управление</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Потребителско име</label>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Въведете потребителско име"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Парола</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Въведете парола"
              autoComplete="current-password"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Влизане..." : "Вход"}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── WorkersTab ───────────────────────────────────────────────────────────────
function WorkersTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const utils = trpc.useUtils();
  const { data: workers = [], isLoading } = trpc.workersMgmt.listWithStats.useQuery();
  const createWorker = trpc.users.createWorker.useMutation({
    onSuccess: () => {
      utils.workersMgmt.listWithStats.invalidate();
      setShowCreate(false);
      setName(""); setUsername(""); setPassword("");
      toast.success("Работникът е създаден успешно.");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deactivateWorker = trpc.workersMgmt.deactivate.useMutation({
    onSuccess: () => { utils.workersMgmt.listWithStats.invalidate(); toast.success("Работникът е деактивиран."); },
    onError: (e: any) => toast.error(e.message),
  });
  const activateWorker = trpc.workersMgmt.activate.useMutation({
    onSuccess: () => { utils.workersMgmt.listWithStats.invalidate(); toast.success("Работникът е активиран."); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteWorker = trpc.workersMgmt.delete.useMutation({
    onSuccess: () => { utils.workersMgmt.listWithStats.invalidate(); toast.success("Работникът е изтрит."); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Работници</h2>
        <Button onClick={() => setShowCreate(!showCreate)} className="rounded-2xl bg-[#4CAF50] hover:bg-green-600 text-white gap-1">
          <Plus className="w-4 h-4" /> Добави
        </Button>
      </div>
      {showCreate && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <h3 className="font-semibold text-gray-800">Нов работник</h3>
          <Input placeholder="Имена" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Потребителско име" value={username} onChange={e => setUsername(e.target.value)} />
          <Input type="password" placeholder="Парола" value={password} onChange={e => setPassword(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={() => createWorker.mutate({ name, username, password })}
              disabled={createWorker.isPending || !name || !username || !password}
              className="rounded-2xl bg-[#4CAF50] hover:bg-green-600 text-white">
              {createWorker.isPending ? "Запазване..." : "Запази"}
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-2xl">Отказ</Button>
          </div>
        </div>
      )}
      {isLoading ? <p className="text-gray-500">Зареждане...</p> : (
        <div className="space-y-2">
          {(workers as any[]).map((w: any) => (
            <div key={w.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                  {w.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{w.name}</p>
                  <p className="text-xs text-gray-500">@{w.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={w.isActive ? "default" : "secondary"} className="rounded-xl">
                  {w.isActive ? "Активен" : "Неактивен"}
                </Badge>
                {w.isActive
                  ? <Button size="sm" variant="outline" onClick={() => deactivateWorker.mutate({ id: w.id })} className="rounded-xl text-orange-600 border-orange-200 hover:bg-orange-50"><PowerOff className="w-3.5 h-3.5" /></Button>
                  : <Button size="sm" variant="outline" onClick={() => activateWorker.mutate({ id: w.id })} className="rounded-xl text-green-600 border-green-200 hover:bg-green-50"><Power className="w-3.5 h-3.5" /></Button>}
                <Button size="sm" variant="outline"
                  onClick={() => { if (confirm("Изтриване на работника?")) deleteWorker.mutate({ id: w.id }); }}
                  className="rounded-xl text-red-500 border-red-200 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {!workers.length && <p className="text-center text-gray-400 py-8">Няма работници</p>}
        </div>
      )}
    </div>
  );
}

// ─── DistrictsTab ─────────────────────────────────────────────────────────────
function DistrictsTab() {
  const [newDistrict, setNewDistrict] = useState("");
  const utils = trpc.useUtils();
  const { data: districts = [], isLoading } = trpc.districts.listAll.useQuery();
  const createDistrict = trpc.districts.create.useMutation({
    onSuccess: () => { utils.districts.listAll.invalidate(); setNewDistrict(""); toast.success("Кварталът е добавен."); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggleDistrict = trpc.districts.toggleActive.useMutation({
    onSuccess: () => utils.districts.listAll.invalidate(),
    onError: (e: any) => toast.error(e.message),
  });
  const deleteDistrict = trpc.districts.delete.useMutation({
    onSuccess: () => { utils.districts.listAll.invalidate(); toast.success("Кварталът е изтрит."); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Квартали</h2>
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-2">
        <Input placeholder="Добави нов квартал..." value={newDistrict} onChange={e => setNewDistrict(e.target.value)}
          onKeyDown={e => e.key === "Enter" && newDistrict && createDistrict.mutate({ name: newDistrict })} />
        <Button onClick={() => newDistrict && createDistrict.mutate({ name: newDistrict })}
          disabled={!newDistrict || createDistrict.isPending} className="rounded-xl bg-[#4CAF50] hover:bg-green-600 text-white">
          <Plus className="w-4 h-4 mr-1" />Добави
        </Button>
      </div>
      {isLoading ? <p className="text-gray-500">Зареждане...</p> : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {(districts as any[]).map((d: any) => (
            <div key={d.id}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm select-none ${
                d.isActive ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700"
              }`}
              onClick={() => toggleDistrict.mutate({ id: d.id, isActive: !d.isActive })}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${d.isActive ? "bg-green-500" : "bg-red-400"}`} />
                <span className="text-sm font-medium truncate">{d.name}</span>
              </div>
              <button onClick={e => { e.stopPropagation(); if (confirm("Изтрий квартала?")) deleteDistrict.mutate({ id: d.id }); }}
                className="ml-1 text-gray-400 hover:text-red-500 flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BlocksTab ────────────────────────────────────────────────────────────────
function BlocksTab() {
  const { data: accessRecords = [], isLoading, refetch } = trpc.entranceAccess.list.useQuery();
  const { data: activeBlocks = [], refetch: refetchActiveBlocks } = trpc.blockAccess.list.useQuery();
  const toggleMutation = trpc.entranceAccess.toggle.useMutation({
    onSuccess: () => { refetch(); refetchActiveBlocks(); toast.success("Достъпът е актуализиран"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.entranceAccess.delete.useMutation({
    onSuccess: () => { refetch(); refetchActiveBlocks(); toast.success("Входът е изтрит"); },
    onError: (e: any) => toast.error(e.message),
  });
  const requestCountMap = new Map<string, number>();
  (activeBlocks as any[]).forEach((b: any) => {
    requestCountMap.set(`${b.district}|${b.blok}|${b.vhod}`, b.requestCount ?? 0);
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Блокове и входове</h2>
        <Button variant="outline" size="sm" onClick={() => { refetch(); refetchActiveBlocks(); }} className="rounded-xl gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Обнови
        </Button>
      </div>
      {isLoading ? <p className="text-gray-500">Зареждане...</p> : (accessRecords as any[]).length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-2" />
          <p>Няма регистрирани входове</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(accessRecords as any[]).map((ea: any) => {
            const reqCount = requestCountMap.get(`${ea.district}|${ea.blok}|${ea.vhod}`) ?? 0;
            return (
              <div key={ea.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{ea.district}, бл. {ea.blok}, вх. {ea.vhod}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={ea.isApproved ? "default" : "secondary"} className="rounded-xl text-xs">
                        {ea.isApproved ? "Одобрен" : "Чака одобрение"}
                      </Badge>
                      {reqCount > 0 && <span className="text-xs text-gray-500">{reqCount} активни заявки</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={toggleMutation.isPending}
                      onClick={() => toggleMutation.mutate({ district: ea.district, blok: ea.blok, vhod: ea.vhod, isApproved: !ea.isApproved })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${ea.isApproved ? "bg-green-500" : "bg-red-400"} ${toggleMutation.isPending ? "opacity-50" : ""}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${ea.isApproved ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                    <button
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`Изтриване на Вх. ${ea.vhod}, Бл. ${ea.blok}, ${ea.district}?`)) {
                          deleteMutation.mutate({ district: ea.district, blok: ea.blok, vhod: ea.vhod });
                        }
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-600 text-gray-500 transition-colors text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CreditsTab ───────────────────────────────────────────────────────────────
function CreditsTab() {
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState<{ openId: string; name: string | null } | null>(null);
  const [amount, setAmount] = useState("");
  const [creditType, setCreditType] = useState<"standard" | "recycling">("standard");
  const [operation, setOperation] = useState<"add" | "deduct">("add");
  const [note, setNote] = useState("");
  const { data: users = [] } = trpc.users.list.useQuery();
  const { data: transactions = [] } = trpc.credits.allTransactions.useQuery();
  const addCredits = trpc.credits.adminAdd.useMutation({
    onSuccess: () => { toast.success("Кредитите са обновени"); setAmount(""); setNote(""); setSelectedUser(null); setSearchEmail(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const filteredUsers = (users as any[]).filter((u: any) =>
    u.email?.toLowerCase().includes(searchEmail.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchEmail.toLowerCase())
  );
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Управление на кредити</h2>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-800">Добавяне / Отнемане на кредити</h3>
        <Input placeholder="Търси клиент по имейл или име..." value={searchEmail}
          onChange={e => { setSearchEmail(e.target.value); setSelectedUser(null); }} className="rounded-xl" />
        {searchEmail && !selectedUser && filteredUsers.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
            {filteredUsers.slice(0, 8).map((u: any) => (
              <button key={u.openId} onClick={() => { setSelectedUser({ openId: u.openId, name: u.name }); setSearchEmail(""); }}
                className="w-full text-left px-3 py-2 bg-gray-50 border-b border-gray-100 last:border-0 flex justify-between items-center">
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
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">История на всички транзакции</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {(transactions as any[]).slice().reverse().map((tx: any) => (
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
          {!(transactions as any[]).length && <p className="text-sm text-gray-400 text-center py-4">Няма транзакции</p>}
        </div>
      </div>
    </div>
  );
}

// ─── RequestsTab ──────────────────────────────────────────────────────────────
function RequestsTab() {
  const { data: allRequests = [] } = trpc.requests.listAll.useQuery();
  const active = (allRequests as any[]).filter((r: any) => r.status === "pending");
  const completed = (allRequests as any[]).filter((r: any) => r.status === "completed");
  const [view, setView] = useState<"active" | "completed">("active");
  const typeLabel: Record<string, string> = {
    standard: "Стандартен", recycling: "Разделно",
    nonstandard: "Нестандартен", construction: "Строителен",
  };
  const grouped: Record<string, Record<string, Record<string, typeof active>>> = {};
  for (const r of active) {
    if (!grouped[r.district]) grouped[r.district] = {};
    if (!grouped[r.district][r.blok]) grouped[r.district][r.blok] = {};
    if (!grouped[r.district][r.blok][r.vhod]) grouped[r.district][r.blok][r.vhod] = [];
    grouped[r.district][r.blok][r.vhod].push(r);
  }
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
                  <div className="px-4 py-2 bg-gray-50 font-medium text-gray-700 text-sm">Бл. {blok}</div>
                  {Object.entries(vhods).map(([vhod, reqs]) => (
                    <div key={vhod} className="px-4 py-3 border-t border-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-600">Вх. {vhod}</span>
                        <Badge variant="secondary" className="text-xs">{reqs.length} {reqs.length === 1 ? "заявка" : "заявки"}</Badge>
                      </div>
                      <div className="pl-3 space-y-1.5">
                        {reqs.map((r: any) => (
                          <div key={r.id} className="rounded-lg px-2 py-1 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700">Ап. {r.apartament}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{typeLabel[r.type] ?? r.type}</Badge>
                                {r.contactPhone && (
                                  <a href={`tel:${r.contactPhone}`} className="text-green-600 hover:text-green-700">
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
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
          {completed.map((r: any) => (
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

// ─── ContentTab ───────────────────────────────────────────────────────────────
function ContentTab() {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const { data: settings, refetch } = trpc.settings.getAll.useQuery();
  const updateSetting = trpc.settings.update.useMutation({
    onSuccess: () => { toast.success("Запазено успешно"); refetch(); setEditingKey(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const contentItems = [
    { key: "credit_standard_desc", label: "Описание — Стандартни кредити", placeholder: "1 кредит = 1 плик до ~4кг битов отпадък" },
    { key: "credit_recycling_desc", label: "Описание — Кредити за разделно", placeholder: "3 плика разделно = 1 кредит за разделно събиране" },
    { key: "homepage_subtitle", label: "Подзаглавие на началната страница", placeholder: "Вашият надежден партньор за управление на отпадъци" },
    { key: "contact_phone", label: "Телефон за контакт", placeholder: "+359 88 888 8888" },
  ];
  const settingsMap = settings as Record<string, string> | undefined;
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Управление на съдържанието</h2>
      {contentItems.map(item => (
        <div key={item.key} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">{item.label}</h3>
            {editingKey !== item.key && (
              <button onClick={() => { setEditingKey(item.key); setEditValue(settingsMap?.[item.key] ?? ""); }}
                className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium">
                <Pencil className="w-3.5 h-3.5" />{settingsMap?.[item.key] ? "Редактирай" : "Добави"}
              </button>
            )}
          </div>
          {editingKey === item.key ? (
            <div className="space-y-2">
              <Input value={editValue} onChange={e => setEditValue(e.target.value)} placeholder={item.placeholder} className="rounded-xl" />
              <div className="flex gap-2">
                <Button onClick={() => updateSetting.mutate({ key: item.key, value: editValue })}
                  disabled={updateSetting.isPending} className="bg-green-600 hover:bg-green-700 rounded-xl">
                  <Save className="w-4 h-4 mr-1" />Запази
                </Button>
                <Button variant="outline" onClick={() => setEditingKey(null)} className="rounded-xl">Отказ</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">{settingsMap?.[item.key] || <span className="text-gray-400 italic">Няма стойност</span>}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── DescriptionsTab ──────────────────────────────────────────────────────────
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
  const descMap = descriptions as Record<string, string> | undefined;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Описания на дейности</h2>
      <p className="text-sm text-gray-500">Добавете допълнителна информация към всяка дейност.</p>
      {ACTIVITY_KEYS.map(({ key, label, icon }) => {
        const current = descMap?.[key] ?? "";
        const isEditing = editingKey === key;
        return (
          <div key={key} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-xl">{icon}</span>{label}
              </h3>
              {!isEditing && (
                <button onClick={() => { setEditingKey(key); setEditValue(current); }}
                  className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium">
                  <Pencil className="w-3.5 h-3.5" />{current ? "Редактирай" : "Добави"}
                </button>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <Textarea value={editValue} onChange={e => setEditValue(e.target.value)}
                  placeholder={`Допълнителна информация за ${label.toLowerCase()}...`} rows={4} className="rounded-xl" />
                <div className="flex gap-2">
                  <Button onClick={() => upsert.mutate({ activityKey: key, description: editValue })}
                    disabled={upsert.isPending} className="bg-green-600 hover:bg-green-700 rounded-xl">
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

// ─── ProblemsTab ──────────────────────────────────────────────────────────────
function ProblemsTab() {
  const [selectedProblem, setSelectedProblem] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const { data: problems = [], refetch } = trpc.problems.list.useQuery();
  const resolve = trpc.problems.resolve.useMutation({
    onSuccess: () => { toast.success("Проблемът е разрешен"); refetch(); setSelectedProblem(null); setAdminNotes(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const forward = trpc.problems.forwardToClient.useMutation({
    onSuccess: () => { toast.success("Препратено към клиента"); refetch(); setSelectedProblem(null); setAdminNotes(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const open = (problems as any[]).filter((p: any) => p.status === "open");
  const statusLabel: Record<string, string> = { open: "Отворен", resolved: "Решен", forwarded: "Препратен" };
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
      {!(problems as any[]).length && (
        <div className="text-center py-12 text-gray-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Няма докладвани проблеми</p>
        </div>
      )}
      <div className="space-y-3">
        {(problems as any[]).map((problem: any) => (
          <div key={problem.id}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${problem.status === "open" ? "border-red-200" : "border-gray-200"}`}>
            <div className={`px-4 py-3 flex items-center justify-between ${problem.status === "open" ? "bg-red-50" : "bg-gray-50"}`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${problem.status === "open" ? "text-red-500" : "text-gray-400"}`} />
                <span className="font-semibold text-gray-900">{problem.workerName ?? "Работник"}</span>
                {problem.requestId && <span className="text-xs text-gray-500">Заявка #{problem.requestId}</span>}
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

// ─── ClientsTab ───────────────────────────────────────────────────────────────
function ClientsTab() {
  const [search, setSearch] = useState("");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [creditAmounts, setCreditAmounts] = useState<Record<string, string>>({});
  const [creditTypes, setCreditTypes] = useState<Record<string, "standard" | "recycling">>({});
  const [creditOps, setCreditOps] = useState<Record<string, "add" | "deduct">>({});
  const utils = trpc.useUtils();
  const { data: clients = [], isLoading } = trpc.users.listClients.useQuery();
  const { data: allRequests = [] } = trpc.requests.listAll.useQuery();
  const adminAdd = trpc.credits.adminAdd.useMutation({
    onSuccess: () => {
      toast.success("Кредитите са актуализирани");
      utils.users.listClients.invalidate();
      utils.credits.userTransactions.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const filtered = (clients as any[]).filter((c: any) => {
    const q = search.toLowerCase();
    return (c.name ?? "").toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q);
  });
  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  };
  const formatReqType = (type: string) => {
    const map: Record<string, string> = {
      standard: "Стандартен", recycling: "Разделно",
      nonstandard: "Нестандартен", construction: "Строителни",
    };
    return map[type] ?? type;
  };
  const formatReqStatus = (status: string) => {
    const map: Record<string, string> = {
      pending: "Изчаква", assigned: "Назначена", completed: "Завършена", cancelled: "Отменена",
    };
    return map[status] ?? status;
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Клиенти</h2>
          <p className="text-sm text-gray-500">{(clients as any[]).length} клиента в системата</p>
        </div>
        <Input placeholder="Търси клиент..." value={search} onChange={e => setSearch(e.target.value)} className="rounded-xl w-48" />
      </div>
      {isLoading ? <p className="text-gray-500">Зареждане...</p> : (
        <div className="space-y-3">
          {filtered.map((client: any) => {
            const isExpanded = expandedClient === client.openId;
            const clientRequests = (allRequests as any[]).filter((r: any) => r.userOpenId === client.openId);
            const completedCount = clientRequests.filter((r: any) => r.status === "completed").length;
            const stdCredits = parseFloat(client.creditsStandard ?? "0");
            const recCredits = parseFloat(client.creditsRecycling ?? "0");
            const creditType = creditTypes[client.openId] ?? "standard";
            const creditOp = creditOps[client.openId] ?? "add";
            const creditAmount = creditAmounts[client.openId] ?? "";
            return (
              <div key={client.openId} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedClient(isExpanded ? null : client.openId)}
                >
                  <div className="w-11 h-11 rounded-xl bg-green-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                    {getInitials(client.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 truncate">{client.name ?? "—"}</span>
                      <span className="text-xs text-gray-400 truncate">{client.email ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs font-medium text-green-700">🗑️ {stdCredits.toFixed(0)} ст.</span>
                      <span className="text-xs font-medium text-emerald-700">♻️ {recCredits.toFixed(0)} рец.</span>
                      <Badge variant="secondary" className="text-xs">{clientRequests.length} заявки ({completedCount} завършени)</Badge>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-gray-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-gray-50/50">
                    {/* Credits management */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Управление на кредити</h4>
                      <div className="flex flex-wrap gap-2 items-center">
                        <select value={creditOp} onChange={e => setCreditOps(prev => ({ ...prev, [client.openId]: e.target.value as "add" | "deduct" }))}
                          className="border border-gray-200 rounded-xl px-2 py-1.5 text-sm bg-white">
                          <option value="add">Добави</option>
                          <option value="deduct">Отнеми</option>
                        </select>
                        <select value={creditType} onChange={e => setCreditTypes(prev => ({ ...prev, [client.openId]: e.target.value as "standard" | "recycling" }))}
                          className="border border-gray-200 rounded-xl px-2 py-1.5 text-sm bg-white">
                          <option value="standard">Стандартни</option>
                          <option value="recycling">Разделно</option>
                        </select>
                        <Input type="number" min="1" step="1" placeholder="Брой" value={creditAmount}
                          onChange={e => setCreditAmounts(prev => ({ ...prev, [client.openId]: e.target.value }))}
                          className="rounded-xl w-24" />
                        <Button size="sm"
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
                          className="rounded-xl bg-green-600 hover:bg-green-700 text-white">
                          {adminAdd.isPending ? "..." : creditOp === "add" ? "Добави" : "Отнеми"}
                        </Button>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-600 mt-2">
                        <span>🗑️ Стандартни: <strong>{stdCredits.toFixed(0)}</strong></span>
                        <span>♻️ Рециклиращи: <strong>{recCredits.toFixed(0)}</strong></span>
                      </div>
                    </div>
                    {/* Request history */}
                    {clientRequests.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">История на заявките ({clientRequests.length})</h4>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {clientRequests.slice().reverse().map((r: any) => (
                            <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                              <div className="text-sm text-gray-700">
                                {r.district}, Бл. {r.blok}, Вх. {r.vhod}, Ап. {r.apartament}
                                <span className="text-xs text-gray-400 ml-2">{formatReqType(r.type)}</span>
                              </div>
                              <Badge variant={r.status === "completed" ? "default" : r.status === "cancelled" ? "secondary" : "outline"}
                                className="text-xs ml-2">
                                {formatReqStatus(r.status)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {!filtered.length && (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Няма намерени клиенти</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// ─── Change Password ──────────────────────────────────────────────────────────
function SubAdminChangePassword({ sessionId, onClose }: { sessionId: number; onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePassword = trpc.subAdmins.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Паролата е сменена успешно!");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mx-4 mb-2 space-y-3">
      <h3 className="font-semibold text-blue-800 text-sm">Смяна на парола</h3>
      <Input type="password" placeholder="Текуща парола" value={currentPassword}
        onChange={e => setCurrentPassword(e.target.value)} className="rounded-xl" />
      <Input type="password" placeholder="Нова парола" value={newPassword}
        onChange={e => setNewPassword(e.target.value)} className="rounded-xl" />
      <Input type="password" placeholder="Потвърди нова парола" value={confirmPassword}
        onChange={e => setConfirmPassword(e.target.value)} className="rounded-xl" />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            if (newPassword !== confirmPassword) { toast.error("Паролите не съвпадат"); return; }
            if (newPassword.length < 6) { toast.error("Паролата трябва да е поне 6 символа"); return; }
            changePassword.mutate({ id: sessionId, currentPassword, newPassword });
          }}
          disabled={changePassword.isPending}
          className="bg-blue-600 hover:bg-blue-700 rounded-xl text-white"
        >
          {changePassword.isPending ? "Сменя се..." : "Смени"}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose} className="rounded-xl">Отказ</Button>
      </div>
    </div>
  );
}
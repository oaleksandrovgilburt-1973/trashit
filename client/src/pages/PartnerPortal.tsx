import { useState, useEffect } from "react";
import { toast } from "sonner";
import { LogOut, Eye, EyeOff, ShieldCheck, CalendarDays } from "lucide-react";
import { trpc } from "@/lib/trpc";

const PARTNER_TOKEN_KEY = "partner_session";

const CATEGORY_LABELS: Record<string, string> = {
  standard: "Стандартен отпадък",
  recycling: "Рециклиране",
  nonstandard: "Нестандартен отпадък",
  construction: "Строителен отпадък",
  subscription15: "Абонамент (15 посещения)",
  subscription30: "Абонамент (30 посещения)",
};

export default function PartnerPortal() {
  const [token, setToken] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [mode, setMode] = useState<"day" | "month">("day");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const saved = localStorage.getItem(PARTNER_TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  const loginMutation = trpc.partnerAuth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem(PARTNER_TOKEN_KEY, data.token);
      setToken(data.token);
      setPartnerName(data.partnerName);
      toast.success("Успешен вход!");
    },
    onError: (err) => toast.error(err.message),
  });

  const logoutMutation = trpc.partnerAuth.logout.useMutation();

  const { data: stats, isLoading } = trpc.partnerAuth.getStats.useQuery(
    { partnerToken: token ?? "", mode, date: mode === "day" ? date : month },
    { enabled: !!token }
  );

  const handleLogout = () => {
    logoutMutation.mutate();
    localStorage.removeItem(PARTNER_TOKEN_KEY);
    setToken(null);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#F9FAFB]">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Партньорски портал</h1>
            <p className="text-sm text-gray-500 mt-1">TRASHit за партньори</p>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Потребителско име"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Парола"
                onKeyDown={e => e.key === "Enter" && loginMutation.mutate({ username, password })}
                className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={() => loginMutation.mutate({ username, password })}
              disabled={!username || !password || loginMutation.isPending}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 shadow-md"
            >
              {loginMutation.isPending ? "Влизане..." : "Вход"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const categories = ["standard", "recycling", "nonstandard", "construction", "subscription15", "subscription30"];

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-700 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-tight">{partnerName || "Партньорски портал"}</h1>
              <p className="text-xs text-gray-500">TRASHit</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-sm font-medium">
            <LogOut className="w-4 h-4" />Изход
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center gap-3 flex-wrap">
          <CalendarDays className="w-4 h-4 text-green-600" />
          <div className="flex gap-2">
            <button
              onClick={() => setMode("day")}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${mode === "day" ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
            >
              Ден
            </button>
            <button
              onClick={() => setMode("month")}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${mode === "month" ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
            >
              Месец
            </button>
          </div>
          {mode === "day" ? (
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          ) : (
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          )}
        </div>

        {isLoading ? (
          <p className="text-gray-500 text-center py-8">Зареждане...</p>
        ) : (
          <div className="grid gap-3">
            {categories.map(cat => {
              const s = (stats as any)?.[cat] ?? { acceptedCount: 0, paidCount: 0, paidSum: 0 };
              return (
                <div key={cat} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-2">{CATEGORY_LABELS[cat]}</h3>
                  <div className="flex gap-6 flex-wrap text-sm">
                    {(cat === "nonstandard" || cat === "construction") && (
                      <div>
                        <span className="text-gray-500">Приети: </span>
                        <span className="font-semibold text-amber-600">{s.acceptedCount}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Платени: </span>
                      <span className="font-semibold text-green-600">{s.paidCount}</span>
                    </div>
                    {s.paidSum > 0 && (
                      <div>
                        <span className="text-gray-500">Сума: </span>
                        <span className="font-semibold text-gray-800">{s.paidSum.toFixed(2)} €</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

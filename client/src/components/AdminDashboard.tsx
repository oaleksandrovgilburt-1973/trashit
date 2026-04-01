import { trpc } from "@/lib/trpc";
import {
  ClipboardList, CheckCircle2, BarChart3, Coins,
  MapPin, Users, HardHat, RefreshCw, TrendingUp,
  Activity, Trophy
} from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading, refetch, isFetching } = trpc.adminDashboard.getStats.useQuery(
    undefined,
    { refetchInterval: 30_000 } // auto-refresh every 30s
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Табло за управление</h2>
          <p className="text-sm text-gray-500 mt-0.5">Статистики в реално време</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Обнови
        </button>
      </div>

      {/* Today's Activity */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-green-600" />
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Днес</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={<ClipboardList className="w-6 h-6 text-amber-600" />}
            bg="bg-amber-50"
            border="border-amber-100"
            label="Активни заявки"
            value={stats?.activeTodayCount}
            isLoading={isLoading}
            accent="text-amber-700"
          />
          <StatCard
            icon={<CheckCircle2 className="w-6 h-6 text-green-600" />}
            bg="bg-green-50"
            border="border-green-100"
            label="Приключени"
            value={stats?.completedTodayCount}
            isLoading={isLoading}
            accent="text-green-700"
          />
        </div>
      </div>

      {/* Overall Stats */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Общо</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={<ClipboardList className="w-6 h-6 text-blue-600" />}
            bg="bg-blue-50"
            border="border-blue-100"
            label="Всички заявки"
            value={stats?.totalRequestsCount}
            isLoading={isLoading}
            accent="text-blue-700"
          />
          <StatCard
            icon={<Coins className="w-6 h-6 text-yellow-600" />}
            bg="bg-yellow-50"
            border="border-yellow-100"
            label="Приходи (кредити)"
            value={stats ? `${stats.totalRevenue.toFixed(2)} лв.` : undefined}
            isLoading={isLoading}
            accent="text-yellow-700"
          />
        </div>
      </div>

      {/* Users & Workers */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Потребители</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={<Users className="w-6 h-6 text-purple-600" />}
            bg="bg-purple-50"
            border="border-purple-100"
            label="Регистрирани клиенти"
            value={stats?.registeredUsersCount}
            isLoading={isLoading}
            accent="text-purple-700"
          />
          <StatCard
            icon={<HardHat className="w-6 h-6 text-teal-600" />}
            bg="bg-teal-50"
            border="border-teal-100"
            label="Активни работници"
            value={stats?.activeWorkersCount}
            isLoading={isLoading}
            accent="text-teal-700"
          />
        </div>
      </div>

      {/* Top Districts */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Топ 3 квартала</h3>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : stats?.topDistricts && stats.topDistricts.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {stats.topDistricts.map((d, i) => {
                const medals = ["🥇", "🥈", "🥉"];
                const barColors = ["bg-green-500", "bg-green-400", "bg-green-300"];
                const maxCount = stats.topDistricts[0]?.count ?? 1;
                const pct = Math.round((d.count / maxCount) * 100);
                return (
                  <div key={d.name} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{medals[i]}</span>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-semibold text-gray-800 text-sm">{d.name}</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">
                        {d.count} заявки
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColors[i]} rounded-full transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Все още няма данни за квартали</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Reusable Stat Card ───────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  bg: string;
  border: string;
  label: string;
  value: number | string | undefined;
  isLoading: boolean;
  accent: string;
}

function StatCard({ icon, bg, border, label, value, isLoading, accent }: StatCardProps) {
  return (
    <div className={`bg-white rounded-2xl border ${border} shadow-sm p-5`}>
      <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center mb-3`}>
        {icon}
      </div>
      {isLoading ? (
        <>
          <div className="h-7 w-16 bg-gray-100 rounded-lg animate-pulse mb-1.5" />
          <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
        </>
      ) : (
        <>
          <div className={`text-2xl font-extrabold ${accent} leading-tight`}>
            {value ?? 0}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 leading-snug">{label}</div>
        </>
      )}
    </div>
  );
}

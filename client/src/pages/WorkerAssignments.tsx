/**
 * WorkerAssignments — страница за claim/unclaim на квартали/блокове/входове.
 * Достъпна само за работници (изисква deviceToken).
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { MapPin, CheckCircle2, XCircle, Plus } from "lucide-react";
import MainLayout from "@/components/MainLayout";

function getDeviceToken(): string {
  try {
    const raw = localStorage.getItem("trashit_worker_session");
    return raw ? JSON.parse(raw).deviceToken ?? "" : "";
  } catch { return ""; }
}

export default function WorkerAssignments() {
  const [deviceToken] = useState(() => getDeviceToken());
  const utils = trpc.useUtils();

  const { data: myAssignments = [], isLoading } = trpc.workerAssignments.myAssignments.useQuery(
    { deviceToken },
    { enabled: !!deviceToken },
  );

  const claimMutation = trpc.workerAssignments.claim.useMutation({
    onSuccess: () => {
      toast.success("Входът е приет успешно.");
      utils.workerAssignments.myAssignments.invalidate();
      setForm({ district: "", blok: "", vhod: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const unclaimMutation = trpc.workerAssignments.unclaim.useMutation({
    onSuccess: () => {
      toast.success("Входът е освободен.");
      utils.workerAssignments.myAssignments.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({ district: "", blok: "", vhod: "" });

  if (!deviceToken) {
    return (
      <MainLayout>
        <div className="container py-8 text-center text-muted-foreground">
          Трябва да сте влезли като работник.
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Моите входове
        </h1>

        {/* Add new claim */}
        <div className="bg-secondary rounded-2xl p-4 space-y-3 border border-border">
          <p className="text-sm font-semibold text-foreground">Приеми нов вход</p>
          <div className="grid grid-cols-3 gap-2">
            <input
              className="rounded-xl border border-border p-2.5 text-sm bg-background"
              placeholder="Квартал"
              value={form.district}
              onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
            />
            <input
              className="rounded-xl border border-border p-2.5 text-sm bg-background"
              placeholder="Блок"
              value={form.blok}
              onChange={e => setForm(f => ({ ...f, blok: e.target.value }))}
            />
            <input
              className="rounded-xl border border-border p-2.5 text-sm bg-background"
              placeholder="Вход"
              value={form.vhod}
              onChange={e => setForm(f => ({ ...f, vhod: e.target.value }))}
            />
          </div>
          <button
            onClick={() => {
              if (!form.district.trim() || !form.blok.trim() || !form.vhod.trim()) {
                toast.error("Попълнете квартал, блок и вход.");
                return;
              }
              claimMutation.mutate({ deviceToken, ...form });
            }}
            disabled={claimMutation.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            <Plus className="w-4 h-4" />
            Приеми
          </button>
        </div>

        {/* My assignments list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-2xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : myAssignments.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Нямате приети входове.
          </div>
        ) : (
          <div className="space-y-2">
            {myAssignments.map(a => (
              <div
                key={a.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-background border border-border"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{a.district}, Бл. {a.blok}, Вх. {a.vhod}</p>
                    <p className="text-xs text-muted-foreground">
                      Прието: {new Date(a.claimedAt).toLocaleDateString("bg-BG")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => unclaimMutation.mutate({ deviceToken, district: a.district, blok: a.blok, vhod: a.vhod })}
                  disabled={unclaimMutation.isPending}
                  className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-colors"
                  title="Освободи"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
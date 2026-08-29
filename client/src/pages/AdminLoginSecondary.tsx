import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/lib/trpc";
import MainLayout from "@/components/MainLayout";

const ADMIN_TOKEN_KEY = "admin_session";

export default function AdminLoginSecondary() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = trpc.adminAuth.loginAdditional.useMutation({
    onSuccess: (data) => {
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      toast.success("Успешен вход!");
      window.location.href = "/admin";
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </button>

          <div className="bg-card rounded-2xl shadow-lg border border-border p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Администраторски вход</h1>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Потребителско име"
                autoComplete="off"
                className="w-full px-4 py-3 rounded-xl border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Парола"
                  autoComplete="new-password"
                  onKeyDown={e => e.key === "Enter" && loginMutation.mutate({ username, password })}
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                onClick={() => loginMutation.mutate({ username, password })}
                disabled={!username || !password || loginMutation.isPending}
                className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-md"
              >
                {loginMutation.isPending ? "Влизане..." : "Вход"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

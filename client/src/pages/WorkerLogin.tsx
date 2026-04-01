import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { HardHat, ArrowLeft, Eye, EyeOff, Smartphone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import MainLayout from "@/components/MainLayout";

const WORKER_SESSION_KEY = "trashit_worker_session";

export default function WorkerLogin() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"login" | "change_password">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [changeForm, setChangeForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [workerId, setWorkerId] = useState<number | null>(null);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);

  // Check if already logged in
  useEffect(() => {
    const stored = localStorage.getItem(WORKER_SESSION_KEY);
    if (stored) {
      try {
        const sess = JSON.parse(stored);
        if (sess?.deviceToken) navigate("/worker");
      } catch {
        localStorage.removeItem(WORKER_SESSION_KEY);
      }
    }
  }, [navigate]);

  const loginMutation = trpc.workerAuth.login.useMutation({
    onSuccess: (data) => {
      // Save full session object under the key WorkerPortal reads
      const sessionObj = {
        workerId: data.workerId,
        name: data.name ?? "",
        mustChangePassword: data.mustChangePassword,
        openId: "",
        deviceToken: data.deviceToken,
      };
      localStorage.setItem(WORKER_SESSION_KEY, JSON.stringify(sessionObj));
      setWorkerId(data.workerId);
      setDeviceToken(data.deviceToken);

      if (data.mustChangePassword) {
        setStep("change_password");
        setChangeForm(f => ({ ...f, currentPassword: loginForm.password }));
      } else {
        toast.success(t.loginSuccess);
        window.location.href = "/worker";
      }
    },
    onError: (err) => {
      toast.error(err.message || t.errorInvalidCredentials);
    },
  });

  const changePasswordMutation = trpc.workerAuth.changePassword.useMutation({
    onSuccess: () => {
      // Update session to mark mustChangePassword as false
      const stored = localStorage.getItem(WORKER_SESSION_KEY);
      if (stored) {
        try {
          const sess = JSON.parse(stored);
          sess.mustChangePassword = false;
          localStorage.setItem(WORKER_SESSION_KEY, JSON.stringify(sess));
        } catch { /* ignore */ }
      }
      toast.success(t.passwordChanged);
      window.location.href = "/worker";
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const validateLogin = () => {
    const errs: Record<string, string> = {};
    if (!loginForm.username.trim()) errs.username = t.errorRequired;
    if (!loginForm.password.trim()) errs.password = t.errorRequired;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateChange = () => {
    const errs: Record<string, string> = {};
    if (!changeForm.newPassword || changeForm.newPassword.length < 6) errs.newPassword = t.errorPasswordTooShort;
    if (changeForm.newPassword !== changeForm.confirm) errs.confirm = t.errorPasswordMismatch;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = () => {
    if (!validateLogin()) return;
    const deviceName = `${navigator.platform || "Device"} — ${new Date().toLocaleDateString()}`;
    loginMutation.mutate({ username: loginForm.username, password: loginForm.password, deviceName });
  };

  const handleChangePassword = () => {
    if (!validateChange() || !workerId || !deviceToken) return;
    changePasswordMutation.mutate({
      workerId,
      currentPassword: changeForm.currentPassword,
      newPassword: changeForm.newPassword,
      deviceToken,
    });
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </button>

          <div className="bg-card rounded-2xl shadow-lg border border-border p-6 sm:p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <HardHat className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">
                {step === "login" ? t.workerLoginTitle : t.mustChangePasswordTitle}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {step === "login" ? t.workerLoginDesc : t.mustChangePasswordDesc}
              </p>
            </div>

            {/* Device info banner */}
            {step === "login" && (
              <div className="flex items-center gap-2 bg-primary/5 rounded-xl p-3 mb-5 text-xs text-muted-foreground">
                <Smartphone className="w-4 h-4 text-primary shrink-0" />
                {t.deviceInfo}
              </div>
            )}

            {/* Login form */}
            {step === "login" && (
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={loginForm.username}
                    onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                    placeholder={t.username}
                    autoComplete="off"
                    className={`w-full px-4 py-3 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${errors.username ? "border-red-400" : "border-border"}`}
                  />
                  {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                </div>

                <div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                      placeholder={t.password}
                      autoComplete="new-password"
                      className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${errors.password ? "border-red-400" : "border-border"}`}
                      onKeyDown={e => e.key === "Enter" && handleLogin()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>

                <button
                  onClick={handleLogin}
                  disabled={loginMutation.isPending}
                  className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-md"
                >
                  {loginMutation.isPending ? t.loading : t.login}
                </button>
              </div>
            )}

            {/* Change password form */}
            {step === "change_password" && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  🔒 {t.mustChangePasswordDesc}
                </div>

                <div>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={changeForm.newPassword}
                      onChange={e => setChangeForm(f => ({ ...f, newPassword: e.target.value }))}
                      placeholder={t.newPassword}
                      className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${errors.newPassword ? "border-red-400" : "border-border"}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>}
                </div>

                <div>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={changeForm.confirm}
                      onChange={e => setChangeForm(f => ({ ...f, confirm: e.target.value }))}
                      placeholder={t.confirmNewPassword}
                      className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${errors.confirm ? "border-red-400" : "border-border"}`}
                      onKeyDown={e => e.key === "Enter" && handleChangePassword()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm}</p>}
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={changePasswordMutation.isPending}
                  className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-md"
                >
                  {changePasswordMutation.isPending ? t.loading : t.changePassword}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

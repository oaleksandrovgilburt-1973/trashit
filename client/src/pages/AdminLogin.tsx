import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import MainLayout from "@/components/MainLayout";

const ADMIN_TOKEN_KEY = "admin_session";

export default function AdminLogin() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"login" | "change_credentials">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [changeForm, setChangeForm] = useState({ currentPassword: "", newUsername: "", newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loginSuccess, setLoginSuccess] = useState(false);

  useEffect(() => {
    if (loginSuccess) {
      window.location.href = "/admin";
    }
  }, [loginSuccess]);

  const loginMutation = trpc.adminAuth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setAdminToken(data.token);
      if (data.mustChangeCredentials) {
        setStep("change_credentials");
        setChangeForm(f => ({ ...f, currentPassword: loginForm.password }));
        toast.info("Препоръчваме ви да смените данните по подразбиране.");
      } else {
        toast.success(t.loginSuccess);
        setLoginSuccess(true);
      }
    },
    onError: (err) => {
      if (err.message.includes("блокиран") || err.message.includes("blocked")) {
        setErrors({ general: t.defaultCredentialsBlocked });
      } else {
        toast.error(err.message || t.errorInvalidCredentials);
      }
    },
  });

  const changeCredentialsMutation = trpc.adminAuth.changeCredentials.useMutation({
    onSuccess: () => {
      toast.success(t.credentialsChanged);
      window.location.href = "/admin";
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
    if (!changeForm.newUsername || changeForm.newUsername.length < 3) errs.newUsername = t.errorUsernameTooShort;
    if (!changeForm.newPassword || changeForm.newPassword.length < 6) errs.newPassword = t.errorPasswordTooShort;
    if (changeForm.newPassword !== changeForm.confirmPassword) errs.confirmPassword = t.errorPasswordMismatch;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = () => {
    if (!validateLogin()) return;
    loginMutation.mutate({ username: loginForm.username, password: loginForm.password });
  };

  const handleChangeCredentials = () => {
    if (!validateChange() || !adminToken) return;
    changeCredentialsMutation.mutate({
      currentPassword: changeForm.currentPassword,
      newUsername: changeForm.newUsername,
      newPassword: changeForm.newPassword,
      adminToken,
    });
  };

  const skipChange = () => {
    window.location.href = "/admin";
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
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
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">
                {step === "login" ? t.adminLoginTitle : t.changeCredentialsTitle}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {step === "login" ? t.adminLoginDesc : ""}
              </p>
            </div>

            {/* General error */}
            {errors.general && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {errors.general}
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
                    placeholder={t.adminUsername}
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
                      placeholder={t.adminPassword}
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

            {/* Change credentials form */}
            {step === "change_credentials" && (
              <div className="space-y-4">
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Препоръчваме ви да смените данните по подразбиране (admin/admin) за по-добра сигурност.</span>
                </div>

                <div>
                  <input
                    type="text"
                    value={changeForm.newUsername}
                    onChange={e => setChangeForm(f => ({ ...f, newUsername: e.target.value }))}
                    placeholder={t.newUsername}
                    className={`w-full px-4 py-3 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${errors.newUsername ? "border-red-400" : "border-border"}`}
                  />
                  {errors.newUsername && <p className="text-red-500 text-xs mt-1">{errors.newUsername}</p>}
                </div>

                <div>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={changeForm.newPassword}
                      onChange={e => setChangeForm(f => ({ ...f, newPassword: e.target.value }))}
                      placeholder={t.newPasswordLabel}
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
                  <input
                    type="password"
                    value={changeForm.confirmPassword}
                    onChange={e => setChangeForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder={t.confirmPassword}
                    className={`w-full px-4 py-3 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${errors.confirmPassword ? "border-red-400" : "border-border"}`}
                    onKeyDown={e => e.key === "Enter" && handleChangeCredentials()}
                  />
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>

                <button
                  onClick={handleChangeCredentials}
                  disabled={changeCredentialsMutation.isPending}
                  className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-md"
                >
                  {changeCredentialsMutation.isPending ? t.loading : t.changeCredentials}
                </button>

                <button
                  onClick={skipChange}
                  className="w-full py-2.5 rounded-xl border border-border text-muted-foreground text-sm hover:bg-muted transition-all"
                >
                  {t.cancel} — {t.login.toLowerCase()} без смяна
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

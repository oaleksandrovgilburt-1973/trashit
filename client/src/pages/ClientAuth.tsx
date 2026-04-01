import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Mail, Phone, ArrowLeft, Sparkles, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import MainLayout from "@/components/MainLayout";

type Tab = "social" | "email" | "phone";
type Mode = "login" | "register";

export default function ClientAuth() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("social");
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Email form state
  const [emailForm, setEmailForm] = useState({ name: "", email: "", password: "", confirm: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Phone form state
  const [phoneForm, setPhoneForm] = useState({ name: "", phone: "" });

  const registerMutation = trpc.clientAuth.register.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.invalidate();
      toast.success(t.bonusCreditsReceived);
      navigate("/");
    },
    onError: (err) => {
      if (err.message.includes("імейл") || err.message.includes("email") || err.message.toLowerCase().includes("съществува")) {
        setErrors(e => ({ ...e, email: t.errorEmailExists }));
      } else {
        toast.error(err.message);
      }
    },
  });

  const loginMutation = trpc.clientAuth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success(t.loginSuccess);
      navigate("/");
    },
    onError: (err) => {
      toast.error(err.message || t.errorInvalidCredentials);
    },
  });

  const phoneRegisterMutation = trpc.clientAuth.registerPhone.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success(t.bonusCreditsReceived);
      navigate("/");
    },
    onError: (err) => toast.error(err.message),
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (tab === "email") {
      if (!emailForm.email) errs.email = t.errorRequired;
      else if (!/\S+@\S+\.\S+/.test(emailForm.email)) errs.email = t.errorEmailInvalid;
      if (!emailForm.password) errs.password = t.errorRequired;
      else if (emailForm.password.length < 6) errs.password = t.errorPasswordTooShort;
      if (mode === "register") {
        if (!emailForm.name || emailForm.name.length < 2) errs.name = t.errorNameTooShort;
        if (emailForm.confirm !== emailForm.password) errs.confirm = t.errorPasswordMismatch;
      }
    }
    if (tab === "phone") {
      if (!phoneForm.name || phoneForm.name.length < 2) errs.name = t.errorNameTooShort;
      if (!phoneForm.phone || phoneForm.phone.length < 8) errs.phone = t.errorPhoneInvalid;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (tab === "email") {
      if (mode === "register") {
        registerMutation.mutate({ name: emailForm.name, email: emailForm.email, password: emailForm.password, phone: emailForm.phone || undefined });
      } else {
        loginMutation.mutate({ email: emailForm.email, password: emailForm.password });
      }
    } else if (tab === "phone") {
      phoneRegisterMutation.mutate({ name: phoneForm.name, phone: phoneForm.phone });
    }
  };

  const isPending = registerMutation.isPending || loginMutation.isPending || phoneRegisterMutation.isPending;

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Back button */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </button>

          {/* Card */}
          <div className="bg-card rounded-2xl shadow-lg border border-border p-6 sm:p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">👤</span>
              </div>
              <h1 className="text-xl font-bold text-foreground">{t.loginOrRegister}</h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                {t.bonusCreditsMessage}
              </p>
            </div>

            {/* Tab selector */}
            <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
              {(["social", "email", "phone"] as Tab[]).map(tabKey => (
                <button
                  key={tabKey}
                  onClick={() => setTab(tabKey)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                    tab === tabKey ? "bg-white shadow text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tabKey === "social" ? "Social" : tabKey === "email" ? t.email : t.phoneNumber}
                </button>
              ))}
            </div>

            {/* Social tab */}
            {tab === "social" && (
              <div className="space-y-3">
                <a
                  href={getLoginUrl()}
                  className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl border border-border bg-white hover:bg-gray-50 text-foreground font-medium text-sm transition-all shadow-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {t.loginWithGoogle}
                </a>
                <a
                  href={getLoginUrl()}
                  className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl border border-border bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium text-sm transition-all shadow-sm"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  {t.loginWithFacebook}
                </a>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs text-muted-foreground bg-card px-2">
                    {t.orContinueWith}
                  </div>
                </div>

                <button
                  onClick={() => setTab("email")}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-border hover:bg-muted text-foreground text-sm font-medium transition-all"
                >
                  <Mail className="w-4 h-4" />
                  {t.loginWithEmail}
                </button>
                <button
                  onClick={() => setTab("phone")}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-border hover:bg-muted text-foreground text-sm font-medium transition-all"
                >
                  <Phone className="w-4 h-4" />
                  {t.loginWithPhone}
                </button>
              </div>
            )}

            {/* Email tab */}
            {tab === "email" && (
              <div className="space-y-4">
                {/* Mode toggle */}
                <div className="flex gap-1 bg-muted rounded-xl p-1 mb-2">
                  <button
                    onClick={() => setMode("login")}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "login" ? "bg-white shadow text-primary" : "text-muted-foreground"}`}
                  >
                    {t.login}
                  </button>
                  <button
                    onClick={() => setMode("register")}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "register" ? "bg-white shadow text-primary" : "text-muted-foreground"}`}
                  >
                    {t.register}
                  </button>
                </div>

                {mode === "register" && (
                  <div>
                    <input
                      type="text"
                      value={emailForm.name}
                      onChange={e => setEmailForm(f => ({ ...f, name: e.target.value }))}
                      placeholder={t.name}
                      className={`w-full px-4 py-3 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${errors.name ? "border-red-400" : "border-border"}`}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>
                )}

                <div>
                  <input
                    type="email"
                    value={emailForm.email}
                    onChange={e => setEmailForm(f => ({ ...f, email: e.target.value }))}
                    placeholder={t.email}
                    className={`w-full px-4 py-3 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${errors.email ? "border-red-400" : "border-border"}`}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={emailForm.password}
                      onChange={e => setEmailForm(f => ({ ...f, password: e.target.value }))}
                      placeholder={t.password}
                      className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${errors.password ? "border-red-400" : "border-border"}`}
                      onKeyDown={e => e.key === "Enter" && handleSubmit()}
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

                {mode === "register" && (
                  <>
                    <div>
                      <div className="relative">
                        <input
                          type={showConfirm ? "text" : "password"}
                          value={emailForm.confirm}
                          onChange={e => setEmailForm(f => ({ ...f, confirm: e.target.value }))}
                          placeholder={t.confirmPassword}
                          className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${errors.confirm ? "border-red-400" : "border-border"}`}
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
                    <input
                      type="tel"
                      value={emailForm.phone}
                      onChange={e => setEmailForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder={`${t.phoneNumber} (${t.or.toLowerCase()} ${t.errorRequired.toLowerCase()})`}
                      className="w-full px-4 py-3 rounded-xl border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                  </>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-md"
                >
                  {isPending ? t.loading : mode === "login" ? t.login : t.register}
                </button>
              </div>
            )}

            {/* Phone tab */}
            {tab === "phone" && (
              <div className="space-y-4">
                <div className="bg-primary/5 rounded-xl p-3 text-sm text-muted-foreground text-center">
                  <Sparkles className="w-4 h-4 inline mr-1 text-yellow-500" />
                  {t.bonusCreditsMessage}
                </div>

                <div>
                  <input
                    type="text"
                    value={phoneForm.name}
                    onChange={e => setPhoneForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={t.name}
                    className={`w-full px-4 py-3 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${errors.name ? "border-red-400" : "border-border"}`}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <input
                    type="tel"
                    value={phoneForm.phone}
                    onChange={e => setPhoneForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder={t.phoneNumber + " (+359...)"}
                    className={`w-full px-4 py-3 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${errors.phone ? "border-red-400" : "border-border"}`}
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-md"
                >
                  {isPending ? t.loading : t.register}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

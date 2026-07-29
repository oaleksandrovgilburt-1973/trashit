import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Mail, Phone, ArrowLeft, Sparkles, Eye, EyeOff, X } from "lucide-react";
import { TERMS_TEXT } from "@/lib/termsContent";
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
  const [showPhonePassword, setShowPhonePassword] = useState(false);
  const [showPhoneConfirm, setShowPhoneConfirm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Email form state
  const [emailForm, setEmailForm] = useState({ name: "", email: "", password: "", confirm: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Phone form state
  const [phoneForm, setPhoneForm] = useState({ name: "", phone: "", password: "", confirm: "" });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
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
  const phoneLoginMutation = trpc.clientAuth.loginPhone.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success(t.loginSuccess);
      navigate("/");
    },
    onError: (err) => toast.error(err.message || t.errorInvalidCredentials),
  });
  const googleLoginMutation = trpc.clientAuth.loginGoogle.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.invalidate();
      toast.success(data.isNew ? t.bonusCreditsReceived : t.loginSuccess);
      navigate("/");
    },
    onError: (err) => toast.error(err.message),
  });
  const googleButtonRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (tab !== "social") return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    const initGoogle = () => {
      const w = window as any;
      if (!w.google || !googleButtonRef.current) return;
      w.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) => {
          googleLoginMutation.mutate({ credential: response.credential });
        },
      });
      w.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
      });
    };
    if ((window as any).google) {
      initGoogle();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.body.appendChild(script);
    }
  }, [tab]);

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
        if (!emailForm.phone || emailForm.phone.length < 8) errs.phone = t.errorPhoneInvalid;
      }
    }
    if (tab === "phone") {
      if (mode === "register" && (!phoneForm.name || phoneForm.name.length < 2)) errs.name = t.errorNameTooShort;
      if (!phoneForm.phone || phoneForm.phone.length < 8) errs.phone = t.errorPhoneInvalid;
      if (!phoneForm.password) errs.password = t.errorRequired;
      else if (mode === "register" && phoneForm.password.length < 6) errs.password = t.errorPasswordTooShort;
      if (mode === "register" && phoneForm.confirm !== phoneForm.password) errs.confirm = t.errorPasswordMismatch;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (tab === "email") {
      if (mode === "register") {
        registerMutation.mutate({ name: emailForm.name, email: emailForm.email, password: emailForm.password, phone: emailForm.phone });
      } else {
        loginMutation.mutate({ email: emailForm.email, password: emailForm.password });
      }
    } else if (tab === "phone") {
      if (mode === "register") {
        phoneRegisterMutation.mutate({ name: phoneForm.name, phone: phoneForm.phone, password: phoneForm.password });
      } else {
        phoneLoginMutation.mutate({ phone: phoneForm.phone, password: phoneForm.password });
      }
    }
  };

  const isPending = registerMutation.isPending || loginMutation.isPending || phoneRegisterMutation.isPending || phoneLoginMutation.isPending;

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

            {tab === "social" && (
  <div className="space-y-3">
    <div ref={googleButtonRef} className="flex justify-center" />
    <div className="relative py-2">
      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
      <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">{t.or}</span></div>
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
                      className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                        mode === "register" && emailForm.password
                          ? (emailForm.password.length >= 6 ? "border-green-400" : "border-red-400")
                          : errors.password ? "border-red-400" : "border-border"
                      }`}
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
                          className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                            emailForm.confirm
                              ? (emailForm.confirm === emailForm.password ? "border-green-400" : "border-red-400")
                              : errors.confirm ? "border-red-400" : "border-border"
                          }`}
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
                      placeholder={t.phoneNumber}
                      className={`w-full px-4 py-3 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${errors.phone ? "border-red-400" : "border-border"}`}
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </>
                )}

                {mode === "register" && (
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="terms-email"
                      checked={termsAccepted}
                      onChange={e => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-primary cursor-pointer"
                    />
                    <label htmlFor="terms-email" className="text-xs text-muted-foreground leading-relaxed">
                      Приемам{" "}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-primary underline font-medium"
                      >
                        Общите условия
                      </button>
                    </label>
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={isPending || (mode === "register" && !termsAccepted)}
                  className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-md"
                >
                  {isPending ? t.loading : mode === "login" ? t.login : t.register}
                </button>
              </div>
            )}

            {/* Phone tab */}
            {tab === "phone" && (
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
                  <div className="bg-primary/5 rounded-xl p-3 text-sm text-muted-foreground text-center">
                    <Sparkles className="w-4 h-4 inline mr-1 text-yellow-500" />
                    {t.bonusCreditsMessage}
                  </div>
                )}
                {mode === "register" && (
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
                )}
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
                <div>
                  <div className="relative">
                    <input
                      type={showPhonePassword ? "text" : "password"}
                      value={phoneForm.password}
                      onChange={e => setPhoneForm(f => ({ ...f, password: e.target.value }))}
                      placeholder={t.password}
                      className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                        mode === "register" && phoneForm.password
                          ? (phoneForm.password.length >= 6 ? "border-green-400" : "border-red-400")
                          : errors.password ? "border-red-400" : "border-border"
                      }`}
                      onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPhonePassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPhonePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>
                {mode === "register" && (
                  <div>
                    <div className="relative">
                      <input
                        type={showPhoneConfirm ? "text" : "password"}
                        value={phoneForm.confirm}
                        onChange={e => setPhoneForm(f => ({ ...f, confirm: e.target.value }))}
                        placeholder={t.confirmPassword}
                        className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                          phoneForm.confirm
                            ? (phoneForm.confirm === phoneForm.password ? "border-green-400" : "border-red-400")
                            : errors.confirm ? "border-red-400" : "border-border"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPhoneConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPhoneConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm}</p>}
                  </div>
                )}
                {mode === "register" && (
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="terms-phone"
                      checked={termsAccepted}
                      onChange={e => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-primary cursor-pointer"
                    />
                    <label htmlFor="terms-phone" className="text-xs text-muted-foreground leading-relaxed">
                      Приемам{" "}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-primary underline font-medium"
                      >
                        Общите условия
                      </button>
                    </label>
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={isPending || (mode === "register" && !termsAccepted)}
                  className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-md"
                >
                  {isPending ? t.loading : mode === "login" ? t.login : t.register}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-base font-bold text-foreground">Общи условия</h2>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 flex-1">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{TERMS_TEXT}</p>
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={() => { setTermsAccepted(true); setShowTermsModal(false); }}
                className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all"
              >
                Приемам
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Mail, Phone, ArrowLeft, Sparkles, Eye, EyeOff, X } from "lucide-react";
import { TERMS_TEXT, TERMS_TEXT_EN } from "@/lib/termsContent";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import MainLayout from "@/components/MainLayout";
import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";

type Tab = "social" | "email";
type Mode = "login" | "register";

export default function ClientAuth() {
  const { t, language } = useLanguage();
  const isBg = language === "bg";
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
  const [showVerifyNotice, setShowVerifyNotice] = useState(false);
  const registerMutation = trpc.clientAuth.register.useMutation({
    onSuccess: async () => {
      setShowVerifyNotice(true);
    },
    onError: (err) => {
      if (err.message.includes("имейл") || err.message.includes("email") || err.message.toLowerCase().includes("съществува")) {
        setErrors(e => ({ ...e, email: t.errorEmailExists }));
      } else {
        toast.error(err.message);
      }
    },
  });
  const resendVerificationMutation = trpc.clientAuth.resendVerification.useMutation({
    onSuccess: () => toast.success(isBg ? "Изпратихме нов имейл за потвърждение!" : "Sent a new verification email!"),
    onError: (err) => toast.error(err.message),
  });
  const loginMutation = trpc.clientAuth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success(t.loginSuccess);
      navigate("/");
    },
    onError: (err) => {
      if (err.message.includes("потвърдете имейла")) {
        setShowVerifyNotice(true);
        return;
      }
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
      if (data.reactivated) {
        toast.success(t.accountRestored);
      } else {
        toast.success(data.isNew ? t.bonusCreditsReceived : t.loginSuccess);
      }
      navigate("/");
    },
    onError: (err) => toast.error(err.message),
  });
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const isAndroidApp = Capacitor.getPlatform() === "android";

  const handleNativeGoogleSignIn = async () => {
    try {
      await SocialLogin.initialize({
        google: {
          webClientId: "1007790802752-qvc11eo6iuh6mvt3vhkmluqm2adhu9b8.apps.googleusercontent.com",
          mode: "online",
        },
      });
      const response = await SocialLogin.login({
        provider: "google",
        options: { scopes: ["profile", "email"] },
      });
      const credential = response.provider === "google" ? (response.result as any).idToken : undefined;
      if (!credential) {
        toast.error(language === "bg" ? "Грешка при вход" : "Login failed");
        return;
      }
      googleLoginMutation.mutate({ credential });
    } catch (err) {
      console.error("Native Google Sign-In error:", err);
      toast.error(language === "bg" ? "Грешка при вход с Google. Опитайте пак." : "Google Sign-In error. Please try again.");
    }
  };

  useEffect(() => {
    if (isAndroidApp) return;
    if (tab !== "social") return;
    if (!termsAccepted) return;
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
        theme: "outline", size: "large", width: 320, text: "continue_with", shape: "pill",
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
  }, [tab, termsAccepted]);

  const appleLoginMutation = trpc.clientAuth.loginApple.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.invalidate();
      if (data.reactivated) {
        toast.success(t.accountRestored);
      } else {
        toast.success(data.isNew ? t.bonusCreditsReceived : t.loginSuccess);
      }
      navigate("/");
    },
    onError: (err) => toast.error(err.message),
  });
  useEffect(() => {
    if (tab !== "social") return;
    const initApple = () => {
      const w = window as any;
      if (!w.AppleID) return;
      w.AppleID.auth.init({
        clientId: import.meta.env.VITE_APPLE_SERVICES_ID,
        scope: "name email",
        redirectURI: "https://trashit.bg/api/oauth/apple/callback",
        usePopup: true,
      });
    };
    if ((window as any).AppleID) {
      initApple();
    } else {
      const script = document.createElement("script");
      script.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
      script.async = true;
      script.onload = initApple;
      document.body.appendChild(script);
    }
    const handler = (event: any) => {
      const idToken = event.detail?.authorization?.id_token;
      const givenName = event.detail?.user?.name?.firstName;
      const familyName = event.detail?.user?.name?.lastName;
      const fullName = (givenName || familyName) ? `${givenName ?? ""} ${familyName ?? ""}`.trim() : undefined;
      if (idToken) {
        appleLoginMutation.mutate({ idToken, name: fullName });
      }
    };
    document.addEventListener("AppleIDSignInOnSuccess", handler);
    return () => document.removeEventListener("AppleIDSignInOnSuccess", handler);
  }, [tab]);
  const handleAppleSignIn = async () => {
    if (!termsAccepted) return;
    const w = window as any;
    if (!w.AppleID) return;
    try {
      await w.AppleID.auth.signIn();
    } catch {
      // потребителят е отказал/затворил popup-а
    }
  };

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
        registerMutation.mutate({ name: emailForm.name, email: emailForm.email, password: emailForm.password, phone: emailForm.phone, origin: window.location.origin });
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

if (showVerifyNotice) {
    return (
      <MainLayout>
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">{isBg ? "Проверете пощата си!" : "Check your email!"}</h2>
            <p className="text-muted-foreground mb-6">
              {isBg ? `Изпратихме линк за потвърждение на ${emailForm.email}. Кликнете върху него, за да активирате акаунта си.` : `We sent a confirmation link to ${emailForm.email}. Click it to activate your account.`}
            </p>
            <Button
              variant="outline"
              onClick={() => resendVerificationMutation.mutate({ email: emailForm.email, origin: window.location.origin })}
              disabled={resendVerificationMutation.isPending}
              className="rounded-xl"
            >
              {resendVerificationMutation.isPending ? "..." : (isBg ? "Изпрати отново" : "Resend email")}
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

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
              {(["social", "email"] as Tab[]).map(tabKey => (
                <button
                  key={tabKey}
                  onClick={() => setTab(tabKey)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                    tab === tabKey ? "bg-white shadow text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tabKey === "social" ? "Social" : t.email}
                </button>
              ))}
            </div>

 {tab === "social" && (
  <div className="space-y-3">
    <div className="flex items-start gap-2 bg-secondary/50 rounded-xl p-3">
      <input
        type="checkbox"
        id="terms-social"
        checked={termsAccepted}
        onChange={e => setTermsAccepted(e.target.checked)}
        className="mt-0.5 w-4 h-4 accent-primary cursor-pointer"
      />
      <label htmlFor="terms-social" className="text-xs text-muted-foreground leading-relaxed">
        {isBg ? "Приемам " : "I accept the "}
        <button
          type="button"
          onClick={() => setShowTermsModal(true)}
          className="text-primary underline font-medium"
        >
          {isBg ? "Общите условия" : "Terms & Conditions"}
        </button>
      </label>
    </div>
    {termsAccepted ? (
      isAndroidApp ? (
        <button
          type="button"
          onClick={handleNativeGoogleSignIn}
          className="flex items-center justify-center gap-2 w-full max-w-[320px] mx-auto py-2.5 px-4 rounded-full border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {language === "bg" ? "Продължи с Google" : "Continue with Google"}
        </button>
      ) : (
        <div ref={googleButtonRef} className="flex justify-center" />
      )
    ) : (
      <div className="w-full max-w-[320px] mx-auto py-3 px-4 rounded-full border border-border text-center text-sm text-muted-foreground">
        {isBg ? "Приемете условията, за да продължите" : "Accept terms to continue"}
      </div>
    )}
    <button
      type="button"
      onClick={handleAppleSignIn}
      disabled={!termsAccepted}
      className="w-full max-w-[320px] mx-auto flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <svg viewBox="0 0 384 512" className="w-4 h-4 fill-white"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.3-41.7-84.7-44.6-35.4-2.8-74.1 20.6-88.3 20.6-15 0-49.3-19.6-76.2-19.6C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.2 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.5-90-61.5-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
      Continue with Apple
    </button>
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
      disabled
      title={isBg ? "Очаквайте скоро" : "Coming soon"}
      className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-border text-foreground/40 text-sm font-medium cursor-not-allowed opacity-50"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      Facebook — {isBg ? "Очаквайте скоро" : "Coming soon"}
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

          </div>
        </div>
      </div>

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-base font-bold text-foreground">{isBg ? "Общи условия" : "Terms & Conditions"}</h2>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 flex-1">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{isBg ? TERMS_TEXT : TERMS_TEXT_EN}</p>
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={() => { setTermsAccepted(true); setShowTermsModal(false); }}
                className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all"
              >
                {isBg ? "Приемам" : "Accept"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

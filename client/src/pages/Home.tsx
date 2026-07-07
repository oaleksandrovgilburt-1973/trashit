import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import MainLayout from "@/components/MainLayout";
import { Trash2, Sparkles, LogIn, UserPlus, ChevronRight, Leaf, User, CreditCard, Recycle, LogOut, Bell, BellOff, Package, HardHat, Building2, Home as HomeIcon, MoreHorizontal, CalendarDays, X } from "lucide-react";
import { StandardCoin, RecyclingCoin } from "@/components/CreditCoin";
import AppStoreBadges from "@/components/AppStoreBadges";
import { TERMS_TEXT } from "@/lib/termsContent";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { requestFCMToken } from "@/lib/firebase";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const saveFcmToken = trpc.users.saveFcmToken.useMutation();

  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null);
  // Services popup — shown automatically only for guests (not logged in), once per session
  const [showServicesPopup, setShowServicesPopup] = useState(false);
  useEffect(() => {
    if (loading) return;
    if (!user && !sessionStorage.getItem("trashit_services_popup_seen")) {
      setShowServicesPopup(true);
    }
  }, [user, loading]);
  const closeServicesPopup = () => {
    sessionStorage.setItem("trashit_services_popup_seen", "1");
    setShowServicesPopup(false);
  };
  const [showHomeTermsModal, setShowHomeTermsModal] = useState(false);

  const refreshPermission = () => {
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  };

  useEffect(() => {
    refreshPermission();
    window.addEventListener("visibilitychange", refreshPermission);
    window.addEventListener("focus", refreshPermission);
    return () => {
      window.removeEventListener("visibilitychange", refreshPermission);
      window.removeEventListener("focus", refreshPermission);
    };
  }, [user]);

  const handleEnableNotifications = async () => {
    try {
      const token = await requestFCMToken();
      if (token) {
        await saveFcmToken.mutateAsync({ token });
        setNotifPermission("granted");
      } else {
        setNotifPermission(Notification.permission);
      }
    } catch {
      setNotifPermission(Notification.permission);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const profileQuery = trpc.users.getProfile.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: descriptions } = trpc.activityDescriptions.getAll.useQuery();
  const descMap: Record<string, string> = {};
  if (descriptions && !Array.isArray(descriptions)) {
    Object.assign(descMap, descriptions);
  } else if (Array.isArray(descriptions)) {
    descriptions.forEach((d: any) => { descMap[d.activityKey] = d.description; });
  }
  const profile = profileQuery.data;
  const creditsStandard = profile?.creditsStandard ?? "0.00";
  const creditsRecycling = profile?.creditsRecycling ?? "0.00";
  const { data: activeSubscription } = trpc.subscriptions.myActive.useQuery(undefined, {
    enabled: !!user,
  });
  const services = [
    { href: "/waste-disposal?type=standard", key: "standard", icon: <Trash2 className="w-6 h-6 text-primary" />, label: t.serviceStandard, active: true },
    { href: "/waste-disposal?type=recycling", key: "recycling", icon: <Recycle className="w-6 h-6 text-primary" />, label: t.serviceRecycling, active: true },
    { href: "/subscription", key: "subscription_standard", icon: <CalendarDays className="w-6 h-6 text-primary" />, label: t.serviceSubscription, active: true },
    { href: "/waste-disposal?type=nonstandard", key: "nonstandard", icon: <Package className="w-6 h-6 text-primary" />, label: t.serviceNonstandard, active: true },
    { href: "/waste-disposal?type=construction", key: "construction", icon: <HardHat className="w-6 h-6 text-primary" />, label: t.serviceConstruction, active: true },
    { href: "/cleaning?type=entrance", key: "entrances", icon: <Building2 className="w-6 h-6 text-gray-400" />, label: "Почистване на вход", active: false },
    { href: "/cleaning?type=residence", key: "residence", icon: <HomeIcon className="w-6 h-6 text-gray-400" />, label: "Жилища", active: false },
    { href: "/cleaning?type=other", key: "other", icon: <MoreHorizontal className="w-6 h-6 text-gray-400" />, label: "Друго", active: false },
  ];

  return (
    <MainLayout>
      <div className="page-enter">
        {/* Hero / Account Section */}
        <section className="bg-gradient-to-br from-primary via-primary to-[#388E3C] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />

          <div className="container relative py-8 pt-10">
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-white/20 rounded-lg animate-pulse" />
                  <div className="h-3 w-20 bg-white/20 rounded-lg animate-pulse" />
                </div>
              </div>
            ) : user ? (
              <div className="flex items-center justify-between gap-2">
                <Link href="/profile">
                  <div className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                      <span className="text-white font-black text-xl">
                        {(user.name ?? "U").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-white/80 text-sm font-medium">{t.welcomeBack},</p>
                      <p className="text-white font-bold text-lg leading-tight">{user.name}</p>
                    </div>
                  </div>
                </Link>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    {notifPermission === "default" && (
                      <button
                        onClick={handleEnableNotifications}
                        className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 hover:bg-yellow-500/60 transition-colors"
                      >
                        <Bell className="w-4 h-4 text-white" />
                        <span className="text-white text-xs font-semibold uppercase tracking-wide">Известия</span>
                      </button>
                    )}
                    {notifPermission === "denied" && (
                      <button
                        onClick={() => alert("Известията са блокирани от браузъра.\n\nЗа да ги разрешите:\n1. Натиснете иконата 🔒 или ℹ️ в адресната лента\n2. Намерете 'Известия' и изберете 'Разреши'\n3. Презаредете страницата")}
                        className="flex items-center gap-1.5 bg-red-500/40 backdrop-blur-sm rounded-xl px-3 py-1.5 hover:bg-red-500/60 transition-colors"
                      >
                        <BellOff className="w-4 h-4 text-white" />
                        <span className="text-white text-xs font-semibold uppercase tracking-wide">Блокирани</span>
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 hover:bg-red-500/60 transition-colors group"
                    >
                      <LogOut className="w-4 h-4 text-white" />
                      <span className="text-white text-xs font-semibold uppercase tracking-wide">Изход</span>
                    </button>
                  </div>
                  <Link href="/credits">
                    <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 cursor-pointer hover:bg-white/30 transition-colors">
                      <div className="flex items-center gap-1">
                        <StandardCoin size={20} />
                        <span className="text-white font-black text-sm leading-none">{parseFloat(creditsStandard || "0").toFixed(0)}</span>
                        <span className="text-white/70 text-[10px] font-medium">ст.</span>
                      </div>
                      <div className="w-px h-4 bg-white/30" />
                      <div className="flex items-center gap-1">
                        <RecyclingCoin size={20} />
                        <span className="text-white font-black text-sm leading-none">{parseFloat(creditsRecycling || "0").toFixed(0)}</span>
                        <span className="text-white/70 text-[10px] font-medium">рец.</span>
                      </div>
                    </div>
                  </Link>
                  {activeSubscription && (
                    <Link href="/subscription">
                      <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 cursor-pointer hover:bg-white/30 transition-colors">
                        <CalendarDays className="w-3.5 h-3.5 text-white" />
                        <span className="text-white text-[11px] font-semibold">
                          {activeSubscription.type === "standard" ? "Стандартен" : "Разделно"} абонамент
                          {activeSubscription.currentPeriodEnd
                            ? ` до ${new Date(activeSubscription.currentPeriodEnd).toLocaleDateString("bg-BG", { day: "2-digit", month: "short" })}`
                            : ""}
                        </span>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium mb-1">{t.appTagline}</p>
                  <p className="text-white font-black text-2xl">{t.appName}</p>
                </div>
                <div className="flex gap-2">
                  <Link href="/auth">
                    <button className="flex items-center gap-1.5 bg-white text-primary font-bold text-sm rounded-2xl px-4 py-2.5 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200">
                      <LogIn className="w-4 h-4" />
                      {t.login}
                    </button>
                  </Link>
                </div>
              </div>
            )}
            {user && (
              <div className="mt-4 space-y-1">
                <p className="text-white font-bold text-lg leading-snug">"Боклукът излиза.<br/>Ти си оставаш вкъщи."</p>
                <p className="text-white/75 text-sm leading-snug">TRASHit е твоята модерна услуга за лесно и удобно изхвърляне на отпадъци от дома. Спести време и усилия – ние се грижим за всичко.</p>
                <div className="flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-white/70" />
                  <p className="text-white/70 text-sm">{t.appTagline}</p>
                </div>
              </div>
            )}
            
            {!user && !loading && (
              <div className="mt-4 space-y-1 text-center">
                <p className="text-white/90 text-sm">🗑️ <strong>{t.heroTitle}</strong></p>
                <p className="text-white/80 text-sm">{t.heroLine1}</p>
                <p className="text-white/80 text-sm">{t.heroLine2}</p>
                <p className="text-yellow-300 text-sm font-bold mt-1">{t.heroPromo}</p>
              </div>
            )}
          </div>
        </section>

        {/* Services */}
        <section className="container py-6">
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setShowServicesPopup(true)}
              className="flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
            >
              ℹ️ Описание на услугите
            </button>
          </div>
          {/* Flow illustration for guests — temporarily hidden */}
          {/* {!user && !loading && (
            <div className="flex justify-center mb-6">
              <img src="/trashit-flow.svg" alt="Как работи TRASHit" className="w-full max-w-2xl" />
            </div>
          )} */}
          <h2 className="text-lg font-bold text-foreground mb-4">{t.mainMenuTitle}</h2>

<div className="grid grid-cols-2 gap-3">
            {services.map((service) => (
              service.active ? (
                <Link key={service.href} href={service.href}>
                  <div className="flex flex-col gap-2 p-4 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all cursor-pointer group h-full">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors flex-shrink-0">
                      {service.icon}
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-snug">{service.label}</p>
                    {descMap[service.key] && (
                      <p className="text-xs text-gray-500 leading-snug">{descMap[service.key]}</p>
                    )}
                    <ChevronRight className="w-4 h-4 text-primary mt-auto self-end" />
                  </div>
                </Link>
              ) : (
                <div key={service.href} className="flex flex-col gap-2 p-4 rounded-2xl bg-gray-100 border border-gray-200 opacity-50 cursor-not-allowed h-full">
                  <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                    {service.icon}
                  </div>
                  <p className="text-sm font-semibold text-gray-400 leading-snug">{service.label}</p>
                  <span className="text-xs text-gray-400 mt-auto">Очаквайте скоро</span>
                </div>
              )
            ))}
          </div>
          {/* Guest CTA */}
          {!user && !loading && (
            <div className="mt-6 p-5 rounded-2xl bg-secondary border border-border text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                <p className="text-foreground font-semibold text-sm">{t.bonusCreditsMessage}</p>
              </div>
              <p className="text-muted-foreground text-xs mb-4">{t.noAccount}</p>
              <div className="flex gap-3 justify-center">
                <Link href="/auth">
                  <button className="flex items-center gap-2 trashit-btn-primary text-sm">
                    <LogIn className="w-4 h-4" />
                    {t.login}
                  </button>
                </Link>
                <Link href="/auth">
                  <button className="flex items-center gap-2 trashit-btn-outline text-sm">
                    <UserPlus className="w-4 h-4" />
                    {t.register}
                  </button>
                </Link>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Изтеглете приложението</p>
                <AppStoreBadges />
              </div>
            </div>
          )}

          {/* Quick links */}
          {user && (
            <div className="mt-4 space-y-2">
              <Link href="/credits">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary border border-border hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group">
                  <div className="w-9 h-9 rounded-xl bg-yellow-100 flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                    <CreditCard className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{t.buyCredits}</p>
                    <p className="text-xs text-muted-foreground">{t.buyCreditsDesc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
              <Link href="/my-requests">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary border border-border hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Recycle className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{t.myRequests}</p>
                    <p className="text-xs text-muted-foreground">{t.myRequestsDesc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
              <Link href="/profile">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary border border-border hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{t.myProfile}</p>
                    <p className="text-xs text-muted-foreground">{t.profileDesc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            </div>
          )}
        </section>

        {/* Footer links */}
        <div className="container py-6 text-center">
          <button
            onClick={() => setShowHomeTermsModal(true)}
            className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
          >
            Общи условия
          </button>
        </div>
      </div>

      {/* Terms modal (accessible from home page footer) */}
      {showHomeTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-base font-bold text-foreground">Общи условия</h2>
              <button
                onClick={() => setShowHomeTermsModal(false)}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 flex-1">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{TERMS_TEXT}</p>
            </div>
          </div>
        </div>
      )}

      {/* Services popup — shown once per session */}
      {showServicesPopup && (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-sm pointer-events-auto animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-start justify-between p-4 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🗑️</span>
                <h2 className="text-base font-bold text-foreground">Добре дошли в TRASHit!</h2>
              </div>
              <button
                onClick={closeServicesPopup}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 pb-4 space-y-2 text-sm text-muted-foreground">
              <ul className="space-y-2 pl-2">
                <li>🏠 <strong>{isBg ? "Стандартен битов отпадък" : "Standard Household Waste"}</strong> — {isBg ? "Един чувал смесен (Стандартен) до ~3 кг и 40–45 л — вземаме го от входната Ви врата до контейнера. 1 кредит = 1 чувал. Заявява се с " : "One mixed waste bag up to ~3 kg and 40–45 L — we collect it from your door to the bin. 1 credit = 1 bag. Order with "}<Link href="/credits" onClick={closeServicesPopup} className="text-primary underline">{isBg ? "кредит" : "credits"}</Link> {isBg ? "или" : "or"} <Link href="/subscription" onClick={closeServicesPopup} className="text-primary underline">{isBg ? "абонамент" : "subscription"}</Link>.</li>
                <li>♻️ <strong>{isBg ? "Разделно събиране" : "Recycling Collection"}</strong> — {isBg ? "До 3 чувала по 15л. до ~4 кг общо, разделени по вид. Вземаме го от входната Ви врата до контейнера. 1 кредит = 1 чувал. Заявява се с " : "Up to 3 bags of 15L up to ~4 kg total, sorted by type. Collected from your door to the bin. 1 credit = 1 bag. Order with "}<Link href="/credits" onClick={closeServicesPopup} className="text-primary underline">{isBg ? "кредит" : "credits"}</Link> {isBg ? "или" : "or"} <Link href="/subscription" onClick={closeServicesPopup} className="text-primary underline">{isBg ? "абонамент" : "subscription"}</Link>.</li>
                <li>📦 <strong>{isBg ? "Нестандартен отпадък" : "Non-standard Waste"}</strong> — {isBg ? "Мебели, електроуреди, кашони и едрогабаритни предмети. Изпрати снимка — нашият AI оценява обема и правим оферта." : "Furniture, appliances, boxes and bulky items. Send a photo — our AI estimates the volume and we provide a quote."}</li>
                <li>🏗️ <strong>{isBg ? "Строителен отпадък" : "Construction Waste"}</strong> — {isBg ? "Отпадъци от ремонт или събаряне. Изпрати снимка — нашият AI оценява обема и правим оферта." : "Waste from renovation or demolition. Send a photo — our AI estimates the volume and we provide a quote."}</li>
              </ul>
              <button
                onClick={closeServicesPopup}
                className="w-full mt-3 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all"
              >
                Разбрах
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Footer */}
      <footer className="border-t py-6 mt-8">
        <div className="max-w-2xl mx-auto px-4 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
          <a href="/terms" className="hover:text-primary transition-colors">{isBg ? "Общи условия" : "Terms & Conditions"}</a>
          <a href="/privacy" className="hover:text-primary transition-colors">{isBg ? "Политика за поверителност" : "Privacy Policy"}</a>
          <a href="/refund" className="hover:text-primary transition-colors">{isBg ? "Политика за възстановяване" : "Refund Policy"}</a>
          <a href="mailto:support@trashit.bg" className="hover:text-primary transition-colors">support@trashit.bg</a>
        </div>
      </footer>
    </MainLayout>
  );
}
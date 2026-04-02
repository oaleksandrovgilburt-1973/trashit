import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import MainLayout from "@/components/MainLayout";
import { Trash2, Sparkles, LogIn, UserPlus, ChevronRight, Leaf, User, CreditCard, Recycle, LogOut, Bell, BellOff } from "lucide-react";
import { StandardCoin, RecyclingCoin } from "@/components/CreditCoin";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { requestFCMToken } from "@/lib/firebase";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const saveFcmToken = trpc.users.saveFcmToken.useMutation();

  // Track notification permission state — refresh on mount, user change, and tab focus
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null);

  const refreshPermission = () => {
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  };

  useEffect(() => {
    refreshPermission();
    // Re-check when the user returns to the tab (FCMProvider may have changed it)
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

  // Fetch extended profile to get credits
  const profileQuery = trpc.users.getProfile.useQuery(undefined, {
    enabled: !!user,
  });
  const profile = profileQuery.data;

  const creditsStandard = profile?.creditsStandard ?? "0.00";
  const creditsRecycling = profile?.creditsRecycling ?? "0.00";

  return (
    <MainLayout>
      <div className="page-enter">
        {/* Hero / Account Section */}
        <section className="bg-gradient-to-br from-primary via-primary to-[#388E3C] relative overflow-hidden">
          {/* Decorative circles */}
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
              /* Logged-in user */
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
                {/* Right column: logout on top, credits below */}
                <div className="flex flex-col items-end gap-2">
                  {/* Top row: logout + notification bell */}
                  <div className="flex items-center gap-2">
                    {/* Notification bell — show only if not yet granted */}
                    {notifPermission === "default" && (
                      <button
                        onClick={handleEnableNotifications}
                        className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 hover:bg-yellow-500/60 transition-colors"
                        title="Разреши известия"
                      >
                        <Bell className="w-4 h-4 text-white" />
                        <span className="text-white text-xs font-semibold uppercase tracking-wide">Известия</span>
                      </button>
                    )}
                    {notifPermission === "denied" && (
                      <button
                        onClick={() => {
                          alert("Известията са блокирани от браузъра.\n\nЗа да ги разрешите:\n1. Натиснете иконата 🔒 или ℹ️ в адресната лента\n2. Намерете 'Известия' и изберете 'Разреши'\n3. Презаредете страницата");
                        }}
                        className="flex items-center gap-1.5 bg-red-500/40 backdrop-blur-sm rounded-xl px-3 py-1.5 hover:bg-red-500/60 transition-colors"
                        title="Известията са блокирани"
                      >
                        <BellOff className="w-4 h-4 text-white" />
                        <span className="text-white text-xs font-semibold uppercase tracking-wide">Блокирани</span>
                      </button>
                    )}
                    {/* Logout button */}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 hover:bg-red-500/60 transition-colors group"
                      title="Изход"
                    >
                      <LogOut className="w-4 h-4 text-white" />
                      <span className="text-white text-xs font-semibold uppercase tracking-wide">Изход</span>
                    </button>
                  </div>
                  {/* Credits — side by side */}
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
                </div>
              </div>
            ) : (
              /* Guest user */
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

            {/* Tagline for logged-in users */}
            {user && (
              <div className="mt-4 flex items-center gap-2">
                <Leaf className="w-4 h-4 text-white/70" />
                <p className="text-white/70 text-sm">{t.appTagline}</p>
              </div>
            )}
          </div>
        </section>

        {/* Main Menu */}
        <section className="container py-6">
          <h2 className="text-lg font-bold text-foreground mb-4">{t.mainMenuTitle}</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Waste Disposal Card */}
            <Link href="/waste-disposal">
              <div className="group trashit-card p-6 cursor-pointer hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Trash2 className="w-7 h-7 text-primary" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="font-bold text-foreground text-lg mb-1.5">{t.wasteDisposal}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t.wasteDisposalDesc}</p>
              </div>
            </Link>

            {/* Cleaning Card */}
            <Link href="/cleaning">
              <div className="group trashit-card p-6 cursor-pointer hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                    <Sparkles className="w-7 h-7 text-primary" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="font-bold text-foreground text-lg mb-1.5">{t.cleaning}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t.cleaningDesc}</p>
              </div>
            </Link>
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
            </div>
          )}

          {/* Quick links for logged-in users */}
          {user && (
            <div className="mt-4 space-y-2">
              <Link href="/credits">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary border border-border hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group">
                  <div className="w-9 h-9 rounded-xl bg-yellow-100 flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                    <CreditCard className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Купи кредити</p>
                    <p className="text-xs text-muted-foreground">Стандартни и рециклиращи кредити</p>
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
                    <p className="text-sm font-semibold text-foreground">Моите заявки</p>
                    <p className="text-xs text-muted-foreground">Вижте статуса на заявките си</p>
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
      </div>
    </MainLayout>
  );
}

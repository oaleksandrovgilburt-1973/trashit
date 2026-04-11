import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, User, MapPin, Phone, Mail, Edit2, Save, X, Calendar } from "lucide-react";
import { StandardCoin, RecyclingCoin } from "@/components/CreditCoin";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import MainLayout from "@/components/MainLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UserProfile() {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const profileQuery = trpc.users.getProfile.useQuery(undefined, { enabled: isAuthenticated });
  const profile = profileQuery.data;
  const { data: districtsData } = trpc.districts.list.useQuery();
  const districts = districtsData?.filter(d => d.isActive) ?? [];

  const [editingProfile, setEditingProfile] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const changePasswordMutation = trpc.clientAuth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Паролата е сменена успешно");
      setEditingPassword(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
  });

  const [addressForm, setAddressForm] = useState({
    addressKvartal: "",
    addressBlok: "",
    addressVhod: "",
    addressEtaj: "",
    addressApartament: "",
    addressCity: "",
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name ?? "",
        phone: profile.phone ?? "",
      });
      setAddressForm({
        addressKvartal: profile.addressKvartal ?? "",
        addressBlok: profile.addressBlok ?? "",
        addressVhod: profile.addressVhod ?? "",
        addressEtaj: profile.addressEtaj ?? "",
        addressApartament: profile.addressApartament ?? "",
        addressCity: profile.addressCity ?? "",
      });
    }
  }, [profile]);

  const updateProfileMutation = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success(t.profileSaved);
      setEditingProfile(false);
      setEditingAddress(false);
      profileQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileForm);
  };

  const handleSaveAddress = () => {
    updateProfileMutation.mutate(addressForm);
  };

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">{t.loginOrRegister}</p>
            <button
              onClick={() => navigate("/auth")}
              className="px-6 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all"
            >
              {t.loginOrRegister}
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const creditsStandard = profile?.creditsStandard ?? "0.00";
  const creditsRecycling = profile?.creditsRecycling ?? "0.00";
  const hasAddress = profile?.addressCity || profile?.addressKvartal || profile?.addressBlok;

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-6 pb-28">
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.back}
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-6">{t.profileTitle}</h1>

        {/* Credits card */}
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 mb-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <StandardCoin size={20} />
            <span className="font-semibold text-sm">{t.myCredits}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/20 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <StandardCoin size={22} />
                <p className="text-xs text-white/80">{t.creditsStandard}</p>
              </div>
              <p className="text-xl font-bold">{parseFloat(creditsStandard || "0").toFixed(0)} <span className="text-sm font-normal opacity-80">кредита</span></p>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <RecyclingCoin size={22} />
                <p className="text-xs text-white/80">{t.creditsRecycling}</p>
              </div>
              <p className="text-xl font-bold">{parseFloat(creditsRecycling || "0").toFixed(0)} <span className="text-sm font-normal opacity-80">кредита</span></p>
            </div>
          </div>
        </div>

        {/* Profile info card */}
        <div className="bg-card rounded-2xl border border-border p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">{t.myProfile}</span>
            </div>
            {!editingProfile ? (
              <button
                onClick={() => setEditingProfile(true)}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                {t.edit}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingProfile(false); setProfileForm({ name: profile?.name ?? "", phone: profile?.phone ?? "" }); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                  {t.cancel}
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                  className="flex items-center gap-1 text-xs text-primary font-semibold"
                >
                  <Save className="w-3.5 h-3.5" />
                  {t.saveChanges}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t.name}</label>
              {editingProfile ? (
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              ) : (
                <p className="text-sm font-medium text-foreground">{profile?.name || "—"}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                <Mail className="w-3 h-3" /> {t.email}
              </label>
              <p className="text-sm text-foreground">{profile?.email || user?.email || "—"}</p>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                <Phone className="w-3 h-3" /> {t.phone}
              </label>
              {editingProfile ? (
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+359..."
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              ) : (
                <p className="text-sm text-foreground">{profile?.phone || "—"}</p>
              )}
            </div>

            {profile?.createdAt && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {t.memberSince}
                </label>
                <p className="text-sm text-foreground">
                  {new Date(profile.createdAt).toLocaleDateString("bg-BG", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Address card */}
        <div className="bg-card rounded-2xl border border-border p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">{t.address}</span>
            </div>
            {!editingAddress ? (
              <button
                onClick={() => setEditingAddress(true)}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                {hasAddress ? t.changeAddress : t.add}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingAddress(false);
                    setAddressForm({
                      addressKvartal: profile?.addressKvartal ?? "",
                      addressBlok: profile?.addressBlok ?? "",
                      addressVhod: profile?.addressVhod ?? "",
                      addressEtaj: profile?.addressEtaj ?? "",
                      addressApartament: profile?.addressApartament ?? "",
                      addressCity: profile?.addressCity ?? "",
                    });
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                  {t.cancel}
                </button>
                <button
                  onClick={handleSaveAddress}
                  disabled={updateProfileMutation.isPending}
                  className="flex items-center gap-1 text-xs text-primary font-semibold"
                >
                  <Save className="w-3.5 h-3.5" />
                  {t.saveAddress}
                </button>
              </div>
            )}
          </div>

          {!editingAddress ? (
            hasAddress ? (
              <div className="text-sm text-foreground space-y-1">
                {profile?.addressCity && <p className="font-medium">{profile.addressCity}</p>}
                {profile?.addressKvartal && <p>кв. {profile.addressKvartal}</p>}
                <p className="text-muted-foreground text-xs">
                  {[
                    profile?.addressBlok && `бл. ${profile.addressBlok}`,
                    profile?.addressVhod && `вх. ${profile.addressVhod}`,
                    profile?.addressEtaj && `ет. ${profile.addressEtaj}`,
                    profile?.addressApartament && `ап. ${profile.addressApartament}`,
                  ].filter(Boolean).join(", ")}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t.noData}</p>
            )
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">{t.addressCity}</label>
                <input
                  type="text"
                  value={addressForm.addressCity}
                  onChange={e => setAddressForm(f => ({ ...f, addressCity: e.target.value }))}
                  placeholder="София"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">{t.addressKvartal}</label>
                {districts.length > 0 ? (
                  <Select
                    value={addressForm.addressKvartal || "_none"}
                    onValueChange={v => setAddressForm(f => ({ ...f, addressKvartal: v === "_none" ? "" : v }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Изберете квартал..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— Без квартал —</SelectItem>
                      {districts.map(d => (
                        <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <input
                    type="text"
                    value={addressForm.addressKvartal}
                    onChange={e => setAddressForm(f => ({ ...f, addressKvartal: e.target.value }))}
                    placeholder="Люлин, Младост..."
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t.addressBlok}</label>
                <input
                  type="text"
                  value={addressForm.addressBlok}
                  onChange={e => setAddressForm(f => ({ ...f, addressBlok: e.target.value }))}
                  placeholder="123"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t.addressVhod}</label>
                <input
                  type="text"
                  value={addressForm.addressVhod}
                  onChange={e => setAddressForm(f => ({ ...f, addressVhod: e.target.value }))}
                  placeholder="А"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t.addressEtaj}</label>
                <input
                  type="text"
                  value={addressForm.addressEtaj}
                  onChange={e => setAddressForm(f => ({ ...f, addressEtaj: e.target.value }))}
                  placeholder="3"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t.addressApartament}</label>
                <input
                  type="text"
                  value={addressForm.addressApartament}
                  onChange={e => setAddressForm(f => ({ ...f, addressApartament: e.target.value }))}
                  placeholder="12"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          )}
        </div>

        {/* Change Password card */}
        {profile?.loginMethod === "email" && (
          <div className="bg-card rounded-2xl border border-border p-5 mt-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Смяна на парола</span>
              </div>
              {!editingPassword ? (
                <button
                  onClick={() => setEditingPassword(true)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Смени
                </button>
              ) : (
                <button
                  onClick={() => { setEditingPassword(false); setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                  Отказ
                </button>
              )}
            </div>

            {!editingPassword ? (
              <p className="text-sm text-muted-foreground">••••••••</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Текуща парола</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Нова парола</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Потвърди нова парола</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <button
                  onClick={() => {
                    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                      toast.error("Паролите не съвпадат");
                      return;
                    }
                    if (passwordForm.newPassword.length < 6) {
                      toast.error("Паролата трябва да е поне 6 символа");
                      return;
                    }
                    changePasswordMutation.mutate({
                      currentPassword: passwordForm.currentPassword,
                      newPassword: passwordForm.newPassword,
                    });
                  }}
                  disabled={!passwordForm.currentPassword || !passwordForm.newPassword || changePasswordMutation.isPending}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {changePasswordMutation.isPending ? "Сменя се..." : "Смени паролата"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}


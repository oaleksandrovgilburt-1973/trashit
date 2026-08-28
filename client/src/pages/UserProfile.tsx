import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, User, MapPin, Phone, Mail, Edit2, Save, X, Calendar, Check, ChevronsUpDown } from "lucide-react";
import { StandardCoin, RecyclingCoin } from "@/components/CreditCoin";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { normalizeAddress } from "../../../shared/bgAlphabet";
import { useAuth } from "@/_core/hooks/useAuth";
import MainLayout from "@/components/MainLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export default function UserProfile() {
  const { t, language } = useLanguage();
  const isBg = language === "bg"; 
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  const profileQuery = trpc.users.getProfile.useQuery(undefined, { enabled: isAuthenticated });
  const profile = profileQuery.data;
  const { data: citiesData } = trpc.cities.list.useQuery();
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const { data: districtsData } = trpc.districts.list.useQuery();
  const [districtOpen, setDistrictOpen] = useState(false);
  const districts = districtsData?.filter(d => d.isActive && d.cityId === selectedCityId) ?? [];

  const [editingProfile, setEditingProfile] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
  const deleteAccountMutation = trpc.users.deleteAccount.useMutation({
    onSuccess: async () => {
      toast.success("Акаунтът е изтрит успешно.");
      await logout();
      navigate("/auth");
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

  const [addressSuggestOpen, setAddressSuggestOpen] = useState(false);
  const { data: addressSuggestions } = trpc.requests.addressSuggestions.useQuery(
    { district: addressForm.addressKvartal, query: addressForm.addressBlok },
    { enabled: !!addressForm.addressKvartal && addressForm.addressBlok.length >= 1 }
  );

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
                <label className="text-xs text-muted-foreground mb-1 block">Град</label>
                <Popover open={cityOpen} onOpenChange={setCityOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm mb-2"
                    >
                      <span className={selectedCityId ? "" : "text-muted-foreground"}>
                        {citiesData?.find((c) => c.id === selectedCityId)?.name || "Изберете град..."}
                      </span>
                      <ChevronsUpDown className="w-4 h-4 opacity-50 flex-shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                    <Command>
                      <CommandInput placeholder="Търси град..." />
                      <CommandList>
                        <CommandEmpty>Няма намерен град</CommandEmpty>
                        <CommandGroup>
                          {citiesData?.map((city) => (
                            <CommandItem
                              key={city.id}
                              value={city.name}
                              disabled={!city.isActive}
                              onSelect={() => {
                                if (!city.isActive) return;
                                setSelectedCityId(city.id);
                                setAddressForm(f => ({ ...f, addressKvartal: "" }));
                                setCityOpen(false);
                              }}
                            >
                              <Check className={`mr-2 w-4 h-4 ${selectedCityId === city.id ? "opacity-100" : "opacity-0"}`} />
                              <span className={!city.isActive ? "text-muted-foreground" : ""}>{city.name}</span>
                              {!city.isActive && <span className="ml-auto text-xs text-muted-foreground">неактивен</span>}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <label className="text-xs text-muted-foreground mb-1 block">{t.addressKvartal}</label>
                {districts.length > 0 ? (
                  <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      >
                        <span className={addressForm.addressKvartal ? "" : "text-muted-foreground"}>
                          {addressForm.addressKvartal || "Изберете квартал..."}
                        </span>
                        <ChevronsUpDown className="w-4 h-4 opacity-50 flex-shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                      <Command>
                        <CommandInput placeholder="Търси квартал..." />
                        <CommandList>
                          <CommandEmpty>Няма намерен квартал</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="_none"
                              onSelect={() => {
                                setAddressForm(f => ({ ...f, addressKvartal: "" }));
                                setDistrictOpen(false);
                              }}
                            >
                              <Check className={`mr-2 w-4 h-4 ${!addressForm.addressKvartal ? "opacity-100" : "opacity-0"}`} />
                              — Без квартал —
                            </CommandItem>
                            {districts.map(d => (
                              <CommandItem
                                key={d.id}
                                value={d.name}
                                onSelect={(value) => {
                                  setAddressForm(f => ({ ...f, addressKvartal: value }));
                                  setDistrictOpen(false);
                                }}
                              >
                                <Check className={`mr-2 w-4 h-4 ${addressForm.addressKvartal === d.name ? "opacity-100" : "opacity-0"}`} />
                                {d.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
              <div className="relative">
                <label className="text-xs text-muted-foreground mb-1 block">{t.addressBlok}</label>
                <input
                  type="text"
                  value={addressForm.addressBlok}
                  onChange={e => { setAddressForm(f => ({ ...f, addressBlok: e.target.value })); setAddressSuggestOpen(true); }}
                  onBlur={() => { setAddressForm(f => ({ ...f, addressBlok: normalizeAddress(f.addressBlok) })); setTimeout(() => setAddressSuggestOpen(false), 150); }}
                  onFocus={() => setAddressSuggestOpen(true)}
                  placeholder={isBg ? "123 или Ул. Сребърна 26" : "123 or Str. Srebarna 26"}
                  autoComplete="off"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {addressSuggestOpen && addressSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {addressSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        onMouseDown={(e) => { e.preventDefault(); setAddressForm(f => ({ ...f, addressBlok: s })); setAddressSuggestOpen(false); }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
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
        {(profile?.loginMethod === "email" || profile?.loginMethod === "phone") && (
          <div className="bg-card rounded-2xl border border-border p-5 mt-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">{isBg ? "Смяна на парола" : "Change password"}</span>
              </div>
              {!editingPassword ? (
                <button
                  onClick={() => setEditingPassword(true)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {isBg ? "Смени" : "Change"}
                </button>
              ) : (
                <button
                  onClick={() => { setEditingPassword(false); setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                  {isBg ? "Отказ" : "Cancel"}
                </button>
              )}
            </div>

            {!editingPassword ? (
              <p className="text-sm text-muted-foreground">••••••••</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{isBg ? "Текуща парола" : "Current password"}</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{isBg ? "Нова парола" : "New password"}</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{isBg ? "Потвърди нова парола" : "Confirm new password"}</label>
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
                      toast.error(isBg ? "Паролите не съвпадат" : "Passwords do not match");
                      return;
                    }
                    if (passwordForm.newPassword.length < 6) {
                      toast.error(isBg ? "Паролата трябва да е поне 6 символа" : "Password must be at least 6 characters");
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
                  {changePasswordMutation.isPending ? (isBg ? "Сменя се..." : "Changing...") : (isBg ? "Смени паролата" : "Change password")}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border p-5 mt-4 shadow-sm">
            <div>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2.5 rounded-xl border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
                >
                  {isBg ? "Изтрий акаунта" : "Delete account"}
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-red-800">
                    {isBg ? "Сигурни ли сте, че искате да изтриете акаунта си?" : "Are you sure you want to delete your account?"}
                  </p>
                  <p className="text-xs text-red-600">
                    {isBg
                      ? "Това действие е необратимо. Личните ви данни (име, имейл, телефон, адрес) ще бъдат трайно изтрити. Активни абонаменти ще бъдат прекратени автоматично."
                      : "This action is irreversible. Your personal data (name, email, phone, address) will be permanently deleted. Active subscriptions will be cancelled automatically."}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                    >
                      {isBg ? "Отказ" : "Cancel"}
                    </button>
                    <button
                      onClick={() => deleteAccountMutation.mutate()}
                      disabled={deleteAccountMutation.isPending}
                      className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {deleteAccountMutation.isPending ? (isBg ? "Изтрива се..." : "Deleting...") : (isBg ? "Да, изтрий акаунта" : "Yes, delete account")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>
    </MainLayout>
  );
}


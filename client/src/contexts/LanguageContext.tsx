import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type Language = "bg" | "en";

export interface Translations {
  // App
  appName: string;
  appTagline: string;

  // Navigation
  home: string;
  back: string;

  // Language
  langBg: string;
  langEn: string;

  // Auth — general
  login: string;
  logout: string;
  register: string;
  loginOrRegister: string;
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  username: string;
  loginAsClient: string;
  loginAsWorker: string;
  loginAsAdmin: string;
  noAccount: string;
  hasAccount: string;
  loginSuccess: string;
  logoutSuccess: string;
  orContinueWith: string;

  // Auth — client
  loginWithGoogle: string;
  loginWithFacebook: string;
  loginWithEmail: string;
  loginWithPhone: string;
  phoneNumber: string;
  registerWithEmail: string;
  registerWithPhone: string;
  bonusCreditsMessage: string;
  bonusCreditsReceived: string;

  // Auth — worker
  workerLoginTitle: string;
  workerLoginDesc: string;
  mustChangePasswordTitle: string;
  mustChangePasswordDesc: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  changePassword: string;
  passwordChanged: string;
  deviceInfo: string;

  // Auth — admin
  adminLoginTitle: string;
  adminLoginDesc: string;
  adminUsername: string;
  adminPassword: string;
  changeCredentials: string;
  changeCredentialsTitle: string;
  newUsername: string;
  newPasswordLabel: string;
  credentialsChanged: string;
  defaultCredentialsBlocked: string;

  // Validation errors
  errorRequired: string;
  errorEmailInvalid: string;
  errorPasswordTooShort: string;
  errorPasswordMismatch: string;
  errorUsernameTooShort: string;
  errorPhoneInvalid: string;
  errorEmailExists: string;
  errorUsernameExists: string;
  errorInvalidCredentials: string;
  errorNameTooShort: string;

  // Home
  welcomeBack: string;
  credits: string;
  creditsUnit: string;
  creditsStandard: string;
  creditsRecycling: string;
  mainMenuTitle: string;
  wasteDisposal: string;
  wasteDisposalDesc: string;
  cleaning: string;
  cleaningDesc: string;

  // Footer
  workerPortal: string;
  adminPortal: string;
  contactEmail: string;
  contactPhone: string;

  // Worker Portal
  workerPortalTitle: string;
  workerPortalDesc: string;
  myTasks: string;
  activeTask: string;
  completedTasks: string;
  noTasks: string;

  // Admin Portal
  adminPortalTitle: string;
  adminPortalDesc: string;
  manageWorkers: string;
  manageClients: string;
  contactSettings: string;
  createWorker: string;
  workerName: string;
  workerEmail: string;
  workerUsername: string;
  workerPassword: string;
  workerInitialPassword: string;
  saveChanges: string;
  cancel: string;
  phone: string;
  editPhone: string;
  editEmail: string;
  allUsers: string;
  role: string;
  roleUser: string;
  roleWorker: string;
  roleAdmin: string;

  // Services
  wasteDisposalTitle: string;
  wasteDisposalIntro: string;
  cleaningTitle: string;
  cleaningIntro: string;
  comingSoon: string;
  featureComingSoon: string;

  // Profile
  profileTitle: string;
  profileDesc: string;
  myProfile: string;
  address: string;
  addressKvartal: string;
  addressBlok: string;
  addressVhod: string;
  addressEtaj: string;
  addressApartament: string;
  addressCity: string;
  changeAddress: string;
  saveAddress: string;
  editProfile: string;
  profileSaved: string;
  myCredits: string;
  memberSince: string;

  // Common
  loading: string;
  error: string;
  success: string;
  confirm: string;
  close: string;
  edit: string;
  delete: string;
  add: string;
  search: string;
  noData: string;
  or: string;
}

const bg: Translations = {
  appName: "TRASHit",
  appTagline: "Управление на отпадъци и почистване",
  home: "Начало",
  back: "Назад",
  langBg: "БГ",
  langEn: "EN",

  login: "Влез",
  logout: "Излез",
  register: "Регистрирай се",
  loginOrRegister: "Влез / Регистрирай се",
  email: "Имейл",
  password: "Парола",
  confirmPassword: "Потвърди парола",
  name: "Пълно име",
  username: "Потребителско име",
  loginAsClient: "Вход като клиент",
  loginAsWorker: "Вход като работник",
  loginAsAdmin: "Вход като администратор",
  noAccount: "Нямаш акаунт?",
  hasAccount: "Вече имаш акаунт?",
  loginSuccess: "Успешен вход!",
  logoutSuccess: "Успешно излизане!",
  orContinueWith: "или продължи с",

  loginWithGoogle: "Влез с Google",
  loginWithFacebook: "Влез с Facebook",
  loginWithEmail: "Влез с имейл",
  loginWithPhone: "Влез с телефон",
  phoneNumber: "Телефонен номер",
  registerWithEmail: "Регистрация с имейл",
  registerWithPhone: "Регистрация с телефон",
  bonusCreditsMessage: "При регистрация получаваш 2 бонус кредита!",
  bonusCreditsReceived: "Получи 2 бонус кредита! 🎉",

  workerLoginTitle: "Вход за работници",
  workerLoginDesc: "Влезте с данните, предоставени от администратора",
  mustChangePasswordTitle: "Смяна на парола",
  mustChangePasswordDesc: "При първо влизане трябва да смените паролата си",
  currentPassword: "Текуща парола",
  newPassword: "Нова парола",
  confirmNewPassword: "Потвърди нова парола",
  changePassword: "Смени паролата",
  passwordChanged: "Паролата е сменена успешно!",
  deviceInfo: "Можете да влизате от до 4 устройства едновременно",

  adminLoginTitle: "Администраторски вход",
  adminLoginDesc: "Влезте с администраторски данни",
  adminUsername: "Потребителско име",
  adminPassword: "Парола",
  changeCredentials: "Смени данните",
  changeCredentialsTitle: "Смяна на администраторски данни",
  newUsername: "Ново потребителско име",
  newPasswordLabel: "Нова парола",
  credentialsChanged: "Данните са сменени. Достъпът с admin/admin е блокиран.",
  defaultCredentialsBlocked: "Достъпът с данните по подразбиране е блокиран.",

  errorRequired: "Полето е задължително",
  errorEmailInvalid: "Невалиден имейл адрес",
  errorPasswordTooShort: "Паролата трябва да е поне 6 символа",
  errorPasswordMismatch: "Паролите не съвпадат",
  errorUsernameTooShort: "Потребителското име трябва да е поне 3 символа",
  errorPhoneInvalid: "Невалиден телефонен номер",
  errorEmailExists: "Вече съществува акаунт с този имейл",
  errorUsernameExists: "Вече съществува работник с това потребителско име",
  errorInvalidCredentials: "Грешно потребителско име или парола",
  errorNameTooShort: "Името трябва да е поне 2 символа",

  welcomeBack: "Добре дошъл",
  credits: "Кредити",
  creditsUnit: "лв.",
  creditsStandard: "Стандартни кредити",
  creditsRecycling: "Кредити за рециклиране",
  mainMenuTitle: "Изберете услуга",
  wasteDisposal: "Изхвърляне на отпадъци",
  wasteDisposalDesc: "Бързо и лесно изхвърляне на всякакви отпадъци",
  cleaning: "Почистване",
  cleaningDesc: "Професионално почистване на домове и офиси",

  workerPortal: "Портал за работници",
  adminPortal: "Администраторски панел",
  contactEmail: "Имейл за контакт",
  contactPhone: "Телефон за контакт",

  workerPortalTitle: "Портал за работници",
  workerPortalDesc: "Управлявайте вашите задачи и заявки",
  myTasks: "Моите задачи",
  activeTask: "Активни задачи",
  completedTasks: "Завършени задачи",
  noTasks: "Няма задачи",

  adminPortalTitle: "Администраторски панел",
  adminPortalDesc: "Управление на системата",
  manageWorkers: "Работници",
  manageClients: "Клиенти",
  contactSettings: "Контакти",
  createWorker: "Създай работник",
  workerName: "Пълно име",
  workerEmail: "Имейл",
  workerUsername: "Потребителско име",
  workerPassword: "Начална парола",
  workerInitialPassword: "Работникът ще смени паролата при първо влизане",
  saveChanges: "Запази",
  cancel: "Отказ",
  phone: "Телефон",
  editPhone: "Редактирай телефон",
  editEmail: "Редактирай имейл",
  allUsers: "Всички потребители",
  role: "Роля",
  roleUser: "Клиент",
  roleWorker: "Работник",
  roleAdmin: "Администратор",

  wasteDisposalTitle: "Изхвърляне на отпадъци",
  wasteDisposalIntro: "Изберете вид отпадък и насрочете вземане",
  cleaningTitle: "Почистване",
  cleaningIntro: "Изберете вид почистване и насрочете посещение",
  comingSoon: "Очаквайте скоро",
  featureComingSoon: "Тази функция е в разработка",

  profileTitle: "Моят профил",
  profileDesc: "Управлявайте личните си данни",
  myProfile: "Профил",
  address: "Адрес",
  addressKvartal: "Квартал",
  addressBlok: "Блок",
  addressVhod: "Вход",
  addressEtaj: "Етаж",
  addressApartament: "Апартамент",
  addressCity: "Град",
  changeAddress: "Смени адреса",
  saveAddress: "Запази адреса",
  editProfile: "Редактирай профила",
  profileSaved: "Профилът е запазен успешно!",
  myCredits: "Моите кредити",
  memberSince: "Член от",

  loading: "Зареждане...",
  error: "Грешка",
  success: "Успех",
  confirm: "Потвърди",
  close: "Затвори",
  edit: "Редактирай",
  delete: "Изтрий",
  add: "Добави",
  search: "Търси",
  noData: "Няма данни",
  or: "или",
};

const en: Translations = {
  appName: "TRASHit",
  appTagline: "Waste Management & Cleaning",
  home: "Home",
  back: "Back",
  langBg: "BG",
  langEn: "EN",

  login: "Login",
  logout: "Logout",
  register: "Register",
  loginOrRegister: "Login / Register",
  email: "Email",
  password: "Password",
  confirmPassword: "Confirm Password",
  name: "Full Name",
  username: "Username",
  loginAsClient: "Login as Client",
  loginAsWorker: "Login as Worker",
  loginAsAdmin: "Login as Admin",
  noAccount: "Don't have an account?",
  hasAccount: "Already have an account?",
  loginSuccess: "Login successful!",
  logoutSuccess: "Logged out successfully!",
  orContinueWith: "or continue with",

  loginWithGoogle: "Continue with Google",
  loginWithFacebook: "Continue with Facebook",
  loginWithEmail: "Continue with Email",
  loginWithPhone: "Continue with Phone",
  phoneNumber: "Phone Number",
  registerWithEmail: "Register with Email",
  registerWithPhone: "Register with Phone",
  bonusCreditsMessage: "Get 2 bonus credits when you register!",
  bonusCreditsReceived: "You received 2 bonus credits! 🎉",

  workerLoginTitle: "Worker Login",
  workerLoginDesc: "Login with credentials provided by the administrator",
  mustChangePasswordTitle: "Change Password",
  mustChangePasswordDesc: "You must change your password on first login",
  currentPassword: "Current Password",
  newPassword: "New Password",
  confirmNewPassword: "Confirm New Password",
  changePassword: "Change Password",
  passwordChanged: "Password changed successfully!",
  deviceInfo: "You can log in from up to 4 devices simultaneously",

  adminLoginTitle: "Admin Login",
  adminLoginDesc: "Login with administrator credentials",
  adminUsername: "Username",
  adminPassword: "Password",
  changeCredentials: "Change Credentials",
  changeCredentialsTitle: "Change Admin Credentials",
  newUsername: "New Username",
  newPasswordLabel: "New Password",
  credentialsChanged: "Credentials changed. Default admin/admin access is now blocked.",
  defaultCredentialsBlocked: "Default credentials access is blocked.",

  errorRequired: "This field is required",
  errorEmailInvalid: "Invalid email address",
  errorPasswordTooShort: "Password must be at least 6 characters",
  errorPasswordMismatch: "Passwords do not match",
  errorUsernameTooShort: "Username must be at least 3 characters",
  errorPhoneInvalid: "Invalid phone number",
  errorEmailExists: "An account with this email already exists",
  errorUsernameExists: "A worker with this username already exists",
  errorInvalidCredentials: "Invalid username or password",
  errorNameTooShort: "Name must be at least 2 characters",

  welcomeBack: "Welcome back",
  credits: "Credits",
  creditsUnit: "BGN",
  creditsStandard: "Standard Credits",
  creditsRecycling: "Recycling Credits",
  mainMenuTitle: "Choose a service",
  wasteDisposal: "Waste Disposal",
  wasteDisposalDesc: "Fast and easy disposal of any type of waste",
  cleaning: "Cleaning",
  cleaningDesc: "Professional cleaning of homes and offices",

  workerPortal: "Worker Portal",
  adminPortal: "Admin Panel",
  contactEmail: "Contact Email",
  contactPhone: "Contact Phone",

  workerPortalTitle: "Worker Portal",
  workerPortalDesc: "Manage your tasks and requests",
  myTasks: "My Tasks",
  activeTask: "Active Tasks",
  completedTasks: "Completed Tasks",
  noTasks: "No tasks",

  adminPortalTitle: "Admin Panel",
  adminPortalDesc: "System management",
  manageWorkers: "Workers",
  manageClients: "Clients",
  contactSettings: "Contact",
  createWorker: "Create Worker",
  workerName: "Full Name",
  workerEmail: "Email",
  workerUsername: "Username",
  workerPassword: "Initial Password",
  workerInitialPassword: "Worker must change password on first login",
  saveChanges: "Save",
  cancel: "Cancel",
  phone: "Phone",
  editPhone: "Edit Phone",
  editEmail: "Edit Email",
  allUsers: "All Users",
  role: "Role",
  roleUser: "Client",
  roleWorker: "Worker",
  roleAdmin: "Administrator",

  wasteDisposalTitle: "Waste Disposal",
  wasteDisposalIntro: "Choose waste type and schedule a pickup",
  cleaningTitle: "Cleaning",
  cleaningIntro: "Choose cleaning type and schedule a visit",
  comingSoon: "Coming Soon",
  featureComingSoon: "This feature is under development",

  profileTitle: "My Profile",
  profileDesc: "Manage your personal information",
  myProfile: "Profile",
  address: "Address",
  addressKvartal: "Neighborhood",
  addressBlok: "Building",
  addressVhod: "Entrance",
  addressEtaj: "Floor",
  addressApartament: "Apartment",
  addressCity: "City",
  changeAddress: "Change Address",
  saveAddress: "Save Address",
  editProfile: "Edit Profile",
  profileSaved: "Profile saved successfully!",
  myCredits: "My Credits",
  memberSince: "Member since",

  loading: "Loading...",
  error: "Error",
  success: "Success",
  confirm: "Confirm",
  close: "Close",
  edit: "Edit",
  delete: "Delete",
  add: "Add",
  search: "Search",
  noData: "No data",
  or: "or",
};

const translations: Record<Language, Translations> = { bg, en };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const STORAGE_KEY = "trashit_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "bg" || stored === "en") return stored;
    } catch {}
    return "bg";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    document.documentElement.lang = lang;
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "bg" ? "en" : "bg");
  }, [language, setLanguage]);

  useEffect(() => { document.documentElement.lang = language; }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language], toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import MainLayout from "@/components/MainLayout";
import { toast } from "sonner";
import {
  ArrowLeft, Star, Recycle, Gift, History, CheckCircle2,
  ArrowRight, Coins, Send, Clock
} from "lucide-react";
import { StandardCoin, RecyclingCoin } from "@/components/CreditCoin";

type Tab = "buy" | "transfer" | "history";

export default function Credits() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { language } = useLanguage();
  const isBg = language === "bg";
  const { user, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>("buy");
  const [creditTypeTab, setCreditTypeTab] = useState<"standard" | "recycling">("standard");

  // Transfer form
  const [transferType, setTransferType] = useState<"standard" | "recycling">("standard");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferEmail, setTransferEmail] = useState("");
  const [transferConfirm, setTransferConfirm] = useState(false);
  const [transferErrors, setTransferErrors] = useState<Record<string, string>>({});

  // Handle payment success redirect
  const params = new URLSearchParams(search);
  const sessionId = params.get("session_id");

  const { data: packages } = trpc.credits.packages.useQuery();
  const { data: subPrices } = trpc.subscriptions.prices.useQuery();
  const { data: profileData } = trpc.users.getProfile.useQuery(undefined, { enabled: isAuthenticated });
  const { data: entranceCheck } = trpc.entranceAccess.check.useQuery(
    {
      district: profileData?.addressKvartal ?? "",
      blok: profileData?.addressBlok ?? "",
      vhod: profileData?.addressVhod ?? "",
    },
    { enabled: !!(profileData?.addressKvartal && profileData?.addressBlok && profileData?.addressVhod) }
  );
  const hasUnapprovedAddress = !!(profileData?.addressKvartal && profileData?.addressBlok && profileData?.addressVhod) && entranceCheck !== undefined && !entranceCheck.approved;
  const { data: historyData, refetch: refetchHistory } = trpc.credits.history.useQuery(undefined, {
    enabled: isAuthenticated && tab === "history",
  });

  const checkoutMutation = trpc.credits.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.info(isBg ? "Пренасочване към страницата за плащане..." : "Redirecting to payment page...");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const verifyMutation = trpc.credits.verifyPayment.useMutation({
    onSuccess: (data) => {
      if (data.alreadyProcessed) {
        toast.info(isBg ? "Плащането вече е обработено." : "Payment already processed.");
      } else {
        toast.success(isBg ? `✅ Добавени ${data.creditsAdded} кредита към профила ви!` : `✅ ${data.creditsAdded} credits added to your profile!`);
        refetchHistory();
      }
      navigate("/credits", { replace: true });
    },
    onError: (err) => {
      toast.error(err.message);
      navigate("/credits", { replace: true });
    },
  });

  useEffect(() => {
    if (sessionId && isAuthenticated) {
      verifyMutation.mutate({ sessionId });
    }
  }, [sessionId, isAuthenticated]);

  const transferMutation = trpc.credits.transfer.useMutation({
    onSuccess: (data) => {
      toast.success(isBg ? `✅ Прехвърлени ${data.transferred} кредита към ${data.to}` : `✅ ${data.transferred} credits transferred to ${data.to}`);
      setTransferAmount("");
      setTransferEmail("");
      setTransferConfirm(false);
      refetchHistory();
    },
    onError: (err) => {
      toast.error(err.message);
      setTransferConfirm(false);
    },
  });

  const handleBuyPackage = (pkg: {
    id: string; credits: number; bonus: number; total: number;
    price: number; label: string;
  }) => {
    if (!isAuthenticated) {
      toast.error(isBg ? "Трябва да сте влезли в акаунта си." : "You must be logged in.");
      navigate("/auth");
      return;
    }
    if (hasUnapprovedAddress) {
      toast.error(isBg
        ? "Адресът ви все още не е одобрен за обслужване. Ще се свържем с вас скоро, за да го осигурим — тогава ще можете да купувате и ползвате кредити."
        : "Your address is not yet approved for service. We will contact you shortly to arrange it — you'll be able to buy and use credits once approved.",
        { duration: 8000 }
      );
      return;
    }
    checkoutMutation.mutate({
      packageId: pkg.id,
      creditType: creditTypeTab,
      credits: pkg.credits,
      bonus: pkg.bonus,
      total: pkg.total,
      price: pkg.price,
      origin: window.location.origin,
    });
  };

  const validateTransfer = () => {
    const errs: Record<string, string> = {};
    if (!transferEmail || !transferEmail.includes("@")) errs.email = isBg ? "Въведете валиден имейл адрес." : "Enter a valid email address.";
    if (!transferAmount || parseInt(transferAmount) < 1) errs.amount = isBg ? "Въведете брой кредити (минимум 1)." : "Enter number of credits (minimum 1).";
    setTransferErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleTransfer = () => {
    if (!validateTransfer()) return;
    if (!transferConfirm) {
      setTransferConfirm(true);
      return;
    }
    transferMutation.mutate({
      creditType: transferType,
      amount: parseInt(transferAmount),
      toEmail: transferEmail,
    });
  };

  const userCreditsStandard = parseFloat((user as any)?.creditsStandard ?? "0");
  const userCreditsRecycling = parseFloat((user as any)?.creditsRecycling ?? "0");

  const standardPkgs = packages?.standard ?? [];
  const recyclingPkgs = packages?.recycling ?? [];
  const currentPkgs = creditTypeTab === "standard" ? standardPkgs : recyclingPkgs;

  // Promo: built from packages endpoint (oldPrice from settings)
  const promoData: Record<string, { oldPrice: number; discount: number }> = {};
  [...(packages?.standard ?? []), ...(packages?.recycling ?? [])].forEach((pkg: any) => {
    if (pkg.oldPrice && pkg.oldPrice > pkg.price) {
      promoData[pkg.id] = {
        oldPrice: pkg.oldPrice,
        discount: Math.round((1 - pkg.price / pkg.oldPrice) * 100),
      };
    }
  });

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">💳 {isBg ? "Кредити" : "Credits"}</h1>
            <p className="text-sm text-gray-500">{isBg ? "Купете, прехвърлете или вижте историята" : "Buy, transfer or view history"}</p>
          </div>
        </div>

        {/* Balance cards */}
        {isAuthenticated && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gradient-to-br from-[#388E3C] to-[#2E7D32] rounded-2xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <StandardCoin size={28} />
                <span className="text-sm font-semibold opacity-90">{isBg ? "Стандартни" : "Standard"}</span>
              </div>
              <div className="text-3xl font-black">{userCreditsStandard.toFixed(0)}</div>
              <div className="text-xs opacity-75 mt-1">{isBg ? "кредита" : "credits"}</div>
            </div>
            <div className="bg-gradient-to-br from-[#1B5E20] to-[#145214] rounded-2xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <RecyclingCoin size={28} />
                <span className="text-sm font-semibold opacity-90">{isBg ? "Рециклиращи" : "Recycling"}</span>
              </div>
              <div className="text-3xl font-black">{userCreditsRecycling.toFixed(0)}</div>
              <div className="text-xs opacity-75 mt-1">{isBg ? "кредита" : "credits"}</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-6 gap-1">
          {([
            { id: "buy", labelBg: "Купи кредити или абонамент", labelEn: "Buy credits or subscription", icon: Coins },
            { id: "transfer", labelBg: "Прехвърли", labelEn: "Transfer", icon: Gift },
            { id: "history", labelBg: "История", labelEn: "History", icon: History },
          ] as const).map(({ id, labelBg, labelEn, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === id ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{isBg ? labelBg : labelEn}</span>
            </button>
          ))}
        </div>

        {/* Buy tab */}
        {tab === "buy" && (
          <div className="space-y-5">
            {hasUnapprovedAddress && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                ⚠️ {isBg
                  ? "Ако адресът Ви не е одобрен, няма да можете да купувате и да използвате кредити. Пробвайте първо да използвате бонус кредитите. Това ще ускори одобрението."
                  : "If your address is not approved, you won't be able to buy or use credits. Try using your bonus credits first — this will speed up approval."}
              </div>
            )}
            {/* Subscription promo card */}
            <button
              onClick={() => navigate("/subscription")}
              className="w-full flex items-center justify-between gap-3 rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 text-left hover:border-blue-400 transition-colors"
            >
              <div>
                <p className="text-sm font-bold text-blue-800">📅 {isBg ? "Или изберете месечен абонамент" : "Or choose a monthly subscription"}</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  {isBg ? "Редовни посещения всеки месец, без да купувате кредити всеки път" : "Regular visits every month, no need to buy credits each time"}
                  {subPrices?.standard["15"]?.price && (
                    <> — {isBg ? "от" : "from"} <strong>{subPrices.standard["15"].price.toFixed(2)} €/{isBg ? "мес" : "mo"}</strong></>
                  )}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-600 flex-shrink-0" />
            </button>
            {/* Credit type toggle */}
            <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
              <button
                onClick={() => setCreditTypeTab("standard")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  creditTypeTab === "standard" ? "bg-green-600 text-white shadow-sm" : "text-gray-500"
                }`}
              >
                <Star className="w-4 h-4" /> {isBg ? "Стандартни" : "Standard"}
              </button>
              <button
                onClick={() => setCreditTypeTab("recycling")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  creditTypeTab === "recycling" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500"
                }`}
              >
                <Recycle className="w-4 h-4" /> {isBg ? "Рециклиращи" : "Recycling"}
              </button>
            </div>

            {/* Info */}
            <div className={`rounded-2xl p-4 text-sm ${creditTypeTab === "standard" ? "bg-green-50 border border-green-200" : "bg-blue-50 border border-blue-200"}`}>
              {creditTypeTab === "standard" ? (
                <>
                  <p className="font-bold text-green-800">🗑️ {isBg ? "Стандартни кредити" : "Standard Credits"}</p>
                  <p className="text-green-700 mt-1">{isBg ? "Използват се за изхвърляне на стандартен битов отпадък. 1 кредит = 1 плик до ~3кг. или до 45л." : "Used for standard household waste disposal. 1 credit = 1 bag up to ~3kg or 45L."}</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-blue-800">♻️ {isBg ? "Кредити за рециклиране" : "Recycling Credits"}</p>
                  <p className="text-blue-700 mt-1">{isBg ? "Използват се за разделно изхвърляне. 1 кредит = 3 плика за разделно събиране." : "Used for recycling collection. 1 credit = 3 bags for sorted waste."}</p>
                </>
              )}
            </div>

            {/* Package cards */}
            <div className="space-y-3">
              {currentPkgs.map((pkg: any) => (
                <div
                  key={pkg.id}
                  className={`relative rounded-2xl border-2 p-5 transition-all ${
                    pkg.highlight
                      ? creditTypeTab === "standard"
                        ? "border-green-500 bg-green-50"
                        : "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {pkg.highlight && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white ${
                      creditTypeTab === "standard" ? "bg-green-600" : "bg-blue-600"
                    }`}>
                      ⭐ {isBg ? "Най-популярен" : "Most popular"}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-gray-900">{pkg.total}</span>
                        <span className="text-gray-500 text-sm font-medium">{isBg ? "кредита" : "credits"}</span>
                        {pkg.bonus > 0 && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            creditTypeTab === "standard" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            +{pkg.bonus} {isBg ? "безплатни" : "free"}
                          </span>
                        )}
                      </div>
                      {pkg.save && (
                        <p className="text-sm text-gray-500 mt-1">💰 {pkg.save}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {pkg.credits} {isBg ? "платени" : "paid"} + {pkg.bonus} {isBg ? "бонус" : "bonus"}
                      </p>
                    </div>
                    <div className="text-right">
                      {promoData[pkg.id] && (
                        <div className="flex items-center justify-end gap-1.5 mb-0.5">
                          <span className="text-xs text-gray-400 line-through">{promoData[pkg.id].oldPrice.toFixed(2)} €</span>
                          <span className="text-xs font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">-{promoData[pkg.id].discount}%</span>
                        </div>
                      )}
                      <div className="text-xl font-black text-gray-900">{pkg.price.toFixed(2)} €</div>
                      <div className="text-xs text-gray-500">
                        {(pkg.price / pkg.total).toFixed(2)} €/{isBg ? "кредит" : "credit"}
                      </div>
                      <button
                        onClick={() => handleBuyPackage(pkg)}
                        disabled={checkoutMutation.isPending}
                        className={`mt-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                          creditTypeTab === "standard" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {checkoutMutation.isPending ? "..." : (isBg ? "Купи" : "Buy")}
                        <ArrowRight className="w-3 h-3 inline ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-500 text-center">
              🔒 {isBg ? "Плащанията се обработват сигурно чрез Stripe." : "Payments are processed securely via Stripe."}
            </div>
          </div>
        )}

        {/* Transfer tab */}
        {tab === "transfer" && (
          <div className="space-y-5">
            <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-200">
              <p className="text-sm font-bold text-yellow-800">🎁 {isBg ? "Подарете кредити" : "Gift Credits"}</p>
              <p className="text-xs text-yellow-700 mt-1">
                {isBg ? "Можете да прехвърлите кредити на друг потребител по имейл адрес." : "You can transfer credits to another user by email address."}
              </p>
            </div>

            {!isAuthenticated ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">{isBg ? "Трябва да сте влезли в акаунта си." : "You must be logged in."}</p>
                <button onClick={() => navigate("/auth")} className="px-6 py-3 bg-green-600 text-white font-bold rounded-2xl">
                  {isBg ? "Вход в акаунта" : "Log in"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Credit type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{isBg ? "Вид кредити" : "Credit type"}</label>
                  <div className="flex gap-3">
                    {[
                      { val: "standard", labelBg: "Стандартни", labelEn: "Standard", balance: userCreditsStandard, icon: Star },
                      { val: "recycling", labelBg: "Рециклиращи", labelEn: "Recycling", balance: userCreditsRecycling, icon: Recycle },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setTransferType(opt.val as "standard" | "recycling")}
                        className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${
                          transferType === opt.val
                            ? "border-green-500 bg-green-50 text-green-800"
                            : "border-gray-200 bg-white text-gray-600"
                        }`}
                      >
                        <opt.icon className="w-4 h-4 mx-auto mb-1" />
                        {isBg ? opt.labelBg : opt.labelEn}
                        <div className="text-xs font-normal mt-0.5">({opt.balance.toFixed(0)} {isBg ? "налични" : "available"})</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {isBg ? "Брой кредити" : "Number of credits"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder={isBg ? "напр. 5" : "e.g. 5"}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  {transferErrors.amount && <p className="text-red-500 text-xs mt-1">{transferErrors.amount}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {isBg ? "Имейл на получателя" : "Recipient email"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={transferEmail}
                    onChange={(e) => setTransferEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  {transferErrors.email && <p className="text-red-500 text-xs mt-1">{transferErrors.email}</p>}
                </div>

                {/* Confirmation */}
                {transferConfirm && (
                  <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200">
                    <p className="font-bold text-orange-800 mb-1">⚠️ {isBg ? "Потвърдете прехвърлянето" : "Confirm transfer"}</p>
                    <p className="text-sm text-orange-700">
                      {isBg ? "Ще прехвърлите" : "You will transfer"} <strong>{transferAmount}</strong> {transferType === "standard" ? (isBg ? "стандартни" : "standard") : (isBg ? "рециклиращи" : "recycling")} {isBg ? "кредита към" : "credits to"} <strong>{transferEmail}</strong>.
                    </p>
                    <p className="text-xs text-orange-600 mt-1">{isBg ? "Тази операция не може да бъде отменена." : "This action cannot be undone."}</p>
                  </div>
                )}

                <button
                  onClick={handleTransfer}
                  disabled={transferMutation.isPending}
                  className="w-full py-4 bg-green-600 text-white font-bold text-lg rounded-2xl hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  {transferConfirm ? (isBg ? "✅ Потвърди прехвърлянето" : "✅ Confirm transfer") : (isBg ? "Прехвърли кредити" : "Transfer credits")}
                </button>

                {transferConfirm && (
                  <button
                    onClick={() => setTransferConfirm(false)}
                    className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200 transition-colors"
                  >
                    {isBg ? "Отказ" : "Cancel"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* History tab */}
        {tab === "history" && (
          <div className="space-y-3">
            {!isAuthenticated ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">{isBg ? "Трябва да сте влезли в акаунта си." : "You must be logged in."}</p>
                <button onClick={() => navigate("/auth")} className="px-6 py-3 bg-green-600 text-white font-bold rounded-2xl">
                  {isBg ? "Вход в акаунта" : "Log in"}
                </button>
              </div>
            ) : !historyData || historyData.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{isBg ? "Все още няма транзакции." : "No transactions yet."}</p>
              </div>
            ) : (
              historyData.map((tx: any) => {
                const typeLabels: Record<string, { labelBg: string; labelEn: string; color: string; icon: string }> = {
                  purchase: { labelBg: "Покупка", labelEn: "Purchase", color: "text-green-700 bg-green-50", icon: "💳" },
                  transfer_out: { labelBg: "Изпратено", labelEn: "Sent", color: "text-orange-700 bg-orange-50", icon: "📤" },
                  transfer_in: { labelBg: "Получено", labelEn: "Received", color: "text-blue-700 bg-blue-50", icon: "📥" },
                  admin_add: { labelBg: "Добавено от Админ", labelEn: "Added by Admin", color: "text-purple-700 bg-purple-50", icon: "⭐" },
                  deduction: { labelBg: "Изразходвано", labelEn: "Used", color: "text-red-700 bg-red-50", icon: "🗑️" },
                };
                const info = typeLabels[tx.type] ?? { labelBg: tx.type, labelEn: tx.type, color: "text-gray-700 bg-gray-50", icon: "💰" };
                return (
                  <div key={tx.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${info.color}`}>
                      {info.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${info.color}`}>{isBg ? info.labelBg : info.labelEn}</span>
                        <span className="text-xs text-gray-400">{tx.creditType === "standard" ? (isBg ? "Стандартни" : "Standard") : (isBg ? "Рециклиращи" : "Recycling")}</span>
                      </div>
                      {tx.note && <p className="text-sm text-gray-600 mt-0.5 truncate">{tx.note}</p>}
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {new Date(tx.createdAt).toLocaleDateString(isBg ? "bg-BG" : "en-GB")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-black ${
                        tx.type === "transfer_out" || tx.type === "deduction" ? "text-red-600" : "text-green-600"
                      }`}>
                        {tx.type === "transfer_out" || tx.type === "deduction" ? "-" : "+"}{tx.totalAmount}
                      </div>
                      {tx.pricePaid && parseFloat(tx.pricePaid) > 0 && (
                        <div className="text-xs text-gray-400">{parseFloat(tx.pricePaid).toFixed(2)} €</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
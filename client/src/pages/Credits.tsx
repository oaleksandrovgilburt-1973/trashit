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
  const { t } = useLanguage();
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
  const { data: historyData, refetch: refetchHistory } = trpc.credits.history.useQuery(undefined, {
    enabled: isAuthenticated && tab === "history",
  });

  const checkoutMutation = trpc.credits.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.info("Пренасочване към страницата за плащане...");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const verifyMutation = trpc.credits.verifyPayment.useMutation({
    onSuccess: (data) => {
      if (data.alreadyProcessed) {
        toast.info("Плащането вече е обработено.");
      } else {
        toast.success(`✅ Добавени ${data.creditsAdded} кредита към профила ви!`);
        refetchHistory();
      }
      // Clean up URL
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
      toast.success(`✅ Прехвърлени ${data.transferred} кредита към ${data.to}`);
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
      toast.error("Трябва да сте влезли в акаунта си.");
      navigate("/auth");
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
    if (!transferEmail || !transferEmail.includes("@")) errs.email = "Въведете валиден имейл адрес.";
    if (!transferAmount || parseInt(transferAmount) < 1) errs.amount = "Въведете брой кредити (минимум 1).";
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

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">💳 Кредити</h1>
            <p className="text-sm text-gray-500">Купете, прехвърлете или вижте историята</p>
          </div>
        </div>

        {/* Balance cards */}
        {isAuthenticated && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gradient-to-br from-[#388E3C] to-[#2E7D32] rounded-2xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <StandardCoin size={28} />
                <span className="text-sm font-semibold opacity-90">Стандартни</span>
              </div>
              <div className="text-3xl font-black">{userCreditsStandard.toFixed(0)}</div>
              <div className="text-xs opacity-75 mt-1">кредита</div>
            </div>
            <div className="bg-gradient-to-br from-[#1B5E20] to-[#145214] rounded-2xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <RecyclingCoin size={28} />
                <span className="text-sm font-semibold opacity-90">Рециклиращи</span>
              </div>
              <div className="text-3xl font-black">{userCreditsRecycling.toFixed(0)}</div>
              <div className="text-xs opacity-75 mt-1">кредита</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-6 gap-1">
          {([
            { id: "buy", label: "Купи кредити", icon: Coins },
            { id: "transfer", label: "Прехвърли", icon: Gift },
            { id: "history", label: "История", icon: History },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === id ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Buy tab */}
        {tab === "buy" && (
          <div className="space-y-5">
            {/* Credit type toggle */}
            <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
              <button
                onClick={() => setCreditTypeTab("standard")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  creditTypeTab === "standard" ? "bg-green-600 text-white shadow-sm" : "text-gray-500"
                }`}
              >
                <Star className="w-4 h-4" /> Стандартни
              </button>
              <button
                onClick={() => setCreditTypeTab("recycling")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  creditTypeTab === "recycling" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500"
                }`}
              >
                <Recycle className="w-4 h-4" /> Рециклиращи
              </button>
            </div>

            {/* Info */}
            <div className={`rounded-2xl p-4 text-sm ${creditTypeTab === "standard" ? "bg-green-50 border border-green-200" : "bg-blue-50 border border-blue-200"}`}>
              {creditTypeTab === "standard" ? (
                <>
                  <p className="font-bold text-green-800">🗑️ Стандартни кредити</p>
                  <p className="text-green-700 mt-1">Използват се за изхвърляне на стандартен битов отпадък. 1 кредит = 1 плик до ~4кг.</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-blue-800">♻️ Кредити за рециклиране</p>
                  <p className="text-blue-700 mt-1">Използват се за разделно изхвърляне. 1 кредит = 3 плика за разделно събиране.</p>
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
                      ⭐ Най-популярен
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-gray-900">{pkg.total}</span>
                        <span className="text-gray-500 text-sm font-medium">кредита</span>
                        {pkg.bonus > 0 && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            creditTypeTab === "standard" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            +{pkg.bonus} безплатни
                          </span>
                        )}
                      </div>
                      {pkg.save && (
                        <p className="text-sm text-gray-500 mt-1">💰 {pkg.save}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {pkg.credits} платени + {pkg.bonus} бонус
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-gray-900">{pkg.price.toFixed(2)} €</div>
                      <div className="text-xs text-gray-500">
                        {(pkg.price / pkg.total).toFixed(2)} €/кредит
                      </div>
                      <button
                        onClick={() => handleBuyPackage(pkg)}
                        disabled={checkoutMutation.isPending}
                        className={`mt-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                          creditTypeTab === "standard" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {checkoutMutation.isPending ? "..." : "Купи"}
                        <ArrowRight className="w-3 h-3 inline ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-500 text-center">
              🔒 Плащанията се обработват сигурно чрез Stripe. Тествайте с карта: 4242 4242 4242 4242
            </div>
          </div>
        )}

        {/* Transfer tab */}
        {tab === "transfer" && (
          <div className="space-y-5">
            <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-200">
              <p className="text-sm font-bold text-yellow-800">🎁 Подарете кредити</p>
              <p className="text-xs text-yellow-700 mt-1">
                Можете да прехвърлите кредити на друг потребител по имейл адрес.
              </p>
            </div>

            {!isAuthenticated ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Трябва да сте влезли в акаунта си.</p>
                <button onClick={() => navigate("/auth")} className="px-6 py-3 bg-green-600 text-white font-bold rounded-2xl">
                  Влез в акаунта
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Credit type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Вид кредити</label>
                  <div className="flex gap-3">
                    {[
                      { val: "standard", label: "Стандартни", balance: userCreditsStandard, icon: Star },
                      { val: "recycling", label: "Рециклиращи", balance: userCreditsRecycling, icon: Recycle },
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
                        {opt.label}
                        <div className="text-xs font-normal mt-0.5">({opt.balance.toFixed(0)} налични)</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Брой кредити <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="напр. 5"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  {transferErrors.amount && <p className="text-red-500 text-xs mt-1">{transferErrors.amount}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Имейл на получателя <span className="text-red-500">*</span>
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
                    <p className="font-bold text-orange-800 mb-1">⚠️ Потвърдете прехвърлянето</p>
                    <p className="text-sm text-orange-700">
                      Ще прехвърлите <strong>{transferAmount}</strong> {transferType === "standard" ? "стандартни" : "рециклиращи"} кредита към <strong>{transferEmail}</strong>.
                    </p>
                    <p className="text-xs text-orange-600 mt-1">Тази операция не може да бъде отменена.</p>
                  </div>
                )}

                <button
                  onClick={handleTransfer}
                  disabled={transferMutation.isPending}
                  className="w-full py-4 bg-green-600 text-white font-bold text-lg rounded-2xl hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  {transferConfirm ? "✅ Потвърди прехвърлянето" : "Прехвърли кредити"}
                </button>

                {transferConfirm && (
                  <button
                    onClick={() => setTransferConfirm(false)}
                    className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200 transition-colors"
                  >
                    Отказ
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
                <p className="text-gray-500 mb-4">Трябва да сте влезли в акаунта си.</p>
                <button onClick={() => navigate("/auth")} className="px-6 py-3 bg-green-600 text-white font-bold rounded-2xl">
                  Влез в акаунта
                </button>
              </div>
            ) : !historyData || historyData.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Все още няма транзакции.</p>
              </div>
            ) : (
              historyData.map((tx: any) => {
                const typeLabels: Record<string, { label: string; color: string; icon: string }> = {
                  purchase: { label: "Покупка", color: "text-green-700 bg-green-50", icon: "💳" },
                  transfer_out: { label: "Изпратено", color: "text-orange-700 bg-orange-50", icon: "📤" },
                  transfer_in: { label: "Получено", color: "text-blue-700 bg-blue-50", icon: "📥" },
                  admin_add: { label: "Добавено от Админ", color: "text-purple-700 bg-purple-50", icon: "⚡" },
                  deduction: { label: "Изразходвано", color: "text-red-700 bg-red-50", icon: "🗑️" },
                };
                const info = typeLabels[tx.type] ?? { label: tx.type, color: "text-gray-700 bg-gray-50", icon: "💰" };
                return (
                  <div key={tx.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${info.color}`}>
                      {info.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                        <span className="text-xs text-gray-400">{tx.creditType === "standard" ? "Стандартни" : "Рециклиращи"}</span>
                      </div>
                      {tx.note && <p className="text-sm text-gray-600 mt-0.5 truncate">{tx.note}</p>}
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {new Date(tx.createdAt).toLocaleDateString("bg-BG")}
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

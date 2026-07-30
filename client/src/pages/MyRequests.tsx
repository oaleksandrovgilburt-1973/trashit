import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Trash2, Recycle, Package, HardHat,
  Clock, CheckCircle2, XCircle, Loader2,
  ChevronLeft, Plus, MapPin, DollarSign, CalendarDays, CheckCheck, X, CreditCard, Send
} from "lucide-react";
import { Input } from "@/components/ui/input";

const TYPE_LABELS: Record<string, { bg: string; en: string; icon: React.ReactNode; color: string }> = {
  standard: { bg: "Стандартен", en: "Standard", icon: <Trash2 className="w-4 h-4" />, color: "bg-green-100 text-green-700" },
  recycling: { bg: "Разделно", en: "Recycling", icon: <Recycle className="w-4 h-4" />, color: "bg-blue-100 text-blue-700" },
  nonstandard: { bg: "Нестандартен", en: "Non-standard", icon: <Package className="w-4 h-4" />, color: "bg-orange-100 text-orange-700" },
  construction: { bg: "Строителен", en: "Construction", icon: <HardHat className="w-4 h-4" />, color: "bg-yellow-100 text-yellow-700" },
};

const STATUS_LABELS: Record<string, { bg: string; en: string; icon: React.ReactNode; color: string }> = {
  pending: { bg: "Изчакване", en: "Pending", icon: <Clock className="w-4 h-4" />, color: "bg-amber-100 text-amber-700" },
  assigned: { bg: "В изпълнение", en: "In progress", icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "bg-blue-100 text-blue-700" },
  completed: { bg: "Завършено", en: "Completed", icon: <CheckCircle2 className="w-4 h-4" />, color: "bg-green-100 text-green-700" },
  cancelled: { bg: "Анулирано", en: "Cancelled", icon: <XCircle className="w-4 h-4" />, color: "bg-gray-100 text-gray-500" },
  pending_payment: { bg: "Очаква плащане", en: "Awaiting payment", icon: <CreditCard className="w-4 h-4" />, color: "bg-purple-100 text-purple-700" },
  paid: { bg: "Платено", en: "Paid", icon: <CheckCircle2 className="w-4 h-4" />, color: "bg-emerald-100 text-emerald-700" },
};
function getExpectedSession(createdAt: string | Date, isBg: boolean): string {
  const hour = new Date(createdAt).getHours();
  // 08:00–19:59 -> вечерна сесия (след 20:00)
  // 20:00–07:59 -> сутрешна сесия (след 08:00)
  const isEveningSession = hour >= 8 && hour < 20;
  if (isEveningSession) {
    return isBg ? "Очаквайте посещение след 20:00 ч." : "Expect a visit after 8:00 PM";
  }
  return isBg ? "Очаквайте посещение след 08:00 ч." : "Expect a visit after 8:00 AM";
}
/** Bidirectional chat panel for client */
function ClientChatPanel({ requestId, isBg }: { requestId: number; isBg: boolean }) {
  const utils = trpc.useUtils();
  const [msg, setMsg] = React.useState("");
  const { data: messages = [], isLoading } = trpc.requestMessages.getForRequest.useQuery(
    { requestId },
    { refetchInterval: 15000 },
  );
  const sendMutation = trpc.requestMessages.sendAsClient.useMutation({
    onSuccess: () => {
      setMsg("");
      utils.requestMessages.getForRequest.invalidate({ requestId });
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return null;

  const roleLabel: Record<string, string> = {
    client: isBg ? "Вие" : "You",
    worker: isBg ? "Работник" : "Worker",
    admin: isBg ? "Администратор" : "Admin",
  };
  const roleBg: Record<string, string> = {
    client: "bg-blue-50 border-blue-200",
    worker: "bg-green-50 border-green-200",
    admin: "bg-purple-50 border-purple-200",
  };

  return (
    <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 flex items-center gap-1">
        <Send className="w-3 h-3" />{isBg ? `Съобщения (${messages.length})` : `Messages (${messages.length})`}
      </div>
      {messages.length > 0 && (
        <div className="max-h-48 overflow-y-auto p-3 space-y-2">
          {messages.map((m: any) => (
            <div key={m.id} className={`rounded-lg p-2 border text-xs ${roleBg[m.senderRole] ?? "bg-gray-50 border-gray-200"}`}>
              <span className="font-semibold">{roleLabel[m.senderRole] ?? m.senderRole}: </span>
              <span>{m.message}</span>
              <span className="block text-gray-400 text-[10px] mt-0.5">
                {new Date(m.createdAt).toLocaleString(isBg ? "bg-BG" : "en-GB")}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 p-2 border-t border-gray-100">
        <Input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder={isBg ? "Напишете съобщение..." : "Type a message..."}
          className="h-8 text-xs flex-1"
          onKeyDown={e => { if (e.key === "Enter" && msg.trim()) sendMutation.mutate({ requestId, message: msg.trim() }); }}
        />
        <Button
          size="sm"
          className="h-8 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
          disabled={!msg.trim() || sendMutation.isPending}
          onClick={() => sendMutation.mutate({ requestId, message: msg.trim() })}
        >
          <Send className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

/** Inline quote panel for a single request */
function QuotePanel({ requestId, isBg, onAction }: { requestId: number; isBg: boolean; onAction: () => void }) {
  const { data: quotes = [], isLoading } = trpc.workerQuotes.getForRequest.useQuery({ requestId });
  const utils = trpc.useUtils();

  const acceptMutation = trpc.workerQuotes.accept.useMutation({
    onSuccess: () => {
      toast.success(isBg ? "Офертата е приета! Работникът ще се свърже с вас." : "Quote accepted! The worker will contact you.");
      utils.requests.myList.invalidate();
      onAction();
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.workerQuotes.reject.useMutation({
    onSuccess: () => {
      toast.success(isBg ? "Офертата е отхвърлена. Кредитите са възстановени." : "Quote rejected. Credits refunded.");
      utils.requests.myList.invalidate();
      onAction();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-xs text-muted-foreground py-1">{isBg ? "Зарежда..." : "Loading..."}</div>;

  const pending = quotes.filter((q: any) => q.status === "pending");
  if (pending.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {pending.map((q: any) => (
        <div key={q.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <DollarSign className="w-3.5 h-3.5" />
            {isBg ? "Получена оферта от работник" : "Quote received from worker"}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-amber-900">{q.price} €</span>
            <span className="text-xs text-amber-700">{q.workerName}</span>
          </div>
          {q.proposedDate && (
            <div className="flex items-center gap-1 text-xs text-amber-700">
              <CalendarDays className="w-3 h-3" />
              {new Date(q.proposedDate).toLocaleString(isBg ? "bg-BG" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}
            </div>
          )}
          {q.note && (
            <p className="text-xs text-amber-800 italic">"{q.note}"</p>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs"
              disabled={acceptMutation.isPending || rejectMutation.isPending}
              onClick={() => acceptMutation.mutate({ quoteId: q.id })}
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              {isBg ? "Приеми" : "Accept"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 rounded-xl text-red-600 border-red-200 hover:bg-red-50 text-xs"
              disabled={acceptMutation.isPending || rejectMutation.isPending}
              onClick={() => rejectMutation.mutate({ quoteId: q.id })}
            >
              <X className="w-3 h-3 mr-1" />
              {isBg ? "Откажи" : "Reject"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MyRequests() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const { language } = useLanguage();
  const isBg = language === "bg";

  const [activeTab, setActiveTab] = React.useState<"active" | "history">("active");
  const [historyPage, setHistoryPage] = React.useState(1);
  const HISTORY_PAGE_SIZE = 20;

  const { data: requests, isLoading, refetch } = trpc.requests.myList.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const allSorted = React.useMemo(
    () => (requests ?? []).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [requests],
  );
  const activeRequests = React.useMemo(
    () => allSorted.filter(r => ["pending", "assigned", "pending_payment"].includes(r.status)),
    [allSorted],
  );
  const historyRequests = React.useMemo(
    () => allSorted.filter(r => ["completed", "cancelled", "paid"].includes(r.status)),
    [allSorted],
  );
  const historyTotalPages = Math.max(1, Math.ceil(historyRequests.length / HISTORY_PAGE_SIZE));
  const historyPaged = historyRequests.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);

  const cancelMutation = trpc.requests.cancel.useMutation({
    onSuccess: () => {
      toast.success(isBg ? "Заявката е анулирана" : "Request cancelled");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      const sessionId = params.get("session_id");
      if (sessionId) verifyRequestPayment.mutate({ sessionId });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const createRequestCheckout = trpc.credits.createRequestCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) window.open(data.url, "_blank");
      toast.success(isBg ? "Пренасочване към страницата за плащане..." : "Redirecting to payment...");
    },
    onError: (e) => toast.error(e.message),
  });

  const verifyRequestPayment = trpc.credits.verifyRequestPayment.useMutation({
    onSuccess: () => { toast.success(isBg ? "Плащането е успешно!" : "Payment successful!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (loading || isLoading) {
    return (
      <MainLayout showFooter>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <MainLayout showFooter>
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <p className="text-gray-500 mb-4">{isBg ? "Трябва да влезете в акаунта си" : "You must be logged in"}</p>
          <Button onClick={() => navigate("/auth")} className="rounded-2xl bg-primary hover:bg-primary/90">
            {isBg ? "Влез" : "Login"}
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showFooter>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {isBg ? "Моите заявки" : "My Requests"}
            </h1>
          </div>
          <Button
            onClick={() => navigate("/waste-disposal")}
            size="sm"
            className="rounded-xl bg-primary hover:bg-primary/90 gap-1"
          >
            <Plus className="w-4 h-4" />
            {isBg ? "Нова" : "New"}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "active" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {isBg
              ? `Активни${activeRequests.length > 0 ? ` (${activeRequests.length})` : ""}`
              : `Active${activeRequests.length > 0 ? ` (${activeRequests.length})` : ""}`}
          </button>
          <button
            onClick={() => { setActiveTab("history"); setHistoryPage(1); }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "history" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {isBg
              ? `История${historyRequests.length > 0 ? ` (${historyRequests.length})` : ""}`
              : `History${historyRequests.length > 0 ? ` (${historyRequests.length})` : ""}`}
          </button>
        </div>

        {/* Empty state — active tab */}
        {activeTab === "active" && activeRequests.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">
              {isBg ? "Нямате активни заявки" : "No active requests"}
            </p>
            <Button onClick={() => navigate("/waste-disposal")} className="rounded-2xl bg-primary hover:bg-primary/90">
              {isBg ? "Подай заявка" : "Submit Request"}
            </Button>
          </div>
        )}

        {/* Empty state — history tab */}
        {activeTab === "history" && historyRequests.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">{isBg ? "Нямa история на заявки" : "No request history"}</p>
          </div>
        )}

        {/* Requests list */}
        <div className="space-y-2">
          {(activeTab === "active" ? activeRequests : historyPaged).map((req) => {
            const typeInfo = TYPE_LABELS[req.type] ?? TYPE_LABELS.standard;
            const statusInfo = STATUS_LABELS[req.status] ?? STATUS_LABELS.pending;
            const date = new Date(req.createdAt).toLocaleDateString(isBg ? "bg-BG" : "en-GB", {
              day: "2-digit", month: "short", year: "numeric"
            });
            const isQuotable = (req.type === "nonstandard" || req.type === "construction") && req.status === "pending";

            return (
              <div key={req.id} className={`rounded-xl border p-3 shadow-sm ${req.hasProblem ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
                {req.hasProblem && (
                  <div className="flex items-start gap-2 bg-red-100 border border-red-200 rounded-xl px-3 py-2 mb-3">
                    <span className="text-red-500 text-sm mt-0.5">⚠️</span>
                    <div>
                      <p className="text-sm font-semibold text-red-700">Има проблем с заявката</p>
                      {req.problemDescription && (
                        <p className="text-xs text-red-600 mt-0.5">{req.problemDescription}</p>
                      )}
                    {(req as any).adminNotes && (
                        <p className="text-xs text-red-700 mt-1 font-medium">📋 {(req as any).adminNotes}</p>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${typeInfo.color}`}>
                      {typeInfo.icon}
                      {isBg ? typeInfo.bg : typeInfo.en}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${statusInfo.color}`}>
                      {statusInfo.icon}
                      {isBg ? statusInfo.bg : statusInfo.en}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{date}</span>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{req.district}, Бл. {req.blok}, Вх. {req.vhod}, Ет. {req.etaj}, Ап. {req.apartament}</span>
                </div>

                {req.description && (
                  <p className="mt-2 text-sm text-gray-500 line-clamp-2">{req.description}</p>
                )}

                {req.estimatedVolume && (
                  <p className="mt-1 text-xs text-blue-600">
                    {isBg ? "Прогнозен обем:" : "Est. volume:"} {req.estimatedVolume}
                  </p>
                )}

                {/* Image for nonstandard/construction */}
                {(req.type === "nonstandard" || req.type === "construction") && (req as any).imageUrl && (
                  <a href={(req as any).imageUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                    <img
                      src={(req as any).imageUrl}
                      alt={isBg ? "Снимка на отпадъка" : "Waste photo"}
                      className="rounded-xl max-h-48 w-full object-cover border border-gray-200 hover:opacity-90 transition-opacity"
                    />
                  </a>
                )}
                
                {/* Bidirectional chat for nonstandard/construction */}
                {(req.type === "nonstandard" || req.type === "construction") && (
                  <ClientChatPanel requestId={req.id} isBg={isBg} />
                )}

                {/* Expected session for pending requests */}
                {req.status === "pending" && (req.type === "standard" || req.type === "recycling") && (
                  <div className="mt-3 flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-sm text-blue-700 font-medium">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    {getExpectedSession(req.createdAt, isBg)}
                  </div>
                )}

                {/* Assigned worker info + expected date */}
                {req.status === "assigned" && (
                  <div className="mt-3 space-y-2">
                    {(req as any).assignedWorkerName && (
                      <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                        {(req as any).workerPhotoUrl ? (
                          <img src={(req as any).workerPhotoUrl} alt={(req as any).assignedWorkerName} className="w-8 h-8 rounded-full object-cover border border-blue-200 flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-700 font-bold text-sm">{((req as any).assignedWorkerName as string).charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-blue-800">
                            {(req as any).assignedWorkerName}
                            {(req as any).assignedWorkerNumber && <span className="font-normal text-blue-500"> · №{(req as any).assignedWorkerNumber}</span>}
                          </p>
                          <p className="text-xs text-blue-600">{isBg ? "Работник в изпълнение" : "Worker in progress"}</p>
                        </div>
                      </div>
                    )}
                    {(req as any).acceptedQuoteProposedDate && (
                      <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                        <CalendarDays className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-green-800">{isBg ? "Очаквана дата/час" : "Expected date/time"}</p>
                          <p className="text-xs text-green-700">
                            {new Date((req as any).acceptedQuoteProposedDate).toLocaleString(isBg ? "bg-BG" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quote panel for nonstandard/construction pending requests */}
                {isQuotable && (
                  <QuotePanel requestId={req.id} isBg={isBg} onAction={refetch} />
                )}

                {/* Pay button for pending_payment requests */}
                {req.status === "pending_payment" && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                    <p className="text-sm font-semibold text-purple-800 mb-1">
                      {isBg ? "Задачата е изпълнена — необходимо е плащане" : "Task completed — payment required"}
                    </p>
                    {(req as any).acceptedQuotePrice && (
                      <p className="text-xs text-purple-600 mb-2">
                        {isBg ? "Сума:" : "Amount:"} <strong>{(req as any).acceptedQuotePrice} EUR</strong>
                      </p>
                    )}
                    <Button
                      size="sm"
                      onClick={() => createRequestCheckout.mutate({ requestId: req.id, origin: window.location.origin })}
                      disabled={createRequestCheckout.isPending}
                      className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white w-full"
                    >
                      <CreditCard className="w-4 h-4 mr-1.5" />
                      {isBg ? "Плати сега" : "Pay now"}
                    </Button>
                  </div>
                )}

                {/* Cancel button for pending requests */}
                {req.status === "pending" && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelMutation.mutate({ id: req.id })}
                      disabled={cancelMutation.isPending}
                      className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 text-xs"
                    >
                      {isBg ? "Анулирай" : "Cancel"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination — History tab only */}
        {activeTab === "history" && historyTotalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
              disabled={historyPage === 1}
              className="rounded-xl"
            >
              {isBg ? "← Назад" : "← Prev"}
            </Button>
            <span className="text-sm text-gray-500">
              {historyPage} / {historyTotalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
              disabled={historyPage === historyTotalPages}
              className="rounded-xl"
            >
              {isBg ? "Напред →" : "Next →"}
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
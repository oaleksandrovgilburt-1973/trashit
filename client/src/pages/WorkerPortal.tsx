import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MapPin, Navigation, Phone, Mail, AlertTriangle,
  CheckCircle, ChevronDown, ChevronRight, LogOut,
  Trash2, Recycle, Package, HardHat, Camera, Map,
  Settings, List, X, ArrowLeft, Send, Upload,
  CalendarDays, Sun, Moon, Loader2, ClipboardList
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { sortBgEntrances } from "../../../shared/bgAlphabet";

// ─── Types ────────────────────────────────────────────────────────────────────
interface WorkerSession {
  workerId: number;
  name: string;
  mustChangePassword: boolean;
  openId: string;
  deviceToken: string;
}

type WasteType = "standard" | "recycling" | "nonstandard" | "construction";

interface Request {
  id: number;
  type: string;
  status: string;
  district: string;
  blok: string;
  vhod: string;
  etaj: string;
  apartament: string;
  contactPhone: string | null;
  contactEmail: string | null;
  gpsLat: string | null;
  gpsLng: string | null;
  imageUrl: string | null;
  estimatedVolume: string | null;
  description: string | null;
  hasProblem: boolean;
  problemDescription: string | null;
  createdAt: Date | string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getWasteIcon(type: string) {
  switch (type) {
    case "standard": return <Trash2 className="w-4 h-4 text-gray-600" />;
    case "recycling": return <Recycle className="w-4 h-4 text-blue-500" />;
    case "nonstandard": return <Package className="w-4 h-4 text-orange-500" />;
    case "construction": return <HardHat className="w-4 h-4 text-yellow-600" />;
    default: return <Trash2 className="w-4 h-4" />;
  }
}

function getWasteLabel(type: string, isBg: boolean) {
  const labels: Record<string, [string, string]> = {
    standard: ["Стандартен", "Standard"],
    recycling: ["Разделно", "Recycling"],
    nonstandard: ["Нестандартен", "Non-standard"],
    construction: ["Строителен", "Construction"],
  };
  const pair = labels[type] ?? ["Неизвестен", "Unknown"];
  return isBg ? pair[0] : pair[1];
}

function getNavLinks(lat: string, lng: string) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
    apple: isIOS ? `maps://maps.apple.com/?daddr=${lat},${lng}` : null,
  };
}

// ─── District Selector ────────────────────────────────────────────────────────
function DistrictSelector({ deviceToken }: { deviceToken: string }) {
  const { language } = useLanguage();
  const isBg = language === "bg";

  const { data: allDistricts = [] } = trpc.districts.list.useQuery();
  const { data: myDistricts = [], refetch } = trpc.workerDistricts.getMyDistricts.useQuery(
    { deviceToken }, { enabled: !!deviceToken }
  );
  const setMutation = trpc.workerDistricts.setMyDistricts.useMutation({
    onSuccess: () => {
      toast.success(isBg ? "Кварталите са запазени!" : "Districts saved!");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const [selected, setSelected] = useState<string[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && myDistricts.length > 0) {
      setSelected(myDistricts);
      initialized.current = true;
    }
  }, [myDistricts]);

  const toggle = (name: string) => {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(d => d !== name) : [...prev, name]
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold mb-1">
          {isBg ? "Моите квартали" : "My Districts"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isBg
            ? "Изберете кварталите, в които работите. Ще виждате само заявки от тях."
            : "Select the districts you work in. You will only see requests from them."}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => setSelected(allDistricts.map(d => d.name))} className="rounded-2xl text-xs">
          {isBg ? "Избери всички" : "Select all"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setSelected([])} className="rounded-2xl text-xs">
          {isBg ? "Изчисти" : "Clear all"}
        </Button>
        <span className="text-sm text-muted-foreground self-center">
          {selected.length} {isBg ? "избрани" : "selected"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
        {allDistricts.map(d => (
          <div
            key={d.id}
            className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
              selected.includes(d.name) ? "border-primary bg-primary/5" : "hover:bg-accent/30"
            }`}
            onClick={() => toggle(d.name)}
          >
            <Checkbox
              checked={selected.includes(d.name)}
              onCheckedChange={() => toggle(d.name)}
              id={`dist-${d.id}`}
            />
            <Label htmlFor={`dist-${d.id}`} className="cursor-pointer text-sm">{d.name}</Label>
          </div>
        ))}
      </div>

      <Button
        className="w-full rounded-2xl bg-primary text-white"
        onClick={() => setMutation.mutate({ deviceToken, districts: selected })}
        disabled={setMutation.isPending}
      >
        {setMutation.isPending
          ? (isBg ? "Запазва се..." : "Saving...")
          : (isBg ? "Запази квартали" : "Save districts")}
      </Button>
    </div>
  );
}
function WorkerQuotePanel({ requestId, deviceToken, isBg }: { requestId: number; deviceToken: string; isBg: boolean }) {
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [showForm, setShowForm] = useState(false);

  const sendQuote = trpc.workerQuotes.send.useMutation({
    onSuccess: () => {
      toast.success(isBg ? "Офертата е изпратена!" : "Quote sent!");
      setShowForm(false);
      setPrice("");
      setNote("");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!showForm) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="w-full rounded-xl text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
        onClick={() => setShowForm(true)}
      >
        💰 {isBg ? "Изпрати оферта" : "Send quote"}
      </Button>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold text-amber-800">{isBg ? "Изпрати оферта" : "Send quote"}</p>
      <input
        type="number"
        placeholder={isBg ? "Цена в евро" : "Price in EUR"}
        value={price}
        onChange={e => setPrice(e.target.value)}
        className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-sm"
      />
      <input
        type="text"
        placeholder={isBg ? "Бележка (незадължително)" : "Note (optional)"}
        value={note}
        onChange={e => setNote(e.target.value)}
        className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs"
          disabled={!price || sendQuote.isPending}
          onClick={() => sendQuote.mutate({ deviceToken, requestId, price, note: note || undefined })}>
          {sendQuote.isPending ? "..." : isBg ? "Изпрати" : "Send"}
        </Button>
        <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => setShowForm(false)}>
          {isBg ? "Отказ" : "Cancel"}
        </Button>
      </div>
    </div>
  );
}

// ─── Worker Chat Panel ───────────────────────────────────────────────────────
function WorkerChatPanel({ requestId, deviceToken, isBg }: { requestId: number; deviceToken: string; isBg: boolean }) {
  const utils = trpc.useUtils();
  const [msg, setMsg] = React.useState("");
  const { data: messages = [], isLoading } = trpc.requestMessages.getForRequest.useQuery(
    { requestId, deviceToken },
    { refetchInterval: 15000 },
  );
  const sendMutation = trpc.requestMessages.sendAsWorker.useMutation({
    onSuccess: () => {
      setMsg("");
      utils.requestMessages.getForRequest.invalidate({ requestId, deviceToken });
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return null;

  const roleLabel: Record<string, string> = {
    client: isBg ? "Клиент" : "Client",
    worker: isBg ? "Вие" : "You",
    admin: isBg ? "Администратор" : "Admin",
  };
  const roleBg: Record<string, string> = {
    client: "bg-blue-50 border-blue-200",
    worker: "bg-green-50 border-green-200",
    admin: "bg-purple-50 border-purple-200",
  };

  return (
    <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600 flex items-center gap-1">
        <Send className="w-3 h-3" />{isBg ? `Съобщения (${messages.length})` : `Messages (${messages.length})`}
      </div>
      {messages.length > 0 && (
        <div className="max-h-40 overflow-y-auto p-2 space-y-1.5">
          {messages.map((m: any) => (
            <div key={m.id} className={`rounded-lg p-1.5 border text-xs ${roleBg[m.senderRole] ?? "bg-gray-50 border-gray-200"}`}>
              <span className="font-semibold">{roleLabel[m.senderRole] ?? m.senderRole}: </span>
              <span>{m.message}</span>
              <span className="block text-gray-400 text-[10px] mt-0.5">
                {new Date(m.createdAt).toLocaleString(isBg ? "bg-BG" : "en-GB")}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1.5 p-2 border-t border-gray-100">
        <Input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder={isBg ? "Напишете съобщение..." : "Type a message..."}
          className="h-7 text-xs flex-1"
          onKeyDown={e => { if (e.key === "Enter" && msg.trim()) sendMutation.mutate({ requestId, deviceToken, message: msg.trim() }); }}
        />
        <Button
          size="sm"
          className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
          disabled={!msg.trim() || sendMutation.isPending}
          onClick={() => sendMutation.mutate({ requestId, deviceToken, message: msg.trim() })}
        >
          <Send className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Request Card ─────────────────────────────────────────────────────────────
function RequestCard({
  req, deviceToken, onComplete, onProblem, onClaim
}: {
  req: Request;
  deviceToken: string;
  onComplete: (id: number) => void;
  onProblem: (req: Request) => void;
  onClaim?: (district: string, blok: string, vhod: string) => void;
}) {
  const { language } = useLanguage();
  const isBg = language === "bg";
  const [showNav, setShowNav] = useState(false);

  const hasGps = !!(req.gpsLat && req.gpsLng);
  const navLinks = hasGps ? getNavLinks(req.gpsLat!, req.gpsLng!) : null;

  return (
    <div className={`border rounded-2xl p-3 shadow-sm space-y-2 ${req.hasProblem ? 'bg-red-50 border-red-300' : req.status === 'assigned' ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
      {req.hasProblem && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-100 rounded-xl px-2 py-1">
          <span>⚠️ Проблем:</span>
          <span className="font-normal">{req.problemDescription}</span>
        </div>
      )}
{req.status === "assigned" && (
  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-xl px-2 py-1">
    <CheckCircle className="w-3 h-3" />
    <span>Офертата е приета — изчаква изпълнение!</span>
  </div>
)}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getWasteIcon(req.type)}
          <span className="text-sm font-medium">{getWasteLabel(req.type, isBg)}</span>
          <Badge variant="outline" className="text-xs">
            {isBg ? `Ет. ${req.etaj}, Ап. ${req.apartament}` : `Fl. ${req.etaj}, Apt. ${req.apartament}`}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(req.createdAt).toLocaleDateString(isBg ? "bg-BG" : "en-GB")}
        </span>
      </div>

      {req.description && (
        <p className="text-xs text-muted-foreground italic">"{req.description}"</p>
      )}

      {req.estimatedVolume && (
        <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 rounded-lg px-2 py-1">
          <Package className="w-3 h-3" />
          {isBg ? `Прогнозен обем: ${req.estimatedVolume}` : `Est. volume: ${req.estimatedVolume}`}
        </div>
      )}

      {req.imageUrl && (
        <img src={req.imageUrl} alt="waste" className="max-h-48 w-auto object-contain rounded-xl" />
      )}

      {/* Worker chat panel for nonstandard/construction requests */}
      {(req.type === "nonstandard" || req.type === "construction") && (
        <WorkerChatPanel requestId={req.id} deviceToken={deviceToken} isBg={isBg} />
      )}

      

      {hasGps && (
        <div>
          <Button
            size="sm" variant="outline"
            className="rounded-xl text-xs w-full"
            onClick={() => setShowNav(!showNav)}
          >
            <Navigation className="w-3 h-3 mr-1" />
            {isBg ? "Навигация" : "Navigate"}
          </Button>
          {showNav && navLinks && (
            <div className="flex gap-2 mt-2 flex-wrap">
              <a href={navLinks.google} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline" className="rounded-xl text-xs">
                  <Map className="w-3 h-3 mr-1" /> Google Maps
                </Button>
              </a>
              <a href={navLinks.waze} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline" className="rounded-xl text-xs">
                  <Navigation className="w-3 h-3 mr-1" /> Waze
                </Button>
              </a>
              {navLinks.apple && (
                <a href={navLinks.apple} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="rounded-xl text-xs">
                    <Map className="w-3 h-3 mr-1" /> Apple Maps
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-col">
  {(req.type === "nonstandard" || req.type === "construction") && (
    <WorkerQuotePanel requestId={req.id} deviceToken={deviceToken} isBg={isBg} />
  )}
  <div className="flex gap-2">
    {(req.type !== "nonstandard" && req.type !== "construction") && onClaim && (
      <Button
        size="sm"
        className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs"
        onClick={() => onClaim(req.district, req.blok, req.vhod)}
      >
        <CheckCircle className="w-3 h-3 mr-1" />
        {isBg ? "Приеми" : "Accept"}
      </Button>
    )}
    <Button
      size="sm"
      variant="outline"
      className="rounded-xl text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
      onClick={() => onProblem(req)}
    >
      <AlertTriangle className="w-3 h-3 mr-1" />
      {isBg ? "Проблем" : "Problem"}
    </Button>
  </div>
</div>
    </div>
  );
}

// ─── Grouped Requests View ────────────────────────────────────────────────────
function GroupedRequestsView({ deviceToken }: { deviceToken: string }) {
  const { language } = useLanguage();
  const isBg = language === "bg";
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [expandedEntrances, setExpandedEntrances] = useState<Set<string>>(new Set());
  const [problemReq, setProblemReq] = useState<Request | null>(null);
  const [problemDesc, setProblemDesc] = useState("");
  const [problemImagePreview, setProblemImagePreview] = useState<string | null>(null);
  const [problemImageFile, setProblemImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: grouped = {}, isLoading, refetch } = trpc.workerDistricts.getRequestsForMyDistricts.useQuery(
    { deviceToken }, { enabled: !!deviceToken, refetchInterval: 30000 }
  );
  const { data: workerPrefs, refetch: refetchPrefs } = trpc.subscriptions.getWorkerPref.useQuery(
    { deviceToken }, { enabled: !!deviceToken }
  );
  const acceptsNonstandard = workerPrefs?.acceptsNonstandard ?? false;
  const toggleNonstandard = trpc.subscriptions.setWorkerPref.useMutation({
    onSuccess: () => { refetchPrefs(); toast.success(isBg ? "Настройката е запазена!" : "Setting saved!"); },
    onError: (e) => toast.error(e.message),
  });

  // Build entrance list for batch claim status
  const groupedData0 = grouped as Record<string, Record<string, Record<string, Request[]>>>;
  const allEntrances = useMemo(() =>
    Object.entries(groupedData0).flatMap(([district, blocks]) =>
      Object.entries(blocks).flatMap(([blok, entrances]) =>
        Object.keys(entrances).map(vhod => ({ district, blok, vhod }))
      )
    ), [grouped]);

  const { data: claimStatus = {} } = trpc.workerAssignments.getForEntrances.useQuery(
    { deviceToken, entrances: allEntrances },
    { enabled: !!deviceToken && allEntrances.length > 0, refetchInterval: 30000 }
  );

  const claimMutation = trpc.workerAssignments.claim.useMutation({
    onSuccess: () => { toast.success(isBg ? "Входът е приет!" : "Entrance claimed!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const completeMutation = trpc.workerDistricts.completeRequest.useMutation({
    onSuccess: () => { toast.success(isBg ? "Заявката е приключена!" : "Request completed!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const completeEntranceMutation = trpc.workerDistricts.completeEntrance.useMutation({
    onSuccess: (data) => {
      const count = (data as any).count ?? 0;
      toast.success(isBg ? `Приключени ${count} заявки!` : `Completed ${count} requests!`);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const problemMutation = trpc.workerDistricts.reportProblem.useMutation({
    onSuccess: () => {
      toast.success(isBg ? "Проблемът е докладван на администратора!" : "Problem reported to admin!");
      setProblemReq(null);
      setProblemDesc("");
      setProblemImagePreview(null);
      setProblemImageFile(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      toast.error(isBg ? "Снимката е твърде голяма (макс. 16MB)" : "Image too large (max 16MB)");
      return;
    }
    setProblemImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProblemImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitProblem = async () => {
    if (!problemReq || !problemDesc.trim()) return;
    setUploading(true);
    let imageUrl: string | undefined;

    if (problemImageFile) {
      try {
        const formData = new FormData();
        formData.append("file", problemImageFile);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          imageUrl = data.url;
        }
      } catch {
        toast.error(isBg ? "Грешка при качване на снимката" : "Failed to upload image");
        setUploading(false);
        return;
      }
    }

    setUploading(false);
    problemMutation.mutate({
      deviceToken,
      requestId: problemReq.id,
      description: problemDesc,
      imageUrl,
    });
  };

  const toggle = (set: Set<string>, key: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setter(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const groupedData = grouped as Record<string, Record<string, Record<string, Request[]>>>;

  // Filter out claimed entrances from this view
  const filteredGroupedData: Record<string, Record<string, Record<string, Request[]>>> = {};
  for (const [district, blocks] of Object.entries(groupedData)) {
    for (const [blok, entrances] of Object.entries(blocks)) {
      for (const [vhod, reqs] of Object.entries(entrances)) {
        const key = `${district}|${blok}|${vhod}`;
        const status = claimStatus[key];
        const isClaimed = status?.claimedByMe || status?.claimedByOther;
        // If claimed, only keep nonstandard/construction requests (they need quotes, not claim)
        const visibleReqs = isClaimed
          ? acceptsNonstandard
            ? reqs.filter(r => r.type === "nonstandard" || r.type === "construction")
            : []
          : acceptsNonstandard
            ? reqs
            : reqs.filter(r => r.type !== "nonstandard" && r.type !== "construction");
        if (visibleReqs.length === 0) continue;
        if (!filteredGroupedData[district]) filteredGroupedData[district] = {};
        if (!filteredGroupedData[district][blok]) filteredGroupedData[district][blok] = {};
        filteredGroupedData[district][blok][vhod] = visibleReqs;
      }
    }
  }

  const districts = Object.keys(filteredGroupedData);

  if (districts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
        <p className="font-medium">{isBg ? "Няма активни заявки" : "No active requests"}</p>
        <p className="text-sm mt-1">
          {isBg
            ? "Всички заявки са приключени, приети, или не сте избрали квартали."
            : "All requests are completed, claimed, or no districts selected."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Nonstandard toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => toggleNonstandard.mutate({ deviceToken, acceptsSubscriptions: workerPrefs?.acceptsSubscriptions ?? false, acceptsNonstandard: !acceptsNonstandard })}
          disabled={toggleNonstandard.isPending}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border-2 ${
            acceptsNonstandard ? "bg-orange-50 border-orange-400 text-orange-700" : "bg-gray-50 border-gray-300 text-gray-500"
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          {acceptsNonstandard ? (isBg ? "Приемам нестандартен" : "Accepting non-std") : (isBg ? "Не приемам нестандартен" : "Not accepting non-std")}
        </button>
      </div>
      {districts.map(district => {
        const blocks = filteredGroupedData[district];
        const totalInDistrict = Object.values(blocks).flatMap(b => Object.values(b)).flat().length;
        const isDistExpanded = expandedDistricts.has(district);

        return (
          <div key={district} className="border rounded-2xl overflow-hidden shadow-sm">
            <button
              className="w-full flex items-center justify-between p-3 bg-primary/10 hover:bg-primary/20 transition-colors"
              onClick={() => toggle(expandedDistricts, district, setExpandedDistricts)}
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">{district}</span>
                <Badge className="bg-primary text-white text-xs px-2">{totalInDistrict}</Badge>
              </div>
              {isDistExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {isDistExpanded && (
              <div className="p-2 space-y-2 bg-gray-50">
                {Object.entries(blocks).map(([blok, entrances]) => {
                  const blockKey = `${district}|${blok}`;
                  const totalInBlock = Object.values(entrances).flat().length;
                  const isBlockExpanded = expandedBlocks.has(blockKey);

                  return (
                    <div key={blok} className="border rounded-xl overflow-hidden bg-white">
                      <button
                        className="w-full flex items-center justify-between p-2.5 hover:bg-gray-50 transition-colors"
                        onClick={() => toggle(expandedBlocks, blockKey, setExpandedBlocks)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {isBg ? `Бл. ${blok}` : `Bl. ${blok}`}
                          </span>
                          <Badge variant="outline" className="text-xs">{totalInBlock}</Badge>
                        </div>
                        {isBlockExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>

                      {isBlockExpanded && (
                        <div className="px-2 pb-2 space-y-2">
                          {Object.entries(entrances).sort(([a], [b]) => sortBgEntrances(a, b)).map(([vhod, reqs]) => {
                            const entrKey = `${district}|${blok}|${vhod}`;
                            const isEntrExpanded = expandedEntrances.has(entrKey);

                            return (
                              <div key={vhod} className="border rounded-xl overflow-hidden">
                                <div className="flex items-center justify-between p-2 bg-accent/20">
                                  <button
                                    className="flex items-center gap-2 flex-1 text-left"
                                    onClick={() => toggle(expandedEntrances, entrKey, setExpandedEntrances)}
                                  >
                                    <span className="text-sm font-medium">
                                      {isBg ? `Вх. ${vhod}` : `Entr. ${vhod}`}
                                    </span>
                                    <Badge variant="secondary" className="text-xs">{reqs.length}</Badge>
                                    {isEntrExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  </button>
                                  <Button
                                    size="sm"
                                    className="rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white h-7 px-2 ml-2"
                                    onClick={() => claimMutation.mutate({ district, blok, vhod, deviceToken })}
                                    disabled={claimMutation.isPending}
                                  >
                                    <ClipboardList className="w-3 h-3 mr-1" />
                                    {isBg ? "Приеми" : "Claim"}
                                  </Button>
                                </div>

                                {isEntrExpanded && (
                                  <div className="p-2 space-y-2">
                                    {reqs.map(req => (
                                      <RequestCard
                                        key={req.id}
                                        req={req}
                                        deviceToken={deviceToken}
                                        onComplete={(id) => completeMutation.mutate({ requestId: id, deviceToken })}
                                        onProblem={(r) => setProblemReq(r)}
                                        onClaim={(district, blok, vhod) => {
                          const entranceReqs = filteredGroupedData[district]?.[blok]?.[vhod] ?? [];
                          const hasStandard = entranceReqs.some(r => r.type === "standard" || r.type === "recycling");
                          if (!hasStandard) {
                            toast.error(isBg ? "Не може да се приеме вход само с нестандартни заявки." : "Cannot claim entrance with only non-standard requests.");
                            return;
                          }
                          claimMutation.mutate({ district, blok, vhod, deviceToken });
                        }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Problem Report Dialog */}
      <Dialog open={!!problemReq} onOpenChange={() => { setProblemReq(null); setProblemDesc(""); setProblemImagePreview(null); }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              {isBg ? "Докладвай проблем" : "Report Problem"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {problemReq && (
              <div className="bg-orange-50 rounded-xl p-3 text-sm text-orange-800">
                {isBg
                  ? `Заявка #${problemReq.id} — ${problemReq.district}, Бл. ${problemReq.blok}, Вх. ${problemReq.vhod}, Ап. ${problemReq.apartament}`
                  : `Request #${problemReq.id} — ${problemReq.district}, Bl. ${problemReq.blok}, Entr. ${problemReq.vhod}, Apt. ${problemReq.apartament}`}
              </div>
            )}
            <textarea
              className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder={isBg ? "Опишете проблема..." : "Describe the problem..."}
              value={problemDesc}
              onChange={(e) => setProblemDesc(e.target.value)}
              rows={3}
            />
            <div>
              <label className="text-sm font-medium mb-1 block">
                {isBg ? "Снимка (по желание)" : "Photo (optional)"}
              </label>
              {problemImagePreview ? (
                <div className="relative">
                  <img src={problemImagePreview} alt="problem" className="w-full h-32 object-cover rounded-xl" />
                  <button
                    onClick={() => { setProblemImageFile(null); setProblemImagePreview(null); }}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 p-3 border-2 border-dashed rounded-xl cursor-pointer hover:border-orange-300 transition-colors">
                  <Camera className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {isBg ? "Добави снимка" : "Add photo"}
                  </span>
                  <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                </label>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => { setProblemReq(null); setProblemDesc(""); }}>
              {isBg ? "Отказ" : "Cancel"}
            </Button>
            <Button
              className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
              disabled={!problemDesc.trim() || problemMutation.isPending || uploading}
              onClick={handleSubmitProblem}
            >
              {uploading ? (
                <><Upload className="w-3 h-3 mr-1 animate-bounce" />{isBg ? "Качва..." : "Uploading..."}</>
              ) : problemMutation.isPending ? (
                <><Send className="w-3 h-3 mr-1 animate-pulse" />{isBg ? "Изпраща..." : "Sending..."}</>
              ) : (
                <><Send className="w-3 h-3 mr-1" />{isBg ? "Изпрати" : "Send"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkerSubscriptionsTab({ deviceToken, isBg }: { deviceToken: string; isBg: boolean }) {
  const prefQ = trpc.subscriptions.getWorkerPref.useQuery(
    { deviceToken },
    { enabled: !!deviceToken }
  );
  const todayQ = trpc.subscriptions.todayVisits.useQuery(
    { deviceToken },
    { enabled: !!deviceToken }
  );
  const toggleAccept = trpc.subscriptions.setWorkerPref.useMutation({
    onSuccess: () => { prefQ.refetch(); toast.success(isBg ? "Настройката е запазена!" : "Setting saved!"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const toggleNonstandard = trpc.subscriptions.setWorkerPref.useMutation({
    onSuccess: () => { prefQ.refetch(); toast.success(isBg ? "Настройката е запазена!" : "Setting saved!"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const markVisited = trpc.subscriptions.markVisited.useMutation({
    onSuccess: () => { todayQ.refetch(); toast.success(isBg ? "Посещението е отбелязано!" : "Visit marked!"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const accepting = prefQ.data?.acceptsSubscriptions ?? false;
  const acceptingNonstandard = prefQ.data?.acceptsNonstandard ?? false;
  const morning = todayQ.data?.morning ?? [];
  const evening = todayQ.data?.evening ?? [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{isBg ? "Абонаменти" : "Subscriptions"}</h2>
        <button
          onClick={() => toggleAccept.mutate({ deviceToken, acceptsSubscriptions: !accepting })}
          disabled={toggleAccept.isPending}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-all border-2 ${
            accepting ? "bg-green-50 border-green-400 text-green-700" : "bg-gray-50 border-gray-300 text-gray-500"
          }`}
        >
          {toggleAccept.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
          {accepting ? (isBg ? "Приемам абонаменти" : "Accepting subs") : (isBg ? "Не приемам" : "Not accepting")}
        </button>
      </div>
      {!accepting && (
        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-sm text-muted-foreground text-center">
          {isBg ? "Включете превключвателя, за да виждате и изпълнявате абонаментни посещения." : "Enable the toggle to see and complete subscription visits."}
        </div>
      )}
      {accepting && todayQ.isLoading && (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      )}
      {accepting && !todayQ.isLoading && (
        <>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-yellow-500" />
              <span className="font-semibold text-sm">08:00 – 12:00</span>
              <Badge variant="secondary" className="text-xs">{morning.length}</Badge>
            </div>
            {morning.length === 0 ? (
              <p className="text-sm text-muted-foreground pl-6">{isBg ? "Няма адреси за днес" : "No addresses today"}</p>
            ) : (
              (() => {
                const grouped: Record<string, typeof morning> = {};
                morning.forEach(visit => {
                  const sub = (visit as any).subscription;
                  const key = `${sub?.district}|${sub?.blok}|${sub?.vhod}`;
                  if (!grouped[key]) grouped[key] = [];
                  grouped[key].push(visit);
                });
                return Object.entries(grouped).map(([key, visits]) => {
                  const sub = (visits[0] as any).subscription;
                  const isExpanded = expandedBlocks.has(`morning_${key}`);
                  const allCompleted = visits.every(v => (v as any).status === "completed");
                  return (
                    <div key={key} className="rounded-2xl border overflow-hidden">
                      <div
                        className={`flex items-center justify-between p-3 cursor-pointer ${allCompleted ? "bg-green-50 border-green-200" : "bg-white"}`}
                        onClick={() => {
                          setExpandedBlocks(prev => {
                            const next = new Set(prev);
                            next.has(`morning_${key}`) ? next.delete(`morning_${key}`) : next.add(`morning_${key}`);
                            return next;
                          });
                        }}
                      >
                        <div>
                          <p className="text-sm font-medium">{sub?.district}, Бл. {sub?.blok}, Вх. {sub?.vhod}</p>
                          <p className="text-xs text-muted-foreground">{visits.length} {isBg ? "апартамента" : "apartments"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {allCompleted && <Badge className="bg-green-100 text-green-700 border-0 text-xs"><CheckCircle className="w-3 h-3 mr-1" />{isBg ? "Всички посетени" : "All visited"}</Badge>}
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t divide-y">
                          {visits.map(visit => {
                            const s = (visit as any).subscription;
                            const isCompleted = (visit as any).status === "completed";
                            return (
                              <div key={visit.id} className={`flex items-center justify-between px-4 py-2.5 ${isCompleted ? "bg-green-50" : "bg-gray-50"}`}>
                                <p className="text-xs text-muted-foreground">
                                  {s?.etaj ? `Ет. ${s.etaj}` : ""}{s?.etaj && s?.apartament ? ", " : ""}{s?.apartament ? `Ап. ${s.apartament}` : ""}
                                </p>
                                {isCompleted ? (
                                  <Badge className="bg-green-100 text-green-700 border-0 text-xs"><CheckCircle className="w-3 h-3 mr-1" />{isBg ? "Посетен" : "Visited"}</Badge>
                                ) : (
                                  <Button size="sm" className="rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                                    disabled={markVisited.isPending}
                                    onClick={() => markVisited.mutate({ deviceToken, visitId: visit.id })}>
                                    <CheckCircle className="w-3 h-3 mr-1" />{isBg ? "Посетен" : "Visited"}
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-blue-500" />
              <span className="font-semibold text-sm">20:00 – 00:00</span>
              <Badge variant="secondary" className="text-xs">{evening.length}</Badge>
            </div>
            {evening.length === 0 ? (
              <p className="text-sm text-muted-foreground pl-6">{isBg ? "Няма адреси за днес" : "No addresses today"}</p>
            ) : (
              (() => {
                const grouped: Record<string, typeof evening> = {};
                evening.forEach(visit => {
                  const sub = (visit as any).subscription;
                  const key = `${sub?.district}|${sub?.blok}|${sub?.vhod}`;
                  if (!grouped[key]) grouped[key] = [];
                  grouped[key].push(visit);
                });
                return Object.entries(grouped).map(([key, visits]) => {
                  const sub = (visits[0] as any).subscription;
                  const isExpanded = expandedBlocks.has(`evening_${key}`);
                  const allCompleted = visits.every(v => (v as any).status === "completed");
                  return (
                    <div key={key} className="rounded-2xl border overflow-hidden">
                      <div
                        className={`flex items-center justify-between p-3 cursor-pointer ${allCompleted ? "bg-green-50 border-green-200" : "bg-white"}`}
                        onClick={() => {
                          setExpandedBlocks(prev => {
                            const next = new Set(prev);
                            next.has(`evening_${key}`) ? next.delete(`evening_${key}`) : next.add(`evening_${key}`);
                            return next;
                          });
                        }}
                      >
                        <div>
                          <p className="text-sm font-medium">{sub?.district}, Бл. {sub?.blok}, Вх. {sub?.vhod}</p>
                          <p className="text-xs text-muted-foreground">{visits.length} {isBg ? "апартамента" : "apartments"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {allCompleted && <Badge className="bg-green-100 text-green-700 border-0 text-xs"><CheckCircle className="w-3 h-3 mr-1" />{isBg ? "Всички посетени" : "All visited"}</Badge>}
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t divide-y">
                          {visits.map(visit => {
                            const s = (visit as any).subscription;
                            const isCompleted = (visit as any).status === "completed";
                            return (
                              <div key={visit.id} className={`flex items-center justify-between px-4 py-2.5 ${isCompleted ? "bg-green-50" : "bg-gray-50"}`}>
                                <p className="text-xs text-muted-foreground">
                                  {s?.etaj ? `Ет. ${s.etaj}` : ""}{s?.etaj && s?.apartament ? ", " : ""}{s?.apartament ? `Ап. ${s.apartament}` : ""}
                                </p>
                                {isCompleted ? (
                                  <Badge className="bg-green-100 text-green-700 border-0 text-xs"><CheckCircle className="w-3 h-3 mr-1" />{isBg ? "Посетен" : "Visited"}</Badge>
                                ) : (
                                  <Button size="sm" className="rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                                    disabled={markVisited.isPending}
                                    onClick={() => markVisited.mutate({ deviceToken, visitId: visit.id })}>
                                    <CheckCircle className="w-3 h-3 mr-1" />{isBg ? "Посетен" : "Visited"}
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Worker Assignments Tab ───────────────────────────────────────────────────
function WorkerAssignmentsTab({ deviceToken }: { deviceToken: string }) {
  const { language } = useLanguage();
  const isBg = language === "bg";

  const { data: assignments = [], isLoading, refetch } = trpc.workerAssignments.myAssignments.useQuery(
    { deviceToken },
    { enabled: !!deviceToken, refetchInterval: 30000 }
  );

  const unclaimMutation = trpc.workerAssignments.unclaim.useMutation({
    onSuccess: () => { toast.success(isBg ? "Входът е освободен!" : "Entrance released!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const completeEntranceMutation = trpc.workerDistricts.completeEntrance.useMutation({
    onSuccess: (data) => {
      const count = (data as any).count ?? 0;
      toast.success(isBg ? `Приключени ${count} заявки!` : `Completed ${count} requests!`);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ClipboardList className="w-12 h-12 mx-auto mb-3 text-blue-300" />
        <p className="font-medium">{isBg ? "Нямате приети входове" : "No claimed entrances"}</p>
        <p className="text-sm mt-1">
          {isBg ? "Приемете вход от таба \"Заявки\"." : "Claim an entrance from the Requests tab."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(assignments as any[]).map((a) => {
        const reqs: Request[] = a.requests ?? [];
        return (
          <div key={`${a.district}|${a.blok}|${a.vhod}`} className="border rounded-2xl overflow-hidden shadow-sm">
            {/* Entrance header */}
            <div className="flex items-center justify-between p-3 bg-blue-50 border-b border-blue-100">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-sm">{a.district}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isBg ? `Бл. ${a.blok}, Вх. ${a.vhod}` : `Bl. ${a.blok}, Entr. ${a.vhod}`}
                  {reqs.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">{reqs.length}</Badge>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                {reqs.some(r => r.type === "standard" || r.type === "recycling") && (
                  <Button
                    size="sm"
                    className="rounded-xl text-xs bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                    disabled={completeEntranceMutation.isPending}
                    onClick={() => completeEntranceMutation.mutate({ district: a.district, blok: a.blok, vhod: a.vhod, deviceToken })}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {isBg ? "Приключи" : "Complete"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs border-red-200 text-red-600 hover:bg-red-50 h-8 px-3"
                  disabled={unclaimMutation.isPending}
                  onClick={() => unclaimMutation.mutate({ district: a.district, blok: a.blok, vhod: a.vhod, deviceToken })}
                >
                  <X className="w-3 h-3 mr-1" />
                  {isBg ? "Освободи" : "Release"}
                </Button>
              </div>
            </div>

            {/* Requests inside this entrance */}
            {reqs.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                {isBg ? "Няма активни заявки за този вход" : "No active requests for this entrance"}
              </div>
            ) : (
              <div className="p-2 space-y-2 bg-gray-50">
                {/* Standard/Recycling requests */}
                {reqs.filter(r => r.type === "standard" || r.type === "recycling").map((req) => (
                  <div key={req.id} className={`border rounded-xl p-3 space-y-1.5 ${req.hasProblem ? 'bg-red-50 border-red-300' : 'bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getWasteIcon(req.type)}
                        <span className="text-sm font-medium">{getWasteLabel(req.type, isBg)}</span>
                        <Badge variant="outline" className="text-xs">
                          {isBg ? `Ет. ${req.etaj}, Ап. ${req.apartament}` : `Fl. ${req.etaj}, Apt. ${req.apartament}`}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString(isBg ? "bg-BG" : "en-GB")}
                      </span>
                    </div>
                    {req.description && (
                      <p className="text-xs text-muted-foreground italic">"{req.description}"</p>
                    )}
                    {req.estimatedVolume && (
                      <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 rounded-lg px-2 py-1">
                        <Package className="w-3 h-3" />
                        {isBg ? `Прогнозен обем: ${req.estimatedVolume}` : `Est. volume: ${req.estimatedVolume}`}
                      </div>
                    )}
                    {req.imageUrl && (
                      <img src={req.imageUrl} alt="waste" className="max-h-32 w-auto object-contain rounded-xl" />
                    )}
                  </div>
                ))}
                {/* Nonstandard/Construction — отделна секция */}
                {reqs.filter(r => r.type === "nonstandard" || r.type === "construction").length > 0 && (
                  <div className="mt-2 pt-2 border-t border-orange-200">
                    <p className="text-xs font-semibold text-orange-600 mb-2 px-1">
                      {isBg ? "⏳ Чакащи оферта" : "⏳ Pending quotes"}
                    </p>
                    {reqs.filter(r => r.type === "nonstandard" || r.type === "construction").map((req) => (
                      <div key={req.id} className="border border-orange-200 rounded-xl p-3 space-y-1.5 bg-orange-50 mb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getWasteIcon(req.type)}
                            <span className="text-sm font-medium">{getWasteLabel(req.type, isBg)}</span>
                            <Badge variant="outline" className="text-xs">
                              {isBg ? `Ет. ${req.etaj}, Ап. ${req.apartament}` : `Fl. ${req.etaj}, Apt. ${req.apartament}`}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(req.createdAt).toLocaleDateString(isBg ? "bg-BG" : "en-GB")}
                          </span>
                        </div>
                        {req.estimatedVolume && (
                          <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-100 rounded-lg px-2 py-1">
                            <Package className="w-3 h-3" />
                            {isBg ? `Прогнозен обем: ${req.estimatedVolume}` : `Est. volume: ${req.estimatedVolume}`}
                          </div>
                        )}
                        {req.imageUrl && (
                          <img src={req.imageUrl} alt="waste" className="max-h-32 w-auto object-contain rounded-xl" />
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {req.contactPhone && (
                            <a href={`tel:${req.contactPhone}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                              <Phone className="w-3 h-3" />{req.contactPhone}
                            </a>
                          )}
                          {req.contactEmail && (
                            <a href={`mailto:${req.contactEmail}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                              <Mail className="w-3 h-3" />{req.contactEmail}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main WorkerPortal ────────────────────────────────────────────────────────
export default function WorkerPortal() {
  const { language } = useLanguage();
  const isBg = language === "bg";
  const [, setLocation] = useLocation();

  const [session, setSession] = useState<WorkerSession | null>(null);
  const [activeTab, setActiveTab] = useState<"requests" | "assignments" | "districts" | "subscriptions" | "profile">("requests");

  useEffect(() => {
    const stored = localStorage.getItem("trashit_worker_session");
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {
        localStorage.removeItem("trashit_worker_session");
      }
    }
  }, []);

  const logoutMutation = trpc.workerAuth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("trashit_worker_session");
      setSession(null);
      setLocation("/");
    },
  });

  const { data: myStats } = trpc.workerAssignments.myStats.useQuery(
    { deviceToken: session?.deviceToken ?? "" },
    { enabled: !!session?.deviceToken }
  );

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-4">
        <Card className="w-full max-w-sm rounded-3xl shadow-lg">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <HardHat className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">
              {isBg ? "Работнически портал" : "Worker Portal"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isBg ? "Моля, влезте в акаунта си." : "Please log in to your account."}
            </p>
            <Button
              className="w-full rounded-2xl bg-primary text-white"
              onClick={() => setLocation("/worker/login")}
            >
              {isBg ? "Вход" : "Login"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full rounded-xl text-muted-foreground"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {isBg ? "Назад" : "Back"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">TRASHit</p>
              <p className="text-xs text-muted-foreground">{session.name}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-xs"
            onClick={() => logoutMutation.mutate({ deviceToken: session.deviceToken })}
          >
            <LogOut className="w-3 h-3 mr-1" />
            {isBg ? "Изход" : "Logout"}
          </Button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex">
            {[
              { id: "requests", label: isBg ? "Заявки" : "Requests", icon: <List className="w-4 h-4" /> },
              { id: "assignments", label: isBg ? "Приети" : "Claimed", icon: <ClipboardList className="w-4 h-4" /> },
              { id: "districts", label: isBg ? "Квартали" : "Districts", icon: <MapPin className="w-4 h-4" /> },
              { id: "subscriptions", label: isBg ? "Абон." : "Subs", icon: <CalendarDays className="w-4 h-4" /> },
              { id: "profile", label: isBg ? "Профил" : "Profile", icon: <Settings className="w-4 h-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4">
        {activeTab === "requests" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {isBg ? "Активни заявки" : "Active Requests"}
              </h2>
              <Badge variant="outline" className="text-xs">
                {isBg ? "Обновява се на 30с" : "Refreshes every 30s"}
              </Badge>
            </div>
            <GroupedRequestsView deviceToken={session.deviceToken} />
          </div>
        )}

        {activeTab === "assignments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {isBg ? "Приети входове" : "Claimed Entrances"}
              </h2>
              <Badge variant="outline" className="text-xs">
                {isBg ? "Обновява се на 30с" : "Refreshes every 30s"}
              </Badge>
            </div>
            <WorkerAssignmentsTab deviceToken={session.deviceToken} />
          </div>
        )}

        
         {activeTab === "districts" && (
  <DistrictSelector deviceToken={session.deviceToken} />
)}
{activeTab === "subscriptions" && (
  <WorkerSubscriptionsTab deviceToken={session.deviceToken} isBg={isBg} />
)}
{activeTab === "profile" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">{isBg ? "Профил" : "Profile"}</h2>
            <Card className="rounded-2xl">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <HardHat className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">{session.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {isBg ? "Работник" : "Worker"}
                    </p>
                    
                  </div>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{isBg ? "Общо приключени" : "Total completed"}</span>
                    <span className="text-sm font-semibold">{myStats?.completedCount ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{isBg ? "Днес" : "Today"}</span>
                    <span className="text-sm font-semibold text-green-600">{myStats?.todayCount ?? 0}</span>
                  </div>
                  {(myStats?.history?.length ?? 0) > 0 && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-2">{isBg ? "История (последни 30 дни)" : "History (last 30 days)"}</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {myStats!.history.map(h => (
                          <div key={h.date} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                            <span className="text-muted-foreground">{h.date}</span>
                            <span className="font-medium">{h.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-1">
                      {isBg ? "ID на устройство" : "Device ID"}
                    </p>
                    <p className="text-xs font-mono bg-gray-100 rounded-lg p-2 break-all">
                      {session.deviceToken.slice(0, 20)}...
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => logoutMutation.mutate({ deviceToken: session.deviceToken })}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {isBg ? "Изход от акаунта" : "Sign out"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
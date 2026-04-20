import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MapPin, Navigation, Phone, Mail, AlertTriangle,
  CheckCircle, ChevronDown, ChevronRight, LogOut,
  Trash2, Recycle, Package, HardHat, Camera, Map,
  Settings, List, X, ArrowLeft, Send, Upload
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
        placeholder={isBg ? "Цена в лв." : "Price in BGN"}
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
// ─── Request Card ─────────────────────────────────────────────────────────────
function RequestCard({
  req, deviceToken, onComplete, onProblem
}: {
  req: Request;
  deviceToken: string;
  onComplete: (id: number) => void;
  onProblem: (req: Request) => void;
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
    <Button
      size="sm"
      className="flex-1 rounded-xl bg-primary text-white text-xs"
      onClick={() => onComplete(req.id)}
    >
      <CheckCircle className="w-3 h-3 mr-1" />
      {isBg ? "Приключи" : "Complete"}
    </Button>
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
  const districts = Object.keys(groupedData);

  if (districts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
        <p className="font-medium">{isBg ? "Няма активни заявки" : "No active requests"}</p>
        <p className="text-sm mt-1">
          {isBg
            ? "Всички заявки са приключени или не сте избрали квартали."
            : "All requests are completed or no districts selected."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {districts.map(district => {
        const blocks = groupedData[district];
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
                                    className="rounded-xl text-xs bg-green-600 hover:bg-green-700 text-white h-7 px-2 ml-2"
                                    onClick={() => {
                                      completeEntranceMutation.mutate({ district, blok, vhod, deviceToken });
                                    }}
                                    disabled={completeEntranceMutation.isPending}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {isBg ? "Приключи вход" : "Complete entrance"}
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

// ─── Main WorkerPortal ────────────────────────────────────────────────────────
export default function WorkerPortal() {
  const { language } = useLanguage();
  const isBg = language === "bg";
  const [, setLocation] = useLocation();

  const [session, setSession] = useState<WorkerSession | null>(null);
  const [activeTab, setActiveTab] = useState<"requests" | "districts" | "profile">("requests");

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
              { id: "districts", label: isBg ? "Квартали" : "Districts", icon: <MapPin className="w-4 h-4" /> },
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

        {activeTab === "districts" && (
          <DistrictSelector deviceToken={session.deviceToken} />
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

                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    {isBg ? "ID на устройство" : "Device ID"}
                  </p>
                  <p className="text-xs font-mono bg-gray-100 rounded-lg p-2 break-all">
                    {session.deviceToken.slice(0, 20)}...
                  </p>
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

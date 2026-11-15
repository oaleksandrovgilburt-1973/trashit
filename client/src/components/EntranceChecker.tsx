import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { normalizeEntrance } from "../../../shared/bgAlphabet";

export default function EntranceChecker({ isBg = true }: { isBg?: boolean }) {
  const { data: districts = [] } = trpc.districts.list.useQuery();
  const [district, setDistrict] = useState("");
  const [blok, setBlok] = useState("");
  const [vhod, setVhod] = useState("");
  const [checked, setChecked] = useState<{ district: string; blok: string; vhod: string } | null>(null);
  const [contact, setContact] = useState("");
  const [sent, setSent] = useState(false);

  const { data, isLoading } = trpc.entranceAccess.check.useQuery(
    checked ?? { district: "", blok: "", vhod: "" },
    { enabled: !!checked }
  );

  const register = trpc.entranceAccess.register.useMutation({
    onSuccess: () => setSent(true),
    onError: (e) => toast.error(e.message),
  });

  const resetResult = () => { setChecked(null); setSent(false); };
  const canCheck = !!district && !!blok.trim() && !!vhod.trim();

  const handleCheck = () => {
    setSent(false);
    setChecked({ district, blok: blok.trim(), vhod: normalizeEntrance(vhod.trim()) });
  };

  const handleLeaveContact = () => {
    if (!checked) return;
    const value = contact.trim();
    if (!value) return;
    register.mutate({
      ...checked,
      contactEmail: value.includes("@") ? value : undefined,
      contactPhone: value.includes("@") ? undefined : value,
    });
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 text-left">
      <h3 className="font-semibold text-gray-900 mb-1">
        {isBg ? "Проверете дали обслужваме Вашия вход" : "Check if we serve your entrance"}
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        {isBg ? "Без регистрация. Само квартал, блок и вход." : "No sign-up needed. Just district, block and entrance."}
      </p>

      <div className="grid gap-2 sm:grid-cols-3">
        <select value={district} onChange={e => { setDistrict(e.target.value); resetResult(); }} className={inputCls}>
          <option value="">{isBg ? "Квартал" : "District"}</option>
          {districts.map((d: any) => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
        <input value={blok} onChange={e => { setBlok(e.target.value); resetResult(); }} placeholder={isBg ? "Блок" : "Block"} className={inputCls} />
        <input value={vhod} onChange={e => { setVhod(e.target.value); resetResult(); }} placeholder={isBg ? "Вход" : "Entrance"} className={inputCls} />
      </div>

      <button
        onClick={handleCheck}
        disabled={!canCheck || isLoading}
        className="mt-3 w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-60"
      >
        {isLoading ? (isBg ? "Проверка..." : "Checking...") : (isBg ? "Провери" : "Check")}
      </button>

      {checked && data && !isLoading && (
        data.approved ? (
          <div className="mt-3 rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-800">
            {isBg
              ? "Обслужваме този вход. Можете да направите заявка от приложението."
              : "We serve this entrance. You can place a request in the app."}
          </div>
        ) : (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
            {sent ? (
              <p>{isBg ? "Благодарим! Ще се свържем с Вас, когато можем да включим този вход." : "Thank you! We'll contact you when we can add this entrance."}</p>
            ) : (
              <>
                <p className="mb-2">
                  {isBg
                    ? "Все още не обслужваме този вход. Остави имейл или телефон и ще се свържем с Вас, когато можем да го включим."
                    : "We don't serve this entrance yet. Leave an email or phone and we'll contact you when we can add it."}
                </p>
                <div className="flex gap-2">
                  <input value={contact} onChange={e => setContact(e.target.value)} placeholder={isBg ? "Имейл или телефон" : "Email or phone"} className={inputCls} />
                  <button
                    onClick={handleLeaveContact}
                    disabled={!contact.trim() || register.isPending}
                    className="px-4 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {isBg ? "Изпрати" : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        )
      )}
    </div>
  );
}
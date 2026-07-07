import { useLocation } from "wouter";
import MainLayout from "@/components/MainLayout";
import { ChevronLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PrivacyPage() {
  const [, navigate] = useLocation();
  const { language } = useLanguage();
  const isBg = language === "bg";

  return (
    <MainLayout showFooter>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/")} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{isBg ? "Политика за поверителност" : "Privacy Policy"}</h1>
        </div>
        <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
          <p className="text-xs text-gray-400 mb-6">
            {isBg ? "Политика за поверителност и бисквитки на Трашит ЕООД" : "Privacy and Cookie Policy of Trashit Ltd."}
          </p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "I. Въведение" : "I. Introduction"}</h2>
          <p>{isBg
            ? "Настоящата Политика описва начина, по който „Трашит" ЕООД събира, обработва, съхранява и защитава личните данни на потребителите на мобилното приложение Trashit и уеб платформата www.trashit.bg."
            : "This Policy describes how Trashit Ltd. collects, processes, stores and protects the personal data of users of the Trashit mobile application and web platform www.trashit.bg."}</p>
          <p>{isBg
            ? "Политиката е изготвена в съответствие с Регламент (ЕС) 2016/679 (GDPR), Закона за защита на личните данни и приложимото законодателство."
            : "This Policy is prepared in accordance with Regulation (EU) 2016/679 (GDPR), the Personal Data Protection Act and applicable legislation."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "II. Администратор на лични данни" : "II. Data Controller"}</h2>
          <p>{isBg
            ? "Администратор е „Трашит" ЕООД. За въпроси, свързани с обработването на лични данни, можете да се свържете с нас на:"
            : "The data controller is Trashit Ltd. For questions regarding the processing of personal data, please contact us at:"} <a href="mailto:support@trashit.bg" className="text-primary">support@trashit.bg</a></p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "III. Какви лични данни се събират" : "III. What Personal Data We Collect"}</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>{isBg ? "Име и фамилия" : "Full name"}</li>
            <li>{isBg ? "Телефонен номер" : "Phone number"}</li>
            <li>{isBg ? "Имейл адрес" : "Email address"}</li>
            <li>{isBg ? "Адрес на услугата" : "Service address"}</li>
            <li>{isBg ? "Данни за подадени заявки (вид услуга, снимки на отпадъка)" : "Request data (service type, waste photos)"}</li>
            <li>{isBg ? "Данни за местоположение (GPS) — само при изрично активиране" : "Location data (GPS) — only upon explicit activation"}</li>
            <li>{isBg ? "Данни за фактуриране (при поискана фактура на юридическо лице)" : "Billing data (when an invoice for a legal entity is requested)"}</li>
            <li>{isBg ? "Технически данни (IP адрес, устройство, логове) — само за сигурност" : "Technical data (IP address, device, logs) — for security purposes only"}</li>
          </ul>
          <p>{isBg
            ? "Дружеството не съхранява данни за платежни карти — те се обработват от Stripe."
            : "The Company does not store payment card data — it is processed by Stripe."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "IV. Цели и правни основания" : "IV. Purposes and Legal Bases"}</h2>
          <p>{isBg
            ? "Личните данни се обработват за: създаване и поддържане на профил, изпълнение на заявени услуги, комуникация относно заявки, издаване на фактури, сигурност на Платформата и защита на законните интереси на Дружеството."
            : "Personal data is processed for: creating and maintaining a profile, performing requested services, communication regarding requests, issuing invoices, Platform security and protecting the Company's legitimate interests."}</p>
          <p>{isBg
            ? "Правните основания са: изпълнение на договор, законово задължение и легитимен интерес съгласно чл. 6 GDPR."
            : "Legal bases are: performance of a contract, legal obligation and legitimate interest pursuant to Art. 6 GDPR."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "V. Срокове на съхранение" : "V. Retention Periods"}</h2>
          <p>{isBg
            ? "Личните данни се съхраняват за периода на активен профил и до 5 години след последно ползване на услуга. Счетоводни документи — 10 години. Технически логове — до 6 месеца."
            : "Personal data is retained for the duration of the active profile and up to 5 years after the last use of the service. Accounting documents — 10 years. Technical logs — up to 6 months."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "VI. Получатели на лични данни" : "VI. Recipients of Personal Data"}</h2>
          <p>{isBg
            ? "Данни могат да се предоставят на: доставчици на платежни услуги (Stripe), доставчици на хостинг и ИТ услуги, подизпълнители за услугата, счетоводни и правни консултанти, компетентни държавни органи при законово изискване."
            : "Data may be shared with: payment service providers (Stripe), hosting and IT service providers, service subcontractors, accounting and legal advisors, competent authorities when required by law."}</p>
          <p>{isBg
            ? "Дружеството не продава лични данни на трети лица и не ги прехвърля извън ЕС/ЕИП."
            : "The Company does not sell personal data to third parties and does not transfer it outside the EU/EEA."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "VII. Права на субектите на данни" : "VII. Data Subject Rights"}</h2>
          <p>{isBg
            ? "Всеки потребител има право на: достъп до данните си, коригиране, изтриване, ограничаване на обработването, преносимост, възражение и оттегляне на съгласие."
            : "Every user has the right to: access their data, rectification, erasure, restriction of processing, portability, objection and withdrawal of consent."}</p>
          <p>{isBg
            ? "Правата се упражняват чрез писмено искане на support@trashit.bg. Дружеството отговаря в срок до един месец."
            : "Rights are exercised by written request to support@trashit.bg. The Company responds within one month."}</p>
          <p>{isBg
            ? "Всеки потребител може да подаде жалба до КЗЛД (www.cpdp.bg)."
            : "Every user may file a complaint with the Commission for Personal Data Protection (www.cpdp.bg)."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "VIII. Сигурност" : "VIII. Security"}</h2>
          <p>{isBg
            ? "Дружеството прилага технически и организационни мерки за защита на данните, включително криптиране (HTTPS/TLS) и контрол на достъпа. Плащанията се обработват от Stripe при стандарт PCI DSS."
            : "The Company applies technical and organizational data protection measures, including encryption (HTTPS/TLS) and access control. Payments are processed by Stripe under the PCI DSS standard."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "IX. Бисквитки (Cookies)" : "IX. Cookies"}</h2>
          <p>{isBg
            ? "Платформата използва само технически необходими бисквитки (сесия, удостоверяване, сигурност). Понастоящем не се използват аналитични или маркетингови бисквитки. При въвеждане на такива ще бъдете уведомени предварително."
            : "The Platform uses only technically necessary cookies (session, authentication, security). No analytical or marketing cookies are currently used. You will be notified in advance if such are introduced."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "X. Промени в Политиката" : "X. Changes to this Policy"}</h2>
          <p>{isBg
            ? "Дружеството може да актуализира Политиката. Актуалната версия е винаги достъпна в Платформата."
            : "The Company may update this Policy. The current version is always available on the Platform."}</p>

          <div className="mt-8 p-4 bg-gray-50 rounded-xl text-xs text-gray-500">
            {isBg ? "За въпроси относно личните данни: " : "For data protection questions: "}<a href="mailto:support@trashit.bg" className="text-primary">support@trashit.bg</a>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
import { useLocation } from "wouter";
import MainLayout from "@/components/MainLayout";
import { ChevronLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function RefundPage() {
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
          <h1 className="text-2xl font-bold text-gray-900">{isBg ? "Политика за възстановяване на суми" : "Refund Policy"}</h1>
        </div>
        <div className="prose prose-sm max-w-none text-gray-700 space-y-4">

          <h2 className="text-lg font-bold mt-6">{isBg ? "1. Общи положения" : "1. General"}</h2>
          <p>{isBg
            ? "Настоящата Политика урежда условията, при които „Трашит" ЕООД възстановява суми, заплатени чрез мобилното приложение и уеб платформата Trashit. Политиката е неразделна част от Общите условия."
            : "This Policy governs the conditions under which Trashit Ltd. refunds amounts paid through the Trashit mobile application and web platform. This Policy is an integral part of the Terms & Conditions."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "2. Кога може да бъде възстановена сума" : "2. When a Refund May Be Issued"}</h2>
          <p>{isBg ? "Дружеството възстановява изцяло или частично заплатени суми в следните случаи:" : "The Company refunds amounts in full or in part in the following cases:"}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{isBg ? "Услугата не може да бъде изпълнена по причина, за която Дружеството отговаря" : "The service cannot be performed due to a reason attributable to the Company"}</li>
            <li>{isBg ? "Заявката е отменена при условията на Общите условия" : "The request has been cancelled under the Terms & Conditions"}</li>
            <li>{isBg ? "Потребителят е упражнил валидно правото си на отказ по ЗЗП" : "The user has validly exercised their right of withdrawal under consumer protection law"}</li>
            <li>{isBg ? "Рекламацията е уважена" : "A complaint has been upheld"}</li>
            <li>{isBg ? "Установено е надплащане или техническа грешка при плащането" : "An overpayment or technical payment error has been identified"}</li>
          </ul>

          <h2 className="text-lg font-bold mt-6">{isBg ? "3. Кога суми не се възстановяват" : "3. When Refunds Are Not Issued"}</h2>
          <p>{isBg ? "Дружеството не възстановява платени суми, когато:" : "The Company does not refund paid amounts when:"}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{isBg ? "Услугата не е извършена по причина, за която Клиентът отговаря" : "The service was not performed due to a reason attributable to the Client"}</li>
            <li>{isBg ? "Клиентът не е осигурил безопасен и безпрепятствен достъп до адреса" : "The Client did not provide safe and unobstructed access to the address"}</li>
            <li>{isBg ? "Предоставените снимки или информация са неверни, непълни или подвеждащи" : "The provided photos or information were false, incomplete or misleading"}</li>
            <li>{isBg ? "Отпадъците не съответстват на заявените или съдържат забранени материали" : "The waste does not match what was requested or contains prohibited materials"}</li>
            <li>{isBg ? "Клиентът е отказал изпълнение след започване на услугата" : "The Client refused performance after the service had begun"}</li>
            <li>{isBg ? "Правото на отказ е изключено съгласно приложимото законодателство" : "The right of withdrawal is excluded under applicable law"}</li>
            <li>{isBg ? "Искането представлява злоупотреба с право" : "The request constitutes an abuse of right"}</li>
          </ul>

          <h2 className="text-lg font-bold mt-6">{isBg ? "4. Право на отказ" : "4. Right of Withdrawal"}</h2>
          <p>{isBg
            ? "Когато потребителят има право да се откаже от договора по ЗЗП и упражни това право законосъобразно, Дружеството възстановява всички суми, подлежащи на възстановяване."
            : "When the user has the right to withdraw from the contract under consumer protection law and exercises this right lawfully, the Company refunds all amounts subject to refund."}</p>
          <p>{isBg
            ? "Когато по изрично искане на потребителя изпълнението е започнало преди срока за отказ, потребителят заплаща стойността на реално извършената до момента част от услугата."
            : "When, at the user's explicit request, performance began before the withdrawal period, the user pays for the portion of the service actually performed."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "5. Начин на възстановяване" : "5. Refund Method"}</h2>
          <p>{isBg
            ? "Възстановяването се извършва по същия платежен метод, използван при плащането, освен ако потребителят изрично не е поискал друг начин."
            : "Refunds are made via the same payment method used for the original payment, unless the user has explicitly requested otherwise."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "6. Срок за възстановяване" : "6. Refund Timeline"}</h2>
          <p>{isBg
            ? "При наличие на основание, Дружеството извършва възстановяването без неоправдано забавяне и не по-късно от 14 дни от възникване на задължението."
            : "When grounds exist, the Company processes the refund without undue delay and no later than 14 days from when the obligation arose."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "7. Проверка на искането" : "7. Verification"}</h2>
          <p>{isBg
            ? "Преди възстановяване Дружеството има право да извърши проверка и да изиска допълнителни документи: номер на заявката, информация за плащането, снимки, кореспонденция."
            : "Before processing a refund, the Company may conduct a review and request additional documents: request number, payment information, photos, correspondence."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "8. Злоупотреби" : "8. Abuse"}</h2>
          <p>{isBg
            ? "Дружеството си запазва правото да откаже възстановяване, когато искането противоречи на закона, Общите условия, представлява измама или е подадено въз основа на неверни данни."
            : "The Company reserves the right to refuse a refund when the request violates the law, the Terms & Conditions, constitutes fraud or is submitted on the basis of false information."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "9. Платежен оператор" : "9. Payment Processor"}</h2>
          <p>{isBg
            ? "Плащанията се обработват от Stripe. След одобряване на възстановяването Дружеството подава заявка към Stripe. Действителният срок за постъпване на сумата зависи от обслужващата банка и е извън контрола на Дружеството."
            : "Payments are processed by Stripe. Upon approval of the refund, the Company submits a request to Stripe. The actual time for the funds to appear depends on the issuing bank and is beyond the Company's control."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "10. Оспорване на картови плащания (Chargebacks)" : "10. Chargebacks"}</h2>
          <p>{isBg
            ? "При получаване на chargeback Дружеството има право да предостави на платежния оператор всички доказателства за изпълнение на услугата (снимки, GPS данни, логове, кореспонденция и др.)."
            : "Upon receiving a chargeback, the Company may provide the payment processor with all evidence of service performance (photos, GPS data, logs, correspondence, etc.)."}</p>
          <p>{isBg
            ? "При системни или очевидно неоснователни искания Дружеството може да ограничи достъпа до Платформата."
            : "In cases of systematic or clearly unfounded requests, the Company may restrict access to the Platform."}</p>

          <div className="mt-8 p-4 bg-gray-50 rounded-xl text-xs text-gray-500">
            {isBg ? "За въпроси относно възстановяване на суми: " : "For refund questions: "}<a href="mailto:support@trashit.bg" className="text-primary">support@trashit.bg</a>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
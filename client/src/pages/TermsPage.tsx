import { useLocation } from "wouter";
import MainLayout from "@/components/MainLayout";
import { ChevronLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TermsPage() {
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
          <h1 className="text-2xl font-bold text-gray-900">{isBg ? "Общи условия" : "Terms & Conditions"}</h1>
        </div>
        <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
          <p className="text-xs text-gray-400 mb-6">
            {isBg
              ? "За използване на мобилно приложение и уебсайт за заявяване на услуги по извозване на отпадъци"
              : "For use of the mobile application and website for waste collection services"}
          </p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "1. Общи разпоредби" : "1. General Provisions"}</h2>
          <p>{isBg
            ? "Настоящите Общи условия уреждат отношенията между „Трашит\u201C ЕООД, ЕИК 208887008, със седалище и адрес на управление: гр. София, жк. Дружба, бл. 309, вх. В, ап. 66, ет. 4, представлявано от управителя Орлин Христов Александров, и всяко лице, което използва мобилното приложение Trashit или уеб платформата [www.trashit.bg](https://www.trashit.bg) за заявяване на услуги по извозване на отпадъци."
            : "These Terms & Conditions govern the relationship between Trashit EOOD, EIK 208887008, registered at Sofia, Druzhba, Bl. 309, Entr. V, Apt. 66, Fl. 4, represented by Orlin Hristov Alexandrov, and any person using the Trashit mobile application or web platform [www.trashit.bg](https://www.trashit.bg) for waste collection services."}</p>
          <p>{isBg
            ? "Чрез регистрация и/или използване на Платформата Потребителят декларира, че е запознат с настоящите Общи условия, приема ги и се съгласява да ги спазва безусловно."
            : "By registering and/or using the Platform, the User declares that they have read these Terms, accept them and agree to comply with them unconditionally."}</p>
          <p>{isBg
            ? "Услугите се предоставят само на територията на населените места, в които Дружеството официално е обявило, че оперира. Към момента — гр. София."
            : "Services are provided only in locations where the Company has officially announced operations. Currently — Sofia, Bulgaria."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "2. Видове услуги" : "2. Types of Services"}</h2>
          <p><strong>{isBg ? "2.1. Извозване на битов отпадък" : "2.1. Household Waste Collection"}</strong> — {isBg
            ? "Един запечатан чувал до 3 кг и 40–45 л, от входната врата до контейнерите. Заявява се с Кредит или Абонамент."
            : "One sealed bag up to 3 kg and 40–45 L, from your door to the bins. Ordered with a Credit or Subscription."}</p>
          <p><strong>{isBg ? "2.2. Разделно събиране" : "2.2. Recycling Collection"}</strong> — {isBg
            ? "До 3 чувала до 4 кг общо, разделени по вид отпадък."
            : "Up to 3 bags up to 4 kg total, sorted by waste type."}</p>
          <p><strong>{isBg ? "2.3. Нестандартен битов отпадък" : "2.3. Non-standard Waste"}</strong> — {isBg
            ? "Едрогабаритни предмети (мебели, електроуреди и др.). Изисква снимка и индивидуална оферта."
            : "Bulky items (furniture, appliances, etc.). Requires a photo and individual quote."}</p>
          <p><strong>{isBg ? "2.4. Строителен отпадък" : "2.4. Construction Waste"}</strong> — {isBg
            ? "Строителни отпадъци при ремонт/разрушаване. Изисква снимка и индивидуална оферта."
            : "Construction waste from renovation/demolition. Requires a photo and individual quote."}</p>
          <p><strong>{isBg ? "2.5. Изключени отпадъци" : "2.5. Excluded Waste"}</strong> — {isBg
            ? "Платформата не приема: течни отпадъци, органични отпадъци от животински произход, опасни вещества (лекарства, химикали, азбест, радиоактивни материали и др.)."
            : "The Platform does not accept: liquid waste, organic waste of animal origin, hazardous substances (medicines, chemicals, asbestos, radioactive materials, etc.)."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "3. Регистрация и профил" : "3. Registration and Profile"}</h2>
          <p>{isBg
            ? "За използване на услугите е необходима регистрация. Регистрацията е безплатна. При регистрацията се предоставят: имена, телефон, имейл и адрес за услугата."
            : "Registration is required to use the services. Registration is free. The following data is required: name, phone, email and service address."}</p>
          <p>{isBg
            ? "Потребителят декларира, че всички предоставени данни са верни и актуални, и се задължава да ги актуализира при промяна."
            : "The User declares that all provided data is accurate and up to date, and undertakes to update it upon any change."}</p>
          <p>{isBg
            ? "Всеки потребител може да има само един активен профил. Дружеството има право да откаже или закрие профил при нарушение на ОУ, неверни данни или злоупотреба."
            : "Each user may have only one active profile. The Company reserves the right to refuse or close a profile for violation of these Terms, false data or abuse."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "4. Цени и плащане" : "4. Prices and Payment"}</h2>
          <p>{isBg
            ? "Цените са публикувани в Платформата и включват ДДС, когато е приложимо. Плащанията се извършват чрез Stripe. Приемат се банкови карти; в брой не се приема."
            : "Prices are published in the Platform and include VAT where applicable. Payments are processed via Stripe. Bank cards accepted; cash is not accepted."}</p>
          <p>{isBg
            ? "Дружеството не обработва и не съхранява данни за банкови карти. Кредитите не могат да се прехвърлят, обменят срещу пари или използват извън Платформата."
            : "The Company does not process or store bank card data. Credits cannot be transferred, exchanged for cash, or used outside the Platform."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "5. Отказ и възстановяване на суми" : "5. Cancellation and Refunds"}</h2>
          <p>{isBg
            ? "До сключването на договора заявката може да бъде оттеглена безплатно. Дружеството възстановява суми при: невъзможност за изпълнение по негова вина, надлежно упражнено право на отказ по ЗЗП, уважена рекламация или техническа грешка."
            : "Prior to contract conclusion, the request may be withdrawn free of charge. The Company refunds in cases of: inability to perform due to its fault, lawfully exercised right of withdrawal, upheld complaint or technical error."}</p>
          <p>{isBg
            ? "Суми не се възстановяват, когато услугата не е извършена по причина на Клиента, при неосигурен достъп или несъответствие на отпадъците."
            : "No refund is issued when the service was not performed due to the Client's fault, lack of access, or waste discrepancy."}</p>
          <p>{isBg
            ? "Възстановяването се извършва по същия платежен метод в срок до 14 дни."
            : "Refunds are made via the same payment method within 14 days."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "6. Задължения на Потребителя" : "6. User Obligations"}</h2>
          <p>{isBg
            ? "Потребителят е длъжен да: предоставя точна информация; осигурява свободен и безопасен достъп до адреса; подготви отпадъците съгласно изискванията; не предоставя забранени отпадъци; не отправя обиди или заплахи към служители."
            : "The User must: provide accurate information; ensure free and safe access to the address; prepare waste according to requirements; not provide prohibited waste; not make offensive or threatening statements to staff."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "7. Ограничение на отговорността" : "7. Limitation of Liability"}</h2>
          <p>{isBg
            ? "Дружеството не носи отговорност при неизпълнение поради: неверни данни от Потребителя, неосигурен достъп, форсмажор или действия на трети лица. Отговорността за конкретна заявка не може да надвишава платената цена за услугата."
            : "The Company is not liable for non-performance due to: false data from the User, lack of access, force majeure or third-party actions. Liability for a specific request cannot exceed the price paid for the service."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "8. Рекламации" : "8. Complaints"}</h2>
          <p>{isBg
            ? "Рекламацията се подава чрез Платформата или на support@trashit.bg в срок до 14 дни от установяване на несъответствието."
            : "Complaints must be submitted via the Platform or at support@trashit.bg within 14 days of discovering the issue."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "9. Лични данни" : "9. Personal Data"}</h2>
          <p>{isBg
            ? "Дружеството обработва лични данни съгласно Политиката за поверителност, достъпна в Платформата."
            : "The Company processes personal data in accordance with the Privacy Policy available on the Platform."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "10. Изменение на Общите условия" : "10. Amendments"}</h2>
          <p>{isBg
            ? "Дружеството може да изменя настоящите ОУ. Промените влизат в сила от публикуването им. Продължаващото използване на Платформата означава съгласие с тях."
            : "The Company may amend these Terms. Changes take effect upon publication. Continued use of the Platform constitutes acceptance."}</p>

          <h2 className="text-lg font-bold mt-6">{isBg ? "11. Приложимо право" : "11. Governing Law"}</h2>
          <p>{isBg
            ? "Настоящите ОУ се уреждат от българското законодателство. Спорове се решават от компетентния български съд или чрез извънсъдебни способи."
            : "These Terms are governed by Bulgarian law. Disputes shall be resolved by the competent Bulgarian court or through alternative dispute resolution."}</p>

          <div className="mt-8 p-4 bg-gray-50 rounded-xl text-xs text-gray-500">
            {isBg ? "За въпроси: " : "For questions: "}<a href="mailto:support@trashit.bg" className="text-primary">support@trashit.bg</a>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
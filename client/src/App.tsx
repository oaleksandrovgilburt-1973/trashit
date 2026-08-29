import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Home from "./pages/Home";
import WasteDisposal from "./pages/WasteDisposal";
import Cleaning from "./pages/Cleaning";
import WorkerPortal from "./pages/WorkerPortal";
import WorkerLogin from "./pages/WorkerLogin";
import WorkerAssignments from "@/pages/WorkerAssignments";
import AdminPortal from "./pages/AdminPortal";
import AdminLogin from "./pages/AdminLogin";
import SubAdminPortal from "./pages/SubAdminPortal";
import PartnerPortal from "./pages/PartnerPortal";
import AdminLoginSecondary from "./pages/AdminLoginSecondary";
import ClientAuth from "./pages/ClientAuth";
import UserProfile from "./pages/UserProfile";
import MyRequests from "./pages/MyRequests";
import WorkerRequests from "./pages/WorkerRequests";
import Credits from "./pages/Credits";
import Subscription from "./pages/Subscription";
import TermsPage from "./pages/TermsPage";
import DownloadPage from "@/pages/DownloadPage";
import PrivacyPage from "./pages/PrivacyPage";
import RefundPage from "./pages/RefundPage";
import { UpdateBanner } from "./components/UpdateBanner";
import { FCMProvider } from "./components/FCMProvider";
import { usePWA } from "./hooks/usePWA";

function Router() {
  return (
    <Switch>
      {/* Main */}
      <Route path="/" component={Home} />
      <Route path="/waste-disposal" component={WasteDisposal} />
      <Route path="/cleaning" component={Cleaning} />

      {/* Client auth */}
      <Route path="/auth" component={ClientAuth} />
      <Route path="/profile" component={UserProfile} />
      <Route path="/my-requests" component={MyRequests} />
      <Route path="/credits" component={Credits} />
      <Route path="/credits/success" component={Credits} />
      <Route path="/subscription" component={Subscription} />

      {/* Worker */}
      <Route path="/worker/login" component={WorkerLogin} />
      <Route path="/worker" component={WorkerPortal} />
      <Route path="/worker/requests" component={WorkerRequests} />
      <Route path="/worker/assignments" component={WorkerAssignments} />

      {/* Admin */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminPortal} />
      <Route path="/subadmin" component={SubAdminPortal} />
      <Route path="/partner" component={PartnerPortal} />
      <Route path="/admin/login2" component={AdminLoginSecondary} />

      {/* Legal */}
      <Route path="/download" component={DownloadPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/refund" component={RefundPage} />

      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  const { updateAvailable, triggerUpdate } = usePWA();
  return (
    <>
      <FCMProvider>
        <Router />
      </FCMProvider>
      {/*updateAvailable && <UpdateBanner onUpdate={triggerUpdate} />*/}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <TooltipProvider>
            <Toaster position="top-center" richColors />
            <AppInner />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

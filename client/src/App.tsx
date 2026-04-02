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
import AdminPortal from "./pages/AdminPortal";
import AdminLogin from "./pages/AdminLogin";
import ClientAuth from "./pages/ClientAuth";
import UserProfile from "./pages/UserProfile";
import MyRequests from "./pages/MyRequests";
import WorkerRequests from "./pages/WorkerRequests";
import Credits from "./pages/Credits";
import PWAInstallBanner from "./components/PWAInstallBanner";

import { FCMProvider } from "./components/FCMProvider";

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

      {/* Worker */}
      <Route path="/worker/login" component={WorkerLogin} />
      <Route path="/worker" component={WorkerPortal} />
      <Route path="/worker/requests" component={WorkerRequests} />

      {/* Admin */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminPortal} />

      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  return (
    <FCMProvider>
      <Router />
    </FCMProvider>
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

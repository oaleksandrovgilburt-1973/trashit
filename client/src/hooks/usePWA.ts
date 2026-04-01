import { useState, useEffect, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    // Check if running as installed PWA
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Register service worker and set up update detection
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[SW] Registered:", reg.scope);

          // Poll for updates every 60 seconds
          setInterval(() => {
            reg.update().catch(() => {});
          }, 60 * 1000);

          /**
           * A real update is available ONLY when:
           * 1. There is a waiting SW (new version downloaded)
           * 2. There is an active controller (current SW is running — not first install)
           *
           * Without condition 2, the banner would show on first install when
           * the new SW transitions from installing → installed but there is no
           * old SW to replace.
           */
          const checkWaiting = (r: ServiceWorkerRegistration) => {
            if (r.waiting && navigator.serviceWorker.controller) {
              console.log("[SW] Update available — waiting worker detected");
              waitingWorkerRef.current = r.waiting;
              setUpdateAvailable(true);
            }
          };

          // Check immediately (in case SW was already waiting before this page load)
          checkWaiting(reg);

          // When a new SW is found installing
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed") {
                checkWaiting(reg);
              }
            });
          });
        })
        .catch((err) => {
          console.warn("[SW] Registration failed:", err);
        });

      // When the controller changes (new SW took over), reload the page
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        console.log("[SW] New version activated — reloading");
        window.location.reload();
      });
    }

    // Listen for install prompt (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for app installed
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return false;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setInstallPrompt(null);
    }
    return outcome === "accepted";
  };

  /**
   * Tell the waiting SW to take over.
   * Immediately hides the banner so it doesn't flash while the page reloads.
   */
  const triggerUpdate = () => {
    // Hide banner immediately
    setUpdateAvailable(false);
    if (waitingWorkerRef.current) {
      waitingWorkerRef.current.postMessage({ type: "SKIP_WAITING" });
      waitingWorkerRef.current = null;
    } else {
      // Fallback: just reload
      window.location.reload();
    }
  };

  const canInstall = !isStandalone && !isInstalled && (!!installPrompt || isIOS);

  return { canInstall, isIOS, isStandalone, isInstalled, promptInstall, updateAvailable, triggerUpdate };
}

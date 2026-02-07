import {
  createElement,
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { BeforeInstallPromptEvent } from "./types";

type PWAInstallContextValue = {
  isInstalled: boolean;
  canInstall: boolean;
  promptInstall: () => Promise<void>;
};

const PWAInstallContext = createContext<PWAInstallContextValue | undefined>(
  undefined,
);

function usePWAInstallState(): PWAInstallContextValue {
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;
      const isIOSStandalone =
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkInstalled();
    const media = window.matchMedia("(display-mode: standalone)");
    const handleChange = () => checkInstalled();
    media.addEventListener?.("change", handleChange);
    window.addEventListener("appinstalled", checkInstalled);

    return () => {
      media.removeEventListener?.("change", handleChange);
      window.removeEventListener("appinstalled", checkInstalled);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setCanInstall(false);
  };

  return {
    isInstalled,
    canInstall,
    promptInstall,
  };
}

export function PWAInstallProvider({ children }: { children: ReactNode }) {
  const value = usePWAInstallState();
  return createElement(PWAInstallContext.Provider, { value }, children);
}

export function usePWAInstall() {
  const context = useContext(PWAInstallContext);
  if (!context) {
    throw new Error("usePWAInstall must be used inside PWAInstallProvider.");
  }
  return context;
}

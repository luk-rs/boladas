import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_PULL_THRESHOLD_PX = 110;

function isScrollableElement(element: Element) {
  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  const canScrollY =
    overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
  return canScrollY && element.scrollHeight > element.clientHeight + 1;
}

function resolveScrollTarget(target: EventTarget | null) {
  let node = target instanceof Element ? target : null;
  while (node) {
    if (isScrollableElement(node)) {
      return node as HTMLElement;
    }
    node = node.parentElement;
  }

  return (document.scrollingElement as HTMLElement | null) ?? null;
}

export function useGlobalInstalledPullToRefresh(
  thresholdPx = DEFAULT_PULL_THRESHOLD_PX,
) {
  const pullStartYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const pullEligibleRef = useRef(false);
  const refreshPendingRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isStandaloneMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    const isDisplayStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ?? false;
    const isIOSStandalone =
      (
        window.navigator as Navigator & {
          standalone?: boolean;
        }
      ).standalone === true;
    return isDisplayStandalone || isIOSStandalone;
  }, []);

  useEffect(() => {
    if (!isStandaloneMode) return;

    const resetPullState = () => {
      pullStartYRef.current = null;
      pullDistanceRef.current = 0;
      pullEligibleRef.current = false;
      setPullDistance(0);
    };

    const refreshInstalledApp = async () => {
      if (refreshPendingRef.current) return;
      refreshPendingRef.current = true;
      setIsRefreshing(true);

      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations.map(async (registration) => {
              await registration.update();
              registration.waiting?.postMessage({ type: "SKIP_WAITING" });
            }),
          );
        }
      } catch {
        // Ignore update check failures and still force a reload.
      } finally {
        window.location.reload();
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      if (refreshPendingRef.current) return;

      const touch = event.touches[0];
      if (!touch) return;

      const scrollTarget = resolveScrollTarget(event.target);
      const isAtTop = scrollTarget ? scrollTarget.scrollTop <= 0 : window.scrollY <= 0;

      pullEligibleRef.current = isAtTop;
      pullStartYRef.current = touch.clientY;
      pullDistanceRef.current = 0;
      setPullDistance(0);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pullEligibleRef.current || pullStartYRef.current === null) return;

      const touch = event.touches[0];
      if (!touch) return;

      const delta = touch.clientY - pullStartYRef.current;
      pullDistanceRef.current = Math.max(delta, 0);
      setPullDistance(pullDistanceRef.current);
    };

    const onTouchEnd = () => {
      const shouldRefresh =
        pullEligibleRef.current && pullDistanceRef.current >= thresholdPx;
      resetPullState();
      if (shouldRefresh) {
        void refreshInstalledApp();
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
      resetPullState();
      setIsRefreshing(false);
    };
  }, [isStandaloneMode, thresholdPx]);

  const progress = Math.min(pullDistance / thresholdPx, 1);
  const isArmed = pullDistance >= thresholdPx;
  const shouldShowIndicator = isStandaloneMode && (pullDistance > 8 || isRefreshing);

  return {
    isStandaloneMode,
    pullDistance,
    progress,
    isArmed,
    isRefreshing,
    shouldShowIndicator,
  };
}

import { useCallback, useMemo, useRef, type RefObject, type TouchEvent } from "react";

const DEFAULT_PULL_THRESHOLD_PX = 110;

export function useInstalledPullToRefresh(
  scrollContainerRef: RefObject<HTMLElement>,
  thresholdPx = DEFAULT_PULL_THRESHOLD_PX,
) {
  const pullStartYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const pullEligibleRef = useRef(false);
  const refreshPendingRef = useRef(false);

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

  const resetPullState = useCallback(() => {
    pullStartYRef.current = null;
    pullDistanceRef.current = 0;
    pullEligibleRef.current = false;
  }, []);

  const refreshInstalledApp = useCallback(async () => {
    if (refreshPendingRef.current) return;
    refreshPendingRef.current = true;

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
  }, []);

  const onTouchStart = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (!isStandaloneMode || refreshPendingRef.current) return;

      const touch = event.touches[0];
      if (!touch) return;

      const scroller = scrollContainerRef.current;
      const isAtTop = scroller ? scroller.scrollTop <= 0 : window.scrollY <= 0;

      pullEligibleRef.current = isAtTop;
      pullStartYRef.current = touch.clientY;
      pullDistanceRef.current = 0;
    },
    [isStandaloneMode, scrollContainerRef],
  );

  const onTouchMove = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (!isStandaloneMode) return;
      if (!pullEligibleRef.current || pullStartYRef.current === null) return;

      const touch = event.touches[0];
      if (!touch) return;

      const delta = touch.clientY - pullStartYRef.current;
      pullDistanceRef.current = Math.max(delta, 0);
    },
    [isStandaloneMode],
  );

  const onTouchEnd = useCallback(() => {
    if (!isStandaloneMode) {
      resetPullState();
      return;
    }

    const shouldRefresh =
      pullEligibleRef.current && pullDistanceRef.current >= thresholdPx;
    resetPullState();
    if (shouldRefresh) {
      void refreshInstalledApp();
    }
  }, [isStandaloneMode, refreshInstalledApp, resetPullState, thresholdPx]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: onTouchEnd,
  };
}

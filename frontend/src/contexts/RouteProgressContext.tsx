"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type RouteProgressContextValue = {
  complete: () => void;
  fail: () => void;
  start: (options?: { minDurationMs?: number }) => void;
};

const RouteProgressContext = createContext<RouteProgressContextValue | null>(null);

function isInternalNavigationTarget(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.getAttribute("rel")?.includes("external")) return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;

  const current = new URL(window.location.href);
  return url.pathname + url.search + url.hash !== current.pathname + current.search + current.hash;
}

export function RouteProgressProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const completionTimerRef = useRef<number | null>(null);
  const minDurationMsRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);

  const clearCompletionTimer = useCallback(() => {
    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
  }, []);

  const start = useCallback((options?: { minDurationMs?: number }) => {
    clearCompletionTimer();
    minDurationMsRef.current = options?.minDurationMs ?? 0;
    startedAtRef.current = Date.now();
    setIsCompleting(false);
    setIsActive(true);
  }, [clearCompletionTimer]);

  const complete = useCallback(() => {
    const startedAt = startedAtRef.current;
    const elapsed = startedAt ? Date.now() - startedAt : 0;
    const remaining = Math.max(0, minDurationMsRef.current - elapsed);

    clearCompletionTimer();
    completionTimerRef.current = window.setTimeout(() => {
      setIsActive(true);
      setIsCompleting(true);
      completionTimerRef.current = window.setTimeout(() => {
        setIsActive(false);
        setIsCompleting(false);
        completionTimerRef.current = null;
        minDurationMsRef.current = 0;
        startedAtRef.current = null;
      }, 320);
    }, remaining);
  }, [clearCompletionTimer]);

  const fail = useCallback(() => {
    clearCompletionTimer();
    setIsActive(false);
    setIsCompleting(false);
    minDurationMsRef.current = 0;
    startedAtRef.current = null;
  }, [clearCompletionTimer]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isInternalNavigationTarget(anchor)) return;

      start();
    }

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [start]);

  useEffect(() => {
    if (isActive && !isCompleting) {
      complete();
    }
  }, [pathname, isActive, isCompleting, complete]);

  useEffect(() => {
    return () => {
      clearCompletionTimer();
    };
  }, [clearCompletionTimer]);

  const value = useMemo(
    () => ({
      complete,
      fail,
      start,
    }),
    [complete, fail, start],
  );

  return (
    <RouteProgressContext.Provider value={value}>
      <div className="fixed inset-x-0 top-0 z-[120] h-[3px] pointer-events-none">
        {isActive ? (
          <div className="relative h-full overflow-hidden bg-[#E8D8AE]/65">
            <div
              className={`absolute inset-y-0 rounded-full bg-[#C9A65B] ${
                isCompleting
                  ? "route-progress-bar-complete"
                  : "route-progress-bar-indeterminate"
              }`}
            />
          </div>
        ) : null}
      </div>
      {children}
      <style jsx global>{`
        @keyframes route-progress-bar-indeterminate {
          0% {
            transform: translateX(-112%);
            width: 24%;
          }
          50% {
            transform: translateX(120%);
            width: 38%;
          }
          100% {
            transform: translateX(340%);
            width: 20%;
          }
        }

        .route-progress-bar-indeterminate {
          animation: route-progress-bar-indeterminate 1.2s ease-in-out infinite;
        }

        @keyframes route-progress-bar-complete {
          0% {
            left: 0;
            width: 34%;
          }
          100% {
            left: 0;
            width: 100%;
          }
        }

        .route-progress-bar-complete {
          animation: route-progress-bar-complete 0.3s ease-out forwards;
        }
      `}</style>
    </RouteProgressContext.Provider>
  );
}

export function useRouteProgress() {
  const context = useContext(RouteProgressContext);
  if (!context) {
    throw new Error("useRouteProgress must be used within RouteProgressProvider");
  }

  return context;
}

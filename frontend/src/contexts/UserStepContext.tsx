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

import {
  canAccessUserRoute,
  getNextUnlockedUserRoute,
} from "@/lib/user-step";
import {
  subscribeToAuthStateChange,
  getCurrentSession,
  refreshCurrentSession,
} from "@/lib/auth";

type UserStepContextValue = {
  currentStep: number;
  isLoading: boolean;
  refreshCurrentStep: () => Promise<number>;
  canAccessPath: (pathname: string) => boolean;
  nextUnlockedPath: string;
};

const UserStepContext = createContext<UserStepContextValue | null>(null);

type UserStepProviderProps = {
  children: ReactNode;
};

function extractStepFromSession(
  session: Awaited<ReturnType<typeof getCurrentSession>>,
) {
  const rawStep = session?.user.user_metadata?.current_step;

  if (typeof rawStep === "number" && Number.isFinite(rawStep)) {
    return rawStep;
  }

  if (typeof rawStep === "string") {
    const parsed = Number(rawStep);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

export function UserStepProvider({ children }: UserStepProviderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);

  const refreshCurrentStep = useCallback(async () => {
    const refreshedSession = await refreshCurrentSession();
    const nextStep = extractStepFromSession(refreshedSession);
    setCurrentStep(nextStep);
    setIsLoading(false);
    return nextStep;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function syncCurrentStep() {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      try {
        const session = await getCurrentSession();

        if (!mounted || requestIdRef.current !== requestId) return;

        const role = session?.user.user_metadata?.role;
        if (role !== "buyer" && role !== "seller") {
          setCurrentStep(0);
          setIsLoading(false);
          return;
        }

        setCurrentStep(extractStepFromSession(session));
      } catch (error) {
        console.error("Failed to sync current step from session:", error);
        if (!mounted || requestIdRef.current !== requestId) return;
        setCurrentStep(0);
      } finally {
        if (mounted && requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    }

    void syncCurrentStep();

    const unsubscribe = subscribeToAuthStateChange((session) => {
      const role = session?.user.user_metadata?.role;

      if (role !== "buyer" && role !== "seller") {
        setCurrentStep(0);
        setIsLoading(false);
        return;
      }

      setCurrentStep(extractStepFromSession(session));
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<UserStepContextValue>(
    () => ({
      currentStep,
      isLoading,
      refreshCurrentStep,
      canAccessPath: (pathname: string) =>
        canAccessUserRoute(pathname, currentStep),
      nextUnlockedPath: getNextUnlockedUserRoute(currentStep),
    }),
    [currentStep, isLoading, refreshCurrentStep],
  );

  return (
    <UserStepContext.Provider value={value}>
      {children}
    </UserStepContext.Provider>
  );
}

export function useUserStep() {
  const context = useContext(UserStepContext);

  if (!context) {
    throw new Error("useUserStep must be used within UserStepProvider");
  }

  return context;
}
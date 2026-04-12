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
import { subscribeToAuthStateChange, getCurrentSession } from "@/lib/auth";
import { getCurrentUserStep } from "@/service/users.service";

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

export function UserStepProvider({ children }: UserStepProviderProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);
  const hasResolvedInitialStepRef = useRef(false);

  const refreshCurrentStep = useCallback(async () => {
    const step = await getCurrentUserStep();
    setCurrentStep(step);
    setIsLoading(false);
    return step;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function syncCurrentStep() {
      const session = await getCurrentSession();

      if (!mounted) return;

      const role = session?.user.user_metadata?.role;
      if (role !== "buyer" && role !== "seller") {
        setCurrentStep(1);
        setIsLoading(false);
        hasResolvedInitialStepRef.current = true;
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const isInitialLoad = !hasResolvedInitialStepRef.current;

      if (isInitialLoad) {
        setIsLoading(true);
      }

      try {
        const nextStep = await getCurrentUserStep();
        if (!mounted || requestIdRef.current !== requestId) return;
        setCurrentStep(nextStep);
        hasResolvedInitialStepRef.current = true;
      } catch (error) {
        console.error("Failed to fetch current step:", error);
        if (!mounted || requestIdRef.current !== requestId) return;
        if (isInitialLoad) {
          setCurrentStep(1);
          hasResolvedInitialStepRef.current = true;
        }
      } finally {
        if (mounted && requestIdRef.current === requestId && isInitialLoad) {
          setIsLoading(false);
        }
      }
    }

    void syncCurrentStep();

    const unsubscribe = subscribeToAuthStateChange(() => {
      void syncCurrentStep();
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
      canAccessPath: (pathname: string) => canAccessUserRoute(pathname, currentStep),
      nextUnlockedPath: getNextUnlockedUserRoute(currentStep),
    }),
    [currentStep, isLoading, refreshCurrentStep],
  );

  return (
    <UserStepContext.Provider value={value}>{children}</UserStepContext.Provider>
  );
}

export function useUserStep() {
  const context = useContext(UserStepContext);

  if (!context) {
    throw new Error("useUserStep must be used within UserStepProvider");
  }

  return context;
}

"use client";

export const USER_STEP_ROUTES = {
  agreement: "/agreement",
  depositFees: "/deposit-fees",
} as const;

export const USER_STEP_ROUTE_REQUIREMENTS = [
  { href: USER_STEP_ROUTES.agreement, minStep: 1 },
  { href: USER_STEP_ROUTES.depositFees, minStep: 2 },
] as const;

export function normalizeCurrentStep(step: number | null | undefined) {
  if (step == null || Number.isNaN(step)) {
    return 1;
  }

  return Math.max(1, Math.trunc(step));
}

export function canAccessUserRoute(pathname: string, currentStep: number) {
  const route = USER_STEP_ROUTE_REQUIREMENTS.find(({ href }) => href === pathname);
  if (!route) {
    return true;
  }

  return currentStep >= route.minStep;
}

export function isRouteUnlockedForStep(href: string, currentStep: number) {
  return canAccessUserRoute(href, currentStep);
}

export function isRouteCompletedForStep(href: string, currentStep: number) {
  const route = USER_STEP_ROUTE_REQUIREMENTS.find((item) => item.href === href);
  if (!route) {
    return false;
  }

  return currentStep > route.minStep;
}

export function getNextUnlockedUserRoute(currentStep: number) {
  const nextRoute = USER_STEP_ROUTE_REQUIREMENTS.find(
    ({ minStep }) => currentStep <= minStep,
  );

  return nextRoute?.href ?? USER_STEP_ROUTES.depositFees;
}

import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { apiRequest } from "./api";

export type AuthStateListener = (
  session: Session | null
) => void | Promise<void>;

/** Returns an unsubscribe function. All auth reads/writes should go through this module when possible. */
export function subscribeToAuthStateChange(callback: AuthStateListener) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
    await callback(nextSession);
  });

  return () => {
    subscription.unsubscribe();
  };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export async function getAccessToken() {
  const session = await getCurrentSession();
  return session?.access_token ?? null;
}

export async function requestPasswordReset(email: string) {
  await apiRequest("/users/forgot-password", {
    method: "POST",
    body: { email },
    authenticated: false
  });
}

export async function updateAuthenticatedUserPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw new Error(error.message);
  }

  const session = await getCurrentSession();

  const passwordChanged =
    session?.user?.app_metadata?.password_changed === true;

  if (!passwordChanged) {
    await apiRequest("/users/me/password-changed", {
      method: "POST",
    });

    await refreshCurrentSession();
  }
}

export async function refreshCurrentSession() {
  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    throw error;
  }

  return data.session;
}
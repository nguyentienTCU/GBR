import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

export type AuthStateListener = (session: Session | null) => void | Promise<void>;

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

export async function getCurrentUser() {
  const token = await getAccessToken();

  if (!token) {
    throw new Error("No access token found");
  }

  const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/users/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch current user");
  }

  const user = await res.json();
  return user;
}

export async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session?.access_token ?? null;
}

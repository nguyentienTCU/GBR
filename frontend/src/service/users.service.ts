import { apiRequest } from "@/lib/api";
import type {
  CreateUserPayload,
  CreateUserResponse,
  UpdateUserPayload,
  User,
} from "@/types/user";

export function getCurrentUserProfile() {
  return apiRequest<User>("/users/me");
}

export async function getCurrentUserStep() {
  const response = await apiRequest<{ step: number}>(
    "/users/current-step",
  );

  return response.step;
}

export function updateCurrentUserProfile(payload: UpdateUserPayload) {
  return apiRequest<User>("/users/me", {
    method: "PATCH",
    body: payload,
  });
}

export function getUsers() {
  return apiRequest<User[]>("/users");
}

export function createUser(payload: CreateUserPayload) {
  return apiRequest<CreateUserResponse>("/users", {
    method: "POST",
    body: payload,
  });
}

export function getUserById(userId: string) {
  return apiRequest<User>(`/users/${userId}`);
}

export function updateUserById(userId: string, payload: UpdateUserPayload) {
  return apiRequest<User>(`/users/${userId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function resendVerificationEmail(userId: string) {
  return apiRequest<{ message: string; user_id: string; email: string }>(
    `/users/${userId}/send-verification`,
    {
      method: "POST",
    }
  );
}

export function sendReminderEmail(userId: string) {
  return apiRequest<{ message: string; user_id: string; email: string }>(
    `/users/${userId}/send-reminder`,
    {
      method: "POST",
    },
  );
}
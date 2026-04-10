export type UserRole = "admin" | "mod" | "buyer" | "seller";

export type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  role: UserRole;
  current_step: number | null;
  company_name: string | null;
  email_verified: boolean;
};

export type CreateUserPayload = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: UserRole;
  company_name: string;
};

export type UpdateUserPayload = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  company_name?: string;
};

export type CreateUserResponse = {
  message: string;
  user_id: string;
  created_by: string;
};
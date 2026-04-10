"use client";

import { useState } from "react";
import { Building2, Mail, Phone, User, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Notification } from "@/components/ui/Notification";
import { createUser } from "@/service/users.service";
import type { CreateUserPayload, UserRole } from "@/types/user";

const initialFormData: CreateUserPayload = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  role: "buyer",
  company_name: "",
};

const roleOptions: { label: string; value: UserRole }[] = [
  { label: "Admin", value: "admin" },
  { label: "Moderator", value: "mod" },
  { label: "Buyer", value: "buyer" },
  { label: "Seller", value: "seller" },
];

const createFieldLabels: Record<
  keyof Pick<
    CreateUserPayload,
    "first_name" | "last_name" | "email" | "phone_number" | "company_name"
  >,
  string
> = {
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  phone_number: "Phone number",
  company_name: "Company name",
};

function trimCreateUserPayload(data: CreateUserPayload): CreateUserPayload {
  return {
    ...data,
    first_name: data.first_name.trim(),
    last_name: data.last_name.trim(),
    email: data.email.trim(),
    phone_number: data.phone_number.trim(),
    company_name: data.company_name.trim(),
  };
}

function validateCreateUserPayload(data: CreateUserPayload): string | null {
  const missing: string[] = [];

  (Object.keys(createFieldLabels) as (keyof typeof createFieldLabels)[]).forEach(
    (key) => {
      if (!data[key]) missing.push(createFieldLabels[key]);
    },
  );

  if (!data.role) missing.push("Role");
  if (missing.length === 0) return null;

  return "Please fill in all fields.";
}

type FormFieldProps = {
  id: keyof CreateUserPayload;
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ComponentType<{ className?: string }>;
};

function FormField({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  icon: Icon,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-[#142B57]"
      >
        {label}
      </label>
      <div className="flex h-13 items-center rounded-xl border border-[#c8d2e3] bg-white px-4 shadow-sm">
        <Icon className="mr-3 h-5 w-5 text-[#8ea0bd]" />
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent text-base text-[#142B57] outline-none placeholder:text-[#8ea0bd]"
        />
      </div>
    </div>
  );
}

export default function CreateUserForm() {
  const [formData, setFormData] = useState<CreateUserPayload>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function updateField<Key extends keyof CreateUserPayload>(
    field: Key,
    value: CreateUserPayload[Key],
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const trimmed = trimCreateUserPayload(formData);
    setFormData(trimmed);

    const validationError = validateCreateUserPayload(trimmed);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      await createUser(trimmed);
      setSuccessMessage(
        "User created successfully. A temporary password and verification email have been sent.",
      );
      setFormData(initialFormData);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create user.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_18px_40px_rgba(8,22,50,0.08)]">
      {errorMessage ? (
        <Notification
          open
          variant="error"
          message={errorMessage}
          onClose={() => setErrorMessage("")}
        />
      ) : null}

      {successMessage ? (
        <Notification
          open
          variant="success"
          message={successMessage}
          onClose={() => setSuccessMessage("")}
        />
      ) : null}

      <div className="relative overflow-hidden bg-[#071633] px-5 py-6 text-white sm:px-8 sm:py-8">
        <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-white/10 sm:h-28 sm:w-28" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C9A65B] text-[#071633] sm:h-14 sm:w-14">
            <UserPlus className="h-7 w-7" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Create User
            </h1>
            <p className="mt-1 text-sm text-white/85">
              Add a new account for admin, moderator, buyer, or seller access.
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              id="first_name"
              label="First Name"
              placeholder="Enter first name"
              value={formData.first_name}
              onChange={(value) => updateField("first_name", value)}
              icon={User}
            />

            <FormField
              id="last_name"
              label="Last Name"
              placeholder="Enter last name"
              value={formData.last_name}
              onChange={(value) => updateField("last_name", value)}
              icon={User}
            />

            <FormField
              id="email"
              label="Email"
              type="email"
              placeholder="user@company.com"
              value={formData.email}
              onChange={(value) => updateField("email", value)}
              icon={Mail}
            />

            <FormField
              id="phone_number"
              label="Phone Number"
              placeholder="Enter phone number"
              value={formData.phone_number}
              onChange={(value) => updateField("phone_number", value)}
              icon={Phone}
            />

            <div>
              <label
                htmlFor="role"
                className="mb-2 block text-sm font-medium text-[#142B57]"
              >
                Role
              </label>
              <div className="flex h-13 items-center rounded-xl border border-[#c8d2e3] bg-white px-4 shadow-sm">
                <UserPlus className="mr-3 h-5 w-5 text-[#8ea0bd]" />
                <select
                  id="role"
                  value={formData.role}
                  onChange={(event) =>
                    updateField("role", event.target.value as UserRole)
                  }
                  className="w-full bg-transparent text-base text-[#142B57] outline-none"
                >
                  {roleOptions.map((roleOption) => (
                    <option key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <FormField
              id="company_name"
              label="Company Name"
              placeholder="Enter company name"
              value={formData.company_name}
              onChange={(value) => updateField("company_name", value)}
              icon={Building2}
            />
          </div>

          <div className="flex justify-stretch sm:justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? "Creating user..." : "Create User"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
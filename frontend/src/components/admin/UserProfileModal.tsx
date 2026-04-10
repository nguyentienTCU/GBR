"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Notification,
  type NotificationVariant,
} from "@/components/ui/Notification";
import { updateUserById } from "@/service/users.service";
import type { UpdateUserPayload, User } from "@/types/user";

type UpdateUserProfileModalProps = {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onUpdated: (updatedUser: User) => void;
};

type EditableField =
  | "first_name"
  | "last_name"
  | "phone_number"
  | "company_name";

type EditableForm = Record<EditableField, string>;

const FIELD_LABELS: Record<EditableField, string> = {
  first_name: "First name",
  last_name: "Last name",
  phone_number: "Phone number",
  company_name: "Company name",
};

const editableFields: EditableField[] = [
  "first_name",
  "last_name",
  "phone_number",
  "company_name",
];

function formFromUser(user: User): EditableForm {
  return {
    first_name: user.first_name,
    last_name: user.last_name,
    phone_number: user.phone_number ?? "",
    company_name: user.company_name ?? "",
  };
}

function trimEditableForm(form: EditableForm): EditableForm {
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    phone_number: form.phone_number.trim(),
    company_name: form.company_name.trim(),
  };
}

function validateProfileEditableForm(form: EditableForm): string | null {
  const t = trimEditableForm(form);
  const missing = editableFields
    .filter((key) => !t[key])
    .map((key) => FIELD_LABELS[key]);

  if (missing.length === 0) return null;
  return "Please fill in all fields.";
}

function buildUpdatePayload(saved: User, form: EditableForm): UpdateUserPayload {
  const trimmed = trimEditableForm(form);
  const payload: UpdateUserPayload = {};
  const baseline = trimEditableForm(formFromUser(saved));

  editableFields.forEach((key) => {
    if (trimmed[key] !== baseline[key]) {
      payload[key] = trimmed[key];
    }
  });

  return payload;
}

export default function UpdateUserProfileModal({
  open,
  user,
  onClose,
  onUpdated,
}: UpdateUserProfileModalProps) {
  const [savedUser, setSavedUser] = useState<User | null>(null);
  const [form, setForm] = useState<EditableForm | null>(null);
  const [editing, setEditing] = useState<Record<EditableField, boolean>>(() =>
    Object.fromEntries(editableFields.map((k) => [k, false])) as Record<
      EditableField,
      boolean
    >,
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{
    variant: NotificationVariant;
    message: string;
  } | null>(null);

  const resetEditing = useCallback(() => {
    setEditing(
      Object.fromEntries(editableFields.map((k) => [k, false])) as Record<
        EditableField,
        boolean
      >,
    );
  }, []);

  const handleClose = useCallback(() => {
    setNotice(null);
    resetEditing();
    onClose();
  }, [onClose, resetEditing]);

  useEffect(() => {
    if (!open || !user) return;

    setSavedUser(user);
    setForm(formFromUser(user));
    resetEditing();
    setNotice(null);
  }, [open, user, resetEditing]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  const dirty = useMemo(() => {
    if (!savedUser || !form) return false;
    const baseline = trimEditableForm(formFromUser(savedUser));
    const trimmed = trimEditableForm(form);

    return editableFields.some((k) => trimmed[k] !== baseline[k]);
  }, [savedUser, form]);

  function updateFormField(field: EditableField, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function toggleFieldEdit(field: EditableField) {
    setEditing((prev) => {
      const wasEditing = prev[field];

      if (wasEditing && savedUser) {
        setForm((currentForm) =>
          currentForm
            ? { ...currentForm, [field]: formFromUser(savedUser)[field] }
            : currentForm,
        );
      }

      return { ...prev, [field]: !wasEditing };
    });
  }

  async function handleSave() {
    if (!savedUser || !form) return;

    const trimmed = trimEditableForm(form);
    setForm(trimmed);

    const validationError = validateProfileEditableForm(trimmed);
    if (validationError) {
      setNotice({ variant: "error", message: validationError });
      return;
    }

    const payload = buildUpdatePayload(savedUser, trimmed);

    if (Object.keys(payload).length === 0) {
      resetEditing();
      return;
    }

    setSaving(true);

    try {
      const updated = await updateUserById(savedUser.id, payload);
      setSavedUser(updated);
      setForm(formFromUser(updated));
      resetEditing();
      onUpdated(updated);

      setNotice({
        variant: "success",
        message: "User profile was updated successfully.",
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to update user profile.";

      setNotice({
        variant: "error",
        message:
          message
            .toLowerCase()
            .includes("failed to update auth user: error updating user")
            ? "Phone number already existed"
            : message,
      });
    } finally {
      setSaving(false);
    }
  }

  if (!open || !savedUser || !form) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {notice ? (
        <Notification
          open
          variant={notice.variant}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      ) : null}

      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-[#071633]/50 backdrop-blur-[2px]"
        aria-label="Close update user profile dialog"
        onClick={handleClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-user-profile-modal-title"
        className="relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_18px_40px_rgba(8,22,50,0.15)]"
      >
        <div className="border-b border-[#e8ecf4] px-6 py-5">
          <h2
            id="update-user-profile-modal-title"
            className="text-xl font-semibold tracking-tight text-[#071633]"
          >
            Update user profile
          </h2>
          <p className="mt-1 text-sm text-[#5f7396]">
            Edit this user’s first name, last name, phone number, and company
            name.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            {editableFields.map((field) => {
              const isEditing = editing[field];
              const inputValue = isEditing ? form[field] : form[field] || "—";

              return (
                <div key={field}>
                  <label
                    htmlFor={`update-user-profile-${field}`}
                    className="mb-2 block text-sm font-medium text-[#142B57]"
                  >
                    {FIELD_LABELS[field]}
                  </label>

                  <div
                    className={`flex h-13 items-center gap-2 rounded-xl border px-3 transition-[background-color,backdrop-filter,box-shadow] sm:px-4 ${
                      isEditing
                        ? "border-[#c8d2e3] bg-white shadow-sm backdrop-blur-0"
                        : "border-[#d4dce8] bg-[#e8edf5]/75 shadow-none backdrop-blur-sm"
                    }`}
                  >
                    <input
                      id={`update-user-profile-${field}`}
                      readOnly={!isEditing}
                      type="text"
                      value={inputValue}
                      onChange={(e) => updateFormField(field, e.target.value)}
                      className={`min-w-0 flex-1 bg-transparent text-base text-[#142B57] outline-none ${
                        !isEditing ? "cursor-default" : ""
                      }`}
                      autoComplete={field === "phone_number" ? "tel" : "off"}
                    />

                    <button
                      type="button"
                      onClick={() => toggleFieldEdit(field)}
                      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg"
                      aria-label={
                        isEditing
                          ? `Stop editing ${FIELD_LABELS[field]}`
                          : `Edit ${FIELD_LABELS[field]}`
                      }
                    >
                      <Pencil
                        className="h-4 w-4 shrink-0"
                        strokeWidth={2}
                        stroke={isEditing ? "#142B57" : "#ffffff"}
                        fill={isEditing ? "#ffffff" : "#142B57"}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#e8ecf4] px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="inverse"
            className="w-full sm:w-auto"
            onClick={handleClose}
          >
            Cancel
          </Button>

          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={saving || !dirty}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
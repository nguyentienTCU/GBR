"use client";

import { apiRequest } from "@/lib/api";

export type CreateInvoicePayload = {
  amount: number;
  txn_date?: string;
  due_date?: string;
  customer_memo?: string;
  private_note?: string;
};

export type CreateInvoiceResponse = {
  customer_id: string;
  invoice_id: string;
  bill_email: string;
  email_sent: boolean;
  send_result: Record<string, unknown>;
  invoice: Record<string, unknown>;
};

export async function createInvoice(
  payload: CreateInvoicePayload,
): Promise<CreateInvoiceResponse> {
  return apiRequest<CreateInvoiceResponse>("/quickbooks/invoices", {
    method: "POST",
    body: payload,
  });
}

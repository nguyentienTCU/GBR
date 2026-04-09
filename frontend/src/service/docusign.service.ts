import { apiRequest } from "@/lib/api";

export type CreateRecipientViewPayload = {
  return_url: string;
  user_id?: string;
};

export type CreateRecipientViewResponse = {
  contract_id: string;
  envelope_id: string;
  envelope_status: string;
  signing_url: string;
};

export async function createRecipientView(
  payload: CreateRecipientViewPayload,
) : Promise<CreateRecipientViewResponse> {
  return apiRequest<CreateRecipientViewResponse>("/docusign/recipient-view", {
    method: "POST",
    body: payload,
  });
}

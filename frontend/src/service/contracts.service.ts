import { apiBlobRequest } from "@/lib/api";

export async function getMySignedContractPdf(): Promise<Blob> {
  return apiBlobRequest("/contracts/me/signed-file");
}

export async function getSignedContractPdf(): Promise<Blob> {
  return getMySignedContractPdf();
}

export async function getUserSignedContractPdf(userId: string): Promise<Blob> {
  return apiBlobRequest(`/contracts/users/${encodeURIComponent(userId)}/signed-file`);
}

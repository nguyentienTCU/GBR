import { getAccessToken } from "@/lib/auth";

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  authenticated?: boolean;
};

function getApiBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  return apiUrl.replace(/\/+$/, "");
}

async function buildHeaders(
  options: ApiRequestOptions,
  body: unknown,
): Promise<HeadersInit> {
  const headers = new Headers(options.headers);

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.authenticated ?? true) {
    const token = await getAccessToken();

    if (!token) {
      throw new Error("No access token found");
    }

    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

async function getErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { detail?: string };
    if (typeof data.detail === "string" && data.detail.length > 0) {
      return data.detail;
    }
  } catch {}

  return `Request failed with status ${response.status}`;
}

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const { body, ...requestInit } = options;
  const headers = await buildHeaders(options, body);
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...requestInit,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

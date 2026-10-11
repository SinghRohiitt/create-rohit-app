const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

export interface ApiRequestOptions extends RequestInit {
  readonly query?: Readonly<Record<string, string | number | boolean>>;
}

function buildUrl(path: string, query?: ApiRequestOptions["query"]): string {
  const baseUrl = new URL(apiBaseUrl);
  const basePath = baseUrl.pathname.replace(/\/+$/, "");
  const requestPath = path.replace(/^\/+/, "");
  baseUrl.pathname = `${basePath}/${requestPath}`;

  for (const [key, value] of Object.entries(query ?? {})) {
    baseUrl.searchParams.set(key, String(value));
  }

  return baseUrl.toString();
}

async function request<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { query, headers, ...init } = options;
  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers: {
      Accept: "application/json",
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `API request failed (${response.status} ${response.statusText}).`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body: unknown, options?: ApiRequestOptions) =>
    request<T>(path, {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: JSON.stringify(body),
    }),
  put: <T>(path: string, body: unknown, options?: ApiRequestOptions) =>
    request<T>(path, {
      ...options,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: JSON.stringify(body),
    }),
  delete: (path: string, options?: ApiRequestOptions) =>
    request<void>(path, { ...options, method: "DELETE" }),
};

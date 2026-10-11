import { getAccessToken } from "./auth";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "/api";

function buildUrl(path, query) {
  const baseUrl = new URL(apiBaseUrl, window.location.origin);
  const basePath = baseUrl.pathname.replace(/\/+$/, "");
  const requestPath = path.replace(/^\/+/, "");
  baseUrl.pathname = `${basePath}/${requestPath}`;

  for (const [key, value] of Object.entries(query ?? {})) {
    baseUrl.searchParams.set(key, String(value));
  }

  return baseUrl.toString();
}

async function request(path, options = {}) {
  const { query, headers, ...init } = options;
  const token = getAccessToken();
  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `API request failed (${response.status} ${response.statusText}).`,
    );
  }

  if (response.status === 204) {
    return undefined;
  }

  return response.json();
}

export const api = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) =>
    request(path, {
      ...options,
      method: "POST",
      headers: { "Content-Type": "application/json", ...options?.headers },
      body: JSON.stringify(body),
    }),
  put: (path, body, options) =>
    request(path, {
      ...options,
      method: "PUT",
      headers: { "Content-Type": "application/json", ...options?.headers },
      body: JSON.stringify(body),
    }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
};

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "/api";

function buildUrl(path, query) {
  const url = new URL(apiBaseUrl, window.location.origin);
  const basePath = url.pathname.replace(/\/+$/, "");
  const requestPath = path.replace(/^\/+/, "");
  url.pathname = `${basePath}/${requestPath}`;

  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function request(path, options = {}) {
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

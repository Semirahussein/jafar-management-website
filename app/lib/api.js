export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function createApiError(body, status) {
  return new ApiError(
    body?.detail || body?.message || body?.error || `Request failed (${status})`,
    status,
    body
  );
}

export function createApiClient() {
  async function api(path, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const csrf = typeof document === "undefined"
      ? null
      : document.cookie.split("; ").find(cookie => cookie.startsWith("XSRF-TOKEN="))?.slice("XSRF-TOKEN=".length);
    const response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(!["GET", "HEAD", "OPTIONS"].includes(method) && csrf ? { "X-XSRF-TOKEN": decodeURIComponent(csrf) } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const error = createApiError(body, response.status);
      if (response.status === 401 && !["/auth/login", "/auth/me", "/auth/csrf"].includes(path) && typeof window !== "undefined") {
        window.dispatchEvent(new Event("jafar:session-expired"));
      }
      throw error;
    }
    if (response.status === 204) return null;
    return response.json();
  }
  api.download = async function download(path, fallbackName) {
    const csrf = typeof document === "undefined"
      ? null
      : document.cookie.split("; ").find(cookie => cookie.startsWith("XSRF-TOKEN="))?.slice("XSRF-TOKEN=".length);
    const response = await fetch(`/api${path}`, {
      headers: { Accept: "application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ...(csrf ? { "X-XSRF-TOKEN": decodeURIComponent(csrf) } : {}) },
      credentials: "same-origin", cache: "no-store",
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const error = createApiError(body, response.status);
      if (response.status === 401 && typeof window !== "undefined") window.dispatchEvent(new Event("jafar:session-expired"));
      throw error;
    }
    const blob = await response.blob();
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = response.headers.get("Content-Disposition")?.match(/filename="?([^";]+)"?/i)?.[1] || fallbackName;
    document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };
  return api;
}

const sessionApi = createApiClient();

export function apiRequest(path, options = {}) {
  if (typeof path !== "string" || !path.startsWith("/api/")) {
    throw new TypeError("API paths must start with /api/.");
  }
  const { auth: _legacyAuth, ...requestOptions } = options;
  return sessionApi(path.slice("/api".length), requestOptions);
}

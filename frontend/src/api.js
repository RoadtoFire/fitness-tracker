const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8123";
const TOKEN_KEY = "fittrack_token";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  setToken(null);
  window.location.hash = "#/login";
}

function buildUrl(path, params) {
  let url = `${BASE_URL}${path}`;
  if (params) {
    const cleaned = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const qs = new URLSearchParams(cleaned).toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

export async function apiFetch(path, { method = "GET", body, params, raw = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Token ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(buildUrl(path, params), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    logout();
    throw new ApiError("Not authenticated", 401, null);
  }

  if (raw) {
    if (!response.ok) throw new ApiError("Request failed", response.status, null);
    return response;
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.non_field_errors?.[0] ||
      (typeof data === "object" && data ? Object.values(data).flat()[0] : null) ||
      "Something went wrong.";
    throw new ApiError(message, response.status, data);
  }
  return data;
}

/** Unwraps DRF's paginated {results: [...]} shape, or returns the array as-is. */
export async function apiList(path, params) {
  const data = await apiFetch(path, { params });
  return data?.results ?? data ?? [];
}

export async function login(username, password) {
  const data = await apiFetch("/api/auth/token/", {
    method: "POST",
    body: { username, password },
  });
  setToken(data.token);
}

export async function downloadDailyExport(date) {
  const response = await apiFetch(`/api/daily/${date}/export/`, { raw: true });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fitness-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

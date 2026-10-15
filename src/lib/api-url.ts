const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") ?? "";

export function apiUrl(path: `/api/${string}`): string {
  return `${API_BASE_URL}${path}`;
}

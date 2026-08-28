// Centralized API Configuration - No Hardcoded URLs
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "") || "http://127.0.0.1:8080";
export const AI_API_URL = (process.env.NEXT_PUBLIC_AI_API_URL || "").replace(/\/+$/, "") || "http://127.0.0.1:8000";

export function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getUserEmail(): string {
  return typeof window !== "undefined" ? localStorage.getItem("email") || "" : "";
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers });
}

export function logout(navigate: (path: string) => void) {
  if (typeof window !== "undefined") {
    localStorage.clear();
    document.cookie = "auth_token=; path=/; max-age=0; SameSite=Strict";
    navigate("/auth/login");
  }
}

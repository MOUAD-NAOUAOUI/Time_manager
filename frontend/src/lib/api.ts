// Centralized API Configuration
// All requests go through Next.js /api/* reverse proxy → backend.
// This ensures the auth_token cookie is set on localhost:3000 (same origin),
// so the middleware can read it for route protection.
export const API_URL = "/api";
export const AI_API_URL = "/aiapi";

/**
 * Returns headers for authenticated API requests.
 * The JWT token is delivered via httpOnly cookie (automatically sent by browser).
 */
export function getAuthHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
  };
}

/**
 * Returns the user's email from localStorage.
 * Email is NOT sensitive and is used for query params like ?email=...
 */
export function getUserEmail(): string {
  return typeof window !== "undefined" ? localStorage.getItem("email") || "" : "";
}

/**
 * Wrapper around fetch that includes auth headers and handles network errors.
 * The JWT token is automatically sent via httpOnly cookie.
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };
  try {
    return await fetch(url, { ...options, headers, credentials: "include" });
  } catch (error) {
    console.warn(`[fetchWithAuth] Request to ${url} failed:`, error);
    return new Response(JSON.stringify({ error: "Network request failed" }), {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Logs out the user: calls the backend /auth/logout endpoint (which revokes the
 * JWT and clears the httpOnly cookie), then clears client-side email from localStorage.
 */
export async function logout(navigate: (path: string) => void) {
  if (typeof window !== "undefined") {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.warn("Logout backend call failed:", error);
    }
    localStorage.removeItem("email");
    navigate("/auth/login");
  }
}

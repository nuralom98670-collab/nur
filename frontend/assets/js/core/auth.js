import { CONFIG } from "./config.js";
import { api, adminApi } from "./api.js";

// ----- Token helpers (Customer) -----
export function setToken(token) {
  if (!token) return;
  localStorage.setItem(CONFIG.TOKEN_KEY, token);
}
export function getToken() {
  return localStorage.getItem(CONFIG.TOKEN_KEY);
}
export function clearToken() {
  localStorage.removeItem(CONFIG.TOKEN_KEY);
}

// ----- Token helpers (Admin) -----
export function setAdminToken(token) {
  if (!token) return;
  localStorage.setItem(CONFIG.ADMIN_TOKEN_KEY, token);
}
export function getAdminToken() {
  return localStorage.getItem(CONFIG.ADMIN_TOKEN_KEY);
}
export function clearAdminToken() {
  localStorage.removeItem(CONFIG.ADMIN_TOKEN_KEY);
}

function go(url) {
  try { location.href = url; } catch { /* ignore */ }
}

// Redirects to login if no CUSTOMER token exists; validates token in backend
export async function requireAuth({ redirectTo = "./login" } = {}) {
  const token = getToken();
  if (!token) {
    go(redirectTo);
    return;
  }
  try {
    await api.get("/auth/me");
  } catch {
    clearToken();
    go(redirectTo);
  }
}

// Redirects to admin login if no ADMIN token exists; validates token + role
export async function requireAdmin({ redirectTo = "./login.html" } = {}) {
  const token = getAdminToken();
  if (!token) {
    go(redirectTo);
    return;
  }

  try {
    const me = await adminApi.get("/auth/me");
    if (me?.role !== "admin") {
      clearAdminToken();
      go(redirectTo);
    }
  } catch {
    clearAdminToken();
    go(redirectTo);
  }
}

// Returns current logged-in CUSTOMER user (from /api/auth/me)
export async function getCurrentUser() {
  return await api.get("/auth/me");
}

export async function getCurrentAdmin() {
  return await adminApi.get("/auth/me");
}

export function logout({ redirectTo = "./login" } = {}) {
  // Clear both local token and server cookie session.
  clearToken();
  try { api.post("/auth/logout", {}); } catch {}
  go(redirectTo);
}

export function adminLogout({ redirectTo = "./login.html" } = {}) {
  clearAdminToken();
  go(redirectTo);
}

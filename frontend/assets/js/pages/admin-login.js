// /assets/js/pages/admin-login.js
import { adminApi as api } from "../core/api.js";
import { CONFIG } from "../core/config.js";
import { setAdminToken, clearAdminToken } from "../core/auth.js";

const form = document.getElementById("loginForm");
const statusEl = document.getElementById("loginStatus");

// If a token exists, verify it with /auth/me.
// This prevents the "auto login" problem when an old/invalid token is stored.
(async () => {
  const existing = localStorage.getItem(CONFIG.ADMIN_TOKEN_KEY);
  if (!existing) return;

  try {
    const me = await api.get("/auth/me");
    if (me?.role === "admin") {
      location.href = "./dashboard";
    } else {
      clearAdminToken();
    }
  } catch {
    // Invalid/expired token -> clear and stay on login page.
    clearAdminToken();
  }
})();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "Signing in...";

  const email = form.email.value.trim();
  const password = form.password.value;

  try {
    const data = await api.post("/auth/login", { email, password });

    if (!data?.token) throw new Error("Token missing from server response");

    setAdminToken(data.token);

    const me = await api.get("/auth/me");
    if (me?.role !== "admin") {
      clearAdminToken();
      throw new Error("Admin only");
    }

    statusEl.textContent = "Success! Redirecting...";
    location.href = "./dashboard";
  } catch (err) {
    const msg = err?.message || String(err);

    statusEl.textContent = `Login failed: ${msg}`;
  }
});

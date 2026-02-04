// /assets/js/core/ui.js
import { logout, adminLogout, getCurrentUser, getCurrentAdmin } from "./auth.js";
import { api, adminApi } from "./api.js";

function isAdminPage() {
  try { return location.pathname.includes("/admin"); } catch { return false; }
}

export async function renderUserbox() {
  const box = document.querySelector("[data-userbox]");
  if (!box) return;

  try {
    const me = isAdminPage() ? await getCurrentAdmin() : await getCurrentUser();
    const name = me?.name || me?.email || "User";
    box.textContent = name;
  } catch {
    box.textContent = "—";
  }
}

export function bindLogout() {
  const btn = document.querySelector("[data-logout]");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (isAdminPage()) adminLogout({ redirectTo: "./login.html" });
    else logout({ redirectTo: "./login" });
  });
}

export function setActiveNav() {
  const navItems = Array.from(document.querySelectorAll("[data-nav]"));
  const p = location.pathname;
  navItems.forEach(i => {
    i.classList.toggle("active", p.includes(i.dataset.nav));
  });
}

export async function refreshNotifications() {
  const el = document.querySelector("[data-notify-count]");
  if (!el) return;

  try {
    const client = isAdminPage() ? adminApi : api;
    const path = isAdminPage() ? "/admin/notifications/count" : "/account/notifications/unread-count";
    const data = await client.get(path);
    el.textContent = String(data?.count ?? 0);
  } catch {
    el.textContent = "0";
  }
}

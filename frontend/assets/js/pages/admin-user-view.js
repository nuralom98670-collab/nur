import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav, refreshNotifications } from "../core/ui.js";

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();
refreshNotifications();

const id = new URLSearchParams(location.search).get('id');
const badge = document.getElementById('userIdBadge');
const nameVal = document.getElementById('nameVal');
const emailVal = document.getElementById('emailVal');
const statsVal = document.getElementById('statsVal');
const ordersJson = document.getElementById('ordersJson');
const statusMsg = document.getElementById('statusMsg');

async function load(){
  if(!id){ statusMsg.textContent='Missing id'; return; }
  badge.textContent = String(id).slice(-6);
  try{ const u = await api.get(`/admin/users/${encodeURIComponent(id)}`);
    nameVal.textContent = u.name || '—';
    emailVal.textContent = u.email || '—';
    const st = u.stats || {};
    statsVal.textContent = `Orders: ${st.totalOrders||0} • Spent: $${Number(st.totalSpent||0).toFixed(2)} • Last: ${st.lastOrderAt?new Date(st.lastOrderAt).toLocaleString():'—'}`;
    ordersJson.textContent = JSON.stringify(u.orders || [], null, 2);
    statusMsg.textContent='';
  }catch(e){ statusMsg.textContent=e?.message||String(e); }
}

load();

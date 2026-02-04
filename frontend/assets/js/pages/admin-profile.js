import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav, refreshNotifications } from "../core/ui.js";

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();
refreshNotifications();

const form = document.getElementById('profileForm');
const statusEl = document.getElementById('status');

async function load(){
  statusEl.textContent='Loading…';
  try{ const me = await api.get('/auth/me');
    form.name.value = me?.user?.name || '';
    form.email.value = me?.user?.email || '';
    statusEl.textContent='';
  }catch(e){ statusEl.textContent=e?.message||String(e); }
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  statusEl.textContent='Updating…';
  const data = Object.fromEntries(new FormData(form).entries());
  try{ await api.put('/auth/me', data);
    statusEl.textContent='Updated ✅';
  }catch(e){ statusEl.textContent=e?.message||String(e); }
});

load();

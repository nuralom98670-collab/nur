import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav, refreshNotifications } from "../core/ui.js";

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();
refreshNotifications();

const form = document.getElementById('tagForm');
const statusEl = document.getElementById('status');
const badge = document.getElementById('tagIdBadge');
const id = new URLSearchParams(location.search).get('id');
if(!id){ statusEl.textContent='Missing id'; form.querySelectorAll('input,button').forEach(el=>el.disabled=true); }
else{
  badge.textContent = String(id).slice(-6);
  (async ()=>{
    try{ const t = await api.get(`/admin/tags/${encodeURIComponent(id)}`);
      form.name.value=t.name||''; form.slug.value=t.slug||'';
    }catch(e){ statusEl.textContent=e?.message||String(e); }
  })();
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    statusEl.textContent='Updating…';
    const data = Object.fromEntries(new FormData(form).entries());
    try{ await api.put(`/admin/tags/${encodeURIComponent(id)}`, data); statusEl.textContent='Updated ✅'; location.href='./tags'; }
    catch(err){ statusEl.textContent=err?.message||String(err); }
  });
}

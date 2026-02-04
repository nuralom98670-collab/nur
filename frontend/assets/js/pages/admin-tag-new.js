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
form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  statusEl.textContent='Saving…';
  const data = Object.fromEntries(new FormData(form).entries());
  try{ await api.post('/admin/tags', data); statusEl.textContent='Saved ✅'; location.href='./tags'; }
  catch(err){ statusEl.textContent = err?.message||String(err); }
});

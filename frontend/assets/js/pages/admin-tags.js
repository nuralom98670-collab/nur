import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav, refreshNotifications } from "../core/ui.js";

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();
refreshNotifications();

const qInput = document.getElementById('q');
const tableBody = document.querySelector('#tagsTable tbody');
const countBadge = document.getElementById('countBadge');
const statusEl = document.getElementById('status');
let all = [];

function esc(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}

function render(list){
  countBadge.textContent = String(list.length);
  if(!list.length){tableBody.innerHTML='<tr><td class="muted" colspan="4">No tags.</td></tr>';return;}
  tableBody.innerHTML = list.map(t=>{
    const id=t.id||t._id||'';
    return `<tr>
      <td>${esc(String(id).slice(-6))}</td>
      <td>${esc(t.name||'—')}</td>
      <td>${esc(t.slug||'—')}</td>
      <td>
        <a class="btn" href="tag-edit.html?id=${encodeURIComponent(id)}">Edit</a>
        <button class="btn" data-del="${esc(id)}">Delete</button>
      </td>
    </tr>`;
  }).join('');

  tableBody.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.getAttribute('data-del');
      if(!id) return;
      if(!confirm('Delete this tag?')) return;
      btn.disabled=true; btn.textContent='Deleting…';
      try{ await api.del(`/admin/tags/${encodeURIComponent(id)}`);
        all = all.filter(x=>String(x.id||x._id)!==String(id));
        apply();
        statusEl.textContent='Deleted.';
      }catch(e){ statusEl.textContent=e?.message||String(e); btn.disabled=false; btn.textContent='Delete'; }
    });
  });
}

function apply(){
  const q=(qInput.value||'').trim().toLowerCase();
  if(!q) return render(all);
  render(all.filter(t=>String(t.name||'').toLowerCase().includes(q) || String(t.slug||'').toLowerCase().includes(q)));
}

async function load(){
  statusEl.textContent='Loading…';
  try{ const data = await api.get('/admin/tags');
    all = Array.isArray(data)?data:(data.items||[]);
    statusEl.textContent='';
    apply();
  }catch(e){ statusEl.textContent=e?.message||String(e); tableBody.innerHTML='<tr><td class="muted" colspan="4">Failed to load.</td></tr>'; }
}

qInput.addEventListener('input', apply);
load();

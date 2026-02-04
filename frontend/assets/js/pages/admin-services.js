import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav, refreshNotifications } from "../core/ui.js";

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();
refreshNotifications();

const tableBody = document.querySelector('#servicesTable tbody');
const countBadge = document.getElementById('countBadge');
const statusEl = document.getElementById('status');
let all=[];

function esc(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
function fmt(d){ try{ return new Date(d).toLocaleString(); }catch{ return '—'; } }

function render(list){
  countBadge.textContent=String(list.length);
  if(!list.length){ tableBody.innerHTML='<tr><td class="muted" colspan="5">No services.</td></tr>'; return; }
  tableBody.innerHTML=list.map(s=>{
    const id=s.id||s._id||'';
    return `<tr>
      <td>${esc(String(id).slice(-6))}</td>
      <td>${esc(s.name||'—')}</td>
      <td>${esc(s.status||'—')}</td>
      <td>${esc(fmt(s.lastCheckAt||s.updatedAt||s.createdAt))}</td>
      <td><a class="btn" href="service-view.html?id=${encodeURIComponent(id)}">Open</a></td>
    </tr>`;
  }).join('');
}

async function load(){
  statusEl.textContent='Loading…';
  try{ const data=await api.get('/admin/services');
    all = Array.isArray(data)?data:(data.items||[]);
    statusEl.textContent='';
    render(all);
  }catch(e){ statusEl.textContent=e?.message||String(e); tableBody.innerHTML='<tr><td class="muted" colspan="5">Failed to load.</td></tr>'; }
}

load();

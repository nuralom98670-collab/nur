import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav, refreshNotifications } from "../core/ui.js";

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();
refreshNotifications();

const qInput = document.getElementById('q');
const tableBody = document.querySelector('#messagesTable tbody');
const countBadge = document.getElementById('countBadge');
const statusEl = document.getElementById('status');
const tabAll = document.getElementById('tabAll');
const tabService = document.getElementById('tabService');
let all=[];

const tab = new URLSearchParams(location.search).get('tab') || 'all';
if(tabService && tab === 'service'){
  tabService.classList.add('primary');
}else if(tabAll){
  tabAll.classList.add('primary');
}

function esc(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}

function render(list){
  countBadge.textContent=String(list.length);
  if(!list.length){ tableBody.innerHTML='<tr><td class="muted" colspan="5">No messages.</td></tr>'; return; }
  tableBody.innerHTML=list.map(m=>{
    const id=m.id||m._id||'';
    const from = `${m.name||'—'} ${m.email?`<span class="muted">(${esc(m.email)})</span>`:''}`;
    const st = m.read||m.status==='read' ? 'read' : 'unread';
    return `<tr>
      <td>${esc(String(id).slice(-6))}</td>
      <td>${from}</td>
      <td>${esc(m.subject||'—')}</td>
      <td>${esc(st)}</td>
      <td><a class="btn" href="message-view.html?id=${encodeURIComponent(id)}">Open</a></td>
    </tr>`;
  }).join('');
}

function apply(){
  const q=(qInput.value||'').trim().toLowerCase();
  if(!q) return render(all);
  render(all.filter(m=>{
    return String(m.name||'').toLowerCase().includes(q) || String(m.email||'').toLowerCase().includes(q) || String(m.subject||'').toLowerCase().includes(q);
  }));
}

async function load(){
  statusEl.textContent='Loading…';
  try{
    const endpoint = tab === 'service' ? '/admin/service-requests' : '/admin/messages';
    const data=await api.get(endpoint);
    all = Array.isArray(data)?data:(data.items||[]);
    statusEl.textContent='';
    apply();
  }catch(e){ statusEl.textContent=e?.message||String(e); tableBody.innerHTML='<tr><td class="muted" colspan="5">Failed to load.</td></tr>'; }
}
qInput.addEventListener('input', apply);
load();

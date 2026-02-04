import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav, refreshNotifications } from "../core/ui.js";

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();
refreshNotifications();

const id = new URLSearchParams(location.search).get('id');
const statusBadge = document.getElementById('statusBadge');
const serviceId = document.getElementById('serviceId');
const nameEl = document.getElementById('name');
const uptimeEl = document.getElementById('uptime');
const lastCheckEl = document.getElementById('lastCheck');
const latencyEl = document.getElementById('latency');
const cpuEl = document.getElementById('cpu');
const memoryEl = document.getElementById('memory');
const versionEl = document.getElementById('version');
const restartBtn = document.getElementById('restartBtn');
const refreshBtn = document.getElementById('refreshBtn');
const statusMsg = document.getElementById('statusMsg');

function fmt(d){ try{ return new Date(d).toLocaleString(); }catch{ return '—'; } }
function fmtUptime(sec){
  const s = Number(sec||0);
  if(!s) return '—';
  const h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60);
  return `${h}h ${m}m`;
}

async function load(){
  if(!id){ statusMsg.textContent='Missing id'; restartBtn.disabled=true; refreshBtn.disabled=true; return; }
  try{ const svc = await api.get(`/admin/services/${encodeURIComponent(id)}`);
    serviceId.textContent=id;
    nameEl.textContent=svc.name||'—';
    statusBadge.textContent=svc.status||'—';
    uptimeEl.textContent=fmtUptime(svc.uptimeSeconds);
    lastCheckEl.textContent=fmt(svc.lastCheckAt||svc.updatedAt||svc.createdAt);
    latencyEl.textContent = (svc.metrics?.latencyMs!=null) ? `${svc.metrics.latencyMs} ms` : '—';
    cpuEl.textContent = (svc.metrics?.cpuPercent!=null) ? `${svc.metrics.cpuPercent}%` : '—';
    memoryEl.textContent = (svc.metrics?.memoryMb!=null) ? `${svc.metrics.memoryMb} MB` : '—';
    versionEl.textContent = svc.metrics?.version || '—';
    statusMsg.textContent='';
  }catch(e){ statusMsg.textContent=e?.message||String(e); }
}

restartBtn.addEventListener('click', async ()=>{
  if(!id) return;
  statusMsg.textContent='Restarting…';
  try{ await api.post(`/admin/services/${encodeURIComponent(id)}/restart`, {});
    statusMsg.textContent='Restart requested ✅';
    await load();
  }catch(e){ statusMsg.textContent=e?.message||String(e); }
});

refreshBtn.addEventListener('click', load);
load();

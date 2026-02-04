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
const msgId = document.getElementById('msgId');
const nameEl = document.getElementById('name');
const emailEl = document.getElementById('email');
const createdAtEl = document.getElementById('createdAt');
const subjectEl = document.getElementById('subject');
const bodyEl = document.getElementById('body');
const markBtn = document.getElementById('markReadBtn');
const statusMsg = document.getElementById('statusMsg');
const repliesEl = document.getElementById('replies');
const replyInput = document.getElementById('replyInput');
const sendReplyBtn = document.getElementById('sendReplyBtn');
const replyStatus = document.getElementById('replyStatus');

function fmt(d){ try{ return new Date(d).toLocaleString(); }catch{ return '—'; } }

function esc(s){
  return String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

function tryParseServiceRequest(subject, rawMessage){
  try{
    if(!String(subject||'').startsWith('Service Request:')) return null;
    if(typeof rawMessage !== 'string') return null;
    const obj = JSON.parse(rawMessage);
    // Expected shape from ServiceRequestController
    if(!obj || typeof obj !== 'object') return null;
    return obj;
  }catch{ return null; }
}

function renderServiceRequest(sr){
  const files = Array.isArray(sr.files) ? sr.files : [];
  const images = Array.isArray(sr.images) ? sr.images : [];
  const parts = [];
  parts.push(`<div class="muted" style="margin-top:4px;">Service</div>`);
  parts.push(`<div style="font-weight:800;">${esc(sr.serviceTitle||'')}</div>`);
  parts.push(`<div style="height:10px"></div>`);
  parts.push(`<div class="muted">Phone</div><div>${esc(sr.phone||'—')}</div>`);
  parts.push(`<div style="height:10px"></div>`);
  parts.push(`<div class="muted">Note</div><div style="white-space:pre-wrap; line-height:1.6;">${esc(sr.note||'')}</div>`);

  if(files.length){
    parts.push(`<div style="height:14px"></div><div class="hr"></div>`);
    parts.push(`<div style="font-weight:800; margin-top:14px;">Uploaded Files</div>`);
    parts.push(`<ul style="margin:10px 0 0 18px;">` + files.map((u,idx)=>{
      const name = String(u).split('/').pop() || `file-${idx+1}`;
      return `<li style="margin:6px 0;"><a class="btn" style="padding:6px 10px;" href="${esc(u)}" target="_blank" rel="noopener">Download</a> <span class="muted" style="margin-left:8px;">${esc(name)}</span></li>`;
    }).join('') + `</ul>`);
  }

  if(images.length){
    parts.push(`<div style="height:14px"></div><div class="hr"></div>`);
    parts.push(`<div style="font-weight:800; margin-top:14px;">Reference Images</div>`);
    parts.push(`<div style="margin-top:10px; display:grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap:10px;">` + images.map(u=>{
      return `<a href="${esc(u)}" target="_blank" rel="noopener" style="display:block;"><img src="${esc(u)}" alt="" style="width:100%; height:110px; object-fit:cover; border-radius:12px; border:1px solid rgba(255,255,255,.08);" /></a>`;
    }).join('') + `</div>`);
  }

  return parts.join('');
}

function renderReplies(items){
  if(!repliesEl) return;
  if(!items?.length){
    repliesEl.innerHTML = `<div class="muted" style="padding:10px 0;">No replies yet.</div>`;
    return;
  }
  repliesEl.innerHTML = items.map(r=>{
    const who = r.adminId ? 'Admin' : 'Support';
    return `<div class="card" style="padding:12px; margin:10px 0;">
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <div style="font-weight:800;">${esc(who)}</div>
        <div class="muted" style="font-size:12px;">${esc(fmt(r.createdAt))}</div>
      </div>
      <div style="margin-top:8px; white-space:pre-wrap; line-height:1.6;">${esc(r.body||'')}</div>
    </div>`;
  }).join('');
}

async function loadReplies(){
  if(!id || !repliesEl) return;
  try{
    const data = await api.get(`/admin/messages/${encodeURIComponent(id)}/replies`);
    const items = Array.isArray(data)?data:(data.items||[]);
    renderReplies(items);
  }catch{
    repliesEl.innerHTML = `<div class="muted" style="padding:10px 0;">Failed to load replies.</div>`;
  }
}


async function load(){
  if(!id){ statusMsg.textContent='Missing id'; markBtn.disabled=true; return; }
  try{ const m = await api.get(`/admin/messages/${encodeURIComponent(id)}`);
    msgId.textContent=id;
    nameEl.textContent=m.name||'—';
    emailEl.textContent=m.email||'—';
    createdAtEl.textContent=fmt(m.createdAt);
    subjectEl.textContent=m.subject||'—';
    // DB column is `message` (not `body`) — support multiple possible keys for backwards compatibility
    const raw = (m.body || m.message || m.text || m.content || m.msg || '');
    const sr = tryParseServiceRequest(m.subject, raw);
    if(sr){
      // Render service request with file links & images
      bodyEl.style.whiteSpace = 'normal';
      bodyEl.innerHTML = renderServiceRequest(sr);
    }else{
      bodyEl.style.whiteSpace = 'pre-wrap';
      bodyEl.textContent = raw;
    }
    const st = m.read||m.status==='read' ? 'read' : 'unread';
    statusBadge.textContent=st;
    loadReplies();
  }catch(e){ statusMsg.textContent=e?.message||String(e); markBtn.disabled=true; }
}

sendReplyBtn?.addEventListener('click', async ()=>{
  if(!id) return;
  const body = String(replyInput?.value||'').trim();
  if(!body){ replyStatus.textContent='Write a reply first.'; return; }
  sendReplyBtn.disabled=true;
  replyStatus.textContent='Sending…';
  try{
    await api.post(`/admin/messages/${encodeURIComponent(id)}/replies`, { body });
    replyInput.value='';
    replyStatus.textContent='Sent ✅';
    await loadReplies();
  }catch(e){ replyStatus.textContent=e?.message||String(e); }
  sendReplyBtn.disabled=false;
});

markBtn.addEventListener('click', async ()=>{
  if(!id) return;
  statusMsg.textContent='Marking…';
  try{ await api.put(`/admin/messages/${encodeURIComponent(id)}/read`, {});
    statusMsg.textContent='Marked read ✅';
    statusBadge.textContent='read';
    refreshNotifications();
  }catch(e){ statusMsg.textContent=e?.message||String(e); }
});

load();

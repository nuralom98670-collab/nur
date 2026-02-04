// /assets/js/pages/admin-reviews.js
import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox } from "../core/ui.js";

await requireAdmin();
bindLogout();
renderUserbox();

const qEl = document.getElementById("q");
const notifBadge = document.getElementById("notifBadge");
const ratingFilter = document.getElementById("ratingFilter");
const countBadge = document.getElementById("countBadge");
const table = document.getElementById("reviewsTable");
const statusEl = document.getElementById("status");

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function stars(r){
  const rating = Math.max(1, Math.min(5, Number(r||0)));
  return "★★★★★☆☆☆☆☆".slice(5 - rating, 10 - rating);
}
function when(iso){
  try { return new Date(iso).toLocaleString(); } catch { return String(iso||""); }
}

async function loadNotif(){
  try{
    const d = await api.get("/admin/notifications/count");
    notifBadge.textContent = `Notifications • ${Number(d?.count||0)}`;
  }catch{
    // ignore
  }
}

let all = [];

function apply(){
  const q = (qEl.value||"").trim().toLowerCase();
  const rf = String(ratingFilter.value||"").trim();
  let list = [...all];
  if (rf) list = list.filter(x => String(x.rating) === rf);
  if (q){
    list = list.filter(x =>
      String(x.productName||"").toLowerCase().includes(q) ||
      String(x.userEmail||x.userName||x.name||"").toLowerCase().includes(q) ||
      String(x.body||"").toLowerCase().includes(q)
    );
  }
  countBadge.textContent = String(list.length);

  const tb = table.querySelector("tbody");
  if (!list.length){
    tb.innerHTML = `<tr><td class="muted" colspan="7">No reviews found.</td></tr>`;
    return;
  }
  tb.innerHTML = list.map(r => {
    const product = escapeHtml(r.productName || r.productTitle || r.productId || "");
    const user = escapeHtml(r.userEmail || r.userName || r.name || r.userId || "—");
    const date = escapeHtml(when(r.createdAt));
    const body = escapeHtml(r.body || "");
    const st = escapeHtml(r.status || "pending");
    const note = escapeHtml(r.adminNote || "");
    const id = escapeHtml(r.id);
    return `
      <tr>
        <td>${product}</td>
        <td><span class="badge">${stars(r.rating)} (${Number(r.rating||0)})</span></td>
        <td>${user}</td>
        <td>${date}</td>
        <td>
          <select class="input" data-st="${id}" style="min-width:100px;">
            <option value="pending" ${st==='pending'?'selected':''}>pending</option>
            <option value="approved" ${st==='approved'?'selected':''}>approved</option>
            <option value="hidden" ${st==='hidden'?'selected':''}>hidden</option>
          </select>
        </td>
        <td style="max-width:420px; white-space:normal;">
          ${body || "<span class='muted'>—</span>"}
          <div style="margin-top:10px;">
            <input class="input" data-note="${id}" placeholder="Admin note (optional)" value="${note}" />
          </div>
        </td>
        <td>
          <button class="btn" data-save="${id}" style="padding:8px 10px;">Save</button>
          <button class="btn" data-del="${id}" style="padding:8px 10px; margin-top:6px;">Delete</button>
        </td>
      </tr>
    `;
  }).join("");

  tb.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      if (!id) return;
      if (!confirm("Delete this review?")) return;
      try{
        await api.del(`/admin/reviews/${encodeURIComponent(id)}`);
        all = all.filter(x => String(x.id) !== String(id));
        statusEl.textContent = "Deleted.";
        apply();
      }catch{
        statusEl.textContent = "Failed to delete.";
      }
    });
  });

  // Save moderation status / note
  tb.querySelectorAll("[data-save]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-save");
      const stEl = tb.querySelector(`[data-st="${id}"]`);
      const noteEl = tb.querySelector(`[data-note="${id}"]`);
      const status = stEl?.value || "pending";
      const adminNote = noteEl?.value || "";
      try {
        await api.put(`/admin/reviews/${encodeURIComponent(id)}/status`, { status, adminNote });
        // update local
        const it = all.find(x => String(x.id) === String(id));
        if (it) { it.status = status; it.adminNote = adminNote; }
        statusEl.textContent = "Saved ✅";
        setTimeout(()=>{ statusEl.textContent = ""; }, 800);
      } catch {
        statusEl.textContent = "Failed to save.";
      }
    });
  });
}

async function load(){
  statusEl.textContent = "Loading…";
  try{
    all = await api.get("/admin/reviews");
    if (!Array.isArray(all)) all = [];
    statusEl.textContent = "";
  }catch{
    all = [];
    statusEl.textContent = "Failed to load reviews.";
  }
  apply();
}

qEl?.addEventListener("input", apply);
ratingFilter?.addEventListener("change", apply);

await loadNotif();
await load();

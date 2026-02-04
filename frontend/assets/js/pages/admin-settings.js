import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav, refreshNotifications } from "../core/ui.js";

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();
refreshNotifications();

const form = document.getElementById('settingsForm');
const statusEl = document.getElementById('status');

// Coupons
const couponForm = document.getElementById('couponForm');
const couponList = document.getElementById('couponList');
const couponStatus = document.getElementById('couponStatus');

function escapeHtml(str){
  return String(str ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

function fmtDate(dt){
  if(!dt) return '';
  try { return new Date(dt).toLocaleString(); } catch { return String(dt); }
}

async function loadCoupons(){
  if(!couponList) return;
  couponStatus.textContent = 'Loading coupons…';
  try{
    const cs = await api.get('/admin/coupons');
    const items = Array.isArray(cs) ? cs : (cs?.items || []);
    if(!items.length){
      couponList.innerHTML = `<div class="muted">No coupons yet.</div>`;
      couponStatus.textContent = '';
      return;
    }
    couponList.innerHTML = items.map(c => {
      const code = escapeHtml(c.code);
      const type = escapeHtml(c.type);
      const value = Number(c.value || 0);
      const minS = Number(c.minSubtotal || 0);
      const maxD = c.maxDiscount == null ? '' : Number(c.maxDiscount || 0);
      const exp = c.expiresAt ? fmtDate(c.expiresAt) : '';
      const act = Number(c.active||0) ? 'Active' : 'Inactive';
      const badge = `<span class="badge" style="opacity:.85;">${escapeHtml(act)}</span>`;
      const details = `${type === 'percent' ? value + '%' : '৳' + value}${minS ? ' • min ৳' + minS : ''}${maxD!=='' ? ' • max ৳' + maxD : ''}${exp ? ' • expires ' + escapeHtml(exp) : ''}`;
      return `
        <div class="card" style="padding:12px; display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap;">
          <div>
            <div style="font-weight:800;">${code} ${badge}</div>
            <div class="muted" style="margin-top:6px;">${escapeHtml(details)}</div>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="btn danger" data-delcoupon="${escapeHtml(c.id)}">Delete</button>
          </div>
        </div>
      `;
    }).join('');

    couponList.querySelectorAll('[data-delcoupon]').forEach(btn => {
      btn.addEventListener('click', async ()=>{
        const id = btn.getAttribute('data-delcoupon');
        if(!id) return;
        couponStatus.textContent = 'Deleting…';
        try{
          await api.del(`/admin/coupons/${encodeURIComponent(id)}`);
          couponStatus.textContent = 'Deleted ✅';
          loadCoupons();
        }catch(e){
          couponStatus.textContent = e?.message || 'Failed';
        }
      });
    });

    couponStatus.textContent = '';
  }catch(e){
    couponStatus.textContent = e?.message || String(e);
  }
}

async function load(){
  statusEl.textContent='Loading…';
  try{ const s = await api.get('/admin/settings');
    form.shopName.value = s.shopName || '';
    form.currency.value = s.currency || '';
    if(form.siteLogoUrl) form.siteLogoUrl.value = s.siteLogoUrl || '';
    if(form.socialFacebook) form.socialFacebook.value = s.socialFacebook || '';
    if(form.socialInstagram) form.socialInstagram.value = s.socialInstagram || '';
    if(form.socialWhatsapp) form.socialWhatsapp.value = s.socialWhatsapp || '';
    if(form.socialYoutube) form.socialYoutube.value = s.socialYoutube || '';
    if(form.starterVideoUrl) form.starterVideoUrl.value = s.starterVideoUrl || '';
    if(form.starterVideoTitle) form.starterVideoTitle.value = s.starterVideoTitle || '';
    if(form.deliveryDhaka) form.deliveryDhaka.value = s.deliveryDhaka ?? '';
    if(form.deliveryOutside) form.deliveryOutside.value = s.deliveryOutside ?? '';
    if(form.paymentMethods) form.paymentMethods.value = s.paymentMethods || '';
    if(form.bkashNumber) form.bkashNumber.value = s.bkashNumber || '';
    if(form.nagadNumber) form.nagadNumber.value = s.nagadNumber || '';
    if(form.rocketNumber) form.rocketNumber.value = s.rocketNumber || '';
    if(form.paymentInstructions) form.paymentInstructions.value = s.paymentInstructions || '';
    if(form.footerAbout) form.footerAbout.value = s.footerAbout || '';
    if(form.footerAddress) form.footerAddress.value = s.footerAddress || '';
    if(form.contactEmail) form.contactEmail.value = s.contactEmail || '';
    if(form.contactPhone) form.contactPhone.value = s.contactPhone || '';
    if(form.whatsappNumber) form.whatsappNumber.value = s.whatsappNumber || '';
    if(form.phoneNumber) form.phoneNumber.value = s.phoneNumber || '';
    if(form.offerEnabled) form.offerEnabled.value = s.offerEnabled || '';
    if(form.offerText) form.offerText.value = s.offerText || '';
    if(form.offerLink) form.offerLink.value = s.offerLink || '';
    if(form.offerEndsAt) form.offerEndsAt.value = s.offerEndsAt || '';
    if(form.offerType) form.offerType.value = s.offerType || '';
    if(form.offerValue) form.offerValue.value = s.offerValue || '';
    if(form.offerAppliesTo) form.offerAppliesTo.value = s.offerAppliesTo || 'all';
    if(form.offerAppliesKey) form.offerAppliesKey.value = s.offerAppliesKey || '';
    if(form.offerAppliesLabel) form.offerAppliesLabel.value = s.offerAppliesLabel || '';
    if(form.homeHeroTitle) form.homeHeroTitle.value = s.homeHeroTitle || '';
    if(form.homeHeroSubtitle) form.homeHeroSubtitle.value = s.homeHeroSubtitle || '';
    if(form.homeHeroPrimaryText) form.homeHeroPrimaryText.value = s.homeHeroPrimaryText || '';
    if(form.homeHeroPrimaryLink) form.homeHeroPrimaryLink.value = s.homeHeroPrimaryLink || '';
    if(form.homeHeroSecondaryText) form.homeHeroSecondaryText.value = s.homeHeroSecondaryText || '';
    if(form.homeHeroSecondaryLink) form.homeHeroSecondaryLink.value = s.homeHeroSecondaryLink || '';
    if(form.homeHighlightsJson) form.homeHighlightsJson.value = s.homeHighlightsJson || '';
    statusEl.textContent='';
  }catch(e){ statusEl.textContent=e?.message||String(e); }
}

// Logo upload helper
const uploadLogoBtn = document.getElementById('uploadLogoBtn');
const siteLogoFile = document.getElementById('siteLogoFile');
const siteLogoUrl = document.getElementById('siteLogoUrl');

uploadLogoBtn?.addEventListener('click', async ()=>{
  const file = siteLogoFile?.files?.[0];
  if(!file){
    alert('Please choose an image file first.');
    return;
  }
  statusEl.textContent = 'Uploading logo…';
  try{
    const out = await api.upload('/admin/upload-image', file, 'file');
    if(siteLogoUrl) siteLogoUrl.value = out?.url || '';
    statusEl.textContent = 'Uploaded ✅ (click Save to apply)';
  }catch(e){
    statusEl.textContent = e?.message || 'Upload failed';
  }
});

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  statusEl.textContent='Saving…';
  const data = Object.fromEntries(new FormData(form).entries());
  try{ await api.put('/admin/settings', data);
    statusEl.textContent='Saved ✅';
  }catch(e){ statusEl.textContent=e?.message||String(e); }
});

load();
loadCoupons();

couponForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  couponStatus.textContent = 'Saving…';
  try{
    const raw = Object.fromEntries(new FormData(couponForm).entries());
    const payload = {
      code: raw.code,
      type: raw.type,
      value: Number(raw.value || 0),
      minSubtotal: raw.minSubtotal === '' ? 0 : Number(raw.minSubtotal||0),
      maxDiscount: raw.maxDiscount === '' ? null : Number(raw.maxDiscount||0),
      expiresAt: raw.expiresAt ? new Date(raw.expiresAt).toISOString() : null,
      active: raw.active ? 1 : 0
    };
    const out = await api.post('/admin/coupons', payload);
    couponStatus.textContent = 'Added ✅';
    // reset (keep active checked)
    couponForm.reset();
    couponForm.active.checked = true;
    loadCoupons();
  }catch(err){
    couponStatus.textContent = err?.message || 'Failed';
  }
});

// /assets/js/core/site-ui.js
// Global UI enhancements driven by /api/public/site-config
// - Navbar logo + shop name
// - Beautiful footer with social icons
// - Floating WhatsApp/Phone widget
// - Optional offer banner

let _CFG = null;

function wireSearchForm(form){
  if (!form || form.dataset.wired === '1') return;
  form.dataset.wired = '1';
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const q = (form.querySelector('input')?.value || '').trim();
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    location.href = `/shop${sp.toString() ? '?' + sp.toString() : ''}`;
  });
}

function esc(str){
  return String(str ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function normalizeUrl(u){
  const s = String(u||'').trim();
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('/')) return s;
  return 'https://' + s;
}

function waLink(cfg){
  // Prefer explicit socialWhatsapp (URL). Otherwise build from whatsappNumber.
  const direct = String(cfg?.socialWhatsapp || '').trim();
  if (direct) return normalizeUrl(direct);
  const num = String(cfg?.whatsappNumber || '').replace(/\s+/g,'').replace(/^\+/,'');
  if (!num) return '';
  return `https://wa.me/${encodeURIComponent(num)}`;
}

function telLink(cfg){
  const p = String(cfg?.phoneNumber || cfg?.contactPhone || '').trim();
  if (!p) return '';
  const digits = p.replace(/\s+/g,'');
  return `tel:${digits}`;
}

async function getCfg(){
  if (_CFG) return _CFG;
  try{
    const r = await fetch('/api/public/site-config');
    if (!r.ok) throw new Error('cfg');
    _CFG = await r.json();
  }catch{
    _CFG = {};
  }
  return _CFG;
}

function applyNavbar(cfg){
  const name = String(cfg?.shopName || 'RoboticsLeb');
  document.querySelectorAll('.logo-text').forEach(el => el.textContent = name);

  const logoUrl = String(cfg?.siteLogoUrl || '').trim();
  if (!logoUrl) return;

  document.querySelectorAll('a.logo').forEach(a => {
    const dot = a.querySelector('.dot');
    if (!dot) return;
    // Replace dot with image (keep size consistent)
    if (dot.dataset.hasImage === '1') return;
    dot.dataset.hasImage = '1';
    dot.innerHTML = `<img src="${esc(logoUrl)}" alt="" style="width:44px;height:44px;border-radius:10px;object-fit:cover;display:block;"/>`;
    dot.style.background = 'transparent';
    dot.style.width = '44px';
    dot.style.height = '44px';
    dot.style.borderRadius = '10px';
  });
}

function applyNavSearch(){
  // Inject a compact search box between nav links and the Cart/Login buttons.
  // Search bar should appear ONLY on the Home page.
  const p = String(location.pathname || '/');
  const isHome = (p === '/' || /\/index\.html$/i.test(p));
  if (!isHome) return;

  const headerNav = document.querySelector('.site-header .container.nav');
  if (!headerNav) return;
  if (headerNav.querySelector('.nav-search-slot')) return;

  const links = headerNav.querySelector('.links');
  const actions = headerNav.querySelector('.nav-actions');
  if (!links || !actions) return;

  const slot = document.createElement('div');
  slot.className = 'nav-search-slot';

  const form = document.createElement('form');
  form.className = 'nav-search-form';
  form.setAttribute('role','search');
  form.innerHTML = `<input class="nav-search" type="search" name="q" placeholder="Search…" autocomplete="off" />`;

  wireSearchForm(form);

  slot.appendChild(form);
  // Place right after links (so it sits beside About) and before Cart/Login
  links.insertAdjacentElement('afterend', slot);
}

function applyAccountHeaderCleanup(){
  // On account/dashboard pages we want a clean header:
  // - No injected search bar
  // - No header cart button (cart is available inside dashboard sidebar)
  const p = String(location.pathname || '/');
  const isAccount = /^\/account(\/|$)/i.test(p) || /\/account(-[a-z-]+)?\.html$/i.test(p);
  if (!isAccount) return;

  document.querySelectorAll('.site-header .nav-search-slot').forEach(el => el.remove());
  document.querySelectorAll('.site-header .nav-actions a[href*="/cart"], .site-header .nav-actions a[href^="./cart"], .site-header .nav-actions a[href$="cart"]').forEach(a => a.remove());
}

function dedupeHeaderAuthButtons(){
  // Remove accidental duplicate Login buttons in header nav-actions
  document.querySelectorAll('.site-header .nav-actions').forEach(actions => {
    const loginBtns = Array.from(actions.querySelectorAll('a.btn')).filter(a => /\blogin\b/i.test((a.textContent||'').trim()));
    if (loginBtns.length <= 1) return;
    // Keep the first "primary" if present, otherwise keep the first
    let keep = loginBtns.find(a => a.classList.contains('primary')) || loginBtns[0];
    loginBtns.forEach(a => { if (a !== keep) a.remove(); });
  });
}

function applyMobileHamburger(){
  const headerNav = document.querySelector('.site-header .container.nav');
  if (!headerNav) return;
  if (headerNav.querySelector('.menu-toggle')) return;

  const logo = headerNav.querySelector('a.logo');
  const links = headerNav.querySelector('nav.links');
  const actions = headerNav.querySelector('.nav-actions');
  if (!logo || !links || !actions) return;

  // Mark existing desktop elements so CSS can hide them only on mobile
  links.classList.add('desktop-nav');
  actions.classList.add('desktop-actions');

  const btn = document.createElement('button');
  btn.className = 'menu-toggle';
  btn.type = 'button';
  btn.setAttribute('aria-label','Open menu');
  btn.setAttribute('aria-expanded','false');
  btn.innerHTML = '<span aria-hidden="true">☰</span>';

  const panel = document.createElement('div');
  panel.className = 'mobile-panel';

  const backdrop = document.createElement('div');
  backdrop.className = 'menu-backdrop';
  backdrop.setAttribute('aria-hidden','true');
  panel.setAttribute('aria-hidden','true');

  // Optional: replicate search on Home page if it exists in desktop header
  const searchSlot = headerNav.querySelector('.nav-search-slot');
  if (searchSlot){
    const mSlot = document.createElement('div');
    mSlot.className = 'mobile-search-slot';
    const form = document.createElement('form');
    form.className = 'nav-search-form';
    form.setAttribute('role','search');
    form.innerHTML = `<input class="nav-search" type="search" name="q" placeholder="Search…" autocomplete="off" />`;
    wireSearchForm(form);
    mSlot.appendChild(form);
    panel.appendChild(mSlot);
  }

  // Build mobile links (ensure all important items exist even if desktop nav is trimmed on some pages)
  const defaults = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
    { label: 'Apps', href: '/apps' },
    { label: 'Services', href: '/services' },
    { label: 'Blog', href: '/blog' },
    { label: 'Account', href: '/account' },
    { label: 'Contact', href: '/contact' },
    { label: 'About', href: '/about' },
  ];

  // Start from whatever exists in desktop nav, then add missing defaults
  const found = new Map();
  Array.from(links.querySelectorAll('a')).forEach(a => {
    const href = (a.getAttribute('href') || '').trim();
    const text = (a.textContent || '').trim();
    if (!href || !text) return;
    try{
      const u = new URL(href, location.origin);
      const p = (u.pathname||'').replace(/\/+$/,'') || '/';
      if (p === '/cart' || p === '/login') return; // avoid duplicates (actions already include these)
    }catch{}
    found.set(href, text);
  });
  defaults.forEach(x => {
    // If any existing link already points to same path (relative or absolute), don't duplicate
    const already = Array.from(found.keys()).some(h => {
      try{
        const u = new URL(h, location.origin);
        return u.pathname.replace(/\/+$/,'') === x.href.replace(/\/+$/,'');
      }catch{return false;}
    });
    if (!already) found.set(x.href, x.label);
  });

  const mLinks = document.createElement('div');
  mLinks.className = 'mobile-links';
  const currentPath = (location.pathname || '/').replace(/\/+$/,'') || '/';
  const as = [];
  for (const [href, label] of found.entries()){
    // Normalize to absolute paths for reliability
    let normalized = href;
    try{ normalized = new URL(href, location.origin).pathname; }catch{}
    if (!normalized.startsWith('/')) normalized = '/' + normalized;
    const a = document.createElement('a');
    a.href = normalized;
    a.textContent = label;
    const nPath = normalized.replace(/\/+$/,'') || '/';
    if (nPath === currentPath) a.classList.add('active');
    as.push(a);
    mLinks.appendChild(a);
  }
  panel.appendChild(mLinks);

  const mActions = actions.cloneNode(true);
  mActions.classList.remove('desktop-actions');
  mActions.classList.add('mobile-actions');
  mActions.querySelectorAll('#cartCount').forEach(el => {
    el.removeAttribute('id');
    el.setAttribute('data-cart-count','1');
  });
  // Also remove any other accidental duplicate IDs inside cloned actions
  mActions.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
  panel.appendChild(mActions);

  // Insert toggle after logo
  logo.insertAdjacentElement('afterend', btn);
  btn.insertAdjacentElement('afterend', panel);
  // Backdrop after panel so it can cover screen; CSS controls z-index
  headerNav.appendChild(backdrop);

  const closePanel = ()=>{
    headerNav.classList.remove('menu-open');
    backdrop.classList.remove('show');
    backdrop.setAttribute('aria-hidden','true');
    document.body.classList.remove('no-scroll');
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden','true');
    btn.setAttribute('aria-expanded','false');
  };

  const openPanel = ()=>{
    headerNav.classList.add('menu-open');
    backdrop.classList.add('show');
    backdrop.setAttribute('aria-hidden','false');
    document.body.classList.add('no-scroll');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden','false');
    btn.setAttribute('aria-expanded','true');
  };

  btn.addEventListener('click', ()=>{
    const isOpen = panel.classList.contains('open');
    if (isOpen) closePanel(); else openPanel();
  });

  // Close on backdrop click
  backdrop.addEventListener('click', ()=> closePanel());

  // Close on outside click
  document.addEventListener('click', (e)=>{
    if (!panel.classList.contains('open')) return;
    if (!headerNav.contains(e.target)) closePanel();
  });

  // Close when a link is clicked
  panel.addEventListener('click', (e)=>{
    const a = e.target.closest('a');
    if (a) closePanel();
  });

  // Close on resize to desktop
  window.addEventListener('resize', ()=>{
    if (window.innerWidth > 768) closePanel();
  });
}

function applyCartCount(){
  // Update any cart count badges if present
  let count = 0;
  try{
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    count = cart.reduce((s,x)=>s+Number(x?.qty||1),0);
  }catch{}

  // Support multiple elements (header + sidebar)
  document.querySelectorAll('#cartCount, [data-cart-count]').forEach(el => {
    el.textContent = String(count);
  });
}

function iconSvg(kind){
  // minimal inline icons (no external libs)
  const common = 'width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"';
  if (kind === 'facebook') return `<svg ${common}><path d="M14 8h2V5h-2c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.3l.7-3H13V9c0-.6.4-1 1-1Z" fill="currentColor"/></svg>`;
  if (kind === 'instagram') return `<svg ${common}><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 6.2A3.8 3.8 0 1 0 15.8 12 3.8 3.8 0 0 0 12 8.2Zm7-1.9a1 1 0 1 0-1 1 1 1 0 0 0 1-1Z" fill="currentColor"/></svg>`;
  if (kind === 'youtube') return `<svg ${common}><path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5A3 3 0 0 0 2.4 7.2 31.4 31.4 0 0 0 2 12a31.4 31.4 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 22 12a31.4 31.4 0 0 0-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z" fill="currentColor"/></svg>`;
  if (kind === 'whatsapp') return `<svg ${common}><path d="M20.5 12a8.5 8.5 0 0 1-12.7 7.4L3 20l.7-4.6A8.5 8.5 0 1 1 20.5 12Zm-4.9 4c.2-.1.3-.3.4-.6.1-.4.1-.7 0-.8-.1-.1-.2-.2-.6-.4l-1.6-.8c-.3-.2-.5-.2-.7 0-.2.2-.4.5-.5.6-.1.1-.2.2-.4.1-.2-.1-.8-.3-1.5-.9-.6-.6-1-1.3-1.1-1.5-.1-.2 0-.3.1-.4l.3-.4c.1-.1.2-.2.3-.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2 0 1.2.8 2.4.9 2.6.1.2 1.6 2.6 4 3.6 2.4 1 2.4.7 2.8.7.5 0 1.5-.6 1.7-1.2Z" fill="currentColor"/></svg>`;
  if (kind === 'phone') return `<svg ${common}><path d="M6.6 10.8c1.3 2.3 3.2 4.2 5.5 5.5l1.8-1.8c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.3 21 3 13.7 3 4c0-.6.4-1 1-1h4.2c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1l-1.9 1.9Z" fill="currentColor"/></svg>`;
  if (kind === 'chat') return `<svg ${common}><path d="M4 4h16v12H7l-3 3V4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
  return '';
}

function applyFooter(cfg){
  const footers = Array.from(document.querySelectorAll('footer.footer'));
  if (!footers.length) return;

  const year = new Date().getFullYear();
  const shop = String(cfg?.shopName || 'RoboticsLeb');
  const about = String(cfg?.footerAbout || '').trim();
  const address = String(cfg?.footerAddress || '').trim();
  const email = String(cfg?.contactEmail || '').trim();
  const phone = String(cfg?.contactPhone || '').trim();

  const links = [
    { label:'Home', href:'/' },
    { label:'Shop', href:'/shop' },
    { label:'Cart', href:'/cart' },
    { label:'Track Order', href:'/track-order.html' },
    { label:'Contact', href:'/contact' },
    { label:'About', href:'/about' },
  ];

  const socials = [
    { key:'facebook', url: cfg?.socialFacebook },
    { key:'instagram', url: cfg?.socialInstagram },
    { key:'whatsapp', url: waLink(cfg) },
    { key:'youtube', url: cfg?.socialYoutube },
  ].map(x => ({...x, url: normalizeUrl(x.url)})).filter(x => x.url);

  const socialHtml = socials.map(s => `
    <a class="social" data-kind="${esc(s.key)}" href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(s.key)}">${iconSvg(s.key)}</a>
  `).join('');

  const footerHtml = `
    <div class="footer-inner">
      <div class="footer-col">
        <div class="footer-brand">
          ${cfg?.siteLogoUrl ? `<img class="footer-logo" src="${esc(cfg.siteLogoUrl)}" alt=""/>` : `<span class="footer-dot"></span>`}
          <div>
            <div class="footer-title">${esc(shop)}</div>
            <div class="footer-sub muted">${esc(about || 'Robotics parts, kits & services for makers in Bangladesh.')}</div>
          </div>
        </div>
        <div class="footer-socials">${socialHtml || ''}</div>
      </div>
      <div class="footer-col">
        <div class="footer-head">Quick links</div>
        <div class="footer-links">
          ${links.map(l => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join('')}
        </div>
      </div>
      <div class="footer-col">
        <div class="footer-head">Contact</div>
        <div class="footer-contact">
          ${address ? `<div><span class="muted">Address:</span> ${esc(address)}</div>` : ''}
          ${email ? `<div><span class="muted">Email:</span> <a href="mailto:${esc(email)}">${esc(email)}</a></div>` : ''}
          ${phone ? `<div><span class="muted">Phone:</span> <a href="tel:${esc(phone.replace(/\s+/g,''))}">${esc(phone)}</a></div>` : ''}
        </div>
      </div>
    </div>
    <div class="footer-bottom muted">© ${year} ${esc(shop)} • All rights reserved.</div>
  `;

  footers.forEach(f => {
    f.classList.add('footer-pro');
    f.classList.remove('muted');
    f.innerHTML = footerHtml;
  });
}

function applyOffer(cfg){
  const enabled = String(cfg?.offerEnabled || '0') === '1';
  if (!enabled) return;

  // Stop if ended
  const endsAtRaw = String(cfg?.offerEndsAt || '').trim();
  let endsTs = null;
  if (endsAtRaw){
    const t = Date.parse(endsAtRaw);
    if (!Number.isNaN(t)) endsTs = t;
    if (endsTs && endsTs < Date.now()) return;
  }

  const header = document.querySelector('header.site-header');
  if (!header) return;
  if (document.getElementById('offerBanner')) return;

  const offerText = String(cfg?.offerText || '').trim();
  const offerType = String(cfg?.offerType || '').trim(); // percent | flat
  const offerValue = String(cfg?.offerValue || '').trim();
  const appliesTo = String(cfg?.offerAppliesTo || '').trim(); // all | category | product
  const appliesKey = String(cfg?.offerAppliesKey || '').trim();
  const appliesLabel = String(cfg?.offerAppliesLabel || '').trim();

  // Build a friendly line like: "Offer: 10% off on Motors" or "Offer: ৳200 off on Product"
  let computed = '';
  if (offerType && offerValue){
    const v = offerType === 'percent' ? `${offerValue}%` : `${offerValue}`;
    const unit = offerType === 'percent' ? 'off' : 'off';
    let scope = '';
    if (appliesTo === 'category') scope = `on ${appliesLabel || appliesKey}`;
    if (appliesTo === 'product') scope = `on ${appliesLabel || 'selected product'}`;
    if (appliesTo === 'all') scope = 'on all products';
    computed = `Offer: ${v} ${unit}${scope ? ' ' + scope : ''}`.trim();
  }
  const textLine = offerText || computed;
  if (!textLine) return;

  // Auto-link if not provided
  let link = String(cfg?.offerLink || '').trim();
  if (!link){
    if (appliesTo === 'category' && appliesKey){
      // shop page expects `cat` param
      link = `/shop?cat=${encodeURIComponent(appliesKey)}`;
    } else if (appliesTo === 'product' && appliesKey){
      link = `/product?id=${encodeURIComponent(appliesKey)}`;
    } else if (appliesTo === 'all'){
      link = `/shop`;
    }
  }

  const banner = document.createElement('div');
  banner.id = 'offerBanner';
  banner.className = 'offer-banner';

  const countdown = document.createElement('span');
  countdown.className = 'offer-countdown';

  const main = document.createElement(link ? 'a' : 'span');
  if (link){
    main.href = link;
  }
  main.textContent = textLine;

  // Make the whole banner clickable (not just the text)
  if (link){
    banner.style.cursor = 'pointer';
    banner.addEventListener('click', (e)=>{
      // Allow default on the anchor itself
      if (e.target && e.target.closest && e.target.closest('a')) return;
      location.href = link;
    });
  }

  banner.appendChild(main);
  if (endsTs){
    banner.appendChild(countdown);
  }

  header.insertAdjacentElement('afterend', banner);

  // Live countdown
  if (endsTs){
    const fmt = (ms)=>{
      const s = Math.max(0, Math.floor(ms/1000));
      const d = Math.floor(s/86400);
      const h = Math.floor((s%86400)/3600);
      const m = Math.floor((s%3600)/60);
      const ss = s%60;
      if (d>0) return `Ends in ${d}d ${h}h ${m}m`;
      return `Ends in ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    };
    const tick = ()=>{
      const left = endsTs - Date.now();
      if (left <= 0){
        banner.remove();
        return;
      }
      countdown.textContent = fmt(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    banner.dataset.timerId = String(id);
  }
}

function applyFloatingWidget(cfg){
  const wUrl = waLink(cfg);
  const tUrl = telLink(cfg);
  if (!wUrl && !tUrl) return;
  if (document.getElementById('cornerContact')) return;

  const wrap = document.createElement('div');
  wrap.id = 'cornerContact';
  wrap.className = 'corner-contact';
  wrap.innerHTML = `
    <button class="corner-btn" type="button" aria-label="Contact">${iconSvg('chat')}</button>
    <div class="corner-menu" aria-hidden="true">
      ${wUrl ? `<a class="corner-item" href="${esc(wUrl)}" target="_blank" rel="noopener">${iconSvg('whatsapp')} <span>WhatsApp</span></a>` : ''}
      ${tUrl ? `<a class="corner-item" href="${esc(tUrl)}">${iconSvg('phone')} <span>Call</span></a>` : ''}
    </div>
  `;
  document.body.appendChild(wrap);

  const btn = wrap.querySelector('.corner-btn');
  const menu = wrap.querySelector('.corner-menu');
  const close = (e) => {
    if (!wrap.contains(e.target)) {
      wrap.classList.remove('open');
      menu?.setAttribute('aria-hidden','true');
    }
  };
  btn?.addEventListener('click', ()=>{
    wrap.classList.toggle('open');
    menu?.setAttribute('aria-hidden', wrap.classList.contains('open') ? 'false' : 'true');
  });
  document.addEventListener('click', close);
}

export async function applySiteUI(){
  const cfg = await getCfg();
  applyNavbar(cfg);
  dedupeHeaderAuthButtons();
  applyNavSearch();
  applyAccountHeaderCleanup();
  applyMobileHamburger();
  applyCartCount();
  applyFooter(cfg);
  applyOffer(cfg);
  applyFloatingWidget(cfg);
  return cfg;
}

// Auto-run for convenience
applySiteUI();

// /assets/js/pages/cart.js
import "../core/site-ui.js";
const yearEl = document.getElementById("year");
yearEl.textContent = String(new Date().getFullYear());

const cartCountEl = document.getElementById("cartCount");
const itemsBadge = document.getElementById("itemsBadge");
const tbody = document.querySelector("#cartTable tbody");
const statusEl = document.getElementById("status");

const clearBtn = document.getElementById("clearBtn");
const checkoutBtn = document.getElementById("checkoutBtn");

const sumItems = document.getElementById("sumItems");
const sumSubtotal = document.getElementById("sumSubtotal");
const sumShipping = document.getElementById("sumShipping");
const sumTotal = document.getElementById("sumTotal");

function getCart(){ try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; } }
function setCart(cart){
  localStorage.setItem("cart", JSON.stringify(cart));
  cartCountEl.textContent = String(cart.reduce((s,x)=>s+Number(x.qty||1),0));
  render();
}
setCart(getCart());

function escapeHtml(str){
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function formatMoney(n){ return `$${Number(n||0).toFixed(2)}`; }
function calcShipping(subtotal){ return subtotal >= 25 ? 0 : (subtotal > 0 ? 3 : 0); }

function render(){
  const cart = getCart();
  itemsBadge.textContent = String(cart.length);

  if (!cart.length){
    tbody.innerHTML = `<tr><td class="muted" colspan="5">Cart is empty.</td></tr>`;
    statusEl.textContent = "";
    checkoutBtn.style.pointerEvents = "none";
    sumItems.textContent="0"; sumSubtotal.textContent="$0.00"; sumShipping.textContent="$0.00"; sumTotal.textContent="$0.00";
    return;
  }
  checkoutBtn.style.pointerEvents = "";

  tbody.innerHTML = cart.map(item => {
    const qty = Number(item.qty || 1);
    const price = Number(item.price || 0);
    const subtotal = qty * price;
    return `
      <tr>
        <td>${escapeHtml(item.name || "—")}</td>
        <td>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="btn" data-dec="${escapeHtml(item.id)}">-</button>
            <input class="input" data-qty="${escapeHtml(item.id)}" value="${escapeHtml(String(qty))}" style="width:60px; padding:8px;" />
            <button class="btn" data-inc="${escapeHtml(item.id)}">+</button>
          </div>
        </td>
        <td>${escapeHtml(formatMoney(price))}</td>
        <td>${escapeHtml(formatMoney(subtotal))}</td>
        <td><button class="btn" data-rm="${escapeHtml(item.id)}">Remove</button></td>
      </tr>
    `;
  }).join("");

  const itemsCount = cart.reduce((s,x)=>s+Number(x.qty||1),0);
  const subtotal = cart.reduce((s,x)=>s+Number(x.qty||1)*Number(x.price||0),0);
  const shipping = calcShipping(subtotal);
  const total = subtotal + shipping;

  sumItems.textContent = String(itemsCount);
  sumSubtotal.textContent = formatMoney(subtotal);
  sumShipping.textContent = formatMoney(shipping);
  sumTotal.textContent = formatMoney(total);

  tbody.querySelectorAll("[data-inc]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-inc");
      const c=getCart();
      const i=c.findIndex(x=>String(x.id)===String(id));
      if (i>=0) c[i].qty = Number(c[i].qty||1)+1;
      setCart(c);
    });
  });

  tbody.querySelectorAll("[data-dec]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-dec");
      const c=getCart();
      const i=c.findIndex(x=>String(x.id)===String(id));
      if (i>=0){ c[i].qty = Math.max(1, Number(c[i].qty||1)-1); setCart(c); }
    });
  });

  tbody.querySelectorAll("[data-rm]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-rm");
      const c=getCart().filter(x=>String(x.id)!==String(id));
      localStorage.setItem("cart", JSON.stringify(c));
      cartCountEl.textContent = String(c.reduce((s,x)=>s+Number(x.qty||1),0));
      render();
      statusEl.textContent="Removed ✅";
      setTimeout(()=>statusEl.textContent="",800);
    });
  });

  tbody.querySelectorAll("[data-qty]").forEach(inp=>{
    inp.addEventListener("change", ()=>{
      const id=inp.getAttribute("data-qty");
      let v=Math.floor(Number(inp.value||1));
      if(!Number.isFinite(v)||v<1) v=1;
      const c=getCart();
      const i=c.findIndex(x=>String(x.id)===String(id));
      if(i>=0) c[i].qty=v;
      setCart(c);
    });
  });
}

clearBtn.addEventListener("click", ()=>{
  if(!confirm("Clear all cart items?")) return;
  localStorage.setItem("cart","[]");
  cartCountEl.textContent="0";
  render();
  statusEl.textContent="Cart cleared ✅";
  setTimeout(()=>statusEl.textContent="",900);
});

render();

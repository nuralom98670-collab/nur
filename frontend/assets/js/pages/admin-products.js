// /assets/js/pages/admin-products.js
import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav } from "../core/ui.js";

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();

const qInput = document.getElementById("q");
const tableBody = document.querySelector("#productsTable tbody");
const countBadge = document.getElementById("countBadge");
const statusEl = document.getElementById("status");

let allProducts = [];

function money(n) {
  const num = Number(n || 0);
  return `$${num.toFixed(2)}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderRows(list) {
  countBadge.textContent = String(list.length);

  if (!list.length) {
    tableBody.innerHTML = `<tr><td class="muted" colspan="6">No products found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = list.map(p => {
    const id = p.id ?? p._id ?? "";
    const name = p.name ?? "—";
    const price = p.price ?? 0;
    const stock = p.stock ?? 0;
    const cat = (p.category?.name ?? p.categoryName ?? "—");

    return `
      <tr>
        <td>${escapeHtml(String(id).slice(-6))}</td>
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(money(price))}</td>
        <td>${escapeHtml(String(stock))}</td>
        <td>${escapeHtml(cat)}</td>
        <td>
          <a class="btn" href="product-edit.html?id=${encodeURIComponent(id)}">Edit</a>
          <button class="btn" data-del="${escapeHtml(String(id))}">Delete</button>
        </td>
      </tr>
    `;
  }).join("");

  // bind delete buttons
  tableBody.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      if (!id) return;

      const ok = confirm("Delete this product?");
      if (!ok) return;

      btn.disabled = true;
      btn.textContent = "Deleting…";

      try {
        await api.del(`/admin/products/${encodeURIComponent(id)}`);
        allProducts = allProducts.filter(x => String(x.id ?? x._id) !== String(id));
        applyFilter();
        statusEl.textContent = "Deleted.";
      } catch (e) {
        statusEl.textContent = (typeof e === "string" ? e : e?.message) || "Delete failed";
        btn.disabled = false;
        btn.textContent = "Delete";
      }
    });
  });
}

function applyFilter() {
  const q = (qInput.value || "").trim().toLowerCase();
  if (!q) return renderRows(allProducts);

  const filtered = allProducts.filter(p => {
    const name = String(p.name ?? "").toLowerCase();
    const cat = String(p.category?.name ?? p.categoryName ?? "").toLowerCase();
    return name.includes(q) || cat.includes(q);
  });

  renderRows(filtered);
}

async function loadProducts() {
  statusEl.textContent = "Loading products…";
  try {
    // Backend should return: [{id/_id,name,price,stock,category:{name}}]
    const data = await api.get("/admin/products");
    allProducts = Array.isArray(data) ? data : (data.items || []);
    statusEl.textContent = "";
    applyFilter();
  } catch (e) {
    tableBody.innerHTML = `<tr><td class="muted" colspan="6">Failed to load products.</td></tr>`;
    statusEl.textContent = (typeof e === "string" ? e : e?.message) || "Error";
  }
}

qInput.addEventListener("input", applyFilter);

loadProducts();

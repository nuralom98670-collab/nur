import "../core/site-ui.js";
const yearEl = document.getElementById("year");
yearEl.textContent = String(new Date().getFullYear());

const cartCountEl = document.getElementById("cartCount");
function getCart(){ try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; } }
cartCountEl.textContent = String(getCart().reduce((s,x)=>s+Number(x.qty||1),0));

const form = document.getElementById("contactForm");
const statusEl = document.getElementById("status");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "Sending…";
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    const r = await fetch("/api/public/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error("Failed");
    statusEl.textContent = "Sent ✅";
    form.reset();
  } catch {
    statusEl.textContent = "Failed to send.";
  }
});

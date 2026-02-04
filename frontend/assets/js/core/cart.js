// /assets/js/core/cart.js
// Shared cart helpers (localStorage-based)
const CART_KEY = "cart";

export function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY) || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function setCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(Array.isArray(cart) ? cart : []));
  } catch {
    // ignore
  }
}

export function getCartCount() {
  const cart = getCart();
  return cart.reduce((sum, x) => sum + Number(x?.qty || 1), 0);
}

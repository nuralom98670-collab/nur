// /assets/js/core/api.js
import { CONFIG } from "./config.js";

/**
 * Create an API client that automatically attaches Authorization header
 * from the given localStorage token key.
 */
function createApi(tokenKey) {
  async function request(path, options = {}) {
    const token = localStorage.getItem(tokenKey);

    const headers = {
      ...(options.headers || {})
    };

    // Only set JSON content-type when body is not FormData
    const isForm = options.body instanceof FormData;
    if (!isForm && !headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json";
    }

    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(CONFIG.API_BASE + path, {
      method: options.method || "GET",
      headers,
      body: options.body,
      // ✅ Always send cookies (Google session login via HttpOnly cookie)
      credentials: "include"
    });

    const text = await res.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text };
    }

    if (!res.ok) {
      const msg = data?.error || data?.message || `API Error (${res.status})`;
      throw new Error(msg);
    }

    return data;
  }

  return {
    get: (path) => request(path),
    post: (path, body) =>
      request(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
    put: (path, body) =>
      request(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
    del: (path) => request(path, { method: "DELETE" }),
    postForm: (path, formData) => request(path, { method: "POST", body: formData }),
    putForm: (path, formData) => request(path, { method: "PUT", body: formData }),

    /**
     * Upload a single file using multipart/form-data.
     * Most admin pages expect server response: { ok:true, url:"/uploads/..." }
     */
    upload: (path, file, fieldName = "file") => {
      const fd = new FormData();
      fd.append(fieldName, file);
      return request(path, { method: "POST", body: fd });
    },
  };
}

// Default: CUSTOMER api
export const api = createApi(CONFIG.TOKEN_KEY);

// Admin-only api (separate token storage so it never overrides customer login)
export const adminApi = createApi(CONFIG.ADMIN_TOKEN_KEY);

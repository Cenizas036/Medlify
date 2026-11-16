/**
 * lib/api.js — Single API client for Medlify
 * Base URL from VITE_API_URL env or proxy (default /api in dev)
 */

const BASE = import.meta.env.VITE_API_URL || '';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  let body;
  try {
    body = await res.json();
  } catch {
    body = { error: `HTTP ${res.status}: ${res.statusText}` };
  }

  if (!res.ok) {
    throw new ApiError(body.error || `Request failed (${res.status})`, res.status);
  }
  return body;
}

export const api = {
  health: () => request('/api/health'),

  searchMedicines: (q, signal) =>
    request(`/api/search/medicines?q=${encodeURIComponent(q)}`, { signal }),

  searchPharmacies: (q, lat, lng, radius, signal) =>
    request(
      `/api/search?q=${encodeURIComponent(q)}&lat=${lat}&lng=${lng}&radius=${radius}`,
      { signal }
    ),

  getPharmacy: (id) => request(`/api/pharmacies/${id}`),

  createOrder: (body) =>
    request('/api/orders', { method: 'POST', body: JSON.stringify(body) }),

  getOrder: (id, signal) => request(`/api/orders/${id}`, { signal }),

  getOrders: (ids) =>
    ids.length === 0
      ? Promise.resolve([])
      : request(`/api/orders?ids=${ids.join(',')}`),

  advanceOrder: (id) =>
    request(`/api/orders/${id}/advance`, { method: 'POST' }),

  cancelOrder: (id) =>
    request(`/api/orders/${id}/cancel`, { method: 'POST' }),
};

export { ApiError };

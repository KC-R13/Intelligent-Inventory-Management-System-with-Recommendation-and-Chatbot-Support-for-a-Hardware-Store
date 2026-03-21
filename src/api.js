/**
 * API Utility — LB POS
 * -------------------------------------------------------
 * All backend requests go through this file.
 * The Node/MySQL backend should expose a REST API
 * (e.g. via Express) on BASE_URL below.
 *
 * Change BASE_URL to match your backend server address.
 * -------------------------------------------------------
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5004/api'

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)

  try {
    const res = await fetch(`${BASE_URL}${path}`, opts)
    if (!res.ok) {
      let errMsg = res.statusText
      try {
        const errData = await res.json()
        errMsg = errData.error || errData.message || errMsg
      } catch (e) {
        // Response wasn't JSON
      }
      throw new Error(`HTTP ${res.status}: ${errMsg}`)
    }
    return res.json()
  } catch (err) {
    console.error(`Fetch failed for ${method} ${BASE_URL}${path}:`, err)
    throw err
  }
}

// ── Dashboard ─────────────────────────────────────────
export const dashboardApi = {
  getSummary:    () => request('GET', '/dashboard/summary'),
  getLowStock:   () => request('GET', '/dashboard/low-stock'),
  getRecentInvoices: (limit = 5) => request('GET', `/invoices?limit=${limit}`),
  getRecommendations: () => request('GET', '/dashboard/recommendations'),
}

// ── Invoices ──────────────────────────────────────────
export const invoicesApi = {
  getAll:    (params = '') => request('GET', `/invoices?${params}`),
  getById:   (id)          => request('GET', `/invoices/${id}`),
  getNext:   ()            => request('GET', '/invoices/next'),
  create:    (data)        => request('POST', '/invoices', data),
  update:    (id, data)    => request('PUT', `/invoices/${id}`, data),
  delete:    (id)          => request('DELETE', `/invoices/${id}`),
}

// ── Products ──────────────────────────────────────────
export const productsApi = {
  search: (q = '') => request('GET', `/products?q=${encodeURIComponent(q)}`),
}

// ── Inventory ─────────────────────────────────────────
export const inventoryApi = {
  getAll:      (params = '') => request('GET', `/inventory?${params}`),
  getById:     (id)          => request('GET', `/inventory/${id}`),
  create:      (data)        => request('POST', '/inventory', data),
  update:      (id, data)    => request('PUT', `/inventory/${id}`, data),
  delete:      (id)          => request('DELETE', `/inventory/${id}`),
  getCategories: ()         => request('GET', '/categories'),
}

// ── Sales ─────────────────────────────────────────────
export const salesApi = {
  getAll:         (params = '') => request('GET', `/sales?${params}`),
  getById:        (id)          => request('GET', `/sales/${id}`),
  getSummary:     (range = 7)   => request('GET', `/sales/summary?range=${range}`),
  getDaily:       (range = 7)   => request('GET', `/sales/daily?range=${range}`),
  getTopProducts: (range = 30)  => request('GET', `/sales/top-products?range=${range}`),
  getRecent:      (limit = 10)  => request('GET', `/sales/recent?limit=${limit}`),
}

// ── Settings ──────────────────────────────────────────
export const settingsApi = {
  get:    ()      => request('GET', '/settings'),
  update: (data)  => request('PUT', '/settings', data),
}

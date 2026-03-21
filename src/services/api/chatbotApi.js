/**
 * API Utility — Chatbot / Assistant
 * -------------------------------------------------------
 * All chatbot requests go through this file.
 * The FastAPI backend runs on BASE_URL below and proxies
 * messages to the Rasa webhook.
 *
 * Change VITE_CHATBOT_URL in your .env to match your
 * backend server address.
 * -------------------------------------------------------
 */

// Determine chatbot backend URL in this order:
// 1) explicit override from VITE_CHATBOT_URL
// 2) backend service directly (no proxy)
const configuredUrl = String(import.meta.env.VITE_CHATBOT_URL || '').trim()
const BASE_URL = configuredUrl || 'http://127.0.0.1:5002/api/chatbot'

console.log('[chatbotApi] BASE_URL=', BASE_URL)

async function request(method, path, body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    }
    if (body) opts.body = JSON.stringify(body)

    const res = await fetch(`${BASE_URL}${path}`, opts)
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(err.message || 'Request failed')
    }
    return res.json()
}

// ── Assistant ─────────────────────────────────────────
export const chatbotApi = {
    /**
     * Send a message to the assistant.
     * @param {string} uid     - Unique identifier for the user/session
     * @param {string} message - The user's message text
     * @returns {Promise<Array<{ recipient_id: string, text: string|null }>>}
     */
    sendMessage: (uid, message) => request('POST', '/chat', { uid, message }),
}
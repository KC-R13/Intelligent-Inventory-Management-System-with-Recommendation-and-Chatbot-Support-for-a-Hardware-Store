import { useState, useRef, useEffect } from 'react'
import './Chatbot.css'
import {chatbotApi} from '../services/api/chatbotApi.js'

// Stable session UID for the lifetime of the page
const SESSION_UID = `user-${Date.now()}`

const SUGGESTIONS = [
  'List all products',
  'Get recommendations',
  'Find products by category: power tools',
  'Check stock levels',
  'Show pricing info',
  'Sales analytics',
]

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function Message({ role, text, time }) {
  const isUser = role === 'user'

  const formatText = (raw) => {
    const lines = raw.split('\n')
    return lines.map((line, i) => {
      if (line.startsWith('|')) return null
      const parts = line.split(/\*\*(.*?)\*\*/g)
      return (
          <p key={i} style={{ margin: '4px 0' }}>
            {parts.map((part, j) =>
                j % 2 === 1
                    ? <strong key={j} style={{ color: 'var(--text-primary)' }}>{part}</strong>
                    : part
            )}
          </p>
      )
    })
  }

  const hasTable = text.includes('|---|')
  const tableLines = hasTable ? text.split('\n').filter(l => l.startsWith('|')) : []
  const nonTableText = hasTable
      ? text.split('\n').filter(l => !l.startsWith('|')).join('\n')
      : text

  return (
      <div className={`message-row ${isUser ? 'user-row' : 'assistant-row'}`}>
        {!isUser && (
            <div className="avatar assistant-avatar">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                <circle cx="12" cy="16" r="1" fill="currentColor"/>
              </svg>
            </div>
        )}

        <div className={`bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
          <div className="bubble-text">
            {formatText(nonTableText)}
            {hasTable && tableLines.length > 0 && (
                <div className="chat-table-wrap">
                  <table className="chat-table">
                    <thead>
                    <tr>
                      {tableLines[0].split('|').filter(c => c.trim()).map((h, i) => (
                          <th key={i}>{h.trim()}</th>
                      ))}
                    </tr>
                    </thead>
                    <tbody>
                    {tableLines.slice(2).map((row, i) => (
                        <tr key={i}>
                          {row.split('|').filter(c => c.trim()).map((cell, j) => (
                              <td key={j}>{cell.trim()}</td>
                          ))}
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
            )}
          </div>
          <span className="bubble-time">{time}</span>
        </div>

        {isUser && (
            <div className="avatar user-avatar">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
        )}
      </div>
  )
}

function TypingIndicator() {
  return (
      <div className="message-row assistant-row">
        <div className="avatar assistant-avatar">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            <circle cx="12" cy="16" r="1" fill="currentColor"/>
          </svg>
        </div>
        <div className="bubble assistant-bubble typing-bubble">
          <span className="dot" /><span className="dot" /><span className="dot" />
        </div>
      </div>
  )
}

export default function Chatbot() {
  console.log('Chatbot component rendering')
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const bottomRef               = useRef(null)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const sendMessage = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg = { role: 'user', text: trimmed, time: getTime() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setError(null)
    setLoading(true)

    try {
      const replies = await chatbotApi.sendMessage(SESSION_UID, trimmed)

      const assistantMsgs = replies
          .filter(r => r.text)
          .map(r => ({ role: 'assistant', text: r.text, time: getTime() }))

      setMessages(prev => [...prev, ...assistantMsgs])
    } catch (err) {
      setError('Could not reach the assistant. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5004/api/chatbot/analytics')
      const data = await response.json()
      setAnalytics(data)
      setShowAnalytics(true)
    } catch (err) {
      console.error('Failed to load analytics:', err)
    }
  }

  return (
    <>
      <div className="chatbot-page">
        <div className="page-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 className="page-title">AI Assistant</h1>
            <p className="page-subtitle">Ask anything about your inventory, suppliers, or sales</p>
          </div>
          <button className="btn btn-secondary" onClick={loadAnalytics} style={{ marginLeft: '10px' }}>
            📊 Analytics
          </button>
        </div>

        <div className="chat-layout">
          {/* Suggested prompts */}
          <div className="suggestions">
            {SUGGESTIONS.map(s => (
                <button
                    key={s}
                    className="suggestion-chip"
                    onClick={() => sendMessage(s)}
                    disabled={loading}
                >
                  {s}
                </button>
            ))}
          </div>

          {/* Chat window */}
          <div className="chat-window card">
            <div className="chat-messages">
              {messages.length === 0 && !loading && (
                  <p className="chat-empty">Ask a question to get started.</p>
              )}

              {messages.map((msg, i) => (
                  <Message key={i} {...msg} />
              ))}

              {loading && <TypingIndicator />}

              {error && (
                  <p className="chat-error">{error}</p>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="chat-input-bar">
              <input
                  className="chat-input"
                  placeholder="Ask about inventory, brands, sales…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
              />
              <button
                  className="btn btn-primary send-btn"
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim()}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22,2 15,22 11,13 2,9"/>
                </svg>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAnalytics && analytics && (
        <div className="analytics-modal-overlay" onClick={() => setShowAnalytics(false)}>
          <div className="analytics-modal" onClick={e => e.stopPropagation()}>
            <div className="analytics-header">
              <h3>🤖 Chatbot Analytics</h3>
              <button className="btn btn-ghost" onClick={() => setShowAnalytics(false)}>×</button>
            </div>
            <div className="analytics-content">
              <div className="analytics-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Queries</span>
                  <span className="stat-value">{analytics.totalQueries}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Uptime</span>
                  <span className="stat-value">{Math.floor(analytics.uptimeSeconds / 3600)}h {Math.floor((analytics.uptimeSeconds % 3600) / 60)}m</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Top Intent</span>
                  <span className="stat-value">{analytics.topIntent}</span>
                </div>
              </div>

              <h4>Intent Breakdown</h4>
              <div className="analytics-intents">
                {analytics.intents.map(intent => (
                  <div key={intent.intent} className="intent-item">
                    <span className="intent-name">{intent.intent}</span>
                    <div className="intent-bar" style={{ width: intent.percentage }}></div>
                    <span className="intent-count">{intent.count} ({intent.percentage})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </>

  )
}

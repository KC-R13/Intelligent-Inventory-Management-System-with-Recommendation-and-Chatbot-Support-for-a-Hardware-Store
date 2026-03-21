import { useState } from 'react'
import './Sidepanel.css'

const NAV_ITEMS = [
  {
    id: 'Dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    id: 'Invoices',
    label: 'Invoices',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/>
      </svg>
    ),
  },
  {
    id: 'Inventory',
    label: 'Inventory',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
  },
  {
    id: 'Sales',
    label: 'Sales',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22,7 13.5,15.5 8.5,10.5 2,17"/>
        <polyline points="16,7 22,7 22,13"/>
      </svg>
    ),
  },
  {
    id: 'Chatbot',
    label: 'AI Assistant',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    id: 'Settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 0 1 1.61 2.35l-1.8.74a8 8 0 0 0-1.28-1.87zm-14.14 0A10 10 0 0 0 3.32 7.28l1.8.74A8 8 0 0 1 6.4 6.15zm16.46 5.82l-1.96.08A8 8 0 0 0 20 12a8 8 0 0 0-.57-1.75zm-18.78 0l1.96.08A8 8 0 0 1 4 12a8 8 0 0 1 .57 1.75zm16.46 4.32a10 10 0 0 1-1.61 2.35l-1.42-1.42a8 8 0 0 0 1.28-1.87zm-14.14 0a10 10 0 0 0 1.61 2.35l1.42-1.42A8 8 0 0 1 5.68 14.4zm10.6 3.35a10 10 0 0 1-2.35 1.61l-.74-1.8a8 8 0 0 0 1.87-1.28zm-7.06 0a10 10 0 0 0 2.35 1.61l.74-1.8a8 8 0 0 1-1.87-1.28z"/>
      </svg>
    ),
  },
]

function Sidepanel({ isOpen, onToggle, onNavigate, currentPage }) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="logo" style={{ opacity: isOpen ? 1 : 0, transition: 'opacity 0.2s' }}>
          <span className="logo-lb">LB</span>
          <span className="logo-pos">POS</span>
        </div>
        <button className="toggle-btn" onClick={onToggle} aria-label="Toggle sidebar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {isOpen
              ? <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></>
              : <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></>
            }
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            title={!isOpen ? item.label : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            {isOpen && <span className="nav-label">{item.label}</span>}
            {currentPage === item.id && <span className="active-bar" />}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item logout-item" title={!isOpen ? 'Logout' : undefined}>
          <span className="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </span>
          {isOpen && <span className="nav-label">Logout</span>}
        </button>
      </div>
    </aside>
  )
}

export default Sidepanel

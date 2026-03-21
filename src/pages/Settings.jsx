import { useState } from 'react'
import './Settings.css'
import { settingsApi } from '../api'

const SECTIONS = ['General', 'Business', 'Notifications', 'API']

export default function Settings() {
  const [section, setSection]   = useState('General')
  const [saved, setSaved]       = useState(false)
  const [settings, setSettings] = useState({
    businessName: 'LB Enterprises',
    currency: 'USD',
    timezone: 'Asia/Colombo',
    taxRate: '15',
    lowStockThreshold: '10',
    emailNotifications: true,
    smsNotifications: false,
    darkMode: true,
    apiUrl: 'http://localhost:5000/api',
    apiKey: '••••••••••••••••',
  })

  const update = (key, value) =>
    setSettings(s => ({ ...s, [key]: value }))

  const handleSave = async () => {
    // await settingsApi.update(settings)    uncomment when the backend ready
    await new Promise(r => setTimeout(r, 500))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your POS system</p>
      </div>

      <div className="settings-layout">
        {/* Section nav */}
        <nav className="settings-nav card">
          {SECTIONS.map(s => (
            <button
              key={s}
              className={`settings-nav-item ${section === s ? 'active' : ''}`}
              onClick={() => setSection(s)}
            >{s}</button>
          ))}
        </nav>

        {/* Content */}
        <div className="settings-content card">
          {saved && <div className="success-banner">✓ Settings saved successfully!</div>}

          {section === 'General' && (
            <SettingsGroup title="General Settings">
              <SettingsRow label="Business Name" desc="Your trading name shown on invoices">
                <input className="form-input" value={settings.businessName} onChange={e => update('businessName', e.target.value)} />
              </SettingsRow>
              <SettingsRow label="Currency" desc="Default currency for all transactions">
                <select className="form-input form-select" value={settings.currency} onChange={e => update('currency', e.target.value)}>
                  <option>USD</option><option>LKR</option><option>EUR</option><option>GBP</option>
                </select>
              </SettingsRow>
              <SettingsRow label="Timezone" desc="Used for date/time display">
                <select className="form-input form-select" value={settings.timezone} onChange={e => update('timezone', e.target.value)}>
                  <option>Asia/Colombo</option><option>UTC</option><option>America/New_York</option>
                </select>
              </SettingsRow>
              <SettingsRow label="Dark Mode" desc="Use dark theme across the app">
                <Toggle value={settings.darkMode} onChange={v => update('darkMode', v)} />
              </SettingsRow>
            </SettingsGroup>
          )}

          {section === 'Business' && (
            <SettingsGroup title="Business Rules">
              <SettingsRow label="Tax Rate (%)" desc="Default tax applied to invoices">
                <input type="number" className="form-input" style={{ width: 120 }} value={settings.taxRate} onChange={e => update('taxRate', e.target.value)} />
              </SettingsRow>
              <SettingsRow label="Low Stock Threshold" desc="Alert when item stock falls below this number">
                <input type="number" className="form-input" style={{ width: 120 }} value={settings.lowStockThreshold} onChange={e => update('lowStockThreshold', e.target.value)} />
              </SettingsRow>
            </SettingsGroup>
          )}

          {section === 'Notifications' && (
            <SettingsGroup title="Notifications">
              <SettingsRow label="Email Notifications" desc="Receive low-stock and daily summary emails">
                <Toggle value={settings.emailNotifications} onChange={v => update('emailNotifications', v)} />
              </SettingsRow>
              <SettingsRow label="SMS Notifications" desc="Receive alerts via SMS">
                <Toggle value={settings.smsNotifications} onChange={v => update('smsNotifications', v)} />
              </SettingsRow>
            </SettingsGroup>
          )}

          {section === 'API' && (
            <SettingsGroup title="Backend API">
              <div className="api-note">
                Configure the connection to your Python/SQLite backend. The backend team should expose a REST API at the URL below.
              </div>
              <SettingsRow label="API Base URL" desc="Your Flask/FastAPI server address">
                <input className="form-input" style={{ width: 300 }} value={settings.apiUrl} onChange={e => update('apiUrl', e.target.value)} />
              </SettingsRow>
              <SettingsRow label="API Key" desc="Bearer token for authentication (if required)">
                <input className="form-input" style={{ width: 300 }} type="password" value={settings.apiKey} onChange={e => update('apiKey', e.target.value)} />
              </SettingsRow>
              <div className="endpoint-list">
                <p className="form-label" style={{ marginBottom: 10 }}>Expected Endpoints</p>
                {[
                  'GET  /api/dashboard/summary',
                  'GET  /api/invoices',
                  'POST /api/invoices',
                  'GET  /api/inventory',
                  'POST /api/inventory',
                  'GET  /api/sales/summary',
                  'GET  /api/settings',
                  'PUT  /api/settings',
                ].map(e => (
                  <div key={e} className="endpoint-row">
                    <span className={`method-badge ${e.startsWith('POST') ? 'post' : e.startsWith('PUT') ? 'put' : 'get'}`}>
                      {e.split(' ')[0]}
                    </span>
                    <span className="endpoint-path">{e.split(' ')[1]}</span>
                  </div>
                ))}
              </div>
            </SettingsGroup>
          )}

          <div className="settings-actions">
            <button className="btn btn-ghost">Reset</button>
            <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsGroup({ title, children }) {
  return (
    <div className="settings-group">
      <h3 className="group-title">{title}</h3>
      <div className="group-rows">{children}</div>
    </div>
  )
}

function SettingsRow({ label, desc, children }) {
  return (
    <div className="settings-row">
      <div className="settings-row-label">
        <span className="row-label">{label}</span>
        {desc && <span className="row-desc">{desc}</span>}
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      className={`toggle ${value ? 'on' : 'off'}`}
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
    >
      <span className="toggle-thumb" />
    </button>
  )
}

import { useState, useEffect } from 'react'
import './Dashboard.css'
import { dashboardApi } from '../api'

//Stat Card
function StatCard({ title, value, change, icon, color }) {
  const isPos = change >= 0
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}1a`, color }}>
        {icon}
      </div>
      <div className="stat-info">
        <span className="stat-title">{title}</span>
        <span className="stat-value">{value}</span>
        {change !== undefined && (
          <span className={`stat-change ${isPos ? 'pos' : 'neg'}`}>
            {isPos ? '▲' : '▼'} {Math.abs(change)}% vs last month
          </span>
        )}
      </div>
    </div>
  )
}

//Low Stock Row
function LowStockRow({ name, sku, stock, threshold }) {
  const pct = Math.min((stock / threshold) * 100, 100)
  const color = pct < 30 ? 'var(--danger)' : pct < 60 ? 'var(--warning)' : 'var(--success)'
  return (
    <div className="ls-row">
      <div className="ls-info">
        <span className="ls-name">{name}</span>
        <span className="ls-sku">{sku}</span>
      </div>
      <div className="ls-bar-wrap">
        <div className="ls-bar" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="ls-count" style={{ color }}>{stock} left</span>
    </div>
  )
}

//Recommendation Row - Enhanced with insights
function RecommendationRow({ name, sku, type, ...data }) {
  const getColor = () => {
    switch (type) {
      case 'highSelling': return 'var(--success)';
      case 'lowSelling': return 'var(--warning)';
      case 'overstocked': return 'var(--info)';
      case 'understocked': return 'var(--danger)';
      default: return 'var(--text)';
    }
  }

  const getInsight = () => {
    if (type === 'highSelling') {
      return {
        metric: `LKR ${data.revenue_last_30d?.toLocaleString() || 0}`,
        label: '30d revenue',
        detail: `${data.daily_avg_sales || 0}/day`
      }
    }
    if (type === 'lowSelling') {
      return {
        metric: data.sold_last_30d || '0',
        label: 'sold (30d)',
        detail: data.stock_recommendation || 'Monitor'
      }
    }
    if (type === 'overstocked') {
      return {
        metric: `${data.current_stock || 0}`,
        label: 'in stock',
        detail: data.action_needed || 'Consider action'
      }
    }
    if (type === 'understocked') {
      return {
        metric: `${data.current_stock || 0}`,
        label: 'in stock',
        detail: data.urgency || 'Reorder'
      }
    }
  }

  const insight = getInsight()

  return (
    <div className="rec-row" style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="rec-info">
        <span className="rec-name" style={{ fontWeight: 600, fontSize: '14px' }}>{name}</span>
        <span className="rec-sku" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sku}</span>
      </div>
      <div style={{ flex: 1, textAlign: 'right', paddingRight: '16px' }}>
        <span style={{ color: getColor(), fontWeight: 600, fontSize: '16px', display: 'block' }}>
          {insight.metric}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {insight.label}
        </span>
      </div>
      <span style={{ fontSize: '11px', color: 'var(--accent)', fontStyle: 'italic' }}>
        {insight.detail}
      </span>
    </div>
  )
}

//Mock Data (replace later for api)
const MOCK_STATS = [
  { title: "Today's Revenue",  value: 'LKR 48,200', change: 12.4, color: 'var(--accent)',  icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
  { title: 'Total Invoices',   value: '38',         change: 5.2,  color: 'var(--info)',    icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg> },
  { title: 'Items in Stock',   value: '1,204',      change: -2.1, color: 'var(--success)', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> },
  { title: 'Low Stock Alerts', value: '5',          color: 'var(--danger)',  icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
]

const MOCK_LOW_STOCK = [
  { name: 'Portland Cement (50kg)', sku: 'SKU-0041', stock: 4,  threshold: 20 },
  { name: 'Iron Rebar 12mm (6m)',   sku: 'SKU-0112', stock: 3,  threshold: 15 },
  { name: 'Roofing Sheet (Box)',    sku: 'SKU-0076', stock: 2,  threshold: 10 },
  { name: 'PVC Pipe 4inch (3m)',    sku: 'SKU-0033', stock: 6,  threshold: 25 },
  { name: 'River Sand (Cube)',      sku: 'SKU-0099', stock: 5,  threshold: 20 },
]

// Recent invoices are now pulled from the backend API

const MOCK_RECOMMENDATIONS = {
  highSelling: [
    { name: 'Portland Cement (50kg)', sku: 'SKU-0041', sales: 150, change: 25 },
    { name: 'Iron Rebar 12mm (6m)', sku: 'SKU-0112', sales: 120, change: 15 },
    { name: 'Roofing Sheet (Box)', sku: 'SKU-0076', sales: 95, change: 10 },
  ],
  lowSelling: [
    { name: 'PVC Pipe 4inch (3m)', sku: 'SKU-0033', sales: 5, change: -20 },
    { name: 'River Sand (Cube)', sku: 'SKU-0099', sales: 8, change: -15 },
  ],
  overstocked: [
    { name: 'Steel Nails (1kg)', sku: 'SKU-0150', stock: 500, salesRate: 2 },
    { name: 'Paint Brush Set', sku: 'SKU-0201', stock: 200, salesRate: 1 },
  ],
  understocked: [
    { name: 'Electrical Wire (100m)', sku: 'SKU-0123', stock: 5, salesRate: 50 },
    { name: 'Concrete Blocks (100pcs)', sku: 'SKU-0134', stock: 10, salesRate: 30 },
  ],
}

const STATUS_BADGE = {
  paid:    'badge-success',
  pending: 'badge-warning',
  overdue: 'badge-danger',
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [lowStock, setLowStock] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [recentInvoices, setRecentInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Dashboard: Fetching from API...')
        
        // Fetch all four endpoints (using api abstraction)
        const [summaryRes, lowStockRes, recsRes, recentInv] = await Promise.all([
          dashboardApi.getSummary(),
          dashboardApi.getLowStock(),
          dashboardApi.getRecommendations(),
          dashboardApi.getRecentInvoices(8),
        ])

        // Map low stock data to component props
        const mappedLowStock = lowStockRes?.map(item => ({
          sku: item.sku,
          name: item.name,
          stock: item.stock,
          threshold: item.threshold,
        })) || []

        setStats(summaryRes)
        setLowStock(mappedLowStock)
        setRecommendations(recsRes)
        setRecentInvoices(Array.isArray(recentInv) ? recentInv : [])
        setError(null)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Build dynamic stats from API response
  const displayStats = stats ? [
    {
      title: "Today's Revenue",
      value: `LKR ${Number(stats.todayRevenue || 0).toLocaleString('en-US')}`,
      change: 0,
      color: 'var(--accent)',
      icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    },
    {
      title: 'Total Invoices',
      value: stats.totalInvoices,
      change: 0,
      color: 'var(--info)',
      icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>,
    },
    {
      title: 'Items in Stock',
      value: stats.itemsInStock?.toLocaleString() || '0',
      change: 0,
      color: 'var(--success)',
      icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
    },
    {
      title: 'Low Stock Alerts',
      value: stats.lowStockAlerts || '0',
      color: 'var(--danger)',
      icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    },
  ] : MOCK_STATS

  if (loading) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Loading...</p>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Fetching data from database...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Error</p>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)', background: 'rgba(255,0,0,0.1)', borderRadius: '8px' }}>
          <strong>Error loading dashboard:</strong><br />{error}
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">{new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        {displayStats.map(s => <StatCard key={s.title} {...s} />)}
      </div>

      {/* Lower Grid */}
      <div className="dash-grid">
        <div className="dash-grid-left">
          {/* Low Stock */}
          <div className="card" style={{ minHeight: '260px' }}>
            <div className="card-head">
              <h2 className="card-title">Low Stock Alerts</h2>
              <span className="badge badge-danger">{lowStock?.length || 0} items</span>
            </div>
            <div className="low-stock-list">
              {lowStock && lowStock.length > 0 ? (
                lowStock.map(item => <LowStockRow key={item.sku} {...item} />)
              ) : (
                <p style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>No low stock items</p>
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div className="card" style={{ minHeight: '360px', overflow: 'hidden' }}>
            <div className="card-head">
              <h2 className="card-title">Inventory Recommendations</h2>
              <span className="badge badge-info">AI Insights</span>
            </div>
            <div className="recommendations">
              {recommendations ? (
                <>
                  <div className="rec-section">
                    <h3 className="rec-title">High Selling Items</h3>
                    <div className="rec-list">
                      {recommendations.highSelling?.length > 0 ? (
                        recommendations.highSelling.map(item => (
                          <RecommendationRow key={item.sku} {...item} type="highSelling" />
                        ))
                      ) : (
                        <p style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>No data</p>
                      )}
                    </div>
                  </div>
                  <div className="rec-section">
                    <h3 className="rec-title">Low Selling Items</h3>
                    <div className="rec-list">
                      {recommendations.lowSelling?.length > 0 ? (
                        recommendations.lowSelling.map(item => (
                          <RecommendationRow key={item.sku} {...item} type="lowSelling" />
                        ))
                      ) : (
                        <p style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>No data</p>
                      )}
                    </div>
                  </div>
                  <div className="rec-section">
                    <h3 className="rec-title">Overstocked Items</h3>
                    <div className="rec-list">
                      {recommendations.overstocked?.length > 0 ? (
                        recommendations.overstocked.map(item => (
                          <RecommendationRow key={item.sku} {...item} type="overstocked" />
                        ))
                      ) : (
                        <p style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>No data</p>
                      )}
                    </div>
                  </div>
                  <div className="rec-section">
                    <h3 className="rec-title">Understocked Items</h3>
                    <div className="rec-list">
                      {recommendations.understocked?.length > 0 ? (
                        recommendations.understocked.map(item => (
                          <RecommendationRow key={item.sku} {...item} type="understocked" />
                        ))
                      ) : (
                        <p style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>No data</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>Generating insights...</p>
              )}
            </div>
          </div>
        </div>

        <div className="dash-grid-right">
          {/* Recent Invoices */}
          <div className="card" style={{ minHeight: '460px', overflow: 'hidden' }}>
            <div className="card-head">
              <h2 className="card-title">Recent Invoices</h2>
              <span className="badge badge-info">{recentInvoices.length} today</span>
            </div>
            <div className="recent-list">
              {recentInvoices.length > 0 ? (
                recentInvoices.map(inv => (
                  <div key={inv.id} className="recent-row">
                    <div className="recent-info">
                      <span className="recent-id">{inv.invoice_no}</span>
                      <span className="recent-customer">{inv.customer_name}</span>
                    </div>
                    <div className="recent-meta">
                      <span className="recent-total">LKR {Number(inv.total_amount || 0).toLocaleString()}</span>
                      <span className={`badge ${STATUS_BADGE[inv.status] || 'badge-info'}`}>{inv.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>No recent invoices</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

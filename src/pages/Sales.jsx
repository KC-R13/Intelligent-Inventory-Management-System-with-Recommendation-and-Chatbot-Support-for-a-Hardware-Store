import { useState, useEffect } from 'react'
import './Sales.css'
import { salesApi } from '../api'

const RANGES = ['7 days', '30 days', '90 days']

// Mini sparkline bar chart
function BarChart({ data }) {
  const max = data.length ? Math.max(...data.map(d => d.value)) : 0
  return (
    <div className="bar-chart">
      {data.length ? data.map((d, i) => (
        <div key={i} className="bar-col">
          <div
            className="bar-fill"
            style={{ height: max ? `${(d.value / max) * 100}%` : '0%' }}
            title={`LKR ${Number(d.value || 0).toLocaleString()}`}
          />
          <span className="bar-label">{d.label}</span>
        </div>
      )) : <div className="empty-state" style={{ padding: 24, width: '100%', textAlign: 'center' }}>No daily revenue data</div>}
    </div>
  )
}

export default function Sales() {
  const [range, setRange] = useState('7 days')
  const [summary, setSummary] = useState({ totalRevenue:0, dailyAverage:0, transactions:0, bestDay: null, bestDayRevenue:0 })
  const [dailyData, setDailyData] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [recentSales, setRecentSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [summaryRes, dailyRes, topRes, recentRes] = await Promise.all([
          salesApi.getSummary(Number(range.split(' ')[0])),
          salesApi.getDaily(Number(range.split(' ')[0])),
          salesApi.getTopProducts(Number(range.split(' ')[0])),
          salesApi.getRecent(12),
        ])

        setSummary({
          totalRevenue: Number(summaryRes.totalRevenue || 0),
          dailyAverage: Number(summaryRes.dailyAverage || 0),
          transactions: Number(summaryRes.transactions || 0),
          bestDay: summaryRes.bestDay,
          bestDayRevenue: Number(summaryRes.bestDayRevenue || 0),
        })

        setDailyData(Array.isArray(dailyRes) ? dailyRes.map(r => ({
          label: new Date(r.label).toLocaleDateString('en-US', { weekday: 'short' }),
          value: Number(r.value || 0),
        })) : [])

        setTopProducts(Array.isArray(topRes) ? topRes.map((p, i) => ({
          ...p,
          pct: p.pct ?? 0,
          revenue: Number(p.revenue || 0),
          units: Number(p.units || 0),
          rank: i + 1,
        })) : [])

        setRecentSales(Array.isArray(recentRes) ? recentRes.map(r => ({
          ...r,
          date: new Date(r.date).toLocaleDateString('en-GB'),
          total: Number(r.total || 0),
        })) : [])
      } catch (err) {
        console.error('Sales data load failed', err)
        setError(err.message || 'Failed to load sales data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [range])

  const totalRevenue = Number(summary.totalRevenue || 0)
  const avgDaily = Number(summary.dailyAverage || 0)
  const topDayDisplay = summary.bestDay ? new Date(summary.bestDay).toLocaleDateString('en-GB') : 'N/A'

  return (
    <div className="sales-page">
      <div className="page-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="page-subtitle">Revenue analytics and transaction history</p>
        </div>
        <div className="range-tabs">
          {RANGES.map(r => (
            <button
              key={r}
              className={`cat-tab ${range === r ? 'active' : ''}`}
              onClick={() => setRange(r)}
            >{r}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading sales data...</div>
      ) : error ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)', background: 'rgba(255,0,0,0.1)', borderRadius: 8 }}>
          <strong>Error loading sales data:</strong><br />{error}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="sales-stat-row">
        {[
          { title: 'Total Revenue', value: `LKR ${totalRevenue.toLocaleString()}`, sub: `Last ${range}` },
          { title: 'Daily Average', value: `LKR ${avgDaily.toLocaleString()}`, sub: `Last ${range}` },
          { title: 'Transactions', value: `${summary.transactions}`, sub: `Last ${range}` },
          { title: 'Top Day', value: topDayDisplay, sub: `LKR ${Number(summary.bestDayRevenue || 0).toLocaleString()}` },
        ].map(s => (
          <div className="sales-stat-card card" key={s.title}>
            <span className="stat-title">{s.title}</span>
            <span className="stat-value">{s.value}</span>
            <span className="stat-sub">{s.sub}</span>
          </div>
        ))}
      </div>

      <div className="sales-grid">
        {/* Revenue chart */}
        <div className="card chart-card">
          <div className="card-head">
            <h2 className="card-title">Daily Revenue</h2>
            <span className="badge badge-success">↑ 14.2%</span>
          </div>
          <BarChart data={dailyData} />
        </div>

        {/* Top products */}
        <div className="card">
          <div className="card-head">
            <h2 className="card-title">Top Products</h2>
          </div>
          <div className="top-products">
            {topProducts.length > 0 ? topProducts.map((p) => (
              <div key={p.name} className="top-row">
                <span className="top-rank">#{p.rank}</span>
                <div className="top-info">
                  <span className="top-name">{p.name}</span>
                  <div className="top-bar-wrap">
                    <div className="top-bar" style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
                <div className="top-meta">
                  <span className="mono-text">LKR {p.revenue.toLocaleString()}</span>
                  <span className="muted-text" style={{ fontSize: '0.75rem' }}>{p.units} units</span>
                </div>
              </div>
            )) : (
              <div className="empty-state" style={{ padding: 16 }}>No top product data</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h2 className="card-title">Recent Transactions</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sale ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length > 0 ? recentSales.map(s => (
                <tr key={s.id}>
                  <td><span className="mono-text" style={{ color:'var(--info)' }}>{s.id}</span></td>
                  <td>{s.customer}</td>
                  <td className="muted-text">{s.items}</td>
                  <td><span className="mono-text">LKR {s.total.toFixed(2)}</span></td>
                  <td className="muted-text">{s.date}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '16px' }}>No recent sales available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  )
}

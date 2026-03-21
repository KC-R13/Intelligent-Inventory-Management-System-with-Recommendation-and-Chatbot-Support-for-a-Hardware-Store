import { useState, useEffect } from 'react'
import './Inventory.css'
import { inventoryApi } from '../api'

const STATIC_CATEGORIES = ['All', 'Hand Tools', 'Power Tools', 'Fasteners', 'Plumbing', 'Electrical', 'Safety & PPE']

export default function Inventory() {
  const [items, setItems] = useState([])
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('All')
  const [categories, setCategories] = useState(STATIC_CATEGORIES)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [newItem, setNewItem]   = useState({ name:'', category:'', stock:'', price:'', threshold:'' })
  const [editingItem, setEditingItem] = useState(null)

  // Fetch inventory from API
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        console.log('Starting inventory fetch...')
        
        // First test the health endpoint
        console.log('Testing API health...')
        const healthRes = await fetch('http://localhost:5004/api/health')
        console.log('Health response:', healthRes.status, healthRes.statusText)
        
        // Then try inventory
        console.log('Fetching inventory...')
        const invRes = await fetch('http://localhost:5004/api/inventory')
        console.log('Inventory response:', invRes.status, invRes.statusText)
        
        if (!invRes.ok) {
          const text = await invRes.text()
          throw new Error(`HTTP ${invRes.status}: ${text}`)
        }
        
        const data = await invRes.json()
        console.log('Parsed data:', data)
        
        if (!Array.isArray(data)) {
          throw new Error('API did not return an array: ' + JSON.stringify(data))
        }
        
        // Map API response to expected format
        const mapped = data.map(item => ({
          inventoryId: item.inventory_id || item.id,
          sku: item.sku,
          id: item.sku,
          name: item.name,
          category: item.category,
          stock: item.quantity_on_hand,
          threshold: item.reorder_point || item.reorder_qty || 0,
          price: item.sell_price || 0,
        }))
        console.log('Mapped items:', mapped.length)
        setItems(mapped)
        setError(null)
      } catch (err) {
        console.error('Inventory fetch failed:', {
          message: err.message,
          stack: err.stack,
          type: err.constructor.name,
        })
        setError(err.message || 'Unknown error occurred')
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    fetchInventory()
  }, [])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await inventoryApi.getCategories()
        if (Array.isArray(data) && data.length > 0) {
          const names = data.map(cat => cat.name)
          setCategories([...STATIC_CATEGORIES, ...names.filter(n => !STATIC_CATEGORIES.includes(n))])
        }
      } catch (err) {
        console.warn('Failed to load categories:', err)
      }
    }
    fetchCategories()
  }, [])

  const filtered = items.filter(item => {
    const matchCat   = category === 'All' || item.category === category
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.id.includes(search)
    return matchCat && matchSearch
  })

  const stockStatus = (stock, threshold) => {
    const pct = stock / threshold
    if (pct < 0.3) return { label: 'Critical', cls: 'badge-danger' }
    if (pct < 0.6) return { label: 'Low',      cls: 'badge-warning' }
    return { label: 'OK', cls: 'badge-success' }
  }

  const handleSaveItem = async () => {
    if (!newItem.name.trim() || !newItem.category.trim()) {
      setError('Name and category are required.')
      return
    }

    const payload = {
      name: newItem.name.trim(),
      category: newItem.category.trim(),
      stock: Number(newItem.stock),
      price: Number(newItem.price),
      threshold: Number(newItem.threshold),
    }

    if (Number.isNaN(payload.stock) || Number.isNaN(payload.price) || Number.isNaN(payload.threshold)) {
      setError('Stock, price and threshold must be valid numbers.')
      return
    }

    setSaving(true)

    try {
      let result
      if (editingItem) {
        result = await inventoryApi.update(editingItem.inventoryId, payload)
      } else {
        result = await inventoryApi.create(payload)
      }

      const mapped = {
        inventoryId: result.inventory_id || result.id || editingItem?.inventoryId,
        id: result.sku,
        sku: result.sku,
        name: result.name,
        category: result.category,
        stock: result.quantity_on_hand || 0,
        threshold: result.reorder_point || result.reorder_qty || 0,
        price: result.sell_price || 0,
      }

      setItems(prev => {
        if (editingItem) {
          return prev.map(item => item.inventoryId === editingItem.inventoryId ? mapped : item)
        }
        return [...prev, mapped]
      })

      setShowForm(false)
      setEditingItem(null)
      setNewItem({ name:'', category:'', stock:'', price:'', threshold:'' })
      setError(null)
    } catch (err) {
      console.error('Inventory save failed:', err)
      setError(err.message || 'Failed to save inventory item')
    } finally {
      setSaving(false)
    }
  }

  const handleEditItem = (item) => {
    setEditingItem(item)
    setNewItem({
      name: item.name,
      category: item.category,
      stock: String(item.stock),
      price: String(item.price),
      threshold: String(item.threshold),
    })
    setShowForm(true)
    setError(null)
  }

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete ${item.name} (${item.sku})?`)) return

    try {
      await inventoryApi.delete(item.inventoryId)
      setItems(prev => prev.filter(i => i.inventoryId !== item.inventoryId))
      if (editingItem?.inventoryId === item.inventoryId) {
        setEditingItem(null)
        setShowForm(false)
      }
      setError(null)
    } catch (err) {
      console.error('Inventory delete failed:', err)
      setError(err.message || 'Failed to delete inventory item')
    }
  }

  return (
    <div className="inventory-page">
      <div className="page-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">{items.length} products · {items.filter(i => i.stock < i.threshold).length} low stock</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '← Back to List' : '+ Add Item'}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading inventory...
        </div>
      ) : error ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)', background: 'rgba(255,0,0,0.1)', borderRadius: '8px' }}>
          <strong>Error loading inventory:</strong><br />{error}
        </div>
      ) : !showForm && (
        <>
          <div className="inv-toolbar">
            <input
              className="search-input"
              placeholder="Search by name or SKU…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="cat-tabs">
              {categories.map(c => (
                <button
                  key={c}
                  className={`cat-tab ${category === c ? 'active' : ''}`}
                  onClick={() => setCategory(c)}
                >{c}</button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Stock</th>
                    <th>Unit Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => {
                    const { label, cls } = stockStatus(item.stock, item.threshold)
                    return (
                      <tr key={item.inventoryId}>
                        <td><span className="mono-text" style={{ color: 'var(--accent)' }}>{item.sku}</span></td>
                        <td style={{ fontWeight: 500 }}>{item.name}</td>
                        <td><span className="badge badge-info">{item.category}</span></td>
                        <td>
                          <div className="stock-cell">
                            <span className="mono-text">{item.stock}</span>
                            <div className="mini-bar-wrap">
                              <div className="mini-bar" style={{
                                width: `${Math.min((item.stock / item.threshold) * 100, 100)}%`,
                                background: cls === 'badge-danger' ? 'var(--danger)' : cls === 'badge-warning' ? 'var(--warning)' : 'var(--success)'
                              }} />
                            </div>
                          </div>
                        </td>
                        <td><span className="mono-text">LKR {item.price.toFixed(2)}</span></td>
                        <td><span className={`badge ${cls}`}>{label}</span></td>
                        <td>
                          <div className="action-btns">
                            <button className="icon-btn" title="Edit" onClick={() => handleEditItem(item)}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-square-pen-icon lucide-square-pen"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>
                            </button>
                            <button className="icon-btn danger" title="Delete" onClick={() => handleDeleteItem(item)}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="empty-state">No items match your search.</div>
            )}
          </div>
        </>
      )}

      {showForm && (
        <div className="card" style={{ maxWidth: 600 }}>
          <h2 className="card-title" style={{ marginBottom: 24 }}>
            {editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
          </h2>
          <div className="form-grid">
            {[
              { key: 'name',      label: 'Product Name',    placeholder: 'e.g. Portland Cement' },
              { key: 'category',  label: 'Category',        placeholder: 'e.g. Building Material' },
              { key: 'stock',     label: 'Initial Stock',   placeholder: 'e.g. 50', type: 'number' },
              { key: 'price',     label: 'Unit Price (LKR)',   placeholder: 'e.g. 1.50', type: 'number' },
              { key: 'threshold', label: 'Low Stock Alert',  placeholder: 'e.g. 10', type: 'number' },
            ].map(f => (
              <div key={f.key} className="form-field">
                <label className="form-label">{f.label}</label>
                {f.key === 'category' ? (
                  <select
                    className="form-input"
                    value={newItem.category}
                    onChange={e => setNewItem(n => ({ ...n, category: e.target.value }))}
                  >
                    <option value="" disabled>Select category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type || 'text'}
                    className="form-input"
                    placeholder={f.placeholder}
                    value={newItem[f.key]}
                    onChange={e => setNewItem(n => ({ ...n, [f.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => {
              setShowForm(false)
              setEditingItem(null)
              setNewItem({ name:'', category:'', stock:'', price:'', threshold:'' })
              setError(null)
            }} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveItem} disabled={saving}>
              {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Save Item'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

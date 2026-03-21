import { useState, useEffect } from 'react'
import './Invoices.css'
import { invoicesApi, productsApi } from '../api'

const TODAY_DATE = new Date().toISOString().split('T')[0]

const EMPTY_FORM = {
  customerName: '',
  invoiceNo: '',
  invoiceDate: TODAY_DATE,
  discount: '',
  status: 'pending',
}

const MOCK_INVOICES = [
  { id: 'INV-2041', customer: 'Ashan Perera',       date: '2026-03-12', total: 34000,  status: 'paid' },
  { id: 'INV-2040', customer: 'Nilmini Fernando',   date: '2026-03-12', total: 8250,   status: 'pending' },
  { id: 'INV-2039', customer: 'Kasun Silva',         date: '2026-03-11', total: 120000, status: 'paid' },
  { id: 'INV-2038', customer: 'Dilani Jayawardena',  date: '2026-03-10', total: 4500,  status: 'overdue' },
  { id: 'INV-2037', customer: 'Ruwantha Bandara',    date: '2026-03-09', total: 67000, status: 'paid' },
]

const STATUS_BADGE = {
  paid:    'badge-success',
  pending: 'badge-warning',
  overdue: 'badge-danger',
}

export default function Invoices() {
  const [form, setForm]       = useState(EMPTY_FORM)
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [tab, setTab]         = useState('list') // 'list' | 'new'
  const [invoices, setInvoices] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [viewInvoice, setViewInvoice] = useState(null)
  const [isLoadingInvoiceNo, setIsLoadingInvoiceNo] = useState(false)
  const [search, setSearch] = useState('')
  const [fetchError, setFetchError] = useState(null)

  const [lineItems, setLineItems] = useState([])
  const [itemInput, setItemInput] = useState('')
  const [itemQuantity, setItemQuantity] = useState(1)
  const [productSuggestions, setProductSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const data = await invoicesApi.getAll()
        setInvoices(data)
        setFetchError(null)
      } catch (err) {
        console.error('Error loading invoices', err)
        setFetchError(err.message)
      }
    }
    loadInvoices()
  }, [])

  const validate = () => {
    const e = {}
    if (!form.customerName.trim()) e.customerName = 'Required'
    if (!form.invoiceDate)         e.invoiceDate  = 'Required'
    if (!lineItems.length)         e.lineItems    = 'Add at least one product line item'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    try {
      const payload = {
        customerName: form.customerName,
        invoiceNo: form.invoiceNo,
        invoiceDate: form.invoiceDate,
        status: form.status,
      }

      let result
      const discountPct = Number(form.discount) || 0
      payload.discount = discountPct
      payload.items = lineItems.map(item => ({
        itemId: item.sku,
        quantity: item.quantity,
      }))

      if (editingId) {
        payload.status = form.status || 'pending'
        payload.discount = discountPct
        result = await invoicesApi.update(editingId, payload)
        setInvoices(prev => prev.map(inv => inv.id === editingId ? result : inv))
        setSuccessMessage('Invoice updated successfully!')
      } else {
        payload.status = form.status || 'pending'

        result = await invoicesApi.create(payload)
        setInvoices(prev => [{
          id: result.id,
          invoice_no: result.invoice_no,
          customer_name: result.customer_name,
          invoice_date: result.invoice_date,
          total_amount: result.total_amount,
          status: result.status,
        }, ...prev])
        setSuccessMessage('Invoice created successfully!')
      }

      setSuccess(true)
      setForm(EMPTY_FORM)
      setLineItems([])
      setItemInput('')
      setItemQuantity(1)
      setSelectedProduct(null)
      setEditingId(null)
      setErrors({})
      setTimeout(() => {
        setSuccess(false)
        setSuccessMessage('')
        setTab('list')
      }, 1500)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const update = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  const fetchProductSuggestions = async (q) => {
    if (!q || !q.trim()) {
      setProductSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      const items = await productsApi.search(q.trim())
      setProductSuggestions(items)
      setShowSuggestions(true)
    } catch (err) {
      console.error('Product suggestion fetch failed', err)
      setProductSuggestions([])
      setShowSuggestions(false)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchProductSuggestions(itemInput)
    }, 260)
    return () => clearTimeout(timeout)
  }, [itemInput])

  const applySuggestion = (product) => {
    setItemInput(`${product.name} (${product.sku})`)
    setSelectedProduct(product)
    setItemQuantity(1)
    setShowSuggestions(false)
  }

  const addLineItem = () => {
    const qty = Number(itemQuantity)
    if (!selectedProduct || Number.isNaN(qty) || qty <= 0) {
      alert('Select a valid product and quantity first')
      return
    }

    const existingIndex = lineItems.findIndex(item => item.sku === selectedProduct.sku)
    const linePrice = Number(selectedProduct.sell_price)
    if (existingIndex >= 0) {
      const updated = [...lineItems]
      updated[existingIndex].quantity += qty
      updated[existingIndex].line_total = Number((updated[existingIndex].quantity * linePrice).toFixed(2))
      setLineItems(updated)
    } else {
      setLineItems(prev => [
        ...prev,
        {
          product_id: selectedProduct.id,
          sku: selectedProduct.sku,
          name: selectedProduct.name,
          quantity: qty,
          unit_price: linePrice,
          line_total: Number((qty * linePrice).toFixed(2)),
        }
      ])
    }

    setItemInput('')
    setItemQuantity(1)
    setSelectedProduct(null)
    setProductSuggestions([])
  }

  const removeLineItem = (sku) => {
    setLineItems(prev => prev.filter(item => item.sku !== sku))
  }

  const handleViewInvoice = async (inv) => {
    try {
      const invoice = await invoicesApi.getById(inv.id)
      setViewInvoice(invoice)
    } catch (err) {
      alert('Error loading invoice details: ' + err.message)
    }
  }

  const handleEditInvoice = async (inv) => {
    try {
      const invoice = await invoicesApi.getById(inv.id)
      setEditingId(invoice.id)
      setForm({
        customerName: invoice.customer_name,
        invoiceNo: invoice.invoice_no,
        invoiceDate: String(invoice.invoice_date).split('T')[0],
        discount: Number(invoice.discount_pct || 0).toFixed(2),
        status: invoice.status || 'pending',
      })
      setLineItems((invoice.items || []).map(item => ({
        product_id: item.product_id,
        sku: item.sku,
        name: item.product_name || item.sku,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        line_total: Number(item.line_total),
      })))
      setTab('new')
    } catch (err) {
      alert('Error loading invoice to edit: ' + err.message)
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setLineItems([])
    setItemInput('')
    setItemQuantity(1)
    setSelectedProduct(null)
    setShowSuggestions(false)
    setTab('list')
  }

  const loadNextInvoiceNo = async () => {
    try {
      setIsLoadingInvoiceNo(true)
      const result = await invoicesApi.getNext()
      setForm(f => ({ ...f, invoiceNo: result.nextInvoiceNo || '' }))
    } catch (err) {
      console.error('Failed to load next invoice number', err)
    } finally {
      setIsLoadingInvoiceNo(false)
    }
  }

  useEffect(() => {
    if (tab === 'new' && !editingId) {
      const now = new Date().toISOString().split('T')[0]
      setForm(f => ({ ...EMPTY_FORM, invoiceDate: now, status: 'pending', invoiceNo: '' }))
      setLineItems([])
      setItemInput('')
      setItemQuantity(1)
      setSelectedProduct(null)
      loadNextInvoiceNo()
    }
  }, [tab, editingId])

  const handleDeleteInvoice = async (id) => {
    if (!window.confirm('Delete this invoice permanently?')) return
    try {
      await invoicesApi.delete(id)
      setInvoices(prev => prev.filter(inv => inv.id !== id))
      if (viewInvoice?.id === id) setViewInvoice(null)
      if (editingId === id) cancelEdit()
    } catch (err) {
      alert('Error deleting invoice: ' + err.message)
    }
  }

  const filteredInvoices = invoices.filter(inv => {
    if (!search.trim()) return true
    const term = search.trim().toLowerCase()
    return inv.invoice_no.toLowerCase().includes(term)
      || inv.customer_name.toLowerCase().includes(term)
  })

  return (
    <div className="invoices-page">
      <div className="page-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Manage and track all customer invoices</p>
        </div>
        <button className="btn btn-primary" onClick={() => { if (tab === 'new') setTab('list'); else setTab('new') }}>
          {tab === 'new' ? '← Back to List' : '+ New Invoice'}
        </button>
      </div>
      {tab === 'list' && (
        <div className="card">
          <div className="card-head">
            <h2 className="card-title">All Invoices</h2>
            <input
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice number or customer name…"
            />
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {fetchError && (
                  <tr><td colSpan="6" style={{ padding: '16px', color: 'var(--danger)' }}>Error loading invoices: {fetchError}</td></tr>
                )}
                {!fetchError && filteredInvoices.length === 0 && (
                  <tr><td colSpan="6" style={{ padding: '16px', color: 'var(--text-muted)' }}>
                    {invoices.length === 0 ? 'No invoices yet.' : 'No invoices found for this search.'}
                  </td></tr>
                )}
                {filteredInvoices.map(inv => (
                  <tr key={inv.id}>
                    <td><span className="mono-text">{inv.invoice_no}</span></td>
                    <td>{inv.customer_name}</td>
                    <td className="muted-text">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                    <td><span className="mono-text">LKR {Number(inv.total_amount).toFixed(2)}</span></td>
                    <td><span className={`badge ${STATUS_BADGE[inv.status] || 'badge-info'}`}>{inv.status}</span></td>
                    <td>
                      <div className="action-btns">
                        <button className="icon-btn" title="View" onClick={() => handleViewInvoice(inv)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-icon lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button className="icon-btn" title="Edit" onClick={() => handleEditInvoice(inv)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-square-pen-icon lucide-square-pen"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>
                        </button>
                        <button className="icon-btn danger" title="Delete" onClick={() => handleDeleteInvoice(inv.id)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewInvoice && (
        <div className="invoice-modal-overlay">
          <div className="invoice-modal">
            <div className="invoice-modal-header">
              <h2>Invoice {viewInvoice.invoice_no}</h2>
              <button className="btn btn-ghost" onClick={() => setViewInvoice(null)}>Close</button>
            </div>
            <div className="invoice-modal-content">
              <p><strong>Customer:</strong> {viewInvoice.customer_name}</p>
              <p><strong>Date:</strong> {new Date(viewInvoice.invoice_date).toLocaleDateString()}</p>
              <p><strong>Status:</strong> {viewInvoice.status}</p>
              <p><strong>Discount:</strong> {Number(viewInvoice.discount_pct || 0).toFixed(2)}%</p>
              <p><strong>Total:</strong> LKR {Number(viewInvoice.total_amount).toFixed(2)}</p>

              <h3>Items</h3>
              {!viewInvoice.items || viewInvoice.items.length === 0 ? (
                <p>No items available.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Name</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewInvoice.items.map(item => (
                      <tr key={item.id}>
                        <td>{item.sku}</td>
                        <td>{item.product_name || 'N/A'}</td>
                        <td>{item.quantity}</td>
                        <td>LKR {Number(item.unit_price).toFixed(2)}</td>
                        <td>LKR {Number(item.line_total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'new' && (
        <div className="card invoice-form-card">
          <h2 className="card-title" style={{ marginBottom: 24 }}>
            {editingId ? 'Edit Invoice' : 'Create New Invoice'}
          </h2>

          {success && (
            <div className="success-banner">
              ✓ {successMessage || (editingId ? 'Invoice updated successfully!' : 'Invoice created successfully!')}
            </div>
          )}

          <div className="form-grid">
            <FormField label="Customer Name" error={errors.customerName} required>
              <input
                className={`form-input ${errors.customerName ? 'input-error' : ''}`}
                placeholder="e.g. Ashan Perera"
                value={form.customerName}
                onChange={e => update('customerName', e.target.value)}
              />
            </FormField>

            <FormField label="Invoice No." error={errors.invoiceNo} required>
              <input
                className={`form-input ${errors.invoiceNo ? 'input-error' : ''}`}
                placeholder={isLoadingInvoiceNo ? 'Loading invoice number…' : 'Auto-generated invoice number'}
                value={form.invoiceNo}
                readOnly={!editingId}
                onChange={e => editingId && update('invoiceNo', e.target.value)}
              />
            </FormField>

            <FormField label="Invoice Date" error={errors.invoiceDate} required>
              <input
                type="date"
                className={`form-input ${errors.invoiceDate ? 'input-error' : ''}`}
                value={form.invoiceDate}
                onChange={e => update('invoiceDate', e.target.value)}
              />
            </FormField>

            <FormField label="Status" required>
              <select
                className="form-input"
                value={form.status}
                onChange={e => update('status', e.target.value)}
              >
                <option value="pending">pending</option>
                <option value="paid">paid</option>
                <option value="overdue">overdue</option>
              </select>
            </FormField>

            <FormField label="Product (name or SKU)" error={errors.lineItems} required>
              <input
                className={`form-input ${errors.lineItems ? 'input-error' : ''}`}
                placeholder="Type product name or SKU (e.g. cord)"
                value={itemInput}
                onChange={e => {
                  setItemInput(e.target.value)
                  setSelectedProduct(null)
                  setShowSuggestions(true)
                }}
                onFocus={() => { if (productSuggestions.length) setShowSuggestions(true) }}
              />
              {selectedProduct && (
                <div style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                  selected: {selectedProduct.name} ({selectedProduct.sku})
                </div>
              )}
              {showSuggestions && productSuggestions.length > 0 && (
                <ul className="suggestions-list">
                  {productSuggestions.map(prod => (
                    <li key={prod.id} onClick={() => applySuggestion(prod)}>
                      <strong>{prod.name}</strong> ({prod.sku}) • LKR {Number(prod.sell_price).toFixed(2)}
                    </li>
                  ))}
                </ul>
              )}
            </FormField>

            <FormField label="Quantity" error={errors.quantity} required>
              <input
                type="number"
                min="1"
                className={`form-input ${errors.quantity ? 'input-error' : ''}`}
                placeholder="e.g. 10"
                value={itemQuantity}
                onChange={e => setItemQuantity(Number(e.target.value))}
              />
            </FormField>

            <div style={{ alignSelf: 'center', marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={addLineItem}>
                + Add Product
              </button>
            </div>

            {lineItems.length > 0 && (
              <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                <h4>Invoice Products</h4>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Name</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>Total</th>
                      <th>Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map(item => (
                      <tr key={item.sku}>
                        <td>{item.sku}</td>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>LKR {item.unit_price.toFixed(2)}</td>
                        <td>LKR {item.line_total.toFixed(2)}</td>
                        <td>
                          <button className="icon-btn danger" type="button" onClick={() => removeLineItem(item.sku)}>x</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <FormField label="Discount (%)" error={errors.discount}>
              <input
                type="number"
                min="0"
                max="100"
                className="form-input"
                placeholder="e.g. 5"
                value={form.discount}
                onChange={e => update('discount', e.target.value)}
              />
            </FormField>

            <div className="invoice-totals" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
              <div className="invoice-total-row"><span>Sub-total</span><strong>LKR {lineItems.reduce((sum, item) => sum + item.line_total, 0).toFixed(2)}</strong></div>
              <div className="invoice-total-row"><span>Discount ({Number(form.discount || 0).toFixed(2)}%)</span><strong>LKR {(lineItems.reduce((sum, item) => sum + item.line_total, 0) * (Number(form.discount || 0) / 100)).toFixed(2)}</strong></div>
              <div className="invoice-total-row total-final"><span>Total after discount</span><strong>LKR {((lineItems.reduce((sum, item) => sum + item.line_total, 0) * (1 - Number(form.discount || 0) / 100))).toFixed(2)}</strong></div>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving…' : editingId ? 'Update Invoice' : 'Create Invoice'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FormField({ label, error, required, children }) {
  return (
    <div className="form-field">
      <label className="form-label">
        {label}{required && <span className="required-star">*</span>}
      </label>
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}

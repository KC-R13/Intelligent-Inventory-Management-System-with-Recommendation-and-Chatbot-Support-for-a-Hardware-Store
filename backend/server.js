import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mysql from 'mysql2/promise'

dotenv.config()

const PORT = process.env.API_PORT || 5002
const db = await mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hardware_store',
  connectionLimit: 10,
  waitForConnections: true,
  decimalNumbers: true,
  supportBigNumbers: true,
})

// Test connection
try {
  const conn = await db.getConnection()
  console.log('✓ MySQL connected successfully')
  conn.release()
} catch (err) {
  console.error('✗ MySQL connection failed:', err.message)
  process.exit(1)
}

const app = express()
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}))
app.use(express.json())

// Simple in-memory analytics for chatbot intents
const chatbotAnalytics = {
  intents: {},
  totalQueries: 0,
  startTime: Date.now()
}

// Reset analytics daily (simple implementation)
setInterval(() => {
  chatbotAnalytics.intents = {}
  chatbotAnalytics.totalQueries = 0
  chatbotAnalytics.startTime = Date.now()
}, 24 * 60 * 60 * 1000) // 24 hours

// Ensure key tables exist for invoices and sales
await db.query(`
  CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_no VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    invoice_date DATE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
    status ENUM('paid','pending','overdue') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`)
await db.query(`
  CREATE TABLE IF NOT EXISTS invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    product_id INT NOT NULL,
    sku VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  )
`)
await db.query(`
  CREATE TABLE IF NOT EXISTS sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    invoice_id INT NULL,
    quantity_sold INT NOT NULL,
    sale_price DECIMAL(12,2) NULL,
    unit_price DECIMAL(12,2) NULL,
    cost_at_sale DECIMAL(12,2) NULL,
    sale_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
  )
`)

// Ensure compatibility with existing sales schema from prior versions
const [salesColumns] = await db.query(
  `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sales'`,
  [process.env.DB_NAME || 'hardware_store']
)
const salesColumnSet = new Set(salesColumns.map(c => c.COLUMN_NAME))

if (!salesColumnSet.has('invoice_id')) {
  await db.query('ALTER TABLE sales ADD COLUMN invoice_id INT NULL')
}
if (!salesColumnSet.has('sale_price')) {
  await db.query('ALTER TABLE sales ADD COLUMN sale_price DECIMAL(12,2) NULL')
}
if (!salesColumnSet.has('unit_price')) {
  await db.query('ALTER TABLE sales ADD COLUMN unit_price DECIMAL(12,2) NULL')
}
if (!salesColumnSet.has('cost_at_sale')) {
  await db.query('ALTER TABLE sales ADD COLUMN cost_at_sale DECIMAL(12,2) NULL')
}

const [invoiceColumns] = await db.query(
  `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'invoices'`,
  [process.env.DB_NAME || 'hardware_store']
)
const invoiceColumnSet = new Set(invoiceColumns.map(c => c.COLUMN_NAME))
if (!invoiceColumnSet.has('discount_pct')) {
  await db.query('ALTER TABLE invoices ADD COLUMN discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0')
}

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Hardware POS Backend API',
    endpoints: {
      health: '/api/health',
      inventory: '/api/inventory',
      dashboard_summary: '/api/dashboard/summary',
      dashboard_low_stock: '/api/dashboard/low-stock',
      dashboard_recommendations: '/api/dashboard/recommendations',
    }
  })
})

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.get('/api/inventory', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT i.id AS inventory_id, p.sku, p.name, c.name AS category, i.quantity_on_hand, i.quantity_reserved,
             p.reorder_point, p.reorder_qty, p.sell_price
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = TRUE
      ORDER BY p.name
    `)
    console.log(`[API] /api/inventory returned ${rows.length} items`)
    res.json(rows)
  } catch (err) {
    console.error('[API] /api/inventory error:', err.message)
    res.status(500).json({ error: err.message })
  }
})
async function getNextInvoiceNumber() {
  const [[row]] = await db.query(`
    SELECT invoice_no FROM invoices
    WHERE invoice_no REGEXP '^INV-[0-9]+$'
    ORDER BY CAST(SUBSTRING(invoice_no, 5) AS UNSIGNED) DESC
    LIMIT 1
  `)
  const base = 22456
  if (!row || !row.invoice_no) {
    return `INV-${base}`
  }
  const existingNum = parseInt((row.invoice_no.match(/\d+/) || ['0'])[0], 10)
  return `INV-${Math.max(base, existingNum + 1)}`
}

app.post('/api/invoices/fix-numbering', async (req, res) => {
  let nextInvoice = parseInt(req.body?.start || '22456', 10)
  if (Number.isNaN(nextInvoice) || nextInvoice < 22456) nextInvoice = 22456

  try {
    await db.query('START TRANSACTION')
    const [rows] = await db.query('SELECT id FROM invoices ORDER BY id ASC')
    for (const row of rows) {
      const newInv = `INV-${nextInvoice}`
      await db.query('UPDATE invoices SET invoice_no = ? WHERE id = ?', [newInv, row.id])
      nextInvoice += 1
    }
    await db.query('COMMIT')
    res.json({ updated: rows.length, nextInvoice })
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    console.error('[API] /api/invoices/fix-numbering error:', err.message)
    res.status(500).json({ error: err.message })
  }
})
app.get('/api/inventory/:id', async (req, res) => {
  try {
    const inventoryId = parseInt(req.params.id, 10)
    if (Number.isNaN(inventoryId)) return res.status(400).json({ error: 'Invalid inventory id' })

    const [[row]] = await db.query(`
      SELECT i.id AS inventory_id, p.sku, p.name, c.name AS category, i.quantity_on_hand, i.quantity_reserved,
             p.reorder_point, p.reorder_qty, p.sell_price
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = TRUE AND i.id = ?
      LIMIT 1
    `, [inventoryId])

    if (!row) return res.status(404).json({ error: 'Inventory item not found' })
    res.json(row)
  } catch (err) {
    console.error('[API] /api/inventory/:id error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/inventory/:id', async (req, res) => {
  const inventoryId = parseInt(req.params.id, 10)
  const { name, category, stock, price, threshold } = req.body

  if (Number.isNaN(inventoryId)) return res.status(400).json({ error: 'Invalid inventory id' })
  if (!name || !category || stock == null || price == null || threshold == null) {
    return res.status(400).json({ error: 'Missing required inventory fields' })
  }

  const quantity = parseInt(stock, 10)
  const sellPrice = parseFloat(price)
  const reorderPoint = parseInt(threshold, 10)

  if (Number.isNaN(quantity) || Number.isNaN(sellPrice) || Number.isNaN(reorderPoint) || quantity < 0 || sellPrice < 0 || reorderPoint < 0) {
    return res.status(400).json({ error: 'Invalid numeric values in inventory item data' })
  }

  try {
    await db.query('START TRANSACTION')

    const [[existing]] = await db.query(`
      SELECT i.product_id FROM inventory i
      WHERE i.id = ?
    `, [inventoryId])

    if (!existing) {
      await db.query('ROLLBACK').catch(() => {})
      return res.status(404).json({ error: 'Inventory item not found' })
    }

    let [catRows] = await db.query('SELECT id FROM categories WHERE name = ?', [category])
    let categoryId
    if (catRows.length > 0) {
      categoryId = catRows[0].id
    } else {
      const [categoryResult] = await db.query('INSERT INTO categories (name) VALUES (?)', [category])
      categoryId = categoryResult.insertId
    }

    const productId = existing.product_id

    await db.query('UPDATE products SET name = ?, category_id = ?, sell_price = ?, reorder_point = ?, reorder_qty = ? WHERE id = ?',
      [name, categoryId, sellPrice, reorderPoint, reorderPoint, productId])

    await db.query('UPDATE inventory SET quantity_on_hand = ? WHERE id = ?', [quantity, inventoryId])

    const [[updated]] = await db.query(`
      SELECT i.id AS inventory_id, p.sku, p.name, c.name AS category, i.quantity_on_hand, i.quantity_reserved,
             p.reorder_point, p.reorder_qty, p.sell_price
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      JOIN categories c ON c.id = p.category_id
      WHERE i.id = ?
      LIMIT 1
    `, [inventoryId])

    await db.query('COMMIT')
    res.json(updated)
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    console.error('[API] /api/inventory/:id update error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/inventory/:id', async (req, res) => {
  const inventoryId = parseInt(req.params.id, 10)
  if (Number.isNaN(inventoryId)) return res.status(400).json({ error: 'Invalid inventory id' })

  try {
    const [result] = await db.query('DELETE FROM inventory WHERE id = ?', [inventoryId])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Inventory item not found' })
    res.json({ success: true })
  } catch (err) {
    console.error('[API] /api/inventory/:id delete error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name FROM categories ORDER BY name')
    res.json(rows)
  } catch (err) {
    console.error('[API] /api/categories error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/products', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const params = []
    let filter = ''
    if (q) {
      filter = `WHERE p.is_active = TRUE AND (p.name LIKE ? OR p.sku LIKE ?)`
      params.push(`%${q}%`, `%${q}%`)
    } else {
      filter = `WHERE p.is_active = TRUE`
    }

    const [rows] = await db.query(
      `SELECT p.id, p.sku, p.name, p.sell_price, c.name AS category, i.quantity_on_hand
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN inventory i ON i.product_id = p.id
       ${filter}
       ORDER BY p.name ASC
       LIMIT 25`,
      params
    )
    res.json(rows)
  } catch (err) {
    console.error('[API] /api/products error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.post(['/api/chatbot/chat', '/assistant/chat'], async (req, res) => {
  try {
    const message = (req.body?.message || '').toString().trim()
    if (!message) return res.status(400).json({ error: 'Message is required' })

    const lowercase = message.toLowerCase()
    let answer = ''
    let intent = 'unknown'

    // Enhanced pattern matching with better natural language support
    if (lowercase.includes('plumbing') || lowercase.match(/\b(pipe|tubing|faucet|drain)\b/)) {
      intent = 'category_search'
      const [rows] = await db.query(
        `SELECT p.sku, p.name, p.sell_price FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.is_active = TRUE AND (c.name LIKE ? OR p.name LIKE ? OR p.name LIKE ?)
         ORDER BY p.name LIMIT 10`,
        ['%plumbing%', '%plumbing%', '%pipe%']
      )
      if (rows.length === 0) {
        answer = 'No plumbing products found.'
      } else {
        answer = 'Plumbing products:\n' + rows.map(r => `- ${r.name} (${r.sku}) — $${Number(r.sell_price).toFixed(2)}`).join('\n')
      }
    } else if (lowercase.includes('power tools') || lowercase.includes('power tool') || lowercase.match(/\b(drill|saw|sander|grinder)\b/)) {
      intent = 'category_search'
      const [rows] = await db.query(
        `SELECT p.sku, p.name, p.sell_price FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.is_active = TRUE AND (c.name LIKE ? OR p.name LIKE ?)
         ORDER BY p.name LIMIT 10`,
        ['%power tools%', '%power tools%']
      )
      if (rows.length === 0) {
        answer = 'No power tools found.'
      } else {
        answer = 'Power tools products:\n' + rows.map(r => `- ${r.name} (${r.sku}) — $${Number(r.sell_price).toFixed(2)}`).join('\n')
      }
    } else if (lowercase.includes('most sold') || lowercase.includes('popular') || lowercase.includes('best selling')) {
      intent = 'popular_products'
      const [rows] = await db.query(
        `SELECT p.sku, p.name, SUM(s.quantity_sold) AS sold_count
         FROM sales s
         JOIN products p ON p.id = s.product_id
         WHERE p.is_active = TRUE
         GROUP BY p.id, p.sku, p.name
         ORDER BY sold_count DESC
         LIMIT 3`
      )
      if (rows.length === 0) {
        answer = 'No sales records found to determine popular items.'
      } else {
        answer = 'Top 3 popular items (by total quantity sold):\n' + rows.map((r, i) => `${i + 1}. ${r.name} (${r.sku}) — sold ${r.sold_count}`).join('\n')
      }
    } else if (lowercase.includes('tell me more about') || lowercase.includes('details about') || lowercase.includes('info about')) {
      intent = 'product_details'
      const match = message.match(/(?:tell me more about|details about|info about)\s+(.+)/i)
      const searchTerm = match ? match[1].trim() : ''
      if (!searchTerm) {
        answer = 'Please provide an item name or SKU. Example: "tell me more about PVC Pipe"'
      } else {
        const [rows] = await db.query(
          `SELECT p.sku, p.name, p.sell_price, c.name AS category, i.quantity_on_hand
           FROM products p
           LEFT JOIN categories c ON c.id = p.category_id
           LEFT JOIN inventory i ON i.product_id = p.id
           WHERE p.is_active = TRUE AND (p.name LIKE ? OR p.sku LIKE ?)
           LIMIT 1`,
          [`%${searchTerm}%`, `%${searchTerm}%`]
        )
        if (rows.length === 0) {
          answer = `No product found for "${searchTerm}".`
        } else {
          const prod = rows[0]
          answer = `Product details for ${prod.name} (${prod.sku}):\nCategory: ${prod.category || 'N/A'}\nPrice: $${Number(prod.sell_price).toFixed(2)}\nStock on hand: ${prod.quantity_on_hand ?? 'N/A'}`
        }
      }
    } else if (lowercase.includes('stock') || lowercase.includes('inventory') || lowercase.match(/\b(how many|quantity|available)\b/)) {
      intent = 'stock_check'
      if (lowercase.includes('how many') && (lowercase.includes('low') || lowercase.includes('out of stock'))) {
        const [rows] = await db.query(
          `SELECT COUNT(*) as low_stock_count
           FROM products p
           LEFT JOIN inventory i ON i.product_id = p.id
           WHERE p.is_active = TRUE AND i.quantity_on_hand <= p.reorder_point`
        )
        const count = rows[0].low_stock_count
        answer = `There are ${count} items that are low on stock (below reorder point).`
      } else if (lowercase.includes('low') || lowercase.includes('out of stock')) {
        const [rows] = await db.query(
          `SELECT p.sku, p.name, i.quantity_on_hand, p.reorder_point
           FROM products p
           LEFT JOIN inventory i ON i.product_id = p.id
           WHERE p.is_active = TRUE AND i.quantity_on_hand <= p.reorder_point
           ORDER BY i.quantity_on_hand ASC
           LIMIT 10`
        )
        if (rows.length === 0) {
          answer = 'All products are well stocked!'
        } else {
          answer = 'Low stock items:\n' + rows.map(r => `- ${r.name} (${r.sku}): ${r.quantity_on_hand} in stock (reorder at ${r.reorder_point})`).join('\n')
        }
      } else {
        const [rows] = await db.query(
          `SELECT COUNT(*) as total_products, SUM(i.quantity_on_hand) as total_stock
           FROM products p
           LEFT JOIN inventory i ON i.product_id = p.id
           WHERE p.is_active = TRUE`
        )
        const stats = rows[0]
        answer = `Inventory summary:\nTotal products: ${stats.total_products}\nTotal stock across all items: ${stats.total_stock || 0}`
      }
    } else if (lowercase.includes('price') || lowercase.includes('cost') || lowercase.includes('expensive') || lowercase.includes('cheap')) {
      intent = 'pricing'
      if (lowercase.includes('expensive') || lowercase.includes('highest') || lowercase.includes('most expensive')) {
        const [rows] = await db.query(
          `SELECT p.sku, p.name, p.sell_price
           FROM products p
           WHERE p.is_active = TRUE
           ORDER BY p.sell_price DESC
           LIMIT 5`
        )
        answer = 'Most expensive products:\n' + rows.map(r => `- ${r.name} (${r.sku}): $${Number(r.sell_price).toFixed(2)}`).join('\n')
      } else if (lowercase.includes('cheap') || lowercase.includes('lowest') || lowercase.includes('affordable')) {
        const [rows] = await db.query(
          `SELECT p.sku, p.name, p.sell_price
           FROM products p
           WHERE p.is_active = TRUE AND p.sell_price > 0
           ORDER BY p.sell_price ASC
           LIMIT 5`
        )
        answer = 'Most affordable products:\n' + rows.map(r => `- ${r.name} (${r.sku}): $${Number(r.sell_price).toFixed(2)}`).join('\n')
      } else {
        const [rows] = await db.query(
          `SELECT MIN(sell_price) as min_price, MAX(sell_price) as max_price, AVG(sell_price) as avg_price
           FROM products WHERE is_active = TRUE AND sell_price > 0`
        )
        const pricing = rows[0]
        answer = `Price range:\nLowest: $${Number(pricing.min_price).toFixed(2)}\nHighest: $${Number(pricing.max_price).toFixed(2)}\nAverage: $${Number(pricing.avg_price).toFixed(2)}`
      }
    } else if (lowercase.includes('sales') || lowercase.includes('revenue') || lowercase.includes('sold')) {
      intent = 'sales_analytics'
      if (lowercase.includes('category') || lowercase.includes('by category')) {
        const [rows] = await db.query(
          `SELECT c.name as category, SUM(s.quantity_sold) as total_sold, SUM(s.quantity_sold * s.sale_price) as revenue
           FROM sales s
           JOIN products p ON p.id = s.product_id
           LEFT JOIN categories c ON c.id = p.category_id
           WHERE p.is_active = TRUE
           GROUP BY c.id, c.name
           ORDER BY revenue DESC
           LIMIT 5`
        )
        if (rows.length === 0) {
          answer = 'No sales data available by category.'
        } else {
          answer = 'Sales by category:\n' + rows.map(r => `- ${r.category || 'Uncategorized'}: ${r.total_sold} sold, $${Number(r.revenue).toFixed(2)} revenue`).join('\n')
        }
      } else {
        const [rows] = await db.query(
          `SELECT SUM(s.quantity_sold) as total_quantity, SUM(s.quantity_sold * s.sale_price) as total_revenue,
                  COUNT(DISTINCT s.product_id) as unique_products
           FROM sales s
           JOIN products p ON p.id = s.product_id
           WHERE p.is_active = TRUE`
        )
        const sales = rows[0]
        answer = `Sales summary:\nTotal items sold: ${sales.total_quantity || 0}\nTotal revenue: $${Number(sales.total_revenue || 0).toFixed(2)}\nUnique products sold: ${sales.unique_products || 0}`
      }
    } else if (lowercase.includes('category') || lowercase.includes('categories')) {
      intent = 'categories'
      const [rows] = await db.query(
        `SELECT c.name, COUNT(p.id) as product_count
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE
         GROUP BY c.id, c.name
         ORDER BY product_count DESC`
      )
      answer = 'Product categories:\n' + rows.map(r => `- ${r.name}: ${r.product_count} products`).join('\n')
    } else if (lowercase.includes('help') || lowercase.includes('what can you') || lowercase.includes('commands')) {
      intent = 'help'
      answer = `I can help with inventory and sales questions! Try asking about:

📦 **Products & Categories:**
• "show plumbing products" or "power tools"
• "what categories do you have?"

📊 **Stock & Pricing:**
• "what's in stock?" or "low stock items"
• "most expensive products" or "cheapest items"
• "price range"

📈 **Sales & Analytics:**
• "what's popular?" or "best selling items"
• "sales by category" or "total revenue"

🔍 **Product Details:**
• "tell me more about PVC Pipe" or "details about drill"

💡 **Examples:**
• "how many items are low on stock?"
• "what's the average price?"
• "total sales revenue"`
    } else {
      intent = 'unknown'
      answer = 'I can help with inventory questions. Try: "show plumbing products", "what\'s popular?", "low stock items", "sales by category", or "tell me more about <item>". Type "help" for more options.'
    }

    // Log intent for analytics
    console.log(`[Chatbot] Intent: ${intent}, Message: "${message.substring(0, 50)}..."`)

    // Track analytics
    chatbotAnalytics.totalQueries++
    chatbotAnalytics.intents[intent] = (chatbotAnalytics.intents[intent] || 0) + 1

    return res.json([{ recipient_id: req.body.uid || 'assistant', text: answer }])
  } catch (err) {
    console.error('[API] /api/chatbot/chat error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/chatbot/analytics', (req, res) => {
  try {
    const uptime = Math.floor((Date.now() - chatbotAnalytics.startTime) / 1000) // seconds

    // Calculate percentages
    const intentStats = Object.entries(chatbotAnalytics.intents).map(([intent, count]) => ({
      intent,
      count,
      percentage: ((count / chatbotAnalytics.totalQueries) * 100).toFixed(1) + '%'
    })).sort((a, b) => b.count - a.count)

    res.json({
      totalQueries: chatbotAnalytics.totalQueries,
      uptimeSeconds: uptime,
      intents: intentStats,
      topIntent: intentStats[0]?.intent || 'none',
      summary: {
        mostPopularIntent: intentStats[0] || null,
        leastPopularIntent: intentStats[intentStats.length - 1] || null,
        uniqueIntents: intentStats.length
      }
    })
  } catch (err) {
    console.error('[API] /api/chatbot/analytics error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/inventory', async (req, res) => {
  const { name, category, stock, price, threshold } = req.body
  if (!name || !category || stock == null || price == null || threshold == null) {
    return res.status(400).json({ error: 'Missing required inventory fields' })
  }

  const quantity = parseInt(stock, 10)
  const sellPrice = parseFloat(price)
  const reorderPoint = parseInt(threshold, 10)

  if (Number.isNaN(quantity) || Number.isNaN(sellPrice) || Number.isNaN(reorderPoint) || quantity < 0 || sellPrice < 0 || reorderPoint < 0) {
    return res.status(400).json({ error: 'Invalid numeric values in inventory item data' })
  }

  const skuBase = name.trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9-]/g, '').toUpperCase().slice(0, 10)
  const sku = `${skuBase || 'ITEM'}-${Date.now() % 100000}-${Math.floor(Math.random() * 900 + 100)}`

  try {
    await db.query('START TRANSACTION')

    let [catRows] = await db.query('SELECT id FROM categories WHERE name = ?', [category])
    let categoryId
    if (catRows.length > 0) {
      categoryId = catRows[0].id
    } else {
      const [categoryResult] = await db.query('INSERT INTO categories (name) VALUES (?)', [category])
      categoryId = categoryResult.insertId
    }

    const [productResult] = await db.query(
      'INSERT INTO products (sku, name, category_id, sell_price, reorder_point, reorder_qty, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
      [sku, name, categoryId, sellPrice, reorderPoint, reorderPoint]
    )

    const productId = productResult.insertId

    await db.query(
      'INSERT INTO inventory (product_id, quantity_on_hand, quantity_reserved) VALUES (?, ?, 0)',
      [productId, quantity]
    )

    const [[newRow]] = await db.query(`
      SELECT i.id, p.sku, p.name, c.name AS category, i.quantity_on_hand, i.quantity_reserved,
             p.reorder_point, p.reorder_qty, p.sell_price
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      JOIN categories c ON c.id = p.category_id
      WHERE i.product_id = ?
      LIMIT 1
    `, [productId])

    await db.query('COMMIT')

    res.status(201).json(newRow)
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    console.error('[API] /api/inventory create error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/invoices', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500)
    const [rows] = await db.query(`
      SELECT inv.id, inv.invoice_no, inv.customer_name, inv.invoice_date, inv.total_amount, inv.discount_pct, inv.status, inv.created_at
      FROM invoices inv
      ORDER BY inv.invoice_date DESC, inv.id DESC
      LIMIT ?
    `, [limit])
    res.json(rows)
  } catch (err) {
    console.error('[API] /api/invoices error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/invoices/next', async (req, res) => {
  try {
    const nextInvoiceNo = await getNextInvoiceNumber()
    res.json({ nextInvoiceNo })
  } catch (err) {
    console.error('[API] /api/invoices/next error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/invoices/:id', async (req, res) => {
  const invoiceId = parseInt(req.params.id, 10)
  if (Number.isNaN(invoiceId)) return res.status(400).json({ error: 'Invalid invoice id' })

  try {
    const [[invoice]] = await db.query('SELECT id, invoice_no, customer_name, invoice_date, total_amount, discount_pct, status FROM invoices WHERE id = ?', [invoiceId])
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

    const [items] = await db.query(
      `SELECT ii.id, ii.product_id, ii.sku, ii.quantity, ii.unit_price, ii.line_total, p.name AS product_name
       FROM invoice_items ii
       LEFT JOIN products p ON p.id = ii.product_id
       WHERE ii.invoice_id = ?`,
      [invoiceId]
    )

    res.json({ ...invoice, items })
  } catch (err) {
    console.error('[API] /api/invoices/:id error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/invoices/:id', async (req, res) => {
  const invoiceId = parseInt(req.params.id, 10)
  const { invoiceNo, customerName, invoiceDate, status, discount = 0 } = req.body
  const discountPct = Math.max(0, Math.min(100, parseFloat(discount) || 0))
  if (Number.isNaN(invoiceId)) return res.status(400).json({ error: 'Invalid invoice id' })

  if (!customerName || !invoiceDate || !invoiceNo) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  if (!['paid', 'pending', 'overdue'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }

  try {
    const [result] = await db.query(
      'UPDATE invoices SET invoice_no = ?, customer_name = ?, invoice_date = ?, status = ?, discount_pct = ? WHERE id = ?',
      [invoiceNo, customerName, invoiceDate, status, discountPct, invoiceId]
    )

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Invoice not found' })

    const [[updated]] = await db.query('SELECT id, invoice_no, customer_name, invoice_date, total_amount, status FROM invoices WHERE id = ?', [invoiceId])
    res.json(updated)
  } catch (err) {
    console.error('[API] /api/invoices/:id update error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/invoices/:id', async (req, res) => {
  const invoiceId = parseInt(req.params.id, 10)
  if (Number.isNaN(invoiceId)) return res.status(400).json({ error: 'Invalid invoice id' })

  try {
    const [result] = await db.query('DELETE FROM invoices WHERE id = ?', [invoiceId])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Invoice not found' })
    res.json({ success: true })
  } catch (err) {
    console.error('[API] /api/invoices/:id delete error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/invoices/seed', async (req, res) => {
  const {
    startDate = '2026-03-01',
    endDate = new Date().toISOString().split('T')[0],
    invoicesPerDay = 1,
    productLimit = 50,
  } = req.body || {}

  const sriLankanNames = [
    'Amal Perera', 'Chanuka Fernando', 'Nisansala Senanayake', 'Lakmini Jayasinghe',
    'Ruwan Dias', 'Shanika Perera', 'Pavithra Silva', 'Mohan Rajapaksha',
    'Priyanka Kularatne', 'Tharindu Wijesinghe', 'Sanduni Herath', 'Kasun Perera',
    'Dilani Senaratne', 'Nirosha Fernando', 'Malith Jayawardena', 'Iresha Kumara',
    'Heshan Bandara', 'Kavindi Senanayake', 'Dilanka Dissanayake', 'Yashoda Chathuranga'
  ]

  const parseDate = (str) => {
    const d = new Date(str)
    if (Number.isNaN(d.getTime())) return null
    return d
  }

  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (!start || !end || start > end) {
    return res.status(400).json({ error: 'Invalid startDate/endDate' })
  }

  try {
    const [products] = await db.query(
      'SELECT id, sku, name, sell_price, cost_price FROM products WHERE is_active = TRUE LIMIT ?',
      [productLimit]
    )
    if (!products.length) return res.status(400).json({ error: 'No active products available for seeding' })

    const created = []

    await db.query('START TRANSACTION')

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const invoiceDate = d.toISOString().split('T')[0]
      const dailyCount = Math.max(1, Math.min(3, parseInt(invoicesPerDay, 10)))

      for (let i = 0; i < dailyCount; i++) {
        const product = products[Math.floor(Math.random() * products.length)]
        const customerName = sriLankanNames[Math.floor(Math.random() * sriLankanNames.length)]
        const qty = Math.floor(Math.random() * 5) + 1
        const unitPrice = Number(product.sell_price)
        const totalAmount = Number((unitPrice * qty).toFixed(2))
        const invoiceNo = await getNextInvoiceNumber()

        const [invoiceResult] = await db.query(
          `INSERT INTO invoices (invoice_no, customer_name, invoice_date, total_amount, status) VALUES (?, ?, ?, ?, ?)`,
          [invoiceNo, customerName, invoiceDate, totalAmount, 'paid']
        )
        const invoiceId = invoiceResult.insertId

        await db.query(
          `INSERT INTO invoice_items (invoice_id, product_id, sku, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?)`,
          [invoiceId, product.id, product.sku, qty, unitPrice, totalAmount]
        )

        await db.query(
          `UPDATE inventory SET quantity_on_hand = GREATEST(quantity_on_hand - ?, 0) WHERE product_id = ?`,
          [qty, product.id]
        )

        await db.query(
          `INSERT INTO sales (product_id, invoice_id, quantity_sold, sale_price, unit_price, cost_at_sale, sale_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [product.id, invoiceId, qty, unitPrice, unitPrice, product.cost_price, invoiceDate]
        )

        created.push({ invoiceId, invoiceNo, customerName, invoiceDate, totalAmount, productSku: product.sku })
      }
    }

    await db.query('COMMIT')

    res.json({ seeded: created.length, entries: created })
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    console.error('[API] /api/invoices/seed error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/invoices', async (req, res) => {
  try {
    const { customerName, invoiceNo, invoiceDate, items, discount = 0, status = 'pending' } = req.body
    const discountPct = Math.max(0, Math.min(100, parseFloat(discount) || 0))

    if (!customerName || !invoiceDate || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required invoice fields or items' })
    }

    const lineItems = []
    for (const input of items) {
      if (!input.itemId || !input.quantity) {
        return res.status(400).json({ error: 'Each item needs itemId and quantity' })
      }
      const qty = parseInt(input.quantity, 10)
      if (Number.isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Invalid line quantity' })
      }

      let [[product]] = await db.query(
        'SELECT id, sku, name, sell_price, cost_price, reorder_point FROM products WHERE (sku = ? OR name = ?) AND is_active = TRUE LIMIT 1',
        [input.itemId, input.itemId]
      )

      if (!product) {
        const [lookup] = await db.query(
          'SELECT id, sku, name, sell_price, cost_price, reorder_point FROM products WHERE name LIKE ? AND is_active = TRUE ORDER BY name LIMIT 1',
          [`%${input.itemId}%`]
        )
        product = lookup[0]
      }

      if (!product) {
        return res.status(404).json({ error: `Product not found: ${input.itemId}` })
      }

      const unitPrice = parseFloat(product.sell_price)
      const lineTotal = Number((unitPrice * qty).toFixed(2))
      lineItems.push({ product, qty, unitPrice, lineTotal })
    }

    let useInvoiceNo = invoiceNo
    if (!useInvoiceNo) {
      useInvoiceNo = await getNextInvoiceNumber()
    } else if (!/^INV-/i.test(useInvoiceNo)) {
      const digits = (invoiceNo.match(/\d+/) || ['22456'])[0]
      const baseNum = Math.max(22456, parseInt(digits, 10) || 22456)
      useInvoiceNo = `INV-${baseNum}`
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0)
    const totalAmount = parseFloat((subtotal * (1 - discountPct / 100)).toFixed(2))

    await db.query('START TRANSACTION')
    const [invoiceResult] = await db.query(`
      INSERT INTO invoices (invoice_no, customer_name, invoice_date, total_amount, discount_pct, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [useInvoiceNo, customerName, invoiceDate, totalAmount, discountPct, status])

    const invoiceId = invoiceResult.insertId

    for (const item of lineItems) {
      await db.query(`
        INSERT INTO invoice_items (invoice_id, product_id, sku, quantity, unit_price, line_total)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [invoiceId, item.product.id, item.product.sku, item.qty, item.unitPrice, item.lineTotal])

      await db.query(`
        UPDATE inventory
        SET quantity_on_hand = GREATEST(quantity_on_hand - ?, 0)
        WHERE product_id = ?
      `, [item.qty, item.product.id])

      await db.query(`
        INSERT INTO sales (product_id, invoice_id, quantity_sold, sale_price, unit_price, cost_at_sale, sale_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [item.product.id, invoiceId, item.qty, item.unitPrice, item.unitPrice, item.product.cost_price, invoiceDate])
    }

    await db.query('COMMIT')

    res.status(201).json({
      id: invoiceId,
      invoice_no: useInvoiceNo,
      customer_name: customerName,
      invoice_date: invoiceDate,
      total_amount: totalAmount,
      status,
    })
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    console.error('[API] /api/invoices create error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/dashboard/low-stock', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT i.id, p.sku, p.name, i.quantity_on_hand AS stock, p.reorder_point AS threshold,
             (i.quantity_on_hand <= p.reorder_point) AS needs_reorder
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      WHERE p.is_active = TRUE
      ORDER BY i.quantity_on_hand ASC
      LIMIT 20
    `)
    console.log(`[API] /api/dashboard/low-stock returned ${rows.length} items`)
    res.json(rows)
  } catch (err) {
    console.error('[API] /api/dashboard/low-stock error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const [[stockStats]] = await db.query(`
      SELECT
        SUM(i.quantity_on_hand) AS items_in_stock,
        SUM(CASE WHEN i.quantity_on_hand <= p.reorder_point THEN 1 ELSE 0 END) AS low_stock_alerts,
        COUNT(*) AS total_products
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      WHERE p.is_active = TRUE;
    `)

    const [[invoicesCount]] = await db.query(`
      SELECT COUNT(*) AS total_invoices FROM invoices WHERE invoice_date >= CURRENT_DATE();
    `)

    const [[todayRevenue]] = await db.query(`
      SELECT COALESCE(SUM(quantity_sold * COALESCE(sale_price, unit_price)), 0) AS revenue
      FROM sales
      WHERE sale_date = CURRENT_DATE();
    `)

    console.log(`[API] /api/dashboard/summary: ${stockStats.items_in_stock} items, ${stockStats.low_stock_alerts} low stock, ${invoicesCount.total_invoices} invoices today`)

    res.json({
      todayRevenue: parseFloat(todayRevenue.revenue || 0),
      totalInvoices: invoicesCount.total_invoices,
      itemsInStock: stockStats.items_in_stock,
      lowStockAlerts: stockStats.low_stock_alerts,
    })
  } catch (err) {
    console.error('[API] /api/dashboard/summary error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/dashboard/recommendations', async (req, res) => {
  try {
    // High selling items - Top revenue generators
    const [highSelling] = await db.query(`
      SELECT 
        p.id, p.sku, p.name, p.sell_price, p.cost_price,
        i.quantity_on_hand AS current_stock,
        p.reorder_point,
        COALESCE(SUM(s.quantity_sold), 0) AS sold_last_30d,
        COALESCE(SUM(s.quantity_sold * COALESCE(s.sale_price, s.unit_price, p.sell_price)), 0) AS revenue_last_30d,
        COALESCE(SUM(s.quantity_sold * (COALESCE(s.sale_price, s.unit_price, p.sell_price) - COALESCE(s.cost_at_sale, p.cost_price))), 0) AS profit_last_30d,
        ROUND(COALESCE(SUM(s.quantity_sold), 0) / 30, 2) AS daily_avg_sales,
        CASE 
          WHEN i.quantity_on_hand < p.reorder_point THEN 'URGENT: Reorder Now'
          WHEN i.quantity_on_hand < p.reorder_point * 1.5 THEN 'Low Stock - Consider Reorder'
          ELSE 'Stock OK'
        END AS stock_recommendation
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      LEFT JOIN sales s ON p.id = s.product_id AND s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      WHERE p.is_active = TRUE
      GROUP BY p.id, p.sku, p.name, p.sell_price, p.cost_price, i.quantity_on_hand, p.reorder_point
      ORDER BY revenue_last_30d DESC
      LIMIT 5
    `)

    // Low selling items - Underperformers
    const [lowSelling] = await db.query(`
      SELECT 
        p.id, p.sku, p.name, p.sell_price, p.cost_price,
        i.quantity_on_hand AS current_stock,
        p.reorder_point,
        COALESCE(SUM(s.quantity_sold), 0) AS sold_last_30d,
        COALESCE(SUM(s.quantity_sold * COALESCE(s.sale_price, s.unit_price, p.sell_price)), 0) AS revenue_last_30d,
        ROUND(COALESCE(SUM(s.quantity_sold), 0) / 30, 2) AS daily_avg_sales,
        CASE 
          WHEN i.quantity_on_hand > p.reorder_point * 3 THEN 'OVERSTOCK: Consider Discount/Promotion'
          WHEN i.quantity_on_hand > p.reorder_point * 1.5 THEN 'Excess Stock: Monitor'
          ELSE 'Normal'
        END AS stock_recommendation
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      LEFT JOIN sales s ON p.id = s.product_id AND s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      WHERE p.is_active = TRUE
      GROUP BY p.id, p.sku, p.name, p.sell_price, p.cost_price, i.quantity_on_hand, p.reorder_point
      HAVING sold_last_30d > 0
      ORDER BY sold_last_30d ASC, i.quantity_on_hand DESC
      LIMIT 5
    `)

    // Overstocked items - Tied up capital
    const [overstocked] = await db.query(`
      SELECT 
        p.id, p.sku, p.name, p.sell_price, p.cost_price,
        i.quantity_on_hand AS current_stock,
        p.reorder_point,
        COALESCE(SUM(s.quantity_sold), 0) AS sold_last_30d,
        ROUND(COALESCE(SUM(s.quantity_sold), 0) / 30, 2) AS daily_avg_sales,
        (i.quantity_on_hand * p.cost_price) AS capital_tied_up,
        CEIL(i.quantity_on_hand / NULLIF(COALESCE(SUM(s.quantity_sold), 0) / 30, 0)) AS months_stock_on_hand,
        CASE 
          WHEN COALESCE(SUM(s.quantity_sold), 0) / 30 < 1 THEN 'CRITICAL: Dead Stock - Promote/Clearance'
          WHEN i.quantity_on_hand / NULLIF(COALESCE(SUM(s.quantity_sold), 0) / 30, 0) > 6 THEN 'HIGH: Over 6 months stock'
          ELSE 'MODERATE: Excess inventory'
        END AS action_needed
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      LEFT JOIN sales s ON p.id = s.product_id AND s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      WHERE p.is_active = TRUE AND i.quantity_on_hand > p.reorder_point * 2
      GROUP BY p.id, p.sku, p.name, p.sell_price, p.cost_price, i.quantity_on_hand, p.reorder_point
      ORDER BY capital_tied_up DESC
      LIMIT 5
    `)

    // Understocked items - Lost sales risk
    const [understocked] = await db.query(`
      SELECT 
        p.id, p.sku, p.name, p.sell_price, p.cost_price,
        i.quantity_on_hand AS current_stock,
        p.reorder_point,
        p.reorder_qty,
        COALESCE(SUM(s.quantity_sold), 0) AS sold_last_30d,
        ROUND(COALESCE(SUM(s.quantity_sold), 0) / 30, 2) AS daily_avg_sales,
        COALESCE(SUM(s.quantity_sold * p.sell_price), 0) AS revenue_potential_last_30d,
        CEIL(p.reorder_point / NULLIF(COALESCE(SUM(s.quantity_sold), 0) / 30, 1)) AS days_until_stockout,
        CASE 
          WHEN i.quantity_on_hand <= 0 THEN 'OUT OF STOCK: Lost Sales!'
          WHEN i.quantity_on_hand < p.reorder_point / 2 THEN 'CRITICAL: Urgent Reorder'
          ELSE 'Low: Reorder Soon'
        END AS urgency
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      LEFT JOIN sales s ON p.id = s.product_id AND s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      WHERE p.is_active = TRUE AND i.quantity_on_hand <= p.reorder_point
      GROUP BY p.id, p.sku, p.name, p.sell_price, p.cost_price, i.quantity_on_hand, p.reorder_point, p.reorder_qty
      ORDER BY daily_avg_sales DESC
      LIMIT 5
    `)

    console.log(`[API] /api/dashboard/recommendations: ${highSelling.length} high, ${lowSelling.length} low, ${overstocked.length} overstocked, ${understocked.length} understocked`)
    res.json({ 
      highSelling: highSelling.map(item => ({
        ...item,
        type: 'highSelling'
      })),
      lowSelling: lowSelling.map(item => ({
        ...item,
        type: 'lowSelling'
      })),
      overstocked: overstocked.map(item => ({
        ...item,
        type: 'overstocked'
      })),
      understocked: understocked.map(item => ({
        ...item,
        type: 'understocked'
      }))
    })
  } catch (err) {
    console.error('[API] /api/dashboard/recommendations error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/sales/summary', async (req, res) => {
  try {
    const range = Number(req.query.range) || 7
    const since = new Date()
    since.setDate(since.getDate() - range + 1)
    const sinceDate = since.toISOString().slice(0, 10)

    const [rows] = await db.query(`
      SELECT sale_date, SUM(quantity_sold * COALESCE(sale_price, unit_price, 0)) AS revenue, COUNT(*) AS transactions
      FROM sales
      WHERE sale_date >= ?
      GROUP BY sale_date
      ORDER BY sale_date ASC
    `, [sinceDate])

    const totalRevenue = Number(rows.reduce((sum, r) => sum + Number(r.revenue || 0), 0).toFixed(2))
    const dailyAverage = rows.length ? Number((totalRevenue / rows.length).toFixed(0)) : 0
    const transactions = rows.reduce((sum, r) => sum + Number(r.transactions || 0), 0)
    let bestDay = rows.length ? rows.reduce((best, r) => (r.revenue > best.revenue ? r : best), rows[0]) : { sale_date: null, revenue: 0 }

    res.json({ totalRevenue, dailyAverage, transactions, bestDay: bestDay.sale_date || null, bestDayRevenue: Number(bestDay.revenue || 0) })
  } catch (err) {
    console.error('[API] /api/sales/summary error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/sales/daily', async (req, res) => {
  try {
    const range = Number(req.query.range) || 7
    const since = new Date()
    since.setDate(since.getDate() - range + 1)
    const sinceDate = since.toISOString().slice(0, 10)

    const [rows] = await db.query(`
      SELECT sale_date, SUM(quantity_sold * COALESCE(sale_price, unit_price, 0)) AS revenue
      FROM sales
      WHERE sale_date >= ?
      GROUP BY sale_date
      ORDER BY sale_date ASC
    `, [sinceDate])

    const data = rows.map(r => ({ label: r.sale_date, value: Number(r.revenue || 0) }))
    res.json(data)
  } catch (err) {
    console.error('[API] /api/sales/daily error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/sales/top-products', async (req, res) => {
  try {
    const range = Number(req.query.range) || 30
    const since = new Date()
    since.setDate(since.getDate() - range)
    const sinceDate = since.toISOString().slice(0, 10)

    const [rows] = await db.query(`
      SELECT p.name, SUM(s.quantity_sold * COALESCE(s.sale_price, s.unit_price, p.sell_price)) AS revenue,
             SUM(s.quantity_sold) AS units
      FROM sales s
      JOIN products p ON p.id = s.product_id
      WHERE s.sale_date >= ?
      GROUP BY p.name
      ORDER BY revenue DESC
      LIMIT 10
    `, [sinceDate])

    const totalRevenue = rows.reduce((sum, r) => sum + Number(r.revenue || 0), 0)
    const data = rows.map((r, i) => ({
      name: r.name,
      revenue: Number(r.revenue || 0),
      units: Number(r.units || 0),
      pct: totalRevenue > 0 ? Math.round((Number(r.revenue || 0) / totalRevenue) * 100) : 0,
    }))

    res.json(data)
  } catch (err) {
    console.error('[API] /api/sales/top-products error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/sales/recent', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100)
    const [rows] = await db.query(`
      SELECT inv.invoice_no AS id, inv.customer_name AS customer, 
             COALESCE(SUM(ii.quantity), 0) AS items,
             inv.total_amount AS total,
             inv.invoice_date AS date
      FROM invoices inv
      LEFT JOIN invoice_items ii ON ii.invoice_id = inv.id
      GROUP BY inv.id
      ORDER BY inv.invoice_date DESC, inv.id DESC
      LIMIT ?
    `, [limit])

    const data = rows.map(r => ({
      id: r.id,
      customer: r.customer,
      items: Number(r.items || 0),
      total: Number(r.total || 0),
      date: new Date(r.date).toISOString().split('T')[0],
    }))

    res.json(data)
  } catch (err) {
    console.error('[API] /api/sales/recent error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Backend API listening on http://localhost:${PORT}`)
})

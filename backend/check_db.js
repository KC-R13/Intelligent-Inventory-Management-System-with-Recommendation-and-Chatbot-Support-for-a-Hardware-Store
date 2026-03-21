const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function main() {
  const db = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hardware_store',
    connectionLimit: 10,
  });

  let rows;
  ([rows] = await db.query('SELECT COUNT(*) AS cnt FROM products'));
  console.log('products', rows[0].cnt);

  ([rows] = await db.query('SELECT name FROM categories'));
  console.log('categories count', rows.length);
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    console.log('category', rows[i].name);
  }

  ([rows] = await db.query('SELECT p.name, p.category_id, p.sku, p.sell_price FROM products p LIMIT 10'));
  for (let i = 0; i < rows.length; i++) {
    console.log('product', rows[i]);
  }

  ([rows] = await db.query('SELECT p.name, i.quantity_on_hand, p.reorder_point FROM products p LEFT JOIN inventory i ON i.product_id=p.id ORDER BY i.quantity_on_hand LIMIT 10'));
  for (let i = 0; i < rows.length; i++) {
    console.log('inventory', rows[i]);
  }

  await db.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
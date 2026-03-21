import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const main = async () => {
  const db = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hardware_store',
    connectionLimit: 10,
  });

  const names = [
    'Amal Perera','Nirosha Fernando','Mohan Rajapaksha','Sanduni Herath','Kasun Silva',
    'Priyanka Kularatne','Tharindu Wijesinghe','Lakmini Jayasinghe','Ruwan Dias','Iresha Kumara',
    'Dilani Senaratne','Shanika Perera','Kavindi Senanayake','Yashoda Chathuranga','Dulanjali Kumara'
  ];

  const [rows] = await db.query("SELECT id FROM invoices WHERE customer_name LIKE 'Seed Customer %' OR customer_name='Test Customer'");
  let i = 0;
  for (const row of rows) {
    const name = names[i % names.length];
    i += 1;
    await db.query('UPDATE invoices SET customer_name = ? WHERE id = ?', [name, row.id]);
  }
  console.log(`Updated ${rows.length} seed customer rows to real names.`);

  await db.end();

  const start = new Date();
  start.setDate(start.getDate() - 60);
  const end = new Date();

  const body = {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    invoicesPerDay: 2,
  };

  const response = await fetch('http://localhost:5004/api/invoices/seed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  console.log('seed response:', data);
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
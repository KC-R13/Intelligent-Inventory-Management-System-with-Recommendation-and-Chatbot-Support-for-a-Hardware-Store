# Sample Backend Code for Recommendations API
# This is a sample implementation for the /dashboard/recommendations endpoint
# Assuming Flask + SQLAlchemy with SQLite

from flask import Flask, jsonify
from sqlalchemy import create_engine, text
import os

app = Flask(__name__)
engine = create_engine('sqlite:///pos.db')  # Adjust path as needed

@app.route('/api/dashboard/recommendations', methods=['GET'])
def get_recommendations():
    with engine.connect() as conn:
        # High Selling Items (top 5 by sales in last 30 days)
        high_selling = conn.execute(text("""
            SELECT i.name, i.sku, SUM(s.quantity) as sales
            FROM inventory i
            JOIN sales s ON i.id = s.item_id
            WHERE s.sale_date >= date('now', '-30 days')
            GROUP BY i.id, i.name, i.sku
            ORDER BY sales DESC
            LIMIT 5
        """)).fetchall()

        # Low Selling Items (bottom 5 by sales in last 30 days)
        low_selling = conn.execute(text("""
            SELECT i.name, i.sku, SUM(s.quantity) as sales
            FROM inventory i
            JOIN sales s ON i.id = s.item_id
            WHERE s.sale_date >= date('now', '-30 days')
            GROUP BY i.id, i.name, i.sku
            ORDER BY sales ASC
            LIMIT 5
        """)).fetchall()

        # Overstocked: stock > reorder_point * 2 and low sales rate
        overstocked = conn.execute(text("""
            SELECT i.name, i.sku, i.stock_quantity as stock,
                   COALESCE(AVG(s.quantity), 0) as sales_rate
            FROM inventory i
            LEFT JOIN sales s ON i.id = s.item_id AND s.sale_date >= date('now', '-30 days')
            WHERE i.stock_quantity > i.reorder_point * 2
            GROUP BY i.id, i.name, i.sku, i.stock_quantity
            HAVING sales_rate < 1  -- Low sales rate
            ORDER BY i.stock_quantity DESC
            LIMIT 5
        """)).fetchall()

        # Understocked: stock < reorder_point and high sales rate
        understocked = conn.execute(text("""
            SELECT i.name, i.sku, i.stock_quantity as stock,
                   COALESCE(AVG(s.quantity), 0) as sales_rate
            FROM inventory i
            LEFT JOIN sales s ON i.id = s.item_id AND s.sale_date >= date('now', '-30 days')
            WHERE i.stock_quantity < i.reorder_point
            GROUP BY i.id, i.name, i.sku, i.stock_quantity
            HAVING sales_rate > 5  -- High sales rate
            ORDER BY sales_rate DESC
            LIMIT 5
        """)).fetchall()

    return jsonify({
        'highSelling': [{'name': row[0], 'sku': row[1], 'sales': row[2]} for row in high_selling],
        'lowSelling': [{'name': row[0], 'sku': row[1], 'sales': row[2]} for row in low_selling],
        'overstocked': [{'name': row[0], 'sku': row[1], 'stock': row[2], 'salesRate': row[3]} for row in overstocked],
        'understocked': [{'name': row[0], 'sku': row[1], 'stock': row[2], 'salesRate': row[3]} for row in understocked],
    })

# Note: Adjust table names, column names, and logic based on your actual database schema.
# Ensure sales table has item_id referencing inventory.id, quantity, sale_date.
# Inventory table should have stock_quantity, reorder_point.</content>
<parameter name="filePath">c:\wamp64\www\hardware-POS\backend_sample.py
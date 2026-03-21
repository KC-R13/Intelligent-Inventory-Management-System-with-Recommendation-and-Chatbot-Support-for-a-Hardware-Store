import numpy as np
from scipy.spatial.distance import cosine
from sqlalchemy.orm import Session
from database import Product, Sale
from typing import List, Dict, Tuple
import pandas as pd

def get_sales_matrix(db: Session) -> pd.DataFrame:
    products = db.query(Product).all()
    prod_dict = {p.id: i for i, p in enumerate(products)}
    # Simple diagonal "activity" matrix where each product's
    # diagonal entry reflects how often it has been sold.
    # This can be extended later to a full co-occurrence matrix
    # when invoice / basket-level data is available.
    matrix = np.zeros((len(products), len(products)), dtype=float)
    sales = db.query(Sale).all()
    for sale in sales:
        if sale.product_id in prod_dict:
            matrix[prod_dict[sale.product_id], prod_dict[sale.product_id]] += sale.quantity
    return pd.DataFrame(matrix, index=[p.id for p in products], columns=[p.id for p in products])

def compute_recommendations(db: Session, target_prod_id: int, top_k: int = 5) -> List[Dict]:
    matrix = get_sales_matrix(db)
    if target_prod_id not in matrix.index:
        return []

    target_vec = matrix.loc[target_prod_id].to_numpy(dtype=float)
    # If we have no sales signal at all for the target, we
    # gracefully return an empty list instead of NaNs.
    if not np.any(target_vec):
        return []

    similarities = {}
    for prod_id in matrix.index:
        if prod_id != target_prod_id:
            other_vec = matrix.loc[prod_id].to_numpy(dtype=float)
            # Skip products that also have no sales signal.
            if not np.any(other_vec):
                continue
            sim = 1 - cosine(target_vec, other_vec)
            if np.isnan(sim):
                continue
            similarities[prod_id] = sim
    sorted_sims = sorted(similarities.items(), key=lambda x: x[1], reverse=True)[:top_k]
    recs = []
    for prod_id, sim in sorted_sims:
        prod = db.query(Product).filter(Product.id == prod_id).first()
        recs.append({"product_id": prod_id, "name": prod.name, "similarity": sim, "stock": prod.stock})
    return recs

def restock_recommendations(db: Session, threshold: int = 10) -> List[Dict]:
    low_stock = db.query(Product).filter(Product.stock < threshold).all()
    recs = []
    for prod in low_stock:
        avg_sales = db.query(Sale).filter(Sale.product_id == prod.id).count()  # Simplified avg daily
        recs.append({"product_id": prod.id, "name": prod.name, "recommended_qty": int(avg_sales * 1.2), "priority": "High"})
    return sorted(recs, key=lambda x: x["recommended_qty"], reverse=True)[:10]

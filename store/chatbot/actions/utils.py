from typing import Optional

from store.database.schema import Product
from store.database.engine import Session


def find_product(name: str) -> Optional[Product]:
    with Session() as session:
        return session.query(Product).filter(Product.name.ilike(f"%{name}%")).first()


def get_stock_status(qty: int) -> str:
    if qty == 0:
        return "❌ Out of Stock"
    elif qty <= 10:
        return f"⚠️ Low Stock ({qty} left)"
    else:
        return f"✅ In Stock ({qty} units)"

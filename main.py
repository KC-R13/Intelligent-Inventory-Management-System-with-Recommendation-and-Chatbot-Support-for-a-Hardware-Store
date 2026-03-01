from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from database import SessionLocal, Product, Sale
from recommender import compute_recommendations, restock_recommendations

app = FastAPI(title="IIMS Recommender API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ProductCreate(BaseModel):
    name: str
    stock: int
    price: float

class SaleCreate(BaseModel):
    product_id: int
    quantity: int

@app.post("/products/")
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    db_prod = Product(**product.dict())
    db.add(db_prod)
    db.commit()
    db.refresh(db_prod)
    return db_prod

@app.get("/products/")
def get_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Product).offset(skip).limit(limit).all()

@app.post("/sales/")
def create_sale(sale: SaleCreate, db: Session = Depends(get_db)):
    db_sale = Sale(**sale.dict())
    db.add(db_sale)
    product = db.query(Product).filter(Product.id == sale.product_id).first()
    if product:
        product.sales_count += sale.quantity
    db.commit()
    return db_sale

@app.get("/recommendations/{prod_id}")
def get_recs(prod_id: int, db: Session = Depends(get_db)):
    recs = compute_recommendations(db, prod_id)
    if not recs:
        raise HTTPException(status_code=404, detail="No recommendations")
    return recs

@app.get("/restock-recs/")
def get_restock_recs(db: Session = Depends(get_db)):
    return restock_recommendations(db)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

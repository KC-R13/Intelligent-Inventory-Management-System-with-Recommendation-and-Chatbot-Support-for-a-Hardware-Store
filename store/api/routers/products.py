from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from store.database.engine import Session
from store.database.schema import Product
from store.api.routers.auth import get_current_user

router = APIRouter(prefix="/products", tags=["products"])


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    stock: int = Field(default=0, ge=0)
    price: float = Field(..., gt=0)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    stock: int | None = Field(default=None, ge=0)
    price: float | None = Field(default=None, gt=0)


class ProductResponse(BaseModel):
    id: int
    name: str
    stock: int
    price: float


def _get_or_404(session, product_id: int) -> Product:
    product = session.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {product_id} not found",
        )
    return product

def _to_product_response(product: Product) -> ProductResponse:
    return ProductResponse(
        id=product.id,
        name=product.name,
        stock=product.stock,
        price=product.price,
    )


@router.get("/", response_model=list[ProductResponse])
def list_products(skip: int = 0, limit: int = 20):
    with Session() as session:
        return [_to_product_response(p) for p in session.query(Product).offset(skip).limit(limit).all()]


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int):
    with Session() as session:
        return _to_product_response(_get_or_404(session, product_id))


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    _current_user=Depends(get_current_user),
):
    with Session() as session:
        product = Product(**payload.dict())
        session.add(product)
        session.commit()
        session.refresh(product)
        return _to_product_response(product)


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    _current_user=Depends(get_current_user),
):
    with Session() as session:
        product = _get_or_404(session, product_id)
        updates = payload.dict(exclude_unset=True)
        for field, value in updates.items():
            setattr(product, field, value)
        session.commit()
        session.refresh(product)
        return  _to_product_response(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    _current_user=Depends(get_current_user),
):
    with Session() as session:
        product = _get_or_404(session, product_id)
        session.delete(product)
        session.commit()

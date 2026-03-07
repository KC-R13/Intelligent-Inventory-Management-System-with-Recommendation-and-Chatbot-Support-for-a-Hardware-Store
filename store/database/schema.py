from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Integer,
    String,
    Float,
)
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    name = Column(String(255))
    stock = Column(Integer, default=0)
    price = Column(Float)
    created_at = Column(DateTime, default=lambda : datetime.now(timezone.utc), nullable=False)

    def __repr__(self):
        return f"<Product id={self.sku!r} name={self.name!r}>"

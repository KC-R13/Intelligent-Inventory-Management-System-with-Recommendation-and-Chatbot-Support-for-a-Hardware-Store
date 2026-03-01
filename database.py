from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import pymysql

pymysql.install_as_MySQLdb()

SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:password@localhost/iims_db"  # Update credentials

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    stock = Column(Integer, default=0)
    price = Column(Float)
    sales_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Sale(Base):
    __tablename__ = "sales"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    date = Column(DateTime, default=datetime.utcnow)
    product = relationship("Product")

Base.metadata.create_all(bind=engine)

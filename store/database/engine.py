from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from store.general.configs import DATABASE_URL
from .schema import Base

engine = create_engine(DATABASE_URL, echo=True)
Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

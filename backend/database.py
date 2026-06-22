import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Define database URL, defaulting to a local SQLite database named smartnest.db
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./smartnest.db")

# Create SQLAlchemy engine.
# check_same_thread=False is needed only for SQLite because FastAPI can handle requests in multiple threads.
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(DATABASE_URL)

# Configure the session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base class for models
Base = declarative_base()

# FastAPI dependency to obtain a database session per request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

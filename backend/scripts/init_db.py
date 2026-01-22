import os
import sys

# Ensure the parent directory is in the path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from app.db import engine, Base
from app.models import User, AppData, AuditLog  # Import all models to ensure they are registered

def init_db():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_db()

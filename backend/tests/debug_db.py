
import sys
import os
from sqlalchemy import inspect, text

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from app.db import engine, Base
from app.models import User

def debug_database():
    print("Inspecting Database...")
    try:
        # Try to connect
        with engine.connect() as connection:
            print("Successfully connected to the database.")
            
            # Inspect tables
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            print(f"Existing tables: {tables}")
            
            if 'users' in tables:
                print("Table 'users' exists.")
                # Check columns
                columns = [c['name'] for c in inspector.get_columns('users')]
                print(f"Columns in 'users': {columns}")
                
                # Try a query
                result = connection.execute(text("SELECT count(*) FROM users"))
                count = result.scalar()
                print(f"User count: {count}")
            else:
                print("Table 'users' DOES NOT EXIST.")
                
    except Exception as e:
        print(f"Database Error: {e}")

if __name__ == "__main__":
    debug_database()

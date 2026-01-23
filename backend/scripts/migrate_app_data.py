
import sys
import os
import logging
from sqlalchemy import text

# Add src to path to import db config
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from app.db import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    logger.info("Starting app_data table migration...")
    
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # 1. Add columns if they don't exist
            # We use IF NOT EXISTS logic via checking information_schema or checking exception, 
            # but for simplicity in this script we'll just try to add and catch "duplicate column" errors 
            # or rely on safe idempotent checks if possible. 
            # Since this is a one-off refactor, we will execute specific ALTERs.
            
            # Check if columns exist
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='app_data'"))
            columns = [r[0] for r in res.fetchall()]
            
            if 'owner_id' not in columns:
                logger.info("Adding owner_id column...")
                conn.execute(text("ALTER TABLE app_data ADD COLUMN owner_id VARCHAR(120)"))
                
                # Backfill existing data
                logger.info("Backfilling owner_id for existing rows...")
                conn.execute(text("UPDATE app_data SET owner_id = 'system' WHERE owner_id IS NULL"))
                
                # Set NOT NULL
                logger.info("Setting owner_id to NOT NULL...")
                conn.execute(text("ALTER TABLE app_data ALTER COLUMN owner_id SET NOT NULL"))

            if 'is_public' not in columns:
                logger.info("Adding is_public column...")
                conn.execute(text("ALTER TABLE app_data ADD COLUMN is_public BOOLEAN DEFAULT FALSE"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_app_data_is_public ON app_data(is_public)"))

            # 2. Update Primary Key
            # Check current PK
            # We assume the PK is currently just 'key'. We need to drop it and add (owner_id, key).
            
            # Constraint name is usually app_data_pkey but let's be safe
            logger.info("Dropping old primary key...")
            conn.execute(text("ALTER TABLE app_data DROP CONSTRAINT IF EXISTS app_data_pkey"))
            
            logger.info("Creating new composite primary key...")
            conn.execute(text("ALTER TABLE app_data ADD PRIMARY KEY (owner_id, key)"))

            trans.commit()
            logger.info("Migration completed successfully!")
            
        except Exception as e:
            trans.rollback()
            logger.error(f"Migration failed: {e}")
            raise

if __name__ == "__main__":
    migrate()

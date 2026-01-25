# Custom Travel Builder API

## Requirements
- Python 3.11+
- Postgres 16+

## Setup
1. Create a virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -e .
   ```

2. Set environment variables by copying the project root `.env.example` to `.env` and editing values:
   ```bash
   cp ../.env.example .env
   ```
   Example `.env`:
   ```
   DATABASE_URL=postgresql+psycopg://user:pass@localhost:5432/travel_builder
   JWT_SECRET=change-me
   GEMINI_API_KEY=your-gemini-key
   ```

3. Initialize database schema:
   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   ```

4. Run the API:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --app-dir src
   ```

## Environment
- `DATABASE_URL` (required)
- `JWT_SECRET` (required)
- `JWT_ALGORITHM` (optional, default `HS256`)
- `ACCESS_TOKEN_EXPIRE_MINUTES` (optional, default `1440`)
- `GEMINI_API_KEY` (optional, enables AI endpoints)
- `CORS_ORIGINS` (optional, comma-separated list)
- `LOG_LEVEL` (optional, default `INFO`)
- `LOG_JSON` (optional, default `false`)

## API
- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Data: `GET /api/data/{key}`, `PUT /api/data/{key}`, `GET /api/data`, `POST /api/data/restore`
- Admin: `GET /api/admin/users`, `DELETE /api/admin/users/{username}`, `GET /api/admin/logs`
- AI: `POST /api/ai/suggest-hotels`, `POST /api/ai/itinerary`
- Health: `GET /health`

## Project Structure
- `src/app/main.py` - FastAPI app entry
- `src/app/routers/` - API routers
- `src/app/models.py` - SQLAlchemy models
- `db/schema.sql` - Database schema (apply before startup)

## Operations (Best Practices)
### Production Run
```
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --app-dir src
```

### Logging
- Logs go to stdout by default.
- Use `LOG_LEVEL=INFO|DEBUG|WARNING|ERROR`.
- Use `LOG_JSON=true` for JSON log lines when shipping to log collectors.

### Health Check
- `GET /health` should return `{"status":"ok"}`.

### Backups
- Database backup (recommended): `pg_dump` nightly with retention.
- App data export: `GET /api/data`, restore via `POST /api/data/restore`.

### Security
- Rotate `JWT_SECRET` and enforce strong admin passwords.
- Restrict `CORS_ORIGINS` to trusted domains.
- Run behind HTTPS and a reverse proxy.

### Scaling
- Increase `--workers` based on CPU cores.
- Consider PgBouncer for connection pooling at scale.

## User Management
- Accounts are stored in the database only (no admin credentials in `.env`).
- Create a user via API or the CLI script below, then promote to admin in SQL or CLI if needed.

### CLI (recommended for initial admin)
```
python scripts/manage_users.py create --username admin --role admin
python scripts/manage_users.py promote --username your_admin --role admin
python scripts/manage_users.py reset-password --username your_admin
```

### SQL
```
update users set role = 'admin' where username = 'your_admin';
```

## Notes
- Database schema is maintained in `db/schema.sql` and must be applied before startup.

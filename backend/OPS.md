# Backend Ops Manual (Best Practices)

## Overview
- Stack: FastAPI + SQLAlchemy + Postgres
- Auth: JWT
- Health endpoint: `GET /health`

## Environment Variables
Required:
- `DATABASE_URL=postgresql+psycopg://user:pass@host:5432/travel_builder`
- `JWT_SECRET=change-me`

Optional:
- `JWT_ALGORITHM=HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES=1440`
- `ADMIN_USERNAME=admin`
- `ADMIN_PASSWORD=liuwen` (change in production)
- `GEMINI_API_KEY=...` (AI features)
- `CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`

## Run (Production)
Recommended:
```
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --app-dir src
```

Systemd example:
```
[Unit]
Description=Travel Builder API
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/travel-builder/backend
EnvironmentFile=/opt/travel-builder/backend/.env
ExecStart=/opt/travel-builder/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --app-dir src
Restart=always

[Install]
WantedBy=multi-user.target
```

## Database
- Tables are auto-created on startup.
- Best practice: introduce Alembic migrations once schema grows.
- For production, use a managed Postgres with backups and monitoring.

## Backups
1. Database-level backup (recommended):
   - `pg_dump` nightly + retention policy.
2. Application data backup:
   - `GET /api/data` export JSON.
   - `POST /api/data/restore` to restore.

## Monitoring & Logs
- Track `/health` and 5xx rates.
- Enable structured logs if needed (e.g., JSON log formatter).
- Monitor DB connection pool usage and latency.

## Security
- Rotate `JWT_SECRET` and admin credentials.
- Restrict `CORS_ORIGINS` to trusted domains.
- Put API behind HTTPS and a reverse proxy.
- Apply rate limiting at the edge (nginx/ingress).

## Scaling
- Increase `--workers` based on CPU cores.
- Use a load balancer for multiple instances.
- Consider PgBouncer for connection pooling at scale.

## Troubleshooting
- 401 errors: check JWT token expiry and `JWT_SECRET`.
- 500 errors: inspect DB connectivity and migrations.
- AI errors: ensure `GEMINI_API_KEY` is set.

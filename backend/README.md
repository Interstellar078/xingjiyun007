# Custom Travel Builder API

## Requirements
- Python 3.11+
- Postgres 14+

## Setup
1. Create a virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -e .
   ```

2. Set environment variables:
   ```bash
   export DATABASE_URL="postgresql+psycopg://user:pass@localhost:5432/travel_builder"
   export JWT_SECRET="change-me"
   export GEMINI_API_KEY="your-gemini-key"  # optional for AI endpoints
   ```

3. Run the API:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --app-dir src
   ```

## API
- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Data: `GET /api/data/{key}`, `PUT /api/data/{key}`, `GET /api/data`, `POST /api/data/restore`
- Admin: `GET /api/admin/users`, `DELETE /api/admin/users/{username}`, `GET /api/admin/logs`
- AI: `POST /api/ai/suggest-hotels`, `POST /api/ai/itinerary`

Notes:
- The backend auto-creates tables on startup.
- Admin user is bootstrapped from `ADMIN_USERNAME`/`ADMIN_PASSWORD` (defaults: admin/liuwen).

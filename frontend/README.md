# Custom Travel Builder Frontend

## Requirements
- Node.js 18+

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure API base URL:
   ```bash
   VITE_API_BASE_URL=http://localhost:8000
   ```
3. Run the frontend:
   ```bash
   npm run dev
   ```

## Operations (Best Practices)
### Build & Release
1. Install deps (clean): `npm ci`
2. Set env for target environment:
   - `VITE_API_BASE_URL=https://api.example.com`
3. Build: `npm run build`
4. Publish `dist/` to your static host or CDN.

### Serving (Nginx example)
```
server {
  listen 80;
  server_name example.com;
  root /var/www/travel-frontend;
  index index.html;

  location / {
    try_files $uri /index.html;
  }

  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
}
```

### Health Check
- `GET /` returns 200.
- Any SPA route returns `index.html`.

### Monitoring
- Track 4xx/5xx rates, TTFB, asset load time.
- Optional RUM for client errors.

### Security
- Serve over HTTPS only and enable HSTS.
- Consider CSP to restrict script sources.
- Do not publish `.env` files.

### Rollback
- Keep previous `dist/` build and rollback via deploy tooling or symlink switch.

## Notes
- The frontend expects the FastAPI backend to be running.
- Create `frontend/.env.local` (参考项目根目录 `.env.example` 中的 `VITE_API_BASE_URL`).

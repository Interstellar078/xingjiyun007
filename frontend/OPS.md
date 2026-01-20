# Frontend Ops Manual (Best Practices)

## Overview
- Stack: Vite + React + TypeScript
- Build output: `dist/`
- API base URL: `VITE_API_BASE_URL` (build-time)

## Build & Release
1. Install deps (clean): `npm ci`
2. Set env for target environment:
   - `VITE_API_BASE_URL=https://api.example.com`
3. Build: `npm run build`
4. Publish `dist/` to your static host or CDN.

Best practice:
- Use separate `.env.production` and `.env.staging`.
- Keep `dist/` immutable; release by deploying a new build.

## Serving (Nginx example)
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

## Health Check
- Basic: `GET /` should return `200`.
- SPA routing: any route should return `index.html`.

## Monitoring & Logs
- Collect web server access/error logs.
- Track 4xx/5xx rates, TTFB, and asset load times.
- Add RUM (optional) to capture client errors.

## Security
- Serve over HTTPS only.
- Enable HSTS at the CDN/edge.
- Consider CSP to restrict script sources.
- Do not expose `.env` files in the web root.

## Rollback
- Keep the previous `dist/` build and switch via symlink or deploy rollback in your CI/CD.

## Troubleshooting
- 404 on refresh: missing SPA fallback (`try_files $uri /index.html`).
- CORS errors: backend CORS settings (`CORS_ORIGINS`) must allow frontend origin.
- Wrong API base URL: verify `VITE_API_BASE_URL` at build time.

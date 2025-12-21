# Frontend URL Replacement Scripts

These scripts replace the `__FRONTEND_URL__` placeholder in HTML files with the actual frontend URL from environment variables.

## Usage

### Node.js Version
```bash
# Set environment variable and run
FRONTEND_URL=https://your-domain.com node scripts/replace-frontend-url.js

# Or use VITE_FRONTEND_URL
VITE_FRONTEND_URL=https://your-domain.com node scripts/replace-frontend-url.js
```

### Python Version
```bash
# Set environment variable and run
FRONTEND_URL=https://your-domain.com python scripts/replace_frontend_url.py

# Or use VITE_FRONTEND_URL
VITE_FRONTEND_URL=https://your-domain.com python scripts/replace_frontend_url.py
```

## Environment Variables

The scripts check for environment variables in this order:
1. `FRONTEND_URL`
2. `VITE_FRONTEND_URL`
3. Default: `http://localhost:5173` (development fallback)

## Files Processed

- `frontend/index.html`
- `backend/frontend/index.html`

## Integration

Add to your build process:

### Package.json
```json
{
  "scripts": {
    "build": "npm run replace-urls && vite build",
    "replace-urls": "node scripts/replace-frontend-url.js"
  }
}
```

### Docker/CI
```bash
# In your Dockerfile or CI script
ENV FRONTEND_URL=https://your-production-domain.com
RUN node scripts/replace-frontend-url.js
```
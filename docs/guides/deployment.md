# Deployment

PropLab deploys to **Cloudflare Workers (static assets)** automatically on every push to `main`.

## Pipeline

`.github/workflows/deploy.yml`:

```
push to main ──▶ checkout ─▶ Node 24 ─▶ npm ci ─▶ npm test ─▶ npm run build ─▶ wrangler deploy
pull request ──▶ checkout ─▶ Node 24 ─▶ npm ci ─▶ npm test ─▶ npm run build   (no deploy)
manual       ──▶ "Run workflow" button in the Actions tab, same as push
```

A newer push cancels an in-progress run for the same branch.

## Required secrets

Repository → Settings → Secrets and variables → Actions:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | API token with the **Edit Cloudflare Workers** template permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your account ID (Cloudflare dashboard → Workers & Pages → right sidebar) |

## Cloudflare configuration

`wrangler.jsonc`:

```jsonc
{
  "name": "proplab",                       // Worker name → proplab.<subdomain>.workers.dev
  "compatibility_date": "2026-09-01",
  "assets": {
    "directory": "./dist",                 // Vite build output
    "not_found_handling": "single-page-application"
  }
}
```

The Worker is created automatically on the first deploy.

## Finding the live URL

- GitHub → Actions → latest run → "Deploy to Cloudflare" step output, or
- Cloudflare dashboard → Workers & Pages → `proplab`.

## Custom domain

Cloudflare dashboard → Workers & Pages → `proplab` → Settings → Domains & Routes → Add custom domain. The domain must be on your Cloudflare account. No code changes needed.

## Deploy from your machine

```bash
npx wrangler login
npm run deploy
```

## Rolling back

Cloudflare dashboard → `proplab` → Deployments → pick an earlier version → Rollback. Or revert the commit on `main` and let CI redeploy.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `npm ci` fails with `Cannot read properties of null (reading 'edgesOut')` | npm 10. Use Node 24 (npm 11), as the workflow does |
| Deploy step: authentication error | Secret missing, misnamed, or token lacks Workers edit permission |
| Deploy step: account ID error | `CLOUDFLARE_ACCOUNT_ID` missing, or the token belongs to a different account |
| Site loads but 3D view is blank | Browser without WebGL; everything else should still work |
| Old version still showing | Hard refresh; the HTML is not long-cached, but your browser may hold it briefly |

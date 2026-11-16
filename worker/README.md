# myerp-usage

Cloudflare Worker that counts web app opens and exposes totals for the landing page.

- `POST /open` with `{ opens, homeScreen }` increments the all-time counters in D1.
- `GET /stats` returns `{ webOpens, webHomeScreen, apkDownloads }`. APK downloads are summed from the GitHub releases API and cached for an hour.

The web app only reports when `EXPO_PUBLIC_USAGE_URL` is set at build time, and the landing page reads the same Worker. Nothing else is collected.

## Deploy

The D1 name and id are not committed. Provide them as `D1_DATABASE_NAME` and `D1_DATABASE_ID`, either through the environment (GitHub secrets with the same names) or a local `worker/.env`:

```bash
D1_DATABASE_NAME=myerp-usage
D1_DATABASE_ID=...
```

`npm run deploy:worker` writes the ignored `wrangler.toml` and deploys it.

First-time setup:

```bash
npx wrangler d1 create myerp-usage
npx wrangler d1 execute myerp-usage --remote --file=schema.sql
gh variable set USAGE_URL --body "https://myerp-usage.<account>.workers.dev"
```

## Reset

```bash
npx wrangler d1 execute myerp-usage --remote --command "DELETE FROM counters"
```

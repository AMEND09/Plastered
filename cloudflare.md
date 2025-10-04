Plastered — Cloudflare Workers deployment guide

This project includes a `wrangler.toml` pre-configured for a Workers Sites deployment.

Quick steps to publish (local build -> Workers Sites):

1. Install Wrangler (Cloudflare CLI):

   npm install -g wrangler

2. Build the web output for your Expo web app. Depending on your setup, one of the following may work:

   npm run build:web
   # or
   expo export --platform web --output ./web-build

3. Update `wrangler.toml`:
   - Replace `account_id = "YOUR_ACCOUNT_ID_HERE"` with your Cloudflare account ID.
   - Optionally set `zone_id` and `route` if you want to publish to a custom domain.
   - Confirm the `site.bucket` path matches your web build output (defaults to `./web-build`).

4. Authenticate Wrangler:

   wrangler login

5. Publish:

   wrangler publish

Notes:
- If you need SPA fallback support (single-page-router behaviour), consider using a small Worker script that serves `index.html` for unmatched routes. You can set `main = "worker/index.js"` and configure `site` accordingly.
- For large static sites, consider compressing assets or using Cloudflare's Page Rules to set caching headers.

If you want I can also scaffold a minimal Worker handler (`worker/index.js`) that implements SPA fallback and static asset caching. Tell me if you'd like that.
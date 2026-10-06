# Deploying cv.moults31.dev

A fully static, client-side SPA. `npm run build` produces `dist/`; there is no
server to run.

## Cloudflare Workers (recommended — `wrangler.jsonc` is set up for it)

1. Cloudflare dashboard → **Workers & Pages → Create → Workers → Connect to Git**, pick
   `moults31/cv.moults31.dev`.
2. Build settings:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
   - **Build variable:** `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` (Playwright is only used by the
     repo's own image scripts, never by the build)
3. Deploy. `wrangler.jsonc` serves `dist/` as static assets with SPA routing
   (`not_found_handling: "single-page-application"`), and `_headers` carries the security
   headers.
4. **Custom domain:** Worker → **Settings → Domains & Routes → Add → Custom domain** →
   `cv.moults31.dev`. Because `moults31.dev` is in the same account, the DNS record is created
   automatically with TLS.

### Alternatively, from the terminal

```bash
npx wrangler login
npm run build
npx wrangler deploy
```

## Cloudflare Pages (if you prefer Pages)

Pages ignores `wrangler.jsonc`, so first add `public/_redirects` containing:

```
/* /index.html 200
```

then create a Pages project with build command `npm run build` and output directory `dist`.
Pages honours `public/_headers`.

## Apex → cv redirect

In the `moults31.dev` zone: **Rules → Redirect Rules → Create**:

- **When:** hostname is `moults31.dev` (add `www.moults31.dev` as a second rule if you want it)
- **Then:** dynamic redirect to `https://cv.moults31.dev` + the incoming path, status **301**

That keeps `moults31.dev` free for a future portfolio — when it exists, just delete the rule.

## Email for `moults31@moults31.dev`

Cloudflare dashboard → the `moults31.dev` zone → **Email → Email Routing → Enable**, then add a
destination inbox and a custom address `moults31@moults31.dev` forwarding to it. Cloudflare
creates the MX/SPF records for you. (Sending *from* the address needs an SMTP-capable mailbox;
forwarding is enough for a résumé contact.)

## Updating the résumé

1. Open `https://cv.moults31.dev/app` (or `http://localhost:5173/app`) and edit. Content lives in
   your browser's IndexedDB.
2. **Export → JSON Resume**, then replace `public/resume.json` with the downloaded file.
3. Commit and push. Cloudflare rebuilds automatically.

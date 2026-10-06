# cv.moults31.dev

Zachary Moulton's personal résumé site — a **lean fork of [CVAurum](https://github.com/akhil-dara/CVAurum)** (AGPL-3.0).

The site serves exactly one thing: a read-only résumé page at `/` in CVAurum's **Sapphire** template, with a
**Download PDF** button that builds the file in the browser using CVAurum's own vector engine (selectable text,
PDF/A-2B + PDF/UA-1). There is no server, no database, and no tracking.

## How it works

- `public/resume.json` is the single source of truth — a normal [JSON Resume](https://jsonresume.org/schema)
  document with CVAurum's visual metadata under `meta.cvaurum`.
- `src/routes/ResumeView.tsx` loads it, renders it with the shared `TemplateRenderer`, and exposes the PDF engine.
- The editor is kept at `/app` (authoring only); `/print/:id` is a chrome-free native-print fallback. Every other
  public route from upstream (landing, template gallery, examples, prompts, guides, job tracker) was removed.

## Updating the résumé

1. Open `/app` (locally or on the deployed site) and edit. Data lives in your browser's IndexedDB, so nothing is
   uploaded.
2. **Export → JSON Resume**, and replace `public/resume.json` with the file.
3. Commit and push. Cloudflare builds and deploys.

To switch template, accent colour, page size, or section order, do it in the editor before exporting; the choices
travel in `meta.cvaurum`.

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build to dist/
```

## Deploy (Cloudflare)

The repo ships `wrangler.jsonc` (static assets + SPA fallback). Connect the repo in **Cloudflare → Workers & Pages →
Create → Connect to Git**, with build command `npm run build` and output directory `dist`, then attach the custom
domain `cv.moults31.dev`. Set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` as a build variable (Playwright is only used by
the repo's own image scripts, not the build).

## Notes on this fork

- Removed from upstream: the marketing/SEO routes and their assets (`public/art`, `public/og`, the OCR and semantic
  models under `public/ocr` and `public/semantic`). Display and PDF fonts (`public/fonts`, `public/fonts-pdf`),
  the sRGB profile (`public/color`), and the editor's page thumbnails (`public/img`) are kept.
- The PDF engine, templates, editor, and data schema are CVAurum's, unmodified apart from the route/viewer changes.

## Licence

AGPL-3.0-only. The résumé content belongs to Zachary Moulton; the application code is © 2026 Akhil Dara and CVAurum
contributors (see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE)).

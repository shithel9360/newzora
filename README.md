# Newzora — website

Verified tech news site for the Newzora channel (Instagram / Facebook / Threads: @new_zora).

- `posts.json` — all articles (newest first). The posting system appends new entries here.
- `assets/*.b64` — poster images (base64 text so the repo stays text-only); `build.js` decodes them to `dist/img/`.
- `build.js` — zero-dependency Node static generator and SEO engine:
  - Generates `dist/index.html` (homepage with `WebSite` & `NewsMediaOrganization` JSON-LD schema)
  - Generates dedicated category hubs in `dist/category/*.html` (`CollectionPage` & `BreadcrumbList`)
  - Generates individual article pages in `dist/post/*.html` (`NewsArticle` rich snippets, source attribution, reading time)
  - Generates E-E-A-T trust pages: `dist/about.html`, `dist/editorial-policy.html`, `dist/contact.html`
  - Generates Google News XML Sitemap: `dist/news-sitemap.xml`
  - Generates Standard XML Sitemap with image tags: `dist/sitemap.xml`
  - Generates RSS 2.0 Feeds: `dist/feed.xml` & `dist/rss.xml` (for Google News Publisher Center & RSS readers)
  - Generates `dist/robots.txt` referencing both sitemaps
- `test/` — automated test suite covering SEO meta tags, schema validity, and sitemaps (`npm test`).
- Deployed on Vercel: build command `node build.js`, output `dist` with clean URLs and asset caching headers.

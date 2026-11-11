# Newzora — website

Verified tech news site for the Newzora channel (Instagram / Facebook / Threads: @new_zora).

- `posts.json` — all articles (newest first). The posting system appends new entries here.
- `assets/*.b64` — poster images (base64 text so the repo stays text-only); `build.js` decodes them to `dist/img/`.
- `build.js` — zero-dependency Node static generator: builds `dist/` (homepage, one page per article, sitemap).
- Deployed on Vercel: build command `node build.js`, output `dist`.

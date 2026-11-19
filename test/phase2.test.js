const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const ROOT = path.join(__dirname, '..');

const read = f => fs.readFileSync(path.join(DIST, f), 'utf8');
const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'posts.json'), 'utf8'));
const byId = Object.fromEntries(posts.map(p => [p.id, p]));
const postHtml = p => fs.readFileSync(path.join(DIST, 'post', `${p.slug}.html`), 'utf8');

describe('Newzora Phase 2 — structure & reading experience', () => {

  test('search.json is a compact index: 118 entries, no full bodies', () => {
    const indexPath = path.join(DIST, 'search.json');
    assert.ok(fs.existsSync(indexPath), 'search.json must exist in dist');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    assert.equal(index.length, posts.length, 'one index entry per post');
    const expectedKeys = ['category', 'date', 'excerpt', 'id', 'slug', 'title', 'url'].sort();
    for (const entry of index) {
      assert.deepEqual(Object.keys(entry).sort(), expectedKeys, `entry ${entry.id} must carry exactly the index keys`);
      assert.equal(entry.url, `/post/${entry.slug}.html`);
      assert.ok(entry.excerpt.length <= 160, `entry ${entry.id} excerpt must stay short`);
      assert.ok(!('body' in entry), `entry ${entry.id} must not carry the full body`);
    }
    const bySlug = Object.fromEntries(posts.map(p => [p.slug, p]));
    for (const entry of index) {
      assert.ok(bySlug[entry.slug], `index slug ${entry.slug} must be a real post`);
      assert.equal(entry.title, bySlug[entry.slug].title);
      assert.equal(entry.category, bySlug[entry.slug].category);
    }
    // A distinctive full-body sentence must not leak into the index.
    const raw = fs.readFileSync(indexPath, 'utf8');
    assert.ok(!raw.includes('The proceedings will now move through the California court system'),
      'search.json must not contain full article body text');
    assert.ok(!/## /.test(raw), 'search.json must not contain literal ## markers');
  });

  test('Homepage no longer embeds data-t full-text attributes', () => {
    const indexHtml = read('index.html');
    assert.ok(!/data-t="/.test(indexHtml), 'wire rows must not carry data-t search attributes');
    assert.equal((indexHtml.match(/class="wire-row"/g) || []).length, posts.length, 'all wire rows still render');
  });

  test('Homepage is smaller than the Phase 1 baseline (260,452 bytes)', () => {
    const size = fs.statSync(path.join(DIST, 'index.html')).size;
    assert.ok(size < 245000, `index.html must shrink after removing data-t (got ${size} bytes, baseline 260452)`);
  });

  test('Homepage has Space and Tech Business desk sections', () => {
    const indexHtml = read('index.html');
    assert.equal((indexHtml.match(/Desk Briefing/g) || []).length, 8, 'eight desk sections (6 original + Space + Tech Business)');
    assert.match(indexHtml, /<span class="pill-cat">Space<\/span> Desk Briefing/);
    assert.match(indexHtml, /<span class="pill-cat">Tech Business<\/span> Desk Briefing/);
    assert.ok(indexHtml.includes('href="/category/space.html"'), 'Space section links to its hub');
    assert.ok(indexHtml.includes('href="/category/tech-business.html"'), 'Tech Business section links to its hub');
  });

  test('Homepage wire river has load-more pagination and index-backed search', () => {
    const indexHtml = read('index.html');
    assert.match(indexHtml, /<button id="load-more" class="btn ghost" type="button"><\/button>/, 'load-more button must exist');
    assert.ok(indexHtml.includes("fetch('/search.json')"), 'search must fetch the compact index');
    assert.ok(indexHtml.includes("Load more dispatches (' + remaining + ' remaining)"), 'load-more must show the remaining count');
    assert.ok(indexHtml.includes('visibleLimit += PAGE_SIZE'), 'load-more must advance the visible limit in batches');
    assert.ok(indexHtml.includes("new URLSearchParams(window.location.search).get('q')"), 'search must honour a ?q= deep link');
    assert.match(indexHtml, /"urlTemplate":"https:\/\/newzora\.asf\.run\/\?q=\{search_term_string\}"/,
      'WebSite SearchAction must point at /?q=, not /#latest?q=');
  });

  test('Article pages have a reading-progress bar and a copy-link button with fallback', () => {
    for (const p of posts) {
      const html = postHtml(p);
      assert.match(html, /<div class="read-progress" aria-hidden="true"><span class="read-progress-fill" id="read-progress-fill"><\/span><\/div>/,
        `${p.slug} needs the reading-progress bar`);
      assert.match(html, /<button class="btn ghost copy-btn" type="button" data-copy-link aria-label="Copy article link">/,
        `${p.slug} needs the copy-link button`);
      assert.ok(!/onclick="navigator\.clipboard/.test(html), `${p.slug} must not use the old inline clipboard handler`);
      assert.ok(html.includes('navigator.clipboard.writeText'), `${p.slug} copy script must use the Clipboard API`);
      assert.ok(html.includes("document.execCommand('copy')"), `${p.slug} copy script must keep the execCommand fallback`);
      assert.ok(html.includes('read-progress-fill'), `${p.slug} progress script must reference the fill element`);
    }
  });

  test('Prev/next navigation is correct on every article including the edges', () => {
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      const html = postHtml(p);
      const hasPrev = html.includes('Previous Dispatch');
      const hasNext = html.includes('Next Dispatch');
      assert.equal(hasPrev, i + 1 < posts.length, `${p.slug}: Previous must exist iff an older post exists`);
      assert.equal(hasNext, i - 1 >= 0, `${p.slug}: Next must exist iff a newer post exists`);
      if (hasPrev) assert.ok(html.includes(`/post/${posts[i + 1].slug}.html`), `${p.slug} Previous must link the older post`);
      if (hasNext) assert.ok(html.includes(`/post/${posts[i - 1].slug}.html`), `${p.slug} Next must link the newer post`);
    }
    // Edges spelled out explicitly.
    assert.ok(!postHtml(byId[131]).includes('Next Dispatch'), 'newest post (131) has no Next');
    assert.ok(postHtml(byId[131]).includes('Previous Dispatch'), 'newest post (131) has Previous');
    assert.ok(!postHtml(byId[1]).includes('Previous Dispatch'), 'oldest post (1) has no Previous');
    assert.ok(postHtml(byId[1]).includes('Next Dispatch'), 'oldest post (1) has Next');
  });

  test('Related dispatches: exactly 4 per article, same category first, never the article itself', () => {
    for (const p of posts) {
      const html = postHtml(p);
      const section = html.split('Related Dispatches')[1];
      assert.ok(section, `${p.slug} must have a Related Dispatches section`);
      const cards = section.match(/class="card(?: featured)?"/g) || [];
      assert.equal(cards.length, 4, `${p.slug} must show exactly 4 related cards (got ${cards.length})`);
      assert.ok(!section.includes(`/post/${p.slug}.html`), `${p.slug} must never relate to itself`);
    }
    // Same-category priority: id 119 is AI and has 52 same-category peers — all 4 related are AI.
    const sec119 = postHtml(byId[119]).split('Related Dispatches')[1];
    const cats119 = [...sec119.matchAll(/<span class="pill-cat">([^<]+)<\/span>/g)].map(m => m[1]);
    assert.deepEqual(cats119, ['AI', 'AI', 'AI', 'AI'], 'id 119 related must all be AI');
    // Fill behaviour: id 47 is the sole Apple post, so its related are the 4 newest other posts.
    const sec47 = postHtml(byId[47]).split('Related Dispatches')[1];
    for (const id of [131, 130, 129, 128]) {
      assert.ok(sec47.includes(`/post/${byId[id].slug}.html`), `id 47 related must include newest post ${id}`);
    }
  });

  test('Named sources: section lists the article\'s own sources, absent when the article has none', () => {
    // Id 117: "Source: SwitchBot / PR Newswire" -> two named list items.
    const html117 = postHtml(byId[117]);
    assert.match(html117, /<section class="sources-section" aria-label="Sources">/);
    assert.match(html117, /<li>SwitchBot<\/li><li>PR Newswire<\/li>/);
    // Id 119 has no Sources line -> no section at all.
    assert.ok(!postHtml(byId[119]).includes('<section class="sources-section"'), 'id 119 must have no sources section');
    // Every article: section present exactly when a Sources line exists in the body.
    for (const p of posts) {
      const hasLine = /^Sources?:\s*.+$/m.test(p.body);
      assert.equal(postHtml(p).includes('<section class="sources-section"'), hasLine,
        `id ${p.id}: sources section must match the presence of a Sources line`);
    }
    // The generic fallback box is gone everywhere — no invented corroboration text.
    for (const p of posts) {
      assert.ok(!postHtml(p).includes('Corroboration Standard'), `id ${p.id} must not carry the generic fallback box`);
    }
  });

  test('Branded 404 page exists, is noindex, and is not in any sitemap', () => {
    const nfPath = path.join(DIST, '404.html');
    assert.ok(fs.existsSync(nfPath), '404.html must exist in dist');
    const html = fs.readFileSync(nfPath, 'utf8');
    assert.match(html, /<meta name="robots" content="noindex, nofollow">/, '404 must be noindex');
    assert.ok(!html.includes('rel="canonical"'), '404 must not carry a canonical URL');
    assert.match(html, /<form class="notfound-search" action="\/" method="get" role="search">/, '404 needs a search form');
    assert.match(html, /<input id="nf-q" name="q" type="search"/, '404 search must submit as ?q=');
    assert.ok(html.includes('Technology Without Borders'), '404 must carry the tagline');
    assert.ok(html.includes('href="/"'), '404 must link home');
    assert.ok(html.includes('href="/#latest"'), '404 must link the latest dispatches');
    assert.equal((html.match(/class="card(?: featured)?"/g) || []).length, 3, '404 must show 3 trending stories');
    const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(ldMatch, '404 must have JSON-LD');
    assert.doesNotThrow(() => JSON.parse(ldMatch[1]), '404 JSON-LD must be valid JSON');
    const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
    assert.ok(!sitemap.includes('404.html'), '404 must not be listed in sitemap.xml');
    assert.ok(!sitemap.includes('search.json'), 'search.json must not be listed in sitemap.xml');
  });

  test('vercel.json caches the search index like the other generated data files', () => {
    const vercelConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
    const sources = vercelConfig.headers.map(h => h.source);
    assert.ok(sources.some(s => s.includes('xml|txt|json')), 'cache rule must cover .json (search.json)');
  });

});

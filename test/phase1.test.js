const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const ROOT = path.join(__dirname, '..');

const read = f => fs.readFileSync(path.join(DIST, f), 'utf8');

// All 14 real categories (post counts verified against posts.json).
const ALL_CATEGORIES = [
  'ai', 'gadgets', 'gaming', 'mobile', 'cybersecurity', 'tech',
  'tech-business', 'space', 'microsoft', 'ev', 'smart-home',
  'wearables', 'science', 'apple'
];

describe('Newzora Phase 1 — quick wins', () => {

  test('Category hub pages exist for all 14 real categories with CollectionPage + BreadcrumbList JSON-LD', () => {
    for (const cat of ALL_CATEGORIES) {
      const catPath = path.join(DIST, 'category', `${cat}.html`);
      assert.ok(fs.existsSync(catPath), `category/${cat}.html must exist`);
      const html = fs.readFileSync(catPath, 'utf8');
      assert.match(html, new RegExp(`<link\\s+rel="canonical"\\s+href="https:\\/\\/newzora\\.asf\\.run\\/category\\/${cat}\\.html">`));
      assert.match(html, /CollectionPage/);
      assert.match(html, /BreadcrumbList/);
      const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(ldMatch, `category/${cat}.html must have JSON-LD script`);
      assert.doesNotThrow(() => JSON.parse(ldMatch[1]), `category/${cat}.html JSON-LD must be valid JSON`);
    }
  });

  test('Merged-away taxonomy has no category pages (Security, Smartphones)', () => {
    assert.ok(!fs.existsSync(path.join(DIST, 'category', 'security.html')), 'no security.html after merge into Cybersecurity');
    assert.ok(!fs.existsSync(path.join(DIST, 'category', 'smartphones.html')), 'no smartphones.html after merge into Mobile');
  });

  test('No dead Business nav link anywhere in the built site', () => {
    const indexHtml = read('index.html');
    assert.ok(!/>Business</.test(indexHtml), 'header nav must not contain a Business link');
    assert.ok(!/\/category\/business\.html/.test(indexHtml), 'no link to /category/business.html');
  });

  test('Truncated titles fixed (ids 15, 16, 20, 23) and slugs unchanged', () => {
    const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'posts.json'), 'utf8'));
    const byId = Object.fromEntries(posts.map(p => [p.id, p]));
    assert.equal(byId[15].title, 'Anthropic has launched Claude Fable 5.2 and Claude Mythos 5.2, its new models built for the hardest technical work — coding, reasoning and science.');
    assert.equal(byId[16].title, "BREAKING: Anthropic's blockbuster IPO is now set to raise up to $64.4 billion, according to the latest draft prospectus seen by Reuters");
    assert.equal(byId[20].title, "LEAK: Dummy units of the iPhone Air 2 and the standard iPhone 18 have surfaced online — giving us our first real look at Apple's 2027 iPhones.");
    assert.equal(byId[23].title, 'Binance has issued an urgent warning to iPhone users: a flaw in iOS dubbed \u201cworse_query\u201d could let a malicious app read local files');
    assert.equal(byId[15].slug, '15-anthropic-has-launched-claude-fable-5-2-and-claude-mythos-5-');
    assert.equal(byId[16].slug, '16-breaking-anthropic-s-blockbuster-ipo-is-now-set-to-raise-up-');
    assert.equal(byId[20].slug, '20-leak-dummy-units-of-the-iphone-air-2-and-the-standard-iphone');
    assert.equal(byId[23].slug, '23-binance-has-issued-an-urgent-warning-to-iphone-users-a-flaw-');
    // Fixed titles render complete in the article <h1>
    for (const id of [15, 16, 20, 23]) {
      const html = fs.readFileSync(path.join(DIST, 'post', `${byId[id].slug}.html`), 'utf8');
      assert.match(html, new RegExp(`<h1>${byId[id].title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h1>`));
    }
  });

  test('Taxonomy normalised: no Security / Smartphones categories remain in posts.json', () => {
    const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'posts.json'), 'utf8'));
    const cats = new Set(posts.map(p => p.category));
    assert.ok(!cats.has('Security'), 'Security must be merged into Cybersecurity');
    assert.ok(!cats.has('Smartphones'), 'Smartphones must be merged into Mobile');
    const byId = Object.fromEntries(posts.map(p => [p.id, p]));
    assert.equal(byId[96].category, 'Cybersecurity');
    assert.equal(byId[60].category, 'Mobile');
    assert.equal(byId[24].category, 'Microsoft');
  });

  test('No literal ## markers leak into rendered HTML or the search index', () => {
    const indexHtml = read('index.html');
    assert.ok(!/data-t="[^"]*##/.test(indexHtml), 'data-t search attributes must not contain ## markers');
    const postDir = path.join(DIST, 'post');
    for (const file of fs.readdirSync(postDir).filter(f => f.endsWith('.html'))) {
      const html = fs.readFileSync(path.join(postDir, file), 'utf8');
      assert.ok(!html.includes('## '), `${file} must not contain a literal '## ' marker`);
    }
  });

  test('og:image dimensions match the real JPEG file; article pages carry published_time', () => {
    const indexHtml = read('index.html');
    // Hero poster is 880x1100
    assert.match(indexHtml, /<meta property="og:image:width" content="880">/);
    assert.match(indexHtml, /<meta property="og:image:height" content="1100">/);
    assert.match(indexHtml, /<meta name="twitter:image:alt"/);
    const postDir = path.join(DIST, 'post');
    const files = fs.readdirSync(postDir).filter(f => f.endsWith('.html'));
    assert.ok(files.length > 0, 'articles must exist');
    for (const file of files.slice(0, 5)) {
      const html = fs.readFileSync(path.join(postDir, file), 'utf8');
      assert.match(html, /<meta property="article:published_time" content="\d{4}-\d{2}-\d{2}T08:00:00Z">/, `${file} needs article:published_time`);
      assert.match(html, /<meta property="article:section" content="[^"]+">/, `${file} needs article:section`);
      assert.match(html, /<meta property="og:image:width" content="880">/, `${file} og:image:width must be the real 880`);
    }
  });

  test('Accessibility: skip link, main landmark, labelled search, no h5 footer headings', () => {
    const pages = ['index.html', 'about.html', 'category/ai.html', 'category/tech-business.html'];
    for (const page of pages) {
      const html = read(page);
      assert.match(html, /<a class="skip-link" href="#main-content">Skip to main content<\/a>/, `${page} needs a skip link`);
      assert.match(html, /<main id="main-content">/, `${page} needs <main id="main-content">`);
      assert.ok(!/<h5>/.test(html), `${page} must not use h5 footer headings (heading-level skip)`);
      assert.match(html, /class="fhead"/, `${page} footer headings must use .fhead`);
    }
    const indexHtml = read('index.html');
    assert.match(indexHtml, /<label class="sr-only" for="q">Filter dispatches<\/label>/, 'search input needs a real label');
    assert.match(indexHtml, /<h2 class="trend-header">/, 'trending strip needs a real h2');
    assert.match(indexHtml, /<h2 class="sr-only">Latest dispatches<\/h2>/, 'wire section needs an h2 for its h3 rows');
  });

  test('Branding: tagline present, © NEWZORA stamp in footer, no dead assets', () => {
    const indexHtml = read('index.html');
    assert.ok(indexHtml.includes('Technology Without Borders'), 'tagline must appear in the header strip');
    assert.match(indexHtml, /© \d{4} NEWZORA — Technology Without Borders\./, 'footer must carry the © NEWZORA stamp');
    assert.ok(!fs.existsSync(path.join(DIST, 'img', 'cover.jpg')), 'unreferenced cover.jpg must not ship');
    assert.ok(!fs.existsSync(path.join(DIST, 'img', '91-senators-order-musk-to-preserve-spacex-records-over-ukraine-.jpg')), 'orphan id-91 image must not ship');
    assert.ok(!fs.existsSync(path.join(ROOT, 'assets', 'cover.b64')), 'cover.b64 must be removed from assets');
  });

  test('Category links in article breadcrumbs resolve to real category pages', () => {
    const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'posts.json'), 'utf8'));
    for (const p of posts) {
      const html = fs.readFileSync(path.join(DIST, 'post', `${p.slug}.html`), 'utf8');
      const m = html.match(/href="\/category\/([a-z0-9-]+)\.html"/);
      assert.ok(m, `${p.slug} breadcrumb must link a category page`);
      assert.ok(fs.existsSync(path.join(DIST, 'category', `${m[1]}.html`)), `${p.slug} links /category/${m[1]}.html which must exist`);
      assert.ok(!m[1].includes(' '), 'category slug must not contain a space');
    }
  });

  test('Sitemap lists all 14 category pages', () => {
    const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
    for (const cat of ALL_CATEGORIES) {
      assert.ok(sitemap.includes(`<loc>https://newzora.asf.run/category/${cat}.html</loc>`), `sitemap must list category/${cat}.html`);
    }
  });

});

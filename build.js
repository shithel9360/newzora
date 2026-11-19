const fs = require('fs');
const path = require('path');

const posts = JSON.parse(fs.readFileSync('posts.json', 'utf8'));
const dist = 'dist';

// Reset output directories
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'post'), { recursive: true });
fs.mkdirSync(path.join(dist, 'category'), { recursive: true });
fs.mkdirSync(path.join(dist, 'img'), { recursive: true });

// Decode base64 poster images
for (const f of fs.readdirSync('assets')) {
  if (f.endsWith('.b64')) {
    fs.writeFileSync(
      path.join(dist, 'img', f.replace('.b64', '.jpg')),
      Buffer.from(fs.readFileSync(path.join('assets', f), 'utf8'), 'base64')
    );
  }
}

// Google Search Console verification token & file
const G_VERIFY_FILE = 'google64f3ab4c81877d0d.html';
const G_VERIFY_CONTENT = 'google-site-verification: google64f3ab4c81877d0d.html\n';
fs.writeFileSync(path.join(dist, G_VERIFY_FILE), G_VERIFY_CONTENT);
fs.writeFileSync(G_VERIFY_FILE, G_VERIFY_CONTENT);

// Copy any additional root verification and static files
for (const f of fs.readdirSync('.')) {
  if (f.startsWith('google') && f.endsWith('.html')) {
    fs.copyFileSync(f, path.join(dist, f));
  }
}

// Data formatters and text sanitizers
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escXml = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const dstr = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
const dstrIso = d => `${d}T08:00:00Z`;
const paras = p => p.body.split('\n').map(x => x.trim()).filter(Boolean);

// Read real JPEG dimensions from the SOF marker, so og:image / RSS media tags
// always match the actual file (posters are 880x1100, the logo is 1080x1080).
const jpegSize = file => {
  try {
    const d = fs.readFileSync(file);
    let i = 2;
    while (i < d.length - 9) {
      if (d[i] !== 0xFF) { i++; continue; }
      const m = d[i + 1];
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
        return { width: d.readUInt16BE(i + 7), height: d.readUInt16BE(i + 5) };
      }
      i += 2 + d.readUInt16BE(i + 2);
    }
  } catch (_) { /* unreadable — caller omits dimensions */ }
  return null;
};

// `width="W" height="H"` attribute fragment from the real JPEG file.
const imgDimsAttr = img => {
  const d = jpegSize(path.join(dist, img.replace(/^\/+/, '')));
  return d ? `width="${d.width}" height="${d.height}"` : '';
};
// "Tech Business" -> "tech-business"). Unknown names slugify as a fallback.
const categorySlug = name => {
  const c = CATEGORIES.find(x => x.name.toLowerCase() === String(name).toLowerCase());
  return c ? c.slug : String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
};

const cleanDescription = (body, maxLen = 155) => {
  const withoutHashes = String(body || '').replace(/^#{1,3}\s+/gm, '');
  const withoutSource = withoutHashes.replace(/Sources?:\s*.*$/i, '').trim();
  const flat = withoutSource.replace(/\s+/g, ' ').trim();
  if (flat.length <= maxLen) return flat;
  const cut = flat.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 100 ? cut.slice(0, lastSpace) : cut).trim() + '…';
};

const excerpt = (p, n = 150) => {
  const ps = paras(p);
  const raw = ps[1] || ps[0] || '';
  return esc(cleanDescription(raw, n));
};

const readingTime = body => {
  const words = (body || '').trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
};

const parseSource = body => {
  const ps = paras({ body });
  const last = ps[ps.length - 1] || '';
  const match = last.match(/^Sources?:\s*(.+)$/i);
  if (match) {
    return {
      source: match[1].trim(),
      bodyParagraphs: ps.slice(0, -1)
    };
  }
  return {
    source: null,
    bodyParagraphs: ps
  };
};

// Split a "Sources: ..." attribution string into individual source names.
// Separators used in the corpus are ';' and ' / '; commas are NOT split — they
// appear inside source descriptions and dates. Names stay verbatim from the
// article; nothing is invented. A link is rendered only when the name itself
// contains a URL (none do today, but a future post may carry one).
const splitSources = source => {
  return source.split(/;|\s\/\s/).map(s => s.trim().replace(/\.$/, '')).filter(Boolean)
    .filter((s, i, a) => a.indexOf(s) === i);
};

const renderBody = paragraphs => {
  return paragraphs.map(x => {
    if (x.startsWith('### ')) return `<h3>${esc(x.slice(4).trim())}</h3>`;
    if (x.startsWith('## ')) return `<h2>${esc(x.slice(3).trim())}</h2>`;
    return `<p>${esc(x)}</p>`;
  }).join('');
};

const SITE = 'https://newzora.asf.run';
const SOCIALS = {
  Instagram: 'https://www.instagram.com/new_zora',
  Threads: 'https://www.threads.com/@new_zora',
  Facebook: 'https://www.facebook.com/profile.php?id=61596058485989'
};

const CATEGORIES = [
  { name: 'AI', slug: 'ai', desc: 'Frontier machine intelligence, neural silicon architectures, model evaluations, and deployment safety.' },
  { name: 'Gadgets', slug: 'gadgets', desc: 'Hardware engineering, consumer electronics teardowns, precision optics, and physical computing.' },
  { name: 'Gaming', slug: 'gaming', desc: 'Console platform metrics, real-time rendering pipelines, GPU silicon, and studio disclosures.' },
  { name: 'Mobile', slug: 'mobile', desc: 'Baseband hardware, operating system architectures, display technologies, and device rollouts.' },
  { name: 'Cybersecurity', slug: 'cybersecurity', desc: 'CVE vulnerability disclosures, cryptographic verification, exploit mitigations, and defense advisories.' },
  { name: 'Tech', slug: 'tech', desc: 'Semiconductor manufacturing, supply chain infrastructure, technical leadership, and antitrust proceedings.' },
  { name: 'Tech Business', slug: 'tech-business', desc: 'Big Tech earnings, leadership changes, mergers and acquisitions, venture funding, and market-moving corporate strategy.' },
  { name: 'Space', slug: 'space', desc: 'Launch vehicles, orbital infrastructure, satellite constellations, crewed missions, and deep-space exploration.' },
  { name: 'Microsoft', slug: 'microsoft', desc: 'Windows, Microsoft 365, Azure, developer platforms, and .NET releases.' },
  { name: 'EV', slug: 'ev', desc: 'Electric vehicles, battery technology, charging infrastructure, and autonomous driving.' },
  { name: 'Smart Home', slug: 'smart-home', desc: 'Connected home hardware, voice assistants, Matter, and home automation.' },
  { name: 'Wearables', slug: 'wearables', desc: 'Smartwatches, health sensors, smart glasses, and body-worn computing.' },
  { name: 'Science', slug: 'science', desc: 'Research breakthroughs, quantum computing, biotechnology, and energy science.' },
  { name: 'Apple', slug: 'apple', desc: 'iPhone, Mac, iPad, Apple silicon, services, and ecosystem updates.' }
];

// Header nav keeps the six primary desks; every category is listed in the footer.
const NAV_CATEGORIES = CATEGORIES.slice(0, 6);

const BIG = ['apple', 'nvidia', 'google', 'anthropic', 'openai', 'samsung', 'tesla', 'meta', 'microsoft', 'amazon', 'xiaomi', 'huawei', 'sony', 'tsmc', 'carplay'];
const trending = posts.filter(p => BIG.some(b => (p.title + ' ' + p.body).toLowerCase().includes(b))).slice(0, 5);

// 1.5px Stroke Optical SVG Icons
const icons = {
  check: `<svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
  shieldCheck: `<svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
  search: `<svg class="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  clock: `<svg class="ico" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  arrowLeft: `<svg class="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`,
  arrowRight: `<svg class="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`,
  activity: `<svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  copy: `<svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  external: `<svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`,
  x: `<svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  whatsapp: `<svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/></svg>`,
  rss: `<svg class="ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>`,
  layers: `<svg class="ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`
};

const CSS = `
:root {
  --bg: #090a0c;
  --bg-subtle: #0e1014;
  --surface: #121418;
  --surface-raised: #181a20;
  --surface-hover: #1f222a;
  --surface-active: #262933;

  --border-subtle: rgba(255, 255, 255, 0.05);
  --border: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(255, 255, 255, 0.16);
  --border-focus: rgba(255, 255, 255, 0.32);

  --text-primary: #f4f4f5;
  --text-secondary: #a1a1aa;
  --text-tertiary: #71717a;
  --text-muted: #52525b;

  --accent-action: #f4f4f5;
  --accent-action-fg: #090a0c;

  --badge-emerald-bg: rgba(16, 185, 129, 0.07);
  --badge-emerald-border: rgba(52, 211, 153, 0.22);
  --badge-emerald-fg: #34d399;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  --shadow-card: 0 2px 6px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.07);
  --shadow-elevated: 0 10px 28px -6px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1);

  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 160ms;
}

*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  background-color: var(--bg);
  color: var(--text-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.5;
  text-rendering: optimizeLegibility;
}

a {
  color: inherit;
  text-decoration: none;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

button, input {
  font-family: inherit;
  font-size: inherit;
}

:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.4);
  outline-offset: 2px;
}

:focus {
  outline: 2px solid rgba(255, 255, 255, 0.4);
  outline-offset: 2px;
}

.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 100;
  background: var(--accent-action);
  color: var(--accent-action-fg);
  font-size: 13px;
  font-weight: 600;
  padding: 10px 16px;
  border-radius: 0 0 8px 0;
}
.skip-link:focus {
  left: 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.mono {
  font-family: var(--font-mono);
  font-feature-settings: 'tnum' on, 'zero' on;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.ico {
  display: inline-block;
  vertical-align: -1px;
  flex-shrink: 0;
}

/* Micro Header Ticker */
.strip {
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--border-subtle);
  font-size: 11.5px;
  color: var(--text-tertiary);
}
.strip .in {
  max-width: 1240px;
  margin: 0 auto;
  padding: 6px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.15);
  display: inline-block;
}
.strip-source {
  color: var(--text-secondary);
  font-weight: 500;
}
.strip-date {
  margin-left: auto;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: 11px;
}

/* Primary Navigation */
header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(9, 10, 12, 0.88);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border);
}
.hwrap {
  max-width: 1240px;
  margin: 0 auto;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 20px;
}
.brand-link {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand-link img {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: 1px solid var(--border);
}
.brand-title {
  font-weight: 700;
  font-size: 16px;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  line-height: 1;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.brand-title span {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  color: var(--text-tertiary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.hwrap nav {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.hwrap nav::-webkit-scrollbar {
  display: none;
}
.hwrap nav a {
  padding: 6px 11px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
  transition: all var(--duration-fast) var(--ease-spring);
}
.hwrap nav a:hover {
  color: var(--text-primary);
  background: var(--surface-raised);
}
.hwrap nav a.active {
  color: var(--text-primary);
  background: var(--surface-raised);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Micro Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 7px;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--duration-fast) var(--ease-spring);
  white-space: nowrap;
}
.btn:active {
  transform: scale(0.985);
}
.btn.primary {
  background: var(--accent-action);
  color: var(--accent-action-fg);
  border-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}
.btn.primary:hover {
  background: #e4e4e7;
}
.btn.ghost {
  background: var(--surface);
  color: var(--text-secondary);
  border-color: var(--border);
  box-shadow: var(--shadow-sm);
}
.btn.ghost:hover {
  color: var(--text-primary);
  background: var(--surface-raised);
  border-color: var(--border-hover);
}

/* Global Content Wrapper */
.wrap {
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Badges & Micro Labels */
.badge-verified {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border-radius: 999px;
  background: var(--badge-emerald-bg);
  border: 1px solid var(--badge-emerald-border);
  color: var(--badge-emerald-fg);
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-mono);
  letter-spacing: -0.01em;
}
.pill-cat {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.time-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-tertiary);
  font-size: 11.5px;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

/* Section Header Typography */
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 36px 0 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}
.section-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}
.section-link {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  transition: color var(--duration-fast) var(--ease-spring);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.section-link:hover {
  color: var(--text-primary);
}

/* Asymmetric Hero Architecture */
.hero-layout {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 18px;
  margin-top: 24px;
}
.lead-story {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-card);
  transition: all var(--duration-fast) var(--ease-spring);
}
.lead-story:hover {
  border-color: var(--border-hover);
  box-shadow: var(--shadow-elevated);
}
.lead-img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 5;
  background: var(--bg-subtle);
  overflow: hidden;
}
.lead-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 400ms var(--ease-spring);
}
.lead-story:hover .lead-img-wrap img {
  transform: scale(1.015);
}
.lead-body {
  padding: 22px 24px 26px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}
.lead-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.lead-title {
  font-size: clamp(24px, 2.5vw, 34px);
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: -0.03em;
  margin: 0;
  color: var(--text-primary);
}
.lead-excerpt {
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.55;
  margin: 0;
}
.lead-footer {
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-tertiary);
}

/* Developing Dispatches Rail */
.dispatch-rail {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-card);
  align-self: start;
}
.dispatch-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}
.dispatch-head-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
}
.dispatch-count {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-tertiary);
}
.rail-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-subtle);
  transition: all var(--duration-fast) var(--ease-spring);
}
.rail-item:last-child {
  border-bottom: 0;
}
.rail-item:hover {
  transform: translateX(2px);
}
.rail-item:hover h4 {
  color: #ffffff;
}
.rail-thumb {
  width: 68px;
  height: 68px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--bg-subtle);
  border: 1px solid var(--border-subtle);
}
.rail-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}
.rail-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rail-details h4 {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.015em;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color var(--duration-fast) var(--ease-spring);
}

/* Trending Intelligence Bar */
.trend-strip {
  margin: 28px 0 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: var(--shadow-sm);
}
.trend-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.trend-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
}
.trend-card {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-subtle);
  transition: all var(--duration-fast) var(--ease-spring);
}
.trend-card:hover {
  background: var(--surface-raised);
  border-color: var(--border-hover);
  transform: translateY(-1px);
}
.trend-rank {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.trend-title {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Editorial Category Magazine Grid */
.mag-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 16px;
}
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);
  transition: all var(--duration-fast) var(--ease-spring);
}
.card:hover {
  border-color: var(--border-hover);
  box-shadow: var(--shadow-card);
  transform: translateY(-1px);
}
.card-img-wrap {
  width: 100%;
  aspect-ratio: 4 / 5;
  background: var(--bg-subtle);
  overflow: hidden;
}
.card-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 300ms var(--ease-spring);
}
.card:hover .card-img-wrap img {
  transform: scale(1.02);
}
.card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}
.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}
.card.featured .card-title {
  font-size: 19px;
  line-height: 1.25;
}
.card-excerpt {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}
.mag-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.card-mini {
  display: flex;
  gap: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  box-shadow: var(--shadow-sm);
  transition: all var(--duration-fast) var(--ease-spring);
}
.card-mini:hover {
  border-color: var(--border-hover);
  background: var(--surface-raised);
}
.card-mini img {
  width: 68px;
  height: 68px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid var(--border-subtle);
}
.card-mini-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.card-mini-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.015em;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* The Live Wire / Interactive Dispatch Stream */
.wire-section {
  margin: 44px 0 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 22px;
  box-shadow: var(--shadow-card);
}
.wire-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.wire-filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.fchip {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-mono);
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-spring);
}
.fchip:hover {
  color: var(--text-primary);
  background: var(--surface-raised);
  border-color: var(--border-hover);
}
.fchip.on {
  color: var(--accent-action-fg);
  background: var(--accent-action);
  border-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}
.search-box {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-tertiary);
  pointer-events: none;
}
.search-input {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 7px 34px 7px 32px;
  border-radius: 7px;
  font-size: 12.5px;
  width: 240px;
  transition: all var(--duration-fast) var(--ease-spring);
}
.search-input::placeholder {
  color: var(--text-tertiary);
}
.search-input:focus {
  border-color: var(--border-focus);
  background: var(--surface-raised);
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.06);
}
.search-badge {
  position: absolute;
  right: 10px;
  padding: 1px 5px;
  font-family: var(--font-mono);
  font-size: 10px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.wire-stream {
  display: flex;
  flex-direction: column;
}
.wire-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 10px;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 8px;
  transition: all var(--duration-fast) var(--ease-spring);
}
.wire-row:last-child {
  border-bottom: 0;
}
.wire-row:hover {
  background: var(--surface-raised);
}
.wire-thumb {
  width: 78px;
  height: 78px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--bg-subtle);
  border: 1px solid var(--border-subtle);
}
.wire-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  flex: 1;
}
.wire-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}
.wire-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.empty-state {
  display: none;
  padding: 48px 20px;
  text-align: center;
  color: var(--text-secondary);
}
.empty-icon {
  margin: 0 auto 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
}
.empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px;
}
.empty-desc {
  font-size: 12.5px;
  color: var(--text-tertiary);
  margin: 0;
}

/* Trust & Sourcing Architecture */
.trust-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin: 40px 0 20px;
}
.trust-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 22px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.trust-index {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.04em;
}
.trust-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}
.trust-text {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* Article Page Layout */
article {
  max-width: 820px;
  margin: 20px auto 48px;
  padding: 0 20px;
}
.bc {
  margin: 12px 0 16px;
  font-size: 12px;
  color: var(--text-tertiary);
}
.bc ol {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 8px;
}
.bc li + li::before {
  content: '/';
  margin-right: 8px;
  color: var(--border-hover);
  font-size: 11px;
}
.bc a {
  color: var(--text-tertiary);
  transition: color var(--duration-fast) var(--ease-spring);
}
.bc a:hover {
  color: var(--text-primary);
}
.bc span[itemprop="name"] {
  color: var(--text-secondary);
}

article h1 {
  font-size: clamp(26px, 3.8vw, 42px);
  font-weight: 700;
  line-height: 1.16;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  margin: 10px 0 14px;
}
.dek {
  font-size: 18px;
  line-height: 1.55;
  color: var(--text-secondary);
  margin: 0 0 18px;
  font-weight: 400;
}
.byline {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  margin: 18px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  font-size: 12.5px;
  color: var(--text-tertiary);
  flex-wrap: wrap;
}
.byline strong {
  color: var(--text-primary);
}
.poster {
  width: 100%;
  aspect-ratio: 4 / 5;
  border-radius: 12px;
  border: 1px solid var(--border);
  object-fit: cover;
  box-shadow: var(--shadow-card);
  margin: 18px 0 28px;
}
.body p {
  font-size: 16.5px;
  line-height: 1.78;
  color: #d4d4d8;
  margin: 20px 0;
}
.body h2 {
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.25;
  color: var(--text-primary);
  margin: 40px 0 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
.body h3 {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--text-primary);
  margin: 28px 0 10px;
}

/* Sourcing Callout */
.source-box {
  margin: 32px 0 24px;
  padding: 16px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 3px solid var(--badge-emerald-fg);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.source-tag {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--badge-emerald-fg);
  display: flex;
  align-items: center;
  gap: 6px;
}
.source-text {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Share & Post Navigation */
.share-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 16px 0;
  border-top: 1px solid var(--border);
  margin: 28px 0 16px;
}
.share-label {
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin-right: 6px;
}
.post-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin: 24px 0 40px;
}
.pnav-link {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  box-shadow: var(--shadow-sm);
  transition: all var(--duration-fast) var(--ease-spring);
  min-width: 0;
}
.pnav-link:hover {
  background: var(--surface-raised);
  border-color: var(--border-hover);
  transform: translateY(-1px);
}
.pnav-link.next {
  text-align: right;
}
.pnav-label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.pnav-link.next .pnav-label {
  justify-content: flex-end;
}
.pnav-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.015em;
  color: var(--text-primary);
  overflow-wrap: break-word;
}
.more-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
  margin-top: 14px;
}

/* Category Hub & Static Pages */
.cat-hero {
  margin: 24px 0 32px;
  padding: 28px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-card);
}
.cat-hero h1 {
  font-size: clamp(26px, 3.5vw, 38px);
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 6px 0 10px;
  color: var(--text-primary);
}
.cat-hero p {
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.6;
  margin: 0;
  max-width: 680px;
}
.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin: 24px 0 44px;
}

.static-page {
  max-width: 820px;
  margin: 24px auto 64px;
  padding: 0 20px;
}
.static-page h1 {
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 12px 0 16px;
  color: var(--text-primary);
}
.static-page h2 {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 36px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
}
.static-page p {
  font-size: 16px;
  line-height: 1.75;
  color: #d4d4d8;
  margin: 14px 0;
}
.static-page ul {
  padding-left: 20px;
  margin: 16px 0;
  color: #d4d4d8;
  line-height: 1.75;
  font-size: 15.5px;
}
.static-page li {
  margin: 8px 0;
}
.static-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  margin: 24px 0;
  box-shadow: var(--shadow-sm);
}

/* Structured Global Footer */
footer {
  border-top: 1px solid var(--border);
  background: var(--bg-subtle);
  margin-top: 48px;
  font-size: 13px;
  color: var(--text-tertiary);
}
.fwrap {
  max-width: 1240px;
  margin: 0 auto;
  padding: 36px 20px 28px;
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr;
  gap: 32px;
}
.fcol-brand p {
  line-height: 1.6;
  color: var(--text-secondary);
  font-size: 13px;
  margin: 10px 0 0;
  max-width: 320px;
}
footer .fhead {
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0 0 14px;
}
footer ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
footer a {
  color: var(--text-secondary);
  transition: color var(--duration-fast) var(--ease-spring);
}
footer a:hover {
  color: var(--text-primary);
}
.fbot {
  border-top: 1px solid var(--border-subtle);
  padding: 16px 20px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--text-muted);
}

/* Responsive Breakpoints */
@media (max-width: 980px) {
  .hero-layout {
    grid-template-columns: 1fr;
  }
  .mag-grid {
    grid-template-columns: 1fr;
  }
  .fwrap {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 640px) {
  .hwrap {
    padding: 10px 14px;
    gap: 12px;
  }
  .brand-title span {
    display: none;
  }
  .header-actions .btn.primary {
    display: none;
  }
  .post-nav {
    grid-template-columns: 1fr;
  }
  .pnav-link.next {
    text-align: left;
  }
  .pnav-link.next .pnav-label {
    justify-content: flex-start;
  }
  .fwrap {
    grid-template-columns: 1fr;
  }
  .wire-head {
    flex-direction: column;
    align-items: stretch;
  }
  .search-input {
    width: 100%;
  }
}

/* Reading progress bar (article pages) */
.read-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: transparent;
  z-index: 60;
  pointer-events: none;
}
.read-progress-fill {
  display: block;
  height: 100%;
  width: 0%;
  background: #34d399;
  transition: width 80ms linear;
}

/* Named sources section (article pages) */
.sources-section {
  margin: 32px 0 24px;
  padding: 18px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
}
.sources-head {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--badge-emerald-fg);
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 10px;
}
.sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sources-list li {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.5;
  padding-left: 14px;
  position: relative;
}
.sources-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 9px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--badge-emerald-fg);
}
.sources-list a {
  color: var(--text-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Load more (homepage wire river) */
.load-more-wrap {
  display: flex;
  justify-content: center;
  padding: 22px 0 6px;
}

/* 404 page */
.notfound-code {
  font-family: var(--font-mono);
  font-size: clamp(64px, 12vw, 120px);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--text-primary);
  margin: 8px 0 4px;
}
.notfound-search {
  display: flex;
  gap: 8px;
  margin: 22px 0 8px;
  max-width: 480px;
}
.notfound-search input {
  flex: 1;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 10px 14px;
  border-radius: 7px;
  font-size: 14px;
}
`;

const head = (title, desc, img, url, ogt = 'article', ld = '', activeNav = '', articleMeta = null, opts = {}) => {
  const cleanDesc = cleanDescription(desc, 155);
  const imgUrl = img.startsWith('http') ? img : `${SITE}/${img.replace(/^\/+/, '')}`;
  const imgDims = img.startsWith('http') ? null : jpegSize(path.join(dist, img.replace(/^\/+/, '')));
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(cleanDesc)}">
${opts.noCanonical ? '' : `<link rel="canonical" href="${url}">`}
${opts.noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">'}
<meta name="google-site-verification" content="google64f3ab4c81877d0d">
<meta name="author" content="Newzora">
<meta name="publisher" content="Newzora">
<meta name="theme-color" content="#090a0c">
<meta property="og:site_name" content="Newzora">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(cleanDesc)}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="${ogt}">
<meta property="og:image" content="${imgUrl}">
${imgDims ? `<meta property="og:image:width" content="${imgDims.width}">
<meta property="og:image:height" content="${imgDims.height}">` : ''}
<meta property="og:image:alt" content="${esc(title)}">
${ogt === 'article' && articleMeta ? `<meta property="article:published_time" content="${articleMeta.published}">
<meta property="article:modified_time" content="${articleMeta.published}">
<meta property="article:section" content="${esc(articleMeta.section)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@new_zora">
<meta name="twitter:creator" content="@new_zora">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(cleanDesc)}">
<meta name="twitter:image" content="${imgUrl}">
<meta name="twitter:image:alt" content="${esc(title)}">
<link rel="alternate" type="application/rss+xml" title="Newzora RSS Feed" href="${SITE}/feed.xml">
<link rel="icon" type="image/jpeg" href="/img/logo.jpg">
<link rel="apple-touch-icon" href="/img/logo.jpg">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
${ld ? `<script type="application/ld+json">${ld}</script>` : ''}
<style>${CSS}</style></head><body>
<a class="skip-link" href="#main-content">Skip to main content</a>
<div class="strip">
  <div class="in">
    <span class="live-dot" aria-hidden="true"></span>
    <span class="strip-source">Technology Without Borders</span>
    <span class="mono" style="color:var(--text-tertiary)">· Two-Source Corroborated</span>
    <span class="strip-date">${dstr(posts[0].date)}</span>
  </div>
</div>
<header>
  <div class="hwrap">
    <a class="brand-link" href="/" aria-label="Newzora Homepage">
      <img src="/img/logo.jpg" alt="Newzora Emblem" width="30" height="30">
      <div class="brand-title">NEWZORA <span>DISPATCH</span></div>
    </a>
    <nav aria-label="Primary Navigation">
      ${NAV_CATEGORIES.map(c => `<a href="/category/${c.slug}.html"${activeNav === c.name ? ' class="active"' : ''}>${c.name}</a>`).join('')}
    </nav>
    <div class="header-actions">
      <a class="btn ghost mono" href="/#latest" aria-label="Jump to search">${icons.search}<span>Search</span></a>
      <a class="btn primary" href="${SOCIALS.Instagram}" target="_blank" rel="noopener">Follow</a>
    </div>
  </div>
</header>`;
};

const foot = `
<footer>
  <div class="fwrap">
    <div class="fcol-brand">
      <div class="brand-title" style="font-size:15px">NEWZORA <span>DISPATCH</span></div>
      <p>Continuous technical journalism across artificial intelligence, semiconductor silicon, and consumer systems. Every dispatch is corroborated across two or more primary sources prior to transmission.</p>
    </div>
    <div>
      <h2 class="fhead">Coverage Desks</h2>
      <ul>
        ${CATEGORIES.map(c => `<li><a href="/category/${c.slug}.html">${c.name}</a></li>`).join('')}
      </ul>
    </div>
    <div>
      <h2 class="fhead">Editorial Standards</h2>
      <ul>
        <li><a href="/about.html">About Newzora</a></li>
        <li><a href="/editorial-policy.html">Editorial &amp; Verification Policy</a></li>
        <li><a href="/contact.html">Newsroom Contacts &amp; Tips</a></li>
        <li><a href="/feed.xml">RSS Syndication Feed</a></li>
      </ul>
    </div>
    <div>
      <h2 class="fhead">Syndication &amp; Networks</h2>
      <ul>
        <li><a href="${SOCIALS.Instagram}" target="_blank" rel="noopener">Instagram (@new_zora)</a></li>
        <li><a href="${SOCIALS.Threads}" target="_blank" rel="noopener">Threads (@new_zora)</a></li>
        <li><a href="${SOCIALS.Facebook}" target="_blank" rel="noopener">Facebook Page</a></li>
        <li><a href="/sitemap.xml">XML Sitemap</a></li>
      </ul>
    </div>
  </div>
  <div class="fbot">
    © ${new Date().getFullYear()} NEWZORA — Technology Without Borders. All dispatches verified through 2+ independent regulatory, corporate, or primary industry sources.
  </div>
</footer>
</body></html>`;

// Reusable card builders
const card = (p, isFeatured = false) => `
<a class="card${isFeatured ? ' featured' : ''}" href="/post/${p.slug}.html">
  <div class="card-img-wrap">
    <img loading="lazy" src="/${p.image}" alt="${esc(p.title)}" width="800" height="500">
  </div>
  <div class="card-body">
    <div class="card-meta">
      <span class="pill-cat">${esc(p.category)}</span>
      <span class="time-tag">${icons.clock} ${dstr(p.date)}</span>
    </div>
    <h3 class="card-title">${esc(p.title)}</h3>
    ${isFeatured ? `<p class="card-excerpt">${excerpt(p, 180)}…</p>` : ''}
  </div>
</a>`;

const cardMini = p => `
<a class="card-mini" href="/post/${p.slug}.html">
  <img loading="lazy" src="/${p.image}" alt="${esc(p.title)}" width="68" height="68">
  <div class="card-mini-body">
    <div class="card-meta">
      <span class="pill-cat" style="font-size:10px">${esc(p.category)}</span>
      <span class="time-tag" style="font-size:10.5px">${dstr(p.date)}</span>
    </div>
    <h4 class="card-mini-title">${esc(p.title)}</h4>
  </div>
</a>`;

const railItem = p => `
<a class="rail-item" href="/post/${p.slug}.html">
  <img loading="lazy" src="/${p.image}" alt="${esc(p.title)}" class="rail-thumb" width="68" height="68">
  <div class="rail-details">
    <div class="rail-meta">
      <span class="pill-cat" style="font-size:10px">${esc(p.category)}</span>
      <span class="time-tag" style="font-size:10.5px">${dstr(p.date)}</span>
    </div>
    <h4>${esc(p.title)}</h4>
  </div>
</a>`;

// 1. Homepage Construction
const hero = posts[0];
const rail = posts.slice(1, 6);

const homeLD = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'NewsMediaOrganization',
      name: 'Newzora',
      url: SITE + '/',
      logo: {
        '@type': 'ImageObject',
        url: SITE + '/img/logo.jpg',
        width: 512,
        height: 512
      },
      sameAs: Object.values(SOCIALS),
      description: 'Verified technical news and dispatches, corroborated across 2+ primary industry sources.',
      publishingPrinciples: SITE + '/editorial-policy.html',
      ethicsPolicy: SITE + '/editorial-policy.html',
      correctionsPolicy: SITE + '/editorial-policy.html',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'editorial',
        url: SITE + '/contact.html'
      }
    },
    {
      '@type': 'WebSite',
      name: 'Newzora',
      url: SITE + '/',
      description: 'Verified technical news, as it breaks.',
      publisher: {
        '@type': 'Organization',
        name: 'Newzora'
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: SITE + '/?q={search_term_string}'
        },
        'query-input': 'required name=search_term_string'
      }
    }
  ]
});

let indexHtml = head(
  'Newzora — Verified Tech News, As It Breaks',
  'Your daily tech briefing: AI, gadgets, gaming and internet news, cross-checked in 2+ sources. No rumours, just verified news.',
  hero.image,
  SITE + '/',
  'website',
  homeLD
)
+ `<main id="main-content"><div class="wrap">
  <!-- Asymmetric Editorial Hero -->
  <section class="hero-layout" aria-label="Featured Story and Latest Dispatches">
    <a class="lead-story" href="/post/${hero.slug}.html">
      <div class="lead-img-wrap">
        <img src="/${hero.image}" alt="${esc(hero.title)}" width="1200" height="675" fetchpriority="high">
      </div>
      <div class="lead-body">
        <div class="lead-meta">
          <span class="pill-cat">${esc(hero.category)}</span>
          <span class="badge-verified">${icons.shieldCheck} 2-Source Verified</span>
          <span class="time-tag">${icons.clock} ${dstr(hero.date)}</span>
        </div>
        <h1 class="lead-title">${esc(hero.title)}</h1>
        <p class="lead-excerpt">${excerpt(hero, 220)}…</p>
        <div class="lead-footer">
          <span>By Newzora Technical Desk</span>
          <span class="mono">${readingTime(hero.body)}</span>
        </div>
      </div>
    </a>
    <aside class="dispatch-rail" aria-label="Developing Dispatches">
      <div class="dispatch-head">
        <h2 class="dispatch-head-title">${icons.activity} Developing Dispatches</h2>
        <span class="dispatch-count mono">[${rail.length} STORIES]</span>
      </div>
      <div class="rail-items">
        ${rail.map(railItem).join('')}
      </div>
    </aside>
  </section>

  <!-- Trending Intelligence Strip -->
  <section class="trend-strip" aria-label="Trending Coverage">
    <h2 class="trend-header">${icons.activity} Trending Intelligence</h2>
    <div class="trend-grid">
      ${trending.map((p, i) => `
      <a class="trend-card" href="/post/${p.slug}.html">
        <span class="trend-rank mono">0${i + 1}</span>
        <h4 class="trend-title">${esc(p.title)}</h4>
      </a>`).join('')}
    </div>
  </section>`;

// Category sections with editorial magazine layout
const catOrder = ['AI', 'Gadgets', 'Gaming', 'Mobile', 'Cybersecurity', 'Tech', 'Space', 'Tech Business'];
for (const c of catOrder) {
  const cp = posts.filter(p => p.category === c);
  if (cp.length < 3) continue;
  indexHtml += `
  <section class="sec" aria-label="${esc(c)} Coverage">
    <div class="section-head">
      <h2 class="section-title"><span class="pill-cat">${esc(c)}</span> Desk Briefing</h2>
      <a class="section-link" href="/category/${categorySlug(c)}.html">Explore ${esc(c)} ${icons.arrowRight}</a>
    </div>
    <div class="mag-grid">
      ${card(cp[0], true)}
      <div class="mag-stack">
        ${cp.slice(1, 3).map(cardMini).join('')}
      </div>
      <div class="mag-stack">
        ${cp.slice(3, 5).map(cardMini).join('')}
      </div>
    </div>
  </section>`;
}

// The Interactive Wire / Feed Section
indexHtml += `
  <section class="wire-section" id="latest" aria-label="Search and Dispatch Archive">
    <h2 class="sr-only">Latest dispatches</h2>
    <div class="wire-head">
      <div class="wire-filters">
        ${['All', ...new Set(posts.map(p => p.category))].map((c, i) => `
        <button class="fchip${i === 0 ? ' on' : ''}" data-f="${esc(c)}">${esc(c)}</button>`).join('')}
      </div>
      <div class="search-box">
        <span class="search-icon">${icons.search}</span>
        <label class="sr-only" for="q">Filter dispatches</label>
        <input id="q" class="search-input" type="search" placeholder="Filter dispatches…" aria-label="Filter tech news">
        <span class="search-badge">/</span>
      </div>
    </div>
    <div class="wire-stream">
      ${posts.map(p => `
      <a class="wire-row" href="/post/${p.slug}.html" data-cat="${esc(p.category)}">
        <img loading="lazy" src="/${p.image}" alt="${esc(p.title)}" class="wire-thumb" width="78" height="78">
        <div class="wire-details">
          <div class="wire-meta">
            <span class="pill-cat" style="font-size:10px">${esc(p.category)}</span>
            <span class="badge-verified" style="font-size:10px;padding:2px 6px">${icons.check} Verified</span>
            <span class="time-tag" style="font-size:11px">${icons.clock} ${dstr(p.date)}</span>
          </div>
          <h3 class="wire-title">${esc(p.title)}</h3>
        </div>
      </a>`).join('')}
    </div>
    <div class="load-more-wrap">
      <button id="load-more" class="btn ghost" type="button"></button>
    </div>
    <div id="no-res" class="empty-state">
      <div class="empty-icon">${icons.search}</div>
      <p class="empty-title">No dispatches found</p>
      <p class="empty-desc">No published stories matched your query. Try a different keyword or category.</p>
    </div>
  </section>

  <!-- Editorial Pillars -->
  <section class="trust-grid" aria-label="Editorial Standards">
    <h2 class="sr-only">Editorial standards</h2>
    <div class="trust-card">
      <span class="trust-index">PILLAR 01</span>
      <h3 class="trust-title">Multi-Source Corroboration</h3>
      <p class="trust-text">Every story begins as an engineering disclosure, benchmark or filing. No dispatch runs without corroboration across two or more primary documents or verified disclosures.</p>
    </div>
    <div class="trust-card">
      <span class="trust-index">PILLAR 02</span>
      <h3 class="trust-title">Authentic Media Integrity</h3>
      <p class="trust-text">Zero synthetic, hallucinated, or unverified imagery. Every poster visual is backed by actual hardware captures, public filings, or confirmed manufacturer engineering documentation.</p>
    </div>
    <div class="trust-card">
      <span class="trust-index">PILLAR 03</span>
      <h3 class="trust-title">Independent Editorial Stance</h3>
      <p class="trust-text">No commercial preconditions, paid review placement, or access-trading. Dispatches are published for technical professionals who require signal over hype.</p>
    </div>
  </section>
</div></main>
<script>
(function() {
  const chips = Array.from(document.querySelectorAll('.fchip'));
  const rows = Array.from(document.querySelectorAll('.wire-row'));
  const q = document.getElementById('q');
  const noRes = document.getElementById('no-res');
  const loadMoreBtn = document.getElementById('load-more');
  const PAGE_SIZE = 25;
  let visibleLimit = PAGE_SIZE;
  let currentCat = 'All';
  let searchIndex = null; // slug -> lowercase searchable text (title + excerpt + category + date)

  function rowSlug(r) {
    const href = r.getAttribute('href') || '';
    return href.split('/post/').pop().replace('.html', '');
  }
  function rowText(r) {
    const slug = rowSlug(r);
    if (searchIndex && searchIndex.has(slug)) return searchIndex.get(slug);
    const t = r.querySelector('.wire-title');
    return (t ? t.textContent : '').toLowerCase();
  }

  function applyFilter() {
    const query = (q.value || '').trim().toLowerCase();
    const filtering = !!query || currentCat !== 'All';
    let count = 0;
    rows.forEach((r, i) => {
      const matchCat = currentCat === 'All' || r.dataset.cat === currentCat;
      const matchQuery = !query || rowText(r).includes(query);
      const withinLimit = filtering || i < visibleLimit;
      const visible = matchCat && matchQuery && withinLimit;
      r.style.display = visible ? '' : 'none';
      if (visible) count++;
    });
    if (noRes) noRes.style.display = count === 0 ? 'block' : 'none';
    if (loadMoreBtn) {
      const remaining = rows.length - visibleLimit;
      if (!filtering && remaining > 0) {
        loadMoreBtn.style.display = '';
        loadMoreBtn.textContent = 'Load more dispatches (' + remaining + ' remaining)';
      } else {
        loadMoreBtn.style.display = 'none';
      }
    }
  }

  // Compact search index (search.json): titles + excerpts + categories + dates.
  // Falls back to the visible row titles if the index cannot be fetched.
  fetch('/search.json').then(function(res) { return res.json(); }).then(function(items) {
    searchIndex = new Map(items.map(function(it) {
      return [it.slug, (it.title + ' ' + it.excerpt + ' ' + it.category + ' ' + it.date).toLowerCase()];
    }));
    applyFilter();
  }).catch(function() { /* index unavailable — title-text fallback stays active */ });

  chips.forEach(b => {
    b.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('on'));
      b.classList.add('on');
      currentCat = b.dataset.f;
      applyFilter();
    });
  });

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      visibleLimit += PAGE_SIZE;
      applyFilter();
    });
  }

  if (q) {
    // Deep-link a search from the 404 page or a shared link: /?q=term
    const preset = new URLSearchParams(window.location.search).get('q');
    if (preset) q.value = preset;
    q.addEventListener('input', applyFilter);
    document.addEventListener('keydown', e => {
      if (e.key === '/' && document.activeElement !== q) {
        e.preventDefault();
        q.focus();
      }
    });
  }

  applyFilter();
})();
</script>`
+ foot;

fs.writeFileSync(path.join(dist, 'index.html'), indexHtml);

// 1b. Compact client-side search index (titles + excerpts + categories + dates only — no full bodies)
const searchIndex = posts.map(p => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  excerpt: cleanDescription(paras(p)[1] || paras(p)[0] || '', 150),
  category: p.category,
  date: p.date,
  url: `/post/${p.slug}.html`
}));
fs.writeFileSync(path.join(dist, 'search.json'), JSON.stringify(searchIndex));

// 2. Individual Article Pages
posts.forEach((p, i) => {
  const { source, bodyParagraphs } = parseSource(p.body);
  const externalLinks = Object.entries(p.links || {}).map(([k, u]) => `
    <a class="btn ghost" href="${u}" target="_blank" rel="noopener">
      ${icons.external} <span>${k[0].toUpperCase() + k.slice(1)}</span>
    </a>
  `).join('');

  const sameCat = posts.filter(x => x.category === p.category && x.id !== p.id);
  // Related dispatches: same category first, then the newest other stories — always 4, never this article.
  const related = sameCat.slice(0, 4);
  if (related.length < 4) {
    for (const x of posts) {
      if (related.length >= 4) break;
      if (x.id !== p.id && !related.includes(x)) related.push(x);
    }
  }
  const more = related.map(x => card(x)).join('');
  const catSlug = categorySlug(p.category);
  const desc = cleanDescription(p.body, 155);

  const prevPost = posts[i + 1] || null; // chronologically older
  const nextPost = posts[i - 1] || null; // chronologically newer

  const artLD = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        headline: p.title,
        description: desc,
        image: [`${SITE}/${p.image}`],
        datePublished: dstrIso(p.date),
        dateModified: dstrIso(p.date),
        inLanguage: 'en-US',
        isAccessibleForFree: 'True',
        articleSection: p.category,
        author: {
          '@type': 'Organization',
          name: 'Newzora',
          url: SITE + '/'
        },
        publisher: {
          '@type': 'Organization',
          name: 'Newzora',
          url: SITE + '/',
          logo: {
            '@type': 'ImageObject',
            url: SITE + '/img/logo.jpg',
            width: 512,
            height: 512
          }
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${SITE}/post/${p.slug}.html`
        }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: p.category, item: `${SITE}/category/${catSlug}.html` },
          { '@type': 'ListItem', position: 3, name: p.title, item: `${SITE}/post/${p.slug}.html` }
        ]
      }
    ]
  });

  // Named sources, verbatim from the article's own "Sources:" line.
  // No Sources line (17 posts) means no section at all — never invent one.
  const sourceNames = source ? splitSources(source) : [];
  const sourcesSectionHtml = sourceNames.length
    ? `<section class="sources-section" aria-label="Sources">
         <h2 class="sources-head">${icons.shieldCheck} Sources</h2>
         <ul class="sources-list">
           ${sourceNames.map(name => {
             const urlMatch = name.match(/(https?:\/\/\S+)/);
             if (urlMatch) {
               const label = name.replace(urlMatch[1], '').trim().replace(/[:\-–—]\s*$/, '') || urlMatch[1];
               return `<li><a href="${esc(urlMatch[1])}" target="_blank" rel="noopener">${esc(label)}</a></li>`;
             }
             return `<li>${esc(name)}</li>`;
           }).join('')}
         </ul>
       </section>`
    : '';

  const shareUrl = `${SITE}/post/${p.slug}.html`;
  const shareText = encodeURIComponent(p.title);
  const encUrl = encodeURIComponent(shareUrl);
  const twitterShare = `https://twitter.com/intent/tweet?text=${shareText}&url=${encUrl}`;
  const waShare = `https://api.whatsapp.com/send?text=${shareText}%20${encUrl}`;

  const shareButtonsHtml = `
  <div class="share-bar">
    <span class="share-label">Transmit:</span>
    <a class="btn ghost" href="${twitterShare}" target="_blank" rel="noopener">${icons.x} <span>X</span></a>
    <a class="btn ghost" href="${waShare}" target="_blank" rel="noopener">${icons.whatsapp} <span>WhatsApp</span></a>
    <button class="btn ghost copy-btn" type="button" data-copy-link aria-label="Copy article link">
      ${icons.copy} <span class="copy-txt">Copy Link</span>
    </button>
    ${externalLinks}
  </div>`;

  const postNavHtml = `
  <nav class="post-nav" aria-label="Story Navigation">
    ${prevPost
      ? `<a class="pnav-link prev" href="/post/${prevPost.slug}.html">
           <span class="pnav-label">${icons.arrowLeft} Previous Dispatch</span>
           <span class="pnav-title">${esc(prevPost.title)}</span>
         </a>`
      : '<div></div>'}
    ${nextPost
      ? `<a class="pnav-link next" href="/post/${nextPost.slug}.html">
           <span class="pnav-label">Next Dispatch ${icons.arrowRight}</span>
           <span class="pnav-title">${esc(nextPost.title)}</span>
         </a>`
      : '<div></div>'}
  </nav>`;

  const postHtml = head(
    `${p.title} — Newzora`,
    desc,
    p.image,
    `${SITE}/post/${p.slug}.html`,
    'article',
    artLD,
    p.category,
    { published: dstrIso(p.date), section: p.category }
  )
  + `<main id="main-content">
  <div class="read-progress" aria-hidden="true"><span class="read-progress-fill" id="read-progress-fill"></span></div>
  <article>
    <nav class="bc" aria-label="Breadcrumb">
      <ol itemscope itemtype="https://schema.org/BreadcrumbList">
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <a itemprop="item" href="/"><span itemprop="name">Home</span></a>
          <meta itemprop="position" content="1">
        </li>
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <a itemprop="item" href="/category/${catSlug}.html"><span itemprop="name">${esc(p.category)}</span></a>
          <meta itemprop="position" content="2">
        </li>
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <span itemprop="name">${esc(p.title)}</span>
          <meta itemprop="position" content="3">
        </li>
      </ol>
    </nav>

    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span class="pill-cat">${esc(p.category)}</span>
      <span class="badge-verified">${icons.shieldCheck} 2-Source Verified</span>
    </div>

    <h1>${esc(p.title)}</h1>
    <div class="dek">${esc(cleanDescription(bodyParagraphs[0] || ''))}</div>

    <div class="byline">
      <span><strong>Newzora Technical Desk</strong></span>
      <span class="mono">· ${dstr(p.date)}</span>
      <span class="time-tag">· ${icons.clock} ${readingTime(p.body)}</span>
      <span class="badge-verified" style="margin-left:auto">${icons.check} Corroborated</span>
    </div>

    <img class="poster" src="/${p.image}" alt="${esc(p.title)}" width="1200" height="675" fetchpriority="high" decoding="async">

    <div class="body">
      ${renderBody(bodyParagraphs.slice(1))}
    </div>

    ${sourcesSectionHtml}
    ${shareButtonsHtml}
    ${postNavHtml}

    <div class="section-head" style="margin-top:40px">
      <h2 class="section-title"><span class="pill-cat">${esc(p.category)}</span> Related Dispatches</h2>
      <a class="section-link" href="/category/${catSlug}.html">All ${esc(p.category)} ${icons.arrowRight}</a>
    </div>
    <div class="more-grid">${more}</div>
  </article>
<script>
(function() {
  // Reading progress: the bar fills as the reader moves through the article body.
  var fill = document.getElementById('read-progress-fill');
  var articleBody = document.querySelector('article .body');
  function updateProgress() {
    if (!fill || !articleBody) return;
    var start = articleBody.offsetTop;
    var end = start + articleBody.offsetHeight - window.innerHeight;
    var p = end <= start ? 1 : (window.scrollY - start) / (end - start);
    p = Math.min(1, Math.max(0, p));
    fill.style.width = (p * 100).toFixed(1) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  // Copy link: Clipboard API with a textarea + execCommand fallback for
  // older browsers and non-secure contexts.
  var copyBtn = document.querySelector('[data-copy-link]');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      var url = window.location.href;
      var label = copyBtn.querySelector('.copy-txt');
      function done() {
        if (label) {
          label.textContent = 'Link Copied';
          setTimeout(function() { label.textContent = 'Copy Link'; }, 2000);
        }
      }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { /* clipboard unavailable */ }
        document.body.removeChild(ta);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(fallback);
      } else {
        fallback();
      }
    });
  }
})();
</script>
</main>`
  + foot;

  fs.writeFileSync(path.join(dist, 'post', `${p.slug}.html`), postHtml);
});

// 3. Category Hub Pages
CATEGORIES.forEach(cat => {
  const catPosts = posts.filter(p => categorySlug(p.category) === cat.slug);
  const catTitle = `${cat.name} Tech News, Updates & Analysis — Newzora`;
  const catUrl = `${SITE}/category/${cat.slug}.html`;

  const catLD = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: catTitle,
        url: catUrl,
        description: cat.desc,
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
            { '@type': 'ListItem', position: 2, name: cat.name, item: catUrl }
          ]
        }
      },
      {
        '@type': 'ItemList',
        itemListElement: catPosts.slice(0, 10).map((p, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: `${SITE}/post/${p.slug}.html`,
          name: p.title
        }))
      }
    ]
  });

  const catImage = catPosts[0] ? catPosts[0].image : 'img/logo.jpg';

  let catHtml = head(catTitle, cat.desc, catImage, catUrl, 'website', catLD, cat.name)
  + `<main id="main-content"><div class="wrap">
    <nav class="bc" aria-label="Breadcrumb">
      <ol itemscope itemtype="https://schema.org/BreadcrumbList">
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <a itemprop="item" href="/"><span itemprop="name">Home</span></a>
          <meta itemprop="position" content="1">
        </li>
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <span itemprop="name">${esc(cat.name)}</span>
          <meta itemprop="position" content="2">
        </li>
      </ol>
    </nav>

    <div class="cat-hero">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span class="pill-cat">Desk Archive</span>
        <span class="mono" style="font-size:11.5px;color:var(--text-tertiary)">[${catPosts.length} DISPATCHES]</span>
      </div>
      <h1>${esc(cat.name)} Intelligence</h1>
      <p>${esc(cat.desc)} Every development verified across primary source documentation and enterprise filings.</p>
    </div>

    <h2 class="sr-only">All ${esc(cat.name)} dispatches</h2>
    <div class="cat-grid">
      ${catPosts.map((p, idx) => card(p, idx === 0)).join('')}
    </div>
  </div></main>`
  + foot;

  fs.writeFileSync(path.join(dist, 'category', `${cat.slug}.html`), catHtml);
});

// 4. E-E-A-T Transparency Hubs (About, Editorial Policy, Contact)
const aboutLD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About Newzora — Verified Tech Journalism',
  url: `${SITE}/about.html`,
  description: 'How Newzora independently corroborates breaking technology, AI, hardware, and cybersecurity dispatches.'
});

const aboutHtml = head(
  'About Newzora — Verified Tech Journalism & Standards',
  'Why Newzora exists: verified tech news without rumours, clickbait, or unverified leaks. Cross-checked in 2+ independent sources.',
  'img/logo.jpg',
  `${SITE}/about.html`,
  'website',
  aboutLD
)
+ `<main id="main-content"><div class="static-page">
  <nav class="bc" aria-label="Breadcrumb">
    <ol itemscope itemtype="https://schema.org/BreadcrumbList">
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="/"><span itemprop="name">Home</span></a><meta itemprop="position" content="1"></li>
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><span itemprop="name">About</span><meta itemprop="position" content="2"></li>
    </ol>
  </nav>

  <span class="pill-cat">Institutional Mandate</span>
  <h1>About Newzora</h1>
  <p class="dek">High-signal technical journalism engineered for engineers, founders, and technical professionals.</p>

  <div class="static-card">
    <h2 style="margin-top:0">The Two-Source Corroboration Rule</h2>
    <p>In digital technology reporting, unverified social leaks and recycled press PR frequently mask reality. Newzora operates under an absolute standard: <b>no dispatch is published without corroboration across two or more independent, verified primary sources</b>.</p>
    <p>Eligible validation materials include direct SEC or regulatory submissions, patent disclosures, public code commits, hardware teardowns, corporate financial filings, and vetted primary reporting from established institutional press desks (Reuters, Bloomberg, AP, Financial Times).</p>
  </div>

  <h2>Coverage Desks</h2>
  <ul>
    <li><b>Artificial Intelligence:</b> Frontier model training runs, compute clusters, safety audits, and research releases.</li>
    <li><b>Semiconductor Silicon &amp; Hardware:</b> Architecture designs, fab capacity, packaging technologies, and consumer hardware.</li>
    <li><b>Systems &amp; Cybersecurity:</b> Zero-day disclosures, CVE analysis, cryptographic verification, and operational infrastructure vulnerabilities.</li>
    <li><b>Mobile Architecture:</b> Cellular basebands, microcode architectures, and operating system updates.</li>
  </ul>

  <h2>Media Authenticity Standard</h2>
  <p>Newzora dispatches never employ synthetic or AI-generated product mockups. All visual representations are verified manufacturer assets, official filings, or documented hardware photographs.</p>
</div></main>`
+ foot;

fs.writeFileSync(path.join(dist, 'about.html'), aboutHtml);

// Editorial Policy Page
const policyLD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Newzora Editorial Policy & Fact-Checking Guidelines',
  url: `${SITE}/editorial-policy.html`,
  description: 'Editorial verification rules, correction protocols, and independence standards observed by Newzora.'
});

const policyHtml = head(
  'Editorial Policy, Fact-Checking & Corrections — Newzora',
  'Our journalistic standards: verification protocols, anonymous source handling, error corrections, and ethical boundaries.',
  'img/logo.jpg',
  `${SITE}/editorial-policy.html`,
  'website',
  policyLD
)
+ `<main id="main-content"><div class="static-page">
  <nav class="bc" aria-label="Breadcrumb">
    <ol itemscope itemtype="https://schema.org/BreadcrumbList">
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="/"><span itemprop="name">Home</span></a><meta itemprop="position" content="1"></li>
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><span itemprop="name">Editorial Policy</span><meta itemprop="position" content="2"></li>
    </ol>
  </nav>

  <span class="pill-cat">Ethics &amp; Governance</span>
  <h1>Editorial &amp; Verification Policy</h1>
  <p class="dek">Methodologies governing research, verification, attribution, and corrections.</p>

  <h2>1. Source Corroboration</h2>
  <p>We do not publish single-source leaks, anonymous forum threads, or promotional hype. Clearance requires:</p>
  <ul>
    <li>Documentary or cryptographic validation (e.g. verified commit, FCC/SEC record, recorded live demo).</li>
    <li>Corroborating statements or reports from recognized independent entities.</li>
    <li>Explicit citation of primary sources at the base of every story.</li>
  </ul>

  <h2>2. Transparent Corrections Protocol</h2>
  <p>When factual inaccuracies arise, we correct them immediately. Updated dispatches display a transparent revision note with timestamp and details of the clarification.</p>

  <h2>3. Independence &amp; Integrity</h2>
  <p>Newzora maintains absolute financial and editorial separation from hardware manufacturers and tech vendors. We accept zero sponsored articles, paid product reviews, or access concessions with editorial preconditions.</p>
</div></main>`
+ foot;

fs.writeFileSync(path.join(dist, 'editorial-policy.html'), policyHtml);

// Contact Page
const contactLD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact Newzora — News Tips & Inquiries',
  url: `${SITE}/contact.html`,
  description: 'Submit technical tips, research documentation, or inquiries to the Newzora editorial desk.'
});

const contactHtml = head(
  'Contact Us & News Tips — Newzora',
  'Contact the Newzora news desk. Send press releases, verified tips, or request factual corrections.',
  'img/logo.jpg',
  `${SITE}/contact.html`,
  'website',
  contactLD
)
+ `<main id="main-content"><div class="static-page">
  <nav class="bc" aria-label="Breadcrumb">
    <ol itemscope itemtype="https://schema.org/BreadcrumbList">
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="/"><span itemprop="name">Home</span></a><meta itemprop="position" content="1"></li>
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><span itemprop="name">Contact</span><meta itemprop="position" content="2"></li>
    </ol>
  </nav>

  <span class="pill-cat">Newsroom Desks</span>
  <h1>Contact &amp; Transmissions</h1>
  <p class="dek">Submit verified leads, engineering documents, or correction notices to the desk.</p>

  <div class="static-card">
    <h2 style="margin-top:0">Technical Tips &amp; Documents</h2>
    <p>We prioritize transmissions substantiated by logs, filings, hardware photographs, or source documentation.</p>
    <p><b>Transmission Channels:</b> <a href="${SOCIALS.Instagram}" target="_blank" rel="noopener" style="color:var(--text-primary);text-decoration:underline">Instagram Direct (@new_zora)</a> or <a href="${SOCIALS.Threads}" target="_blank" rel="noopener" style="color:var(--text-primary);text-decoration:underline">Threads (@new_zora)</a></p>
  </div>

  <div class="static-card">
    <h2 style="margin-top:0">Editorial Clarifications</h2>
    <p>If you identify an error in any technical dispatch, notify the desk with corroborating documentation. Our editors examine all submissions within 24 business hours.</p>
  </div>
</div></main>`
+ foot;

fs.writeFileSync(path.join(dist, 'contact.html'), contactHtml);

// 4b. Branded 404 page (Vercel serves dist/404.html for unknown routes)
const notFoundLD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Page Not Found — Newzora',
  url: `${SITE}/404.html`,
  description: 'The dispatch you requested does not exist or has moved. Search the archive or return to the latest verified tech news.'
});

const notFoundHtml = head(
  'Page Not Found — Newzora',
  'The dispatch you requested does not exist or has moved. Search the Newzora archive or return to the latest verified tech news.',
  'img/logo.jpg',
  `${SITE}/404.html`,
  'website',
  notFoundLD,
  '',
  null,
  { noindex: true, noCanonical: true }
)
+ `<main id="main-content"><div class="static-page">
  <nav class="bc" aria-label="Breadcrumb">
    <ol itemscope itemtype="https://schema.org/BreadcrumbList">
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="/"><span itemprop="name">Home</span></a><meta itemprop="position" content="1"></li>
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><span itemprop="name">Not Found</span><meta itemprop="position" content="2"></li>
    </ol>
  </nav>

  <span class="pill-cat">404 · Dispatch Not Found</span>
  <div class="notfound-code" aria-hidden="true">404</div>
  <h1>This dispatch does not exist</h1>
  <p class="dek">The story may have moved, or the link may contain a typo. Search the archive below, or head back to the latest verified coverage.</p>

  <form class="notfound-search" action="/" method="get" role="search">
    <label class="sr-only" for="nf-q">Search Newzora</label>
    <input id="nf-q" name="q" type="search" placeholder="Search dispatches…" aria-label="Search Newzora">
    <button class="btn primary" type="submit">Search</button>
  </form>

  <p><a href="/#latest" style="color:var(--text-primary);text-decoration:underline">Browse the latest dispatches</a> &nbsp;·&nbsp; <a href="/about.html" style="color:var(--text-primary);text-decoration:underline">About Newzora</a> &nbsp;·&nbsp; <a href="/contact.html" style="color:var(--text-primary);text-decoration:underline">Contact the newsroom</a></p>

  <div class="section-head" style="margin-top:40px">
    <h2 class="section-title">Start With What Is Trending</h2>
    <a class="section-link" href="/">All stories ${icons.arrowRight}</a>
  </div>
  <div class="more-grid">
    ${trending.slice(0, 3).map(x => card(x)).join('')}
  </div>
</div></main>`
+ foot;

fs.writeFileSync(path.join(dist, '404.html'), notFoundHtml);

// 5. PWA Manifest (site.webmanifest)
const manifestJson = JSON.stringify({
  name: 'Newzora — Verified Tech News',
  short_name: 'Newzora',
  description: 'Your daily verified tech briefing. AI, gadgets, gaming, and internet news cross-checked in 2+ independent sources.',
  start_url: '/',
  display: 'standalone',
  background_color: '#090a0c',
  theme_color: '#090a0c',
  icons: [
    {
      src: '/img/logo.jpg',
      sizes: '512x512',
      type: 'image/jpeg',
      purpose: 'any maskable'
    }
  ]
}, null, 2);
fs.writeFileSync(path.join(dist, 'site.webmanifest'), manifestJson);

// 6. Google News XML Sitemap
const newsSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${posts.map(p => `  <url>
    <loc>${SITE}/post/${p.slug}.html</loc>
    <news:news>
      <news:publication>
        <news:name>Newzora</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${p.date}T08:00:00Z</news:publication_date>
      <news:title>${escXml(p.title)}</news:title>
    </news:news>
  </url>`).join('\n')}
</urlset>`;
fs.writeFileSync(path.join(dist, 'news-sitemap.xml'), newsSitemapXml);

// 7. Comprehensive Standard XML Sitemap (with image extensions)
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${SITE}/</loc>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE}/about.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${SITE}/editorial-policy.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${SITE}/contact.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
${CATEGORIES.map(c => `  <url>
    <loc>${SITE}/category/${c.slug}.html</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
${posts.map(p => `  <url>
    <loc>${SITE}/post/${p.slug}.html</loc>
    <lastmod>${p.date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
    <image:image>
      <image:loc>${SITE}/${p.image}</image:loc>
      <image:title>${escXml(p.title)}</image:title>
    </image:image>
  </url>`).join('\n')}
</urlset>`;
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemapXml);

// 8. RSS 2.0 Feed (feed.xml & rss.xml)
const rssFeedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Newzora — Verified Tech &amp; Gadget News</title>
    <link>${SITE}/</link>
    <description>Your daily verified tech briefing. AI, gadgets, gaming, and internet news cross-checked in 2+ independent sources.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
${posts.map(p => `    <item>
      <title>${escXml(p.title)}</title>
      <link>${SITE}/post/${p.slug}.html</link>
      <guid isPermaLink="true">${SITE}/post/${p.slug}.html</guid>
      <pubDate>${new Date(p.date + 'T08:00:00Z').toUTCString()}</pubDate>
      <category>${escXml(p.category)}</category>
      <description>${escXml(cleanDescription(p.body, 200))}</description>
      <media:content url="${SITE}/${p.image}" medium="image" type="image/jpeg" ${imgDimsAttr(p.image)} />
      <enclosure url="${SITE}/${p.image}" length="102400" type="image/jpeg" />
    </item>`).join('\n')}
  </channel>
</rss>`;
fs.writeFileSync(path.join(dist, 'feed.xml'), rssFeedXml);
fs.writeFileSync(path.join(dist, 'rss.xml'), rssFeedXml);

// 9. Robots.txt
const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
Sitemap: ${SITE}/news-sitemap.xml
`;
fs.writeFileSync(path.join(dist, 'robots.txt'), robotsTxt);

console.log(`[SEO Engine & UI Overhaul] Build complete:
- Bespoke Linear/Stripe-tier aesthetic with zero AI slop
- Asymmetric editorial hero & responsive magazine architecture
- Precision Lucide-style 1.5px stroke SVG icons
- Plus Jakarta Sans & JetBrains Mono typography pairing
- Deep neutral slate palette (#090a0c) with hairline micro-elevation
- 1 Homepage with WebSite & NewsMediaOrganization schema
- ${CATEGORIES.length} Category hubs (/category/*.html)
- 3 E-E-A-T trust hubs (About, Editorial Policy, Contact)
- 1 Branded 404 page (dist/404.html, noindex)
- 1 Compact search index (search.json, ${searchIndex.length} entries — titles, excerpts, categories, dates)
- ${posts.length} Article pages with NewsArticle rich snippets
- 1 Google News XML Sitemap (${posts.length} stories)
- 1 Standard XML Sitemap with images & priority
- 2 RSS 2.0 Feeds (feed.xml & rss.xml)
- 1 PWA Manifest (site.webmanifest)
- 1 Robots.txt with multi-sitemap indexing directives`);

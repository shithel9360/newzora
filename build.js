const fs = require('fs');
const path = require('path');

const posts = JSON.parse(fs.readFileSync('posts.json', 'utf8'));
const dist = 'dist';

// Reset output directories
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'post'), { recursive: true });
fs.mkdirSync(path.join(dist, 'category'), { recursive: true });
fs.mkdirSync(path.join(dist, 'img'), { recursive: true });

// Decode base64 images
for (const f of fs.readdirSync('assets')) {
  if (f.endsWith('.b64')) {
    fs.writeFileSync(
      path.join(dist, 'img', f.replace('.b64', '.jpg')),
      Buffer.from(fs.readFileSync(path.join('assets', f), 'utf8'), 'base64')
    );
  }
}

// Copy root verification and static files (e.g. Google Search Console)
for (const f of fs.readdirSync('.')) {
  if (f.startsWith('google') && f.endsWith('.html')) {
    fs.copyFileSync(f, path.join(dist, f));
  }
}

// Helpers
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escXml = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const dstr = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const paras = p => p.body.split('\n').map(x => x.trim()).filter(Boolean);

const cleanDescription = (body, maxLen = 155) => {
  const withoutSource = String(body || '').replace(/Sources?:\s*.*$/i, '').trim();
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

const SITE = 'https://newzora-pied.vercel.app';
const SOCIALS = {
  Instagram: 'https://www.instagram.com/new_zora',
  Threads: 'https://www.threads.com/@new_zora',
  Facebook: 'https://www.facebook.com/profile.php?id=61596058485989'
};

const CATEGORIES = [
  { name: 'AI', slug: 'ai', desc: 'Breaking artificial intelligence developments, frontier LLMs, neural silicon, and industry benchmarks.' },
  { name: 'Gadgets', slug: 'gadgets', desc: 'Hardware releases, consumer electronics, camera breakthroughs, and next-gen devices.' },
  { name: 'Gaming', slug: 'gaming', desc: 'PlayStation, Xbox, Nintendo sales milestones, GPU benchmarks, and verified gaming news.' },
  { name: 'Mobile', slug: 'mobile', desc: 'Smartphones, iOS updates, Android rollouts, mobile silicon, and cellular tech.' },
  { name: 'Cybersecurity', slug: 'cybersecurity', desc: 'Zero-day vulnerability disclosures, urgent patches, enterprise threat advisories, and privacy.' },
  { name: 'Tech', slug: 'tech', desc: 'Semiconductor supply chains, tech industry legal moves, executive leadership, and cloud platforms.' }
];

const BIG = ['apple', 'nvidia', 'google', 'anthropic', 'openai', 'samsung', 'tesla', 'meta', 'microsoft', 'amazon', 'xiaomi', 'huawei', 'sony'];
const trending = posts.filter(p => BIG.some(b => (p.title + ' ' + p.body).toLowerCase().includes(b))).slice(0, 5);

const CSS = `:root{--bg:#04070f;--panel:#0a1220;--panel2:#0d1830;--line:#1b2a45;--txt:#eef3fa;--mut:#93a5c0;--cy:#19b6ff;--cy2:#0a84ff;--grn:#37e0a0}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.strip{background:#02040a;color:var(--mut);font-size:12px;letter-spacing:1.2px;text-transform:uppercase;border-bottom:1px solid var(--line)}
.strip .in{max-width:1180px;margin:0 auto;padding:7px 16px;display:flex;gap:14px;align-items:center}.strip b{color:var(--grn)}
header{position:sticky;top:0;z-index:20;background:rgba(4,7,15,.96);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.hwrap{max-width:1180px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;gap:12px}
.hwrap img{width:42px;height:42px;border-radius:50%;object-fit:cover}
.brand{font-weight:800;font-size:22px;letter-spacing:.5px;line-height:1}.brand span{color:var(--cy)}
.tag{color:var(--mut);font-size:11px;letter-spacing:2px;text-transform:uppercase}
nav{margin-left:18px;display:flex;gap:16px;font-size:13px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;color:var(--mut);overflow-x:auto}
nav a{white-space:nowrap;transition:color .2s}nav a:hover,nav a.active{color:var(--cy)}
.follow{margin-left:auto;background:var(--cy);color:#02131f;font-weight:800;padding:9px 16px;border-radius:99px;font-size:13px;display:inline-block;white-space:nowrap}
.wrap{max-width:1180px;margin:0 auto;padding:0 16px}
.bc{margin:16px 0 14px;font-size:12.5px;color:var(--mut)}
.bc ol{display:flex;flex-wrap:wrap;align-items:center;list-style:none;padding:0;margin:0;gap:8px}
.bc li+li::before{content:'/';margin-right:8px;color:var(--line);font-size:11px}
.bc a{color:var(--mut);transition:color .2s}.bc a:hover{color:var(--cy)}
.bc span[itemprop="name"]{color:var(--txt)}
.kicker{color:var(--cy);font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase}
.verified{color:var(--grn);font-size:12px;font-weight:700}
.hero{display:grid;grid-template-columns:2fr 1fr;gap:20px;margin:22px 0 6px}
.lead{background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;transition:border-color .2s}
.lead:hover{border-color:var(--cy)}
.lead img{width:100%;aspect-ratio:16/10;object-fit:cover;height:auto;display:block}
.lead .lb{padding:22px;display:flex;flex-direction:column;gap:11px}
.lead h1{font-size:clamp(26px,3.6vw,40px);line-height:1.15;margin:0}
.lead h2{font-size:clamp(22px,3vw,34px);line-height:1.15;margin:0}
.rail{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px}
.rail h2,.sec h2{font-size:15px;letter-spacing:2.5px;text-transform:uppercase;margin:0 0 14px;display:flex;align-items:center;gap:10px}
.rail h2::after,.sec h2::after{content:'';flex:1;height:1px;background:var(--line)}
.ritem{display:flex;gap:11px;padding:10px 0;border-bottom:1px solid var(--line);transition:opacity .2s}.ritem:last-child{border-bottom:0}
.ritem:hover{opacity:.85}
.ritem img{width:64px;height:64px;object-fit:cover;border-radius:9px;flex-shrink:0}
.ritem h3,.ritem h4{margin:3px 0 0;font-size:14.5px;line-height:1.3;font-weight:600}
.meta{color:var(--mut);font-size:12px;display:flex;gap:9px;align-items:center;flex-wrap:wrap}
.excerpt{color:var(--mut);line-height:1.55}
.btn{display:inline-block;background:var(--cy);color:#02131f;font-weight:700;padding:10px 18px;border-radius:10px;transition:opacity .2s}
.btn:hover{opacity:.9}
.btn.ghost{background:transparent;color:var(--cy);border:1px solid var(--cy)}
.btn.ghost:hover{background:rgba(25,182,255,.1)}
.trend{margin:20px 0 4px;background:var(--panel2);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
.trend h2{font-size:14px;letter-spacing:2.5px;text-transform:uppercase;margin:0 0 10px;color:var(--cy)}
.trow{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px 22px}
.titem{display:flex;gap:11px;align-items:baseline;padding:6px 0;transition:opacity .2s}
.titem:hover{opacity:.85}
.tnum{font-size:24px;font-weight:800;color:var(--cy);line-height:1}
.titem h3,.titem h4{margin:0;font-size:14.5px;line-height:1.3;font-weight:600}
.sec{margin:30px 0 0}
.secgrid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:16px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:border-color .2s}
.card:hover{border-color:var(--cy)}
.card img{width:100%;aspect-ratio:4/5;object-fit:cover;height:auto;display:block}
.card.big img{aspect-ratio:16/10}
.card .cb{padding:15px;display:flex;flex-direction:column;gap:8px;flex:1}
.card h3{margin:0;font-size:17px;line-height:1.3}.card.big h3{font-size:23px}
.mini{display:flex;gap:11px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:11px;align-items:center;transition:border-color .2s}
.mini:hover{border-color:var(--cy)}
.mini img{width:70px;height:70px;border-radius:9px;object-fit:cover;flex-shrink:0}
.mini h4{margin:3px 0 0;font-size:14.5px;line-height:1.3}
.minis{display:flex;flex-direction:column;gap:12px}
.controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 16px}
.fchip{border:1px solid var(--line);background:var(--panel);color:var(--mut);padding:7px 14px;border-radius:99px;cursor:pointer;font-size:13px;transition:all .2s}
.fchip.on{background:var(--cy);color:#02131f;font-weight:700;border-color:var(--cy)}
#q{margin-left:auto;background:var(--panel);border:1px solid var(--line);color:var(--txt);padding:9px 14px;border-radius:10px;min-width:200px}
.river{display:flex;flex-direction:column}
.rrow{display:flex;gap:15px;padding:13px 4px;border-bottom:1px solid var(--line);align-items:center;transition:opacity .2s}
.rrow:hover{opacity:.85}
.rrow img{width:92px;height:92px;border-radius:10px;object-fit:cover;flex-shrink:0}
.rrow h4{margin:3px 0;font-size:16.5px;line-height:1.3}
.trust{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin:34px 0 6px}
.tcard{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px}
.tcard .n{font-size:26px;font-weight:800;color:var(--cy)}
.tcard h3{margin:6px 0;font-size:16px}.tcard p{color:var(--mut);line-height:1.55;margin:0;font-size:14px}
.followband{margin:30px 0 40px;background:linear-gradient(120deg,#0a2a4a,#051528);border:1px solid var(--line);border-radius:16px;padding:26px;display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.followband img{width:58px;height:58px;border-radius:50%;object-fit:cover}
.followband .btns{display:flex;gap:10px;margin-left:auto;flex-wrap:wrap}
article{max-width:820px;margin:20px auto 44px;padding:0 16px}
article .poster{width:100%;height:auto;aspect-ratio:16/9;border-radius:14px;border:1px solid var(--line);display:block}
article h1{font-size:clamp(27px,4vw,44px);line-height:1.15;margin:12px 0 10px}
.dek{font-size:19px;line-height:1.55;color:#c9d8ec;border-left:3px solid var(--cy);padding-left:14px;margin:16px 0}
.byline{display:flex;gap:12px;align-items:center;color:var(--mut);font-size:13px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:11px 0;margin:14px 0;flex-wrap:wrap}
.body p{line-height:1.78;color:#dbe6f4;font-size:17.5px;margin:16px 0}
.source-box{margin:24px 0 18px;padding:14px 18px;background:var(--panel2);border:1px solid var(--line);border-left:3px solid var(--grn);border-radius:10px;display:flex;flex-direction:column;gap:5px;font-size:13.5px}
.source-tag{font-weight:700;color:var(--grn);font-size:11.5px;text-transform:uppercase;letter-spacing:1px}
.source-text{color:var(--txt);line-height:1.5}
.share{display:flex;gap:10px;flex-wrap:wrap;margin:22px 0}
.more{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-top:14px}
.cat-hero{margin:20px 0 30px;padding:26px;background:linear-gradient(135deg,var(--panel2),var(--panel));border:1px solid var(--line);border-radius:16px}
.cat-hero h1{font-size:clamp(26px,3.8vw,38px);margin:4px 0 10px;line-height:1.15}
.cat-hero p{color:var(--mut);font-size:15.5px;line-height:1.6;margin:0;max-width:720px}
.cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;margin:24px 0 40px}
.static-page{max-width:840px;margin:24px auto 60px;padding:0 16px}
.static-page h1{font-size:clamp(28px,4vw,42px);margin:16px 0 18px;line-height:1.15}
.static-page h2{font-size:22px;margin:34px 0 14px;color:var(--cy);border-bottom:1px solid var(--line);padding-bottom:8px}
.static-page p{font-size:16.5px;line-height:1.8;color:#dbe6f4;margin:14px 0}
.static-page ul{padding-left:22px;margin:16px 0;color:#dbe6f4;line-height:1.8;font-size:16px}
.static-page li{margin:8px 0}
.static-card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:22px;margin:22px 0}
footer{border-top:1px solid var(--line);color:var(--mut);font-size:13.5px;margin-top:20px}
.fwrap{max-width:1180px;margin:0 auto;padding:28px 16px;display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:24px}
footer h5{color:var(--txt);letter-spacing:1.6px;text-transform:uppercase;font-size:12px;margin:0 0 10px}
footer li{list-style:none;margin:7px 0}footer ul{padding:0;margin:0}footer a:hover{color:var(--cy)}
.fbot{border-top:1px solid var(--line);padding:14px 16px;text-align:center;color:var(--mut);font-size:12.5px}
@media(max-width:860px){.hero{grid-template-columns:1fr}.secgrid{grid-template-columns:1fr}.fwrap{grid-template-columns:1fr 1fr}}
@media(max-width:540px){.fwrap{grid-template-columns:1fr}nav{gap:12px}}`;

const head = (title, desc, img, url, ogt = 'article', ld = '', activeNav = '') => {
  const cleanDesc = cleanDescription(desc, 155);
  const imgUrl = img.startsWith('http') ? img : `${SITE}/${img.replace(/^\/+/, '')}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(cleanDesc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta name="google-site-verification" content="google64f3ab4c81877d0d">
<meta name="author" content="Newzora">
<meta name="publisher" content="Newzora">
<meta name="theme-color" content="#04070f">
<meta property="og:site_name" content="Newzora">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(cleanDesc)}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="${ogt}">
<meta property="og:image" content="${imgUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="675">
<meta property="og:image:alt" content="${esc(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@new_zora">
<meta name="twitter:creator" content="@new_zora">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(cleanDesc)}">
<meta name="twitter:image" content="${imgUrl}">
<link rel="alternate" type="application/rss+xml" title="Newzora RSS Feed" href="${SITE}/feed.xml">
<link rel="icon" type="image/jpeg" href="/img/logo.jpg">
<link rel="apple-touch-icon" href="/img/logo.jpg">
${ld ? `<script type="application/ld+json">${ld}</script>` : ''}
<style>${CSS}</style></head><body>
<div class="strip"><div class="in"><span><b>✓ Verified</b> tech news, as it breaks</span><span style="margin-left:auto">${dstr(posts[0].date)}</span></div></div>
<header><div class="hwrap">
<a href="/"><img src="/img/logo.jpg" alt="Newzora Logo" width="42" height="42"></a>
<div><div class="brand"><a href="/">NEW<span>ZORA</span></a></div><div class="tag">Tech &amp; Gadget News</div></div>
<nav aria-label="Main Navigation">
${CATEGORIES.map(c => `<a href="/category/${c.slug}.html"${activeNav === c.name ? ' class="active"' : ''}>${c.name}</a>`).join('')}
</nav>
<a class="follow" href="${SOCIALS.Instagram}" target="_blank" rel="noopener">Follow</a></div></header>`;
};

const foot = `<div class="wrap"><div class="followband">
<img src="/img/logo.jpg" alt="Newzora" width="58" height="58">
<div><div style="font-size:20px;font-weight:800">Follow Newzora</div><div class="excerpt">Verified tech news the moment it breaks — on the platform you use most.</div></div>
<div class="btns">${Object.entries(SOCIALS).map(([k, u]) => `<a class="btn ghost" href="${u}" target="_blank" rel="noopener">${k}</a>`).join('')}</div>
</div></div>
<footer><div class="fwrap">
<div><div class="brand" style="font-size:19px">NEW<span style="color:var(--cy)">ZORA</span></div><p style="line-height:1.6">Your daily verified tech briefing. AI • Gadgets • Gaming • Internet. Every story is cross-checked in 2+ reputable sources before publication. No rumours. Just verified news.</p></div>
<div><h5>Sections</h5><ul>${CATEGORIES.map(c => `<li><a href="/category/${c.slug}.html">${c.name}</a></li>`).join('')}</ul></div>
<div><h5>Standards &amp; Trust</h5><ul>
<li><a href="/about.html">About Newzora</a></li>
<li><a href="/editorial-policy.html">Editorial &amp; Fact-Checking</a></li>
<li><a href="/contact.html">Contact &amp; Tips</a></li>
<li><a href="/feed.xml">RSS Feed</a></li>
</ul></div>
<div><h5>Follow Us</h5><ul>${Object.entries(SOCIALS).map(([k, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${k} — @new_zora</a></li>`).join('')}</ul></div>
</div>
<div class="fbot">© ${new Date().getFullYear()} Newzora. All stories cross-checked in 2+ independent sources. Fast, accurate, verified tech journalism.</div></footer></body></html>`;

const card = p => `<a class="card" href="/post/${p.slug}.html"><img loading="lazy" src="/${p.image}" alt="${esc(p.title)}" width="600" height="400"><div class="cb"><div class="meta"><span class="kicker">${esc(p.category)}</span><span>${dstr(p.date)}</span></div><h3>${esc(p.title)}</h3><div class="excerpt">${excerpt(p)}…</div></div></a>`;
const mini = p => `<a class="mini" href="/post/${p.slug}.html"><img loading="lazy" src="/${p.image}" alt="${esc(p.title)}" width="70" height="70"><div><div class="kicker">${esc(p.category)}</div><h4>${esc(p.title)}</h4></div></a>`;
const ritem = p => `<a class="ritem" href="/post/${p.slug}.html"><img loading="lazy" src="/${p.image}" alt="${esc(p.title)}" width="64" height="64"><div><div class="kicker">${esc(p.category)}</div><h4>${esc(p.title)}</h4><div class="meta">${dstr(p.date)}</div></div></a>`;

// 1. Homepage
const hero = posts[0], rail = posts.slice(1, 6);
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
      description: 'Verified tech and gadget news, cross-checked in 2+ reputable sources.',
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
      description: 'Verified tech news, as it breaks.',
      publisher: {
        '@type': 'Organization',
        name: 'Newzora'
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: SITE + '/#latest?q={search_term_string}'
        },
        'query-input': 'required name=search_term_string'
      }
    }
  ]
});

let idx = head('Newzora — Verified Tech News, As It Breaks', 'Your daily tech briefing: AI, gadgets, gaming and internet news, cross-checked in 2+ sources. No rumours, just verified news.', hero.image, SITE + '/', 'website', homeLD)
+ `<div class="wrap"><section class="hero"><a class="lead" href="/post/${hero.slug}.html"><img src="/${hero.image}" alt="${esc(hero.title)}" width="1200" height="675" fetchpriority="high"><div class="lb"><div class="meta"><span class="kicker">${esc(hero.category)}</span><span class="verified">✓ VERIFIED IN 2+ SOURCES</span><span>${dstr(hero.date)}</span></div><h1>${esc(hero.title)}</h1><div class="excerpt">${excerpt(hero, 240)}…</div></div></a>
<aside class="rail"><h2>Latest Stories</h2>${rail.map(ritem).join('')}</aside></section>
<section class="trend"><h2>🔥 Trending Now</h2><div class="trow">${trending.map((p, i) => `<a class="titem" href="/post/${p.slug}.html"><span class="tnum">${i + 1}</span><h4>${esc(p.title)}</h4></a>`).join('')}</div></section>`;

const catOrder = ['AI', 'Gadgets', 'Gaming', 'Mobile', 'Cybersecurity', 'Tech'];
for (const c of catOrder) {
  const cp = posts.filter(p => p.category === c);
  if (cp.length < 3) continue;
  idx += `<section class="sec"><h2><a href="/category/${c.toLowerCase()}.html">${c}</a></h2><div class="secgrid"><a class="card big" href="/post/${cp[0].slug}.html"><img loading="lazy" src="/${cp[0].image}" alt="${esc(cp[0].title)}" width="800" height="500"><div class="cb"><div class="meta"><span class="kicker">${esc(c)}</span><span>${dstr(cp[0].date)}</span></div><h3>${esc(cp[0].title)}</h3><div class="excerpt">${excerpt(cp[0])}…</div></div></a><div class="minis">${cp.slice(1, 3).map(mini).join('')}</div><div class="minis">${cp.slice(3, 5).map(mini).join('')}</div></div></section>`;
}

idx += `<section class="sec" id="latest"><h2>The Feed</h2><div class="controls">${['All', ...new Set(posts.map(p => p.category))].map((c, i) => `<button class="fchip${i === 0 ? ' on' : ''}" data-f="${esc(c)}">${esc(c)}</button>`).join('')}<input id="q" type="search" placeholder="Search news…"></div>
<div class="river">${posts.map(p => `<a class="rrow" href="/post/${p.slug}.html" data-cat="${esc(p.category)}" data-t="${esc((p.title + ' ' + p.body).toLowerCase())}"><img loading="lazy" src="/${p.image}" alt="${esc(p.title)}" width="92" height="92"><div><div class="kicker">${esc(p.category)}</div><h4>${esc(p.title)}</h4><div class="meta">${dstr(p.date)} · <span class="verified">✓ Verified</span></div></div></a>`).join('')}</div></section>
<section class="trust"><div class="tcard"><div class="n">01</div><h3>We scan the trend</h3><p>Every story starts as a live trend — a launch, a leak, a move by a tech giant — spotted as it breaks, never copied from another page.</p></div>
<div class="tcard"><div class="n">02</div><h3>We cross-check it twice</h3><p>Each story is verified in 2+ reputable sources — facts, specs and dates — before anything is published. If it cannot be verified, it does not run.</p></div>
<div class="tcard"><div class="n">03</div><h3>Real photos, no rumours</h3><p>Every poster is built on the story's real photo. No invented images, no hype, no rumours — just verified news, as it breaks.</p></div></section></div>
<script>
const chips=[...document.querySelectorAll('.fchip')],rows=[...document.querySelectorAll('.rrow')],q=document.getElementById('q');let f='All';
function apply(){rows.forEach(r=>{r.style.display=((f==='All'||r.dataset.cat===f)&&r.dataset.t.includes(q.value.toLowerCase()))?'':'none'})}
chips.forEach(b=>b.onclick=()=>{chips.forEach(x=>x.classList.remove('on'));b.classList.add('on');f=b.dataset.f;apply()});q.oninput=apply;
</script>` + foot;

fs.writeFileSync(path.join(dist, 'index.html'), idx);

// 2. Individual Article Pages
posts.forEach(p => {
  const { source, bodyParagraphs } = parseSource(p.body);
  const btns = Object.entries(p.links || {}).map(([k, u]) => `<a class="btn ghost" href="${u}" target="_blank" rel="noopener">See on ${k[0].toUpperCase() + k.slice(1)}</a>`).join('');
  const sameCat = posts.filter(x => x.category === p.category && x.id !== p.id).slice(0, 3);
  const more = (sameCat.length ? sameCat : posts.filter(x => x.id !== p.id).slice(0, 3)).map(card).join('');
  const catSlug = p.category.toLowerCase();
  const desc = cleanDescription(p.body, 155);

  const artLD = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        headline: p.title,
        description: desc,
        image: [`${SITE}/${p.image}`],
        datePublished: `${p.date}T08:00:00Z`,
        dateModified: `${p.date}T08:00:00Z`,
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

  const sourceBoxHtml = source
    ? `<div class="source-box"><span class="source-tag">✓ Verified Sources</span><span class="source-text">${esc(source)}</span></div>`
    : `<div class="source-box"><span class="source-tag">✓ Editorial Standard</span><span class="source-text">Cross-checked in 2+ independent industry sources prior to publication.</span></div>`;

  const html = head(`${p.title} — Newzora`, desc, p.image, `${SITE}/post/${p.slug}.html`, 'article', artLD, p.category)
  + `<article>
  <nav class="bc" aria-label="Breadcrumb">
    <ol itemscope itemtype="https://schema.org/BreadcrumbList">
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="/"><span itemprop="name">Home</span></a><meta itemprop="position" content="1"></li>
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="/category/${catSlug}.html"><span itemprop="name">${esc(p.category)}</span></a><meta itemprop="position" content="2"></li>
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><span itemprop="name">${esc(p.title)}</span><meta itemprop="position" content="3"></li>
    </ol>
  </nav>
  <div><span class="kicker">${esc(p.category)}</span></div>
  <h1>${esc(p.title)}</h1>
  <div class="dek">${esc(bodyParagraphs[0] || '')}</div>
  <div class="byline">
    <span><b style="color:var(--txt)">Newzora</b> · ${dstr(p.date)}</span>
    <span class="reading-time">· ${readingTime(p.body)}</span>
    <span class="verified">✓ Cross-checked in 2+ sources</span>
  </div>
  <img class="poster" src="/${p.image}" alt="${esc(p.title)}" width="1200" height="675" fetchpriority="high" decoding="async">
  <div class="body">${bodyParagraphs.slice(1).map(x => `<p>${esc(x)}</p>`).join('')}</div>
  ${sourceBoxHtml}
  <div class="share">${btns}</div>
  <h2 style="font-size:22px;margin-top:36px;border-bottom:1px solid var(--line);padding-bottom:10px">More in ${esc(p.category)}</h2>
  <div class="more">${more}</div>
  </article>` + foot;

  fs.writeFileSync(path.join(dist, 'post', `${p.slug}.html`), html);
});

// 3. Category Hub Pages
CATEGORIES.forEach(cat => {
  const catPosts = posts.filter(p => p.category.toLowerCase() === cat.slug);
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
  + `<div class="wrap">
  <nav class="bc" aria-label="Breadcrumb">
    <ol itemscope itemtype="https://schema.org/BreadcrumbList">
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="/"><span itemprop="name">Home</span></a><meta itemprop="position" content="1"></li>
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><span itemprop="name">${esc(cat.name)}</span><meta itemprop="position" content="2"></li>
    </ol>
  </nav>
  <div class="cat-hero">
    <div class="kicker">Category Hub</div>
    <h1>${esc(cat.name)} News</h1>
    <p>${esc(cat.desc)} Every development verified in 2+ primary sources.</p>
  </div>
  <div class="cat-grid">${catPosts.map(card).join('')}</div>
  </div>` + foot;

  fs.writeFileSync(path.join(dist, 'category', `${cat.slug}.html`), catHtml);
});

// 4. E-E-A-T Transparency Pages (About, Editorial Policy, Contact)
// About Page
const aboutLD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About Newzora — Verified Tech Journalism',
  url: `${SITE}/about.html`,
  description: 'Learn how Newzora verifies breaking tech, AI, gaming, and gadget news using a strict multi-source verification standard.'
});

const aboutHtml = head('About Newzora — Verified Tech Journalism & Standards', 'Why Newzora exists: verified tech news without rumours, clickbait, or unverified leaks. Cross-checked in 2+ independent sources.', 'img/logo.jpg', `${SITE}/about.html`, 'website', aboutLD)
+ `<div class="static-page">
<nav class="bc" aria-label="Breadcrumb">
  <ol itemscope itemtype="https://schema.org/BreadcrumbList">
    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="/"><span itemprop="name">Home</span></a><meta itemprop="position" content="1"></li>
    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><span itemprop="name">About</span><meta itemprop="position" content="2"></li>
  </ol>
</nav>
<div class="kicker">Our Mission</div>
<h1>About Newzora</h1>
<p class="dek">Fast, accurate tech news without rumors, speculative hype, or sponsored misinformation.</p>
<div class="static-card">
  <h2>The 2+ Source Verification Rule</h2>
  <p>In modern tech journalism, rumors and unconfirmed leaks spread instantly across social feeds. Newzora was founded with one strict rule: <b>every story must be corroborated in two or more independent, credible sources</b> before publication.</p>
  <p>Our approved verification sources include regulatory filings (SEC, FCC, patent registers), official corporate press disclosures, direct earnings releases, and veteran investigative outlets (Reuters, Bloomberg, AP, Financial Times).</p>
</div>
<h2>What We Cover</h2>
<ul>
  <li><b>Artificial Intelligence:</b> Frontier model deployments, neural hardware, research breakthroughs, enterprise safety audits, and leadership developments.</li>
  <li><b>Hardware &amp; Gadgets:</b> Validated consumer electronics, camera sensors, wearables, and computing systems.</li>
  <li><b>Gaming &amp; Consoles:</b> Official financial reporting, console unit sales, platform architecture, and developer milestones.</li>
  <li><b>Cybersecurity:</b> Critical CVE vulnerability alerts, active exploits, patching directives, and data integrity reports.</li>
  <li><b>Mobile Silicon:</b> Verified processor architectures, OS software releases, modem advancements, and battery tech.</li>
</ul>
<h2>Our Publishing Network</h2>
<p>Newzora publishes in visual cards and briefing formats across our website and social channels on Instagram, Threads, and Facebook (<code>@new_zora</code>). Each card features real hardware or company imagery with zero invented graphics.</p>
</div>` + foot;
fs.writeFileSync(path.join(dist, 'about.html'), aboutHtml);

// Editorial Policy Page
const policyLD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Newzora Editorial Policy & Fact-Checking Guidelines',
  url: `${SITE}/editorial-policy.html`,
  description: 'The editorial guidelines, verification procedures, corrections policy, and independence standards followed by Newzora.'
});

const policyHtml = head('Editorial Policy, Fact-Checking & Corrections — Newzora', 'Our journalistic standards: verification protocols, anonymous source handling, error corrections, and ethical boundaries.', 'img/logo.jpg', `${SITE}/editorial-policy.html`, 'website', policyLD)
+ `<div class="static-page">
<nav class="bc" aria-label="Breadcrumb">
  <ol itemscope itemtype="https://schema.org/BreadcrumbList">
    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="/"><span itemprop="name">Home</span></a><meta itemprop="position" content="1"></li>
    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><span itemprop="name">Editorial Policy</span><meta itemprop="position" content="2"></li>
  </ol>
</nav>
<div class="kicker">Trust &amp; Accuracy</div>
<h1>Editorial Policy &amp; Standards</h1>
<p class="dek">How we research, verify, write, and correct technical reporting.</p>
<h2>1. Verification &amp; Sourcing</h2>
<p>We do not publish single-source leaks or social media speculation. Before a post is cleared for publication, our editorial desk requires:</p>
<ul>
  <li>Primary source verification (e.g. documentation, video proof, regulatory agency submission).</li>
  <li>Corroborating reporting from established financial or technical news entities.</li>
  <li>Explicit transparent citation of sources at the conclusion of each article.</li>
</ul>
<h2>2. Corrections &amp; Updates Policy</h2>
<p>When an error occurs, we correct it promptly and transparently. Substantive updates to developing stories are appended with clear timestamped notes. If a correction is required, the erroneous statement is updated in the text and noted at the base of the article.</p>
<h2>3. Editorial Independence &amp; Ethics</h2>
<p>Newzora maintains complete independence from tech manufacturers, advertisers, and investors. We accept no paid editorial placements, no sponsored news coverage, and no review gifts with editorial preconditions.</p>
<h2>4. AI Transparency</h2>
<p>All factual claims, numbers, dates, and conclusions are curated and validated by human editors prior to release.</p>
</div>` + foot;
fs.writeFileSync(path.join(dist, 'editorial-policy.html'), policyHtml);

// Contact Page
const contactLD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact Newzora — News Tips & Inquiries',
  url: `${SITE}/contact.html`,
  description: 'Submit news tips, corrections, press releases, or inquiries to the Newzora editorial desk.'
});

const contactHtml = head('Contact Us & News Tips — Newzora', 'Contact the Newzora news desk. Send press releases, verified tips, or request factual corrections.', 'img/logo.jpg', `${SITE}/contact.html`, 'website', contactLD)
+ `<div class="static-page">
<nav class="bc" aria-label="Breadcrumb">
  <ol itemscope itemtype="https://schema.org/BreadcrumbList">
    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="/"><span itemprop="name">Home</span></a><meta itemprop="position" content="1"></li>
    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><span itemprop="name">Contact</span><meta itemprop="position" content="2"></li>
  </ol>
</nav>
<div class="kicker">Get In Touch</div>
<h1>Contact Newzora</h1>
<p class="dek">Have a verified news tip, press release, or question about a story? Reach our editorial desk.</p>
<div class="static-card">
  <h2>News Tips &amp; Press Releases</h2>
  <p>We welcome tips supported by documentation, research papers, public filings, or verifiable hardware evidence.</p>
  <p><b>Social Direct Message:</b> <a href="${SOCIALS.Instagram}" target="_blank" rel="noopener" style="color:var(--cy)">Instagram @new_zora</a> or <a href="${SOCIALS.Threads}" target="_blank" rel="noopener" style="color:var(--cy)">Threads @new_zora</a></p>
</div>
<div class="static-card">
  <h2>Corrections &amp; Feedback</h2>
  <p>If you identify a factual inaccuracy in any Newzora story, please message us with the story link and corroborating documentation. Our editors review all correction requests within 24 hours.</p>
</div>
</div>` + foot;
fs.writeFileSync(path.join(dist, 'contact.html'), contactHtml);

// 5. Google News XML Sitemap (Recent stories)
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

// 6. Comprehensive Standard XML Sitemap (with image extensions)
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

// 7. RSS 2.0 Feed (feed.xml & rss.xml) for Google News Publisher Center, aggregators & feed readers
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
      <media:content url="${SITE}/${p.image}" medium="image" type="image/jpeg" width="1200" height="675" />
      <enclosure url="${SITE}/${p.image}" length="102400" type="image/jpeg" />
    </item>`).join('\n')}
  </channel>
</rss>`;
fs.writeFileSync(path.join(dist, 'feed.xml'), rssFeedXml);
fs.writeFileSync(path.join(dist, 'rss.xml'), rssFeedXml);

// 8. Robots.txt
const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
Sitemap: ${SITE}/news-sitemap.xml
`;
fs.writeFileSync(path.join(dist, 'robots.txt'), robotsTxt);

console.log(`[SEO Engine] Build complete:
- 1 Homepage with WebSite & NewsMediaOrganization schema
- ${CATEGORIES.length} Category hubs (/category/*.html) with CollectionPage & BreadcrumbList
- 3 E-E-A-T trust pages (About, Editorial Policy, Contact)
- ${posts.length} Article pages with NewsArticle rich snippets, clean metadata, and source citations
- 1 Google News XML Sitemap (${posts.length} stories)
- 1 Standard XML Sitemap with images & priority
- 2 RSS 2.0 Feeds (feed.xml & rss.xml)
- 1 Robots.txt with multi-sitemap indexing directives`);

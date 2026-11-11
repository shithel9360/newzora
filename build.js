const fs = require('fs'), path = require('path');
const posts = JSON.parse(fs.readFileSync('posts.json','utf8'));
const dist = 'dist';
fs.rmSync(dist,{recursive:true,force:true});
fs.mkdirSync(path.join(dist,'post'),{recursive:true});
fs.mkdirSync(path.join(dist,'img'),{recursive:true});
for (const f of fs.readdirSync('assets')) {
  if (f.endsWith('.b64')) fs.writeFileSync(path.join(dist,'img',f.replace('.b64','.jpg')), Buffer.from(fs.readFileSync(path.join('assets',f),'utf8'),'base64'));
}
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const dstr = d => new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const paras = p => p.body.split('\n').filter(x=>x.trim());
const excerpt = (p,n=150) => esc((paras(p)[1]||paras(p)[0]||'').slice(0,n));
const SITE = 'https://newzora-pied.vercel.app';
const SOCIALS = {Instagram:'https://www.instagram.com/new_zora',Facebook:'https://www.facebook.com/profile.php?id=61596058485989',Threads:'https://www.threads.com/@new_zora'};
const BIG = ['apple','nvidia','google','anthropic','openai','samsung','tesla','meta','microsoft','amazon','xiaomi','huawei'];
const trending = posts.filter(p=>BIG.some(b=>(p.title+' '+p.body).toLowerCase().includes(b))).slice(0,5);
const CSS = `:root{--bg:#04070f;--panel:#0a1220;--panel2:#0d1830;--line:#1b2a45;--txt:#eef3fa;--mut:#93a5c0;--cy:#19b6ff;--cy2:#0a84ff;--grn:#37e0a0}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
a{color:inherit;text-decoration:none}
.strip{background:#02040a;color:var(--mut);font-size:12px;letter-spacing:1.2px;text-transform:uppercase;border-bottom:1px solid var(--line)}
.strip .in{max-width:1180px;margin:0 auto;padding:7px 16px;display:flex;gap:14px}.strip b{color:var(--grn)}
header{position:sticky;top:0;z-index:10;background:rgba(4,7,15,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.hwrap{max-width:1180px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;gap:12px}
.hwrap img{width:42px;height:42px;border-radius:50%}
.brand{font-weight:800;font-size:22px;letter-spacing:.5px;line-height:1}.brand span{color:var(--cy)}
.tag{color:var(--mut);font-size:11px;letter-spacing:2px;text-transform:uppercase}
nav{margin-left:18px;display:flex;gap:15px;font-size:13px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;color:var(--mut)}nav a:hover{color:var(--cy)}
.follow{margin-left:auto;background:var(--cy);color:#02131f;font-weight:800;padding:9px 16px;border-radius:99px;font-size:13px}
.wrap{max-width:1180px;margin:0 auto;padding:0 16px}
.kicker{color:var(--cy);font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase}
.verified{color:var(--grn);font-size:12px;font-weight:700}
.hero{display:grid;grid-template-columns:2fr 1fr;gap:20px;margin:22px 0 6px}
.lead{background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden;display:flex;flex-direction:column}
.lead img{width:100%;aspect-ratio:16/10;object-fit:cover}
.lead .lb{padding:22px;display:flex;flex-direction:column;gap:11px}
.lead h1{font-size:clamp(26px,3.6vw,42px);line-height:1.12;margin:0}
.rail{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px}
.rail h2,.sec h2{font-size:15px;letter-spacing:2.5px;text-transform:uppercase;margin:0 0 14px;display:flex;align-items:center;gap:10px}
.rail h2::after,.sec h2::after{content:'';flex:1;height:1px;background:var(--line)}
.ritem{display:flex;gap:11px;padding:10px 0;border-bottom:1px solid var(--line)}.ritem:last-child{border-bottom:0}
.ritem img{width:64px;height:64px;object-fit:cover;border-radius:9px}
.ritem h4{margin:3px 0 0;font-size:14.5px;line-height:1.3}
.meta{color:var(--mut);font-size:12px;display:flex;gap:9px;align-items:center;flex-wrap:wrap}
.excerpt{color:var(--mut);line-height:1.55}
.btn{display:inline-block;background:var(--cy);color:#02131f;font-weight:700;padding:11px 20px;border-radius:10px}
.btn.ghost{background:transparent;color:var(--cy);border:1px solid var(--cy)}
.trend{margin:20px 0 4px;background:var(--panel2);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
.trend h2{font-size:14px;letter-spacing:2.5px;text-transform:uppercase;margin:0 0 10px;color:var(--cy)}
.trow{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px 22px}
.titem{display:flex;gap:11px;align-items:baseline;padding:6px 0}
.tnum{font-size:24px;font-weight:800;color:var(--cy);line-height:1}
.titem h4{margin:0;font-size:14.5px;line-height:1.3}
.sec{margin:30px 0 0}
.secgrid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:16px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
.card img{width:100%;aspect-ratio:4/5;object-fit:cover}
.card.big img{aspect-ratio:16/10}
.card .cb{padding:15px;display:flex;flex-direction:column;gap:8px;flex:1}
.card h3{margin:0;font-size:17px;line-height:1.3}.card.big h3{font-size:23px}
.mini{display:flex;gap:11px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:11px;align-items:center}
.mini img{width:70px;height:70px;border-radius:9px;object-fit:cover}
.mini h4{margin:3px 0 0;font-size:14.5px;line-height:1.3}
.minis{display:flex;flex-direction:column;gap:12px}
.controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 16px}
.fchip{border:1px solid var(--line);background:var(--panel);color:var(--mut);padding:7px 14px;border-radius:99px;cursor:pointer;font-size:13px}
.fchip.on{background:var(--cy);color:#02131f;font-weight:700;border-color:var(--cy)}
#q{margin-left:auto;background:var(--panel);border:1px solid var(--line);color:var(--txt);padding:9px 14px;border-radius:10px;min-width:200px}
.river{display:flex;flex-direction:column}
.rrow{display:flex;gap:15px;padding:13px 4px;border-bottom:1px solid var(--line);align-items:center}
.rrow img{width:92px;height:92px;border-radius:10px;object-fit:cover}
.rrow h4{margin:3px 0;font-size:16.5px;line-height:1.3}
.trust{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin:34px 0 6px}
.tcard{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px}
.tcard .n{font-size:26px;font-weight:800;color:var(--cy)}
.tcard h3{margin:6px 0;font-size:16px}.tcard p{color:var(--mut);line-height:1.55;margin:0;font-size:14px}
.followband{margin:30px 0 40px;background:linear-gradient(120deg,#0a2a4a,#051528);border:1px solid var(--line);border-radius:16px;padding:26px;display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.followband img{width:58px;height:58px;border-radius:50%}
.followband .btns{display:flex;gap:10px;margin-left:auto;flex-wrap:wrap}
article{max-width:800px;margin:26px auto 44px;padding:0 16px}
article .poster{width:100%;border-radius:14px;border:1px solid var(--line)}
article h1{font-size:clamp(27px,4vw,44px);line-height:1.13;margin:12px 0 10px}
.dek{font-size:19px;line-height:1.55;color:#c9d8ec;border-left:3px solid var(--cy);padding-left:14px;margin:16px 0}
.byline{display:flex;gap:12px;align-items:center;color:var(--mut);font-size:13px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:11px 0;margin:14px 0}
.body p{line-height:1.78;color:#dbe6f4;font-size:17px}
.share{display:flex;gap:10px;flex-wrap:wrap;margin:22px 0}
.more{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-top:14px}
footer{border-top:1px solid var(--line);color:var(--mut);font-size:13.5px;margin-top:10px}
.fwrap{max-width:1180px;margin:0 auto;padding:26px 16px;display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:22px}
footer h5{color:var(--txt);letter-spacing:1.6px;text-transform:uppercase;font-size:12px;margin:0 0 10px}
footer li{list-style:none;margin:7px 0}footer ul{padding:0;margin:0}footer a:hover{color:var(--cy)}
.fbot{border-top:1px solid var(--line);padding:14px 16px;text-align:center;color:var(--mut);font-size:12.5px}
@media(max-width:820px){.hero{grid-template-columns:1fr}.secgrid{grid-template-columns:1fr}.fwrap{grid-template-columns:1fr}nav{display:none}}`;
const head = (title, desc, img, url, ogt='article', ld='') => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${SITE}/${img}"><meta property="og:url" content="${url}"><meta property="og:type" content="${ogt}"><link rel="canonical" href="${url}"><meta name="author" content="Newzora"><meta name="theme-color" content="#04070f">${ld?`<script type="application/ld+json">${ld}</script>`:``}<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/img/logo.jpg"><style>${CSS}</style></head><body>
<div class="strip"><div class="in"><span><b>✓ Verified</b> tech news, as it breaks</span><span style="margin-left:auto">${dstr(posts[0].date)}</span></div></div>
<header><div class="hwrap"><a href="/"><img src="/img/logo.jpg" alt="Newzora"></a><div><div class="brand">NEW<span>ZORA</span></div><div class="tag">Tech &amp; Gadget News</div></div>
<nav>${['AI','Gadgets','Gaming','Mobile','Cybersecurity','Business'].map(c=>`<a href="/#latest" data-nav="${c}">${c}</a>`).join('')}</nav>
<a class="follow" href="${SOCIALS.Instagram}">Follow</a></div></header>`;
const foot = `<div class="wrap"><div class="followband"><img src="/img/logo.jpg" alt="Newzora"><div><div style="font-size:20px;font-weight:800">Follow Newzora</div><div class="excerpt">Verified tech news the moment it breaks — on the platform you use most.</div></div><div class="btns">${Object.entries(SOCIALS).map(([k,u])=>`<a class="btn ghost" href="${u}">${k}</a>`).join('')}</div></div></div>
<footer><div class="fwrap"><div><div class="brand" style="font-size:19px">NEW<span style="color:var(--cy)">ZORA</span></div><p style="line-height:1.6">Your daily tech briefing. AI • Gadgets • Gaming • Internet. Every story is cross-checked in 2+ reputable sources before it is published. No rumours. Just verified news.</p></div>
<div><h5>Sections</h5><ul>${[...new Set(posts.map(p=>p.category))].map(c=>`<li><a href="/#latest">${c}</a></li>`).join('')}</ul></div>
<div><h5>Follow</h5><ul>${Object.entries(SOCIALS).map(([k,u])=>`<li><a href="${u}">${k} — @new_zora</a></li>`).join('')}</ul></div></div>
<div class="fbot">© ${new Date().getFullYear()} Newzora. All stories verified in 2+ sources.</div></footer></body></html>`;
const card = p => `<a class="card" href="/post/${p.slug}.html"><img loading="lazy" src="/${p.image}" alt="${esc(p.title)}"><div class="cb"><div class="meta"><span class="kicker">${esc(p.category)}</span><span>${dstr(p.date)}</span></div><h3>${esc(p.title)}</h3><div class="excerpt">${excerpt(p)}…</div></div></a>`;
const mini = p => `<a class="mini" href="/post/${p.slug}.html"><img loading="lazy" src="/${p.image}" alt=""><div><div class="kicker">${esc(p.category)}</div><h4>${esc(p.title)}</h4></div></a>`;
const ritem = p => `<a class="ritem" href="/post/${p.slug}.html"><img loading="lazy" src="/${p.image}" alt=""><div><div class="kicker">${esc(p.category)}</div><h4>${esc(p.title)}</h4><div class="meta">${dstr(p.date)}</div></div></a>`;
const hero = posts[0], rail = posts.slice(1,6);
const homeLD = JSON.stringify({'@context':'https://schema.org','@graph':[
 {'@type':'Organization',name:'Newzora',url:SITE+'/',logo:SITE+'/img/logo.jpg',sameAs:Object.values(SOCIALS)},
 {'@type':'WebSite',name:'Newzora',url:SITE+'/',publisher:{'@type':'Organization',name:'Newzora'}}]});
let idx = head('Newzora — Verified Tech News, As It Breaks','Your daily tech briefing: AI, gadgets, gaming and internet news, cross-checked in 2+ sources. No rumours, just verified news.', hero.image, SITE+'/', 'website', homeLD)
+ `<div class="wrap"><section class="hero"><a class="lead" href="/post/${hero.slug}.html"><img src="/${hero.image}" alt="${esc(hero.title)}"><div class="lb"><div class="meta"><span class="kicker">${esc(hero.category)}</span><span class="verified">✓ VERIFIED IN 2+ SOURCES</span><span>${dstr(hero.date)}</span></div><h1>${esc(hero.title)}</h1><div class="excerpt">${excerpt(hero,240)}…</div></div></a>
<aside class="rail"><h2>Latest</h2>${rail.map(ritem).join('')}</aside></section>
<section class="trend"><h2>🔥 Trending Now</h2><div class="trow">${trending.map((p,i)=>`<a class="titem" href="/post/${p.slug}.html"><span class="tnum">${i+1}</span><h4>${esc(p.title)}</h4></a>`).join('')}</div></section>`;
const catOrder = ['AI','Gadgets','Gaming','Mobile','Cybersecurity','Business','Tech'];
for (const c of catOrder) {
  const cp = posts.filter(p=>p.category===c);
  if (cp.length < 3) continue;
  idx += `<section class="sec"><h2>${c}</h2><div class="secgrid"><a class="card big" href="/post/${cp[0].slug}.html"><img loading="lazy" src="/${cp[0].image}" alt="${esc(cp[0].title)}"><div class="cb"><div class="meta"><span class="kicker">${esc(c)}</span><span>${dstr(cp[0].date)}</span></div><h3>${esc(cp[0].title)}</h3><div class="excerpt">${excerpt(cp[0])}…</div></div></a><div class="minis">${cp.slice(1,3).map(mini).join('')}</div><div class="minis">${cp.slice(3,5).map(mini).join('')}</div></div></section>`;
}
idx += `<section class="sec" id="latest"><h2>The Latest</h2><div class="controls">${['All',...new Set(posts.map(p=>p.category))].map((c,i)=>`<button class="fchip${i==0?' on':''}" data-f="${esc(c)}">${esc(c)}</button>`).join('')}<input id="q" type="search" placeholder="Search news…"></div>
<div class="river">${posts.map(p=>`<a class="rrow" href="/post/${p.slug}.html" data-cat="${esc(p.category)}" data-t="${esc((p.title+' '+p.body).toLowerCase())}"><img loading="lazy" src="/${p.image}" alt=""><div><div class="kicker">${esc(p.category)}</div><h4>${esc(p.title)}</h4><div class="meta">${dstr(p.date)} · <span class="verified">✓ Verified</span></div></div></a>`).join('')}</div></section>
<section class="trust"><div class="tcard"><div class="n">01</div><h3>We scan the trend</h3><p>Every story starts as a live trend — a launch, a leak, a move by a tech giant — spotted as it breaks, never copied from another page.</p></div>
<div class="tcard"><div class="n">02</div><h3>We cross-check it twice</h3><p>Each story is verified in 2+ reputable sources — facts, specs and dates — before anything is published. If it cannot be verified, it does not run.</p></div>
<div class="tcard"><div class="n">03</div><h3>Real photos, no rumours</h3><p>Every poster is built on the story's real photo. No invented images, no hype, no rumours — just verified news, as it breaks.</p></div></section></div>
<script>
const chips=[...document.querySelectorAll('.fchip')],rows=[...document.querySelectorAll('.rrow')],q=document.getElementById('q');let f='All';
function apply(){rows.forEach(r=>{r.style.display=((f==='All'||r.dataset.cat===f)&&r.dataset.t.includes(q.value.toLowerCase()))?'':'none'})}
chips.forEach(b=>b.onclick=()=>{chips.forEach(x=>x.classList.remove('on'));b.classList.add('on');f=b.dataset.f;apply()});q.oninput=apply;
document.querySelectorAll('[data-nav]').forEach(a=>a.onclick=()=>{const c=a.dataset.nav;const b=chips.find(x=>x.dataset.f===c);if(b)b.click()});
if(location.hash==='#latest'&&new URLSearchParams(location.search).get('c')){}
</script>` + foot;
fs.writeFileSync(path.join(dist,'index.html'), idx);
posts.forEach((p,i)=>{
  const ps = paras(p);
  const btns = Object.entries(p.links||{}).map(([k,u])=>`<a class="btn ghost" href="${u}">See it on ${k[0].toUpperCase()+k.slice(1)}</a>`).join('');
  const sameCat = posts.filter(x=>x.category===p.category && x.id!==p.id).slice(0,3);
  const more = (sameCat.length?sameCat:posts.filter(x=>x.id!==p.id).slice(0,3)).map(card).join('');
  const artLD = JSON.stringify({'@context':'https://schema.org','@graph':[
   {'@type':'NewsArticle',headline:p.title,description:p.body.slice(0,155),image:[SITE+'/'+p.image],datePublished:p.date,dateModified:p.date,author:{'@type':'Organization',name:'Newzora',url:SITE+'/'},publisher:{'@type':'Organization',name:'Newzora',logo:{'@type':'ImageObject',url:SITE+'/img/logo.jpg'}},mainEntityOfPage:SITE+'/post/'+p.slug+'.html'},
   {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:SITE+'/'},{'@type':'ListItem',position:2,name:p.category,item:SITE+'/#latest'},{'@type':'ListItem',position:3,name:p.title,item:SITE+'/post/'+p.slug+'.html'}]}]});
  const html = head(p.title+' — Newzora', p.body.slice(0,155), p.image, SITE+'/post/'+p.slug+'.html', 'article', artLD)
  + `<article><a href="/" style="color:var(--cy)">← All news</a><div style="margin-top:16px"><span class="kicker">${esc(p.category)}</span></div><h1>${esc(p.title)}</h1>
  <div class="dek">${esc(ps[0]||'')}</div>
  <div class="byline"><span><b style="color:var(--txt)">Newzora</b> · ${dstr(p.date)}</span><span class="verified">✓ Cross-checked in 2+ sources</span></div>
  <img class="poster" src="/${p.image}" alt="${esc(p.title)}"><div class="body">${ps.slice(1).map(x=>`<p>${esc(x)}</p>`).join('')}</div>
  <div class="share">${btns}</div>
  <h2 style="font-size:20px">More in ${esc(p.category)}</h2><div class="more">${more}</div></article>` + foot;
  fs.writeFileSync(path.join(dist,'post',p.slug+'.html'), html);
});
fs.writeFileSync(path.join(dist,'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE}/</loc></url>${posts.map(p=>`<url><loc>${SITE}/post/${p.slug}.html</loc><lastmod>${p.date}</lastmod></url>`).join('')}</urlset>`);
fs.writeFileSync(path.join(dist,'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log('built v2:', posts.length, 'articles');

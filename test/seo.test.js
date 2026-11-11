const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');

describe('Newzora SEO & SERP Verification', () => {

  test('Robots.txt contains user-agent and both standard and news sitemaps', () => {
    const robotsPath = path.join(DIST, 'robots.txt');
    assert.ok(fs.existsSync(robotsPath), 'robots.txt must exist in dist');
    const content = fs.readFileSync(robotsPath, 'utf8');
    assert.match(content, /User-agent:\s*\*/i);
    assert.match(content, /Allow:\s*\//i);
    assert.match(content, /Sitemap:\s*https:\/\/newzora-pied\.vercel\.app\/sitemap\.xml/i);
    assert.match(content, /Sitemap:\s*https:\/\/newzora-pied\.vercel\.app\/news-sitemap\.xml/i);
  });

  test('Google News Sitemap exists and uses Google News schema', () => {
    const newsSitemapPath = path.join(DIST, 'news-sitemap.xml');
    assert.ok(fs.existsSync(newsSitemapPath), 'news-sitemap.xml must exist in dist');
    const xml = fs.readFileSync(newsSitemapPath, 'utf8');
    assert.match(xml, /xmlns:news="http:\/\/www\.google\.com\/schemas\/sitemap-news\/0\.9"/);
    assert.match(xml, /<news:publication>/);
    assert.match(xml, /<news:name>Newzora<\/news:name>/);
    assert.match(xml, /<news:language>en<\/news:language>/);
    assert.match(xml, /<news:title>/);
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'Must have XML declaration');
  });

  test('Standard XML Sitemap contains index, category, E-E-A-T and post URLs with image extensions', () => {
    const sitemapPath = path.join(DIST, 'sitemap.xml');
    assert.ok(fs.existsSync(sitemapPath), 'sitemap.xml must exist in dist');
    const xml = fs.readFileSync(sitemapPath, 'utf8');
    assert.match(xml, /<loc>https:\/\/newzora-pied\.vercel\.app\/<\/loc>/);
    assert.match(xml, /<loc>https:\/\/newzora-pied\.vercel\.app\/about\.html<\/loc>/);
    assert.match(xml, /<loc>https:\/\/newzora-pied\.vercel\.app\/editorial-policy\.html<\/loc>/);
    assert.match(xml, /<loc>https:\/\/newzora-pied\.vercel\.app\/category\/ai\.html<\/loc>/);
    assert.match(xml, /image:image/);
    assert.match(xml, /image:loc/);
    assert.match(xml, /image:title/);
  });

  test('RSS 2.0 Feed exists for Google News Publisher Center and aggregators', () => {
    const feedPath = path.join(DIST, 'feed.xml');
    const rssPath = path.join(DIST, 'rss.xml');
    assert.ok(fs.existsSync(feedPath) && fs.existsSync(rssPath), 'both feed.xml and rss.xml must exist');
    const xml = fs.readFileSync(feedPath, 'utf8');
    assert.match(xml, /<rss\s+version="2\.0"/);
    assert.match(xml, /<title>Newzora/);
    assert.match(xml, /<item>/);
    assert.match(xml, /<guid/);
    assert.match(xml, /<pubDate>/);
    assert.match(xml, /<media:content/);
  });

  test('E-E-A-T transparency pages exist and have valid JSON-LD schemas', () => {
    const pages = ['about.html', 'editorial-policy.html', 'contact.html'];
    for (const page of pages) {
      const pagePath = path.join(DIST, page);
      assert.ok(fs.existsSync(pagePath), `${page} must exist`);
      const html = fs.readFileSync(pagePath, 'utf8');
      const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(ldMatch, `${page} must have JSON-LD script`);
      assert.doesNotThrow(() => JSON.parse(ldMatch[1]), `${page} JSON-LD must be valid JSON`);
    }
  });

  test('Category hub pages exist with canonical URLs and valid breadcrumb schema', () => {
    const categories = ['ai', 'gadgets', 'gaming', 'tech', 'cybersecurity', 'mobile'];
    for (const cat of categories) {
      const catPath = path.join(DIST, 'category', `${cat}.html`);
      assert.ok(fs.existsSync(catPath), `category/${cat}.html must exist`);
      const html = fs.readFileSync(catPath, 'utf8');
      assert.match(html, new RegExp(`<link\\s+rel="canonical"\\s+href="https:\\/\\/newzora-pied\\.vercel\\.app\\/category\\/${cat}\\.html">`));
      assert.match(html, /CollectionPage/);
      assert.match(html, /BreadcrumbList/);
      const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(ldMatch, `category/${cat}.html must have JSON-LD script`);
      assert.doesNotThrow(() => JSON.parse(ldMatch[1]), `category/${cat}.html JSON-LD must be valid JSON`);
    }
  });

  test('Article pages have clean metadata, max-image-preview:large, and schema rich snippets', () => {
    const postDir = path.join(DIST, 'post');
    const files = fs.readdirSync(postDir).filter(f => f.endsWith('.html'));
    assert.ok(files.length > 0, 'articles must exist');

    for (const file of files) {
      const sample = fs.readFileSync(path.join(postDir, file), 'utf8');

      // Discover & SERP large preview directive
      assert.match(sample, /name="robots"\s+content="[^"]*max-image-preview:large[^"]*"/);

      // No raw newlines in meta description and proper length
      const descMatch = sample.match(/<meta\s+name="description"\s+content="([^"]*)"/);
      assert.ok(descMatch, `meta description must be present in ${file}`);
      assert.ok(!descMatch[1].includes('\n'), `meta description must not contain raw newlines in ${file}`);
      assert.ok(descMatch[1].length <= 165, `meta description must be concisely bounded <= 165 chars in ${file}`);

      // OpenGraph & Twitter tags
      assert.match(sample, /property="og:site_name"\s+content="Newzora"/);
      assert.match(sample, /name="twitter:site"\s+content="@new_zora"/);
      assert.match(sample, /name="twitter:creator"\s+content="@new_zora"/);

      // Schema.org NewsArticle enhanced fields
      assert.match(sample, /"inLanguage":\s*"en-US"/);
      assert.match(sample, /"isAccessibleForFree":\s*"True"/);
      assert.match(sample, /"articleSection"/);

      // Validate JSON-LD syntax
      const ldMatch = sample.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(ldMatch, `${file} must have JSON-LD script`);
      assert.doesNotThrow(() => JSON.parse(ldMatch[1]), `${file} JSON-LD must be valid JSON`);

      // Image Core Web Vitals & dimensions
      assert.match(sample, /fetchpriority="high"/);
      assert.match(sample, /width="1200"/);
      assert.match(sample, /height="675"/);
    }
  });

  test('Vercel configuration includes cleanUrls and caching headers', () => {
    const vercelConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
    assert.equal(vercelConfig.cleanUrls, true, 'cleanUrls should be enabled');
    assert.ok(Array.isArray(vercelConfig.headers), 'caching and security headers should be configured');
  });

  test('Homepage JSON-LD parses and contains WebSite and NewsMediaOrganization', () => {
    const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
    const ldMatch = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(ldMatch, 'index.html must have JSON-LD script');
    const parsed = JSON.parse(ldMatch[1]);
    assert.ok(parsed['@graph'], '@graph should exist in home LD');
    const types = parsed['@graph'].map(item => item['@type']);
    assert.ok(types.includes('NewsMediaOrganization'), 'NewsMediaOrganization schema must be present');
    assert.ok(types.includes('WebSite'), 'WebSite schema must be present');
  });

  test('Google Search Console HTML verification file exists in dist and meta tag is in head', () => {
    const verifyFile = path.join(DIST, 'google64f3ab4c81877d0d.html');
    assert.ok(fs.existsSync(verifyFile), 'google64f3ab4c81877d0d.html must be copied to dist');
    const content = fs.readFileSync(verifyFile, 'utf8');
    assert.match(content, /google-site-verification:\s*google64f3ab4c81877d0d\.html/);

    const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
    assert.match(indexHtml, /<meta\s+name="google-site-verification"\s+content="google64f3ab4c81877d0d"/);
  });

});

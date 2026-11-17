const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const read = f => fs.readFileSync(path.join(DIST, f), 'utf8');

describe('Newzora Phase 2b — full 4:5 posters, story-nav overflow fix', () => {

  test('Posters display at their native 4:5 ratio, never cropped 16:9', () => {
    const home = read('index.html');
    // Hero image wrapper, card thumbnails and the article poster all show
    // the full 1408x1760 poster. No 16:9 / 16:10 crop may remain on them.
    for (const sel of ['.lead-img-wrap', '.card-img-wrap', '.poster']) {
      const m = home.match(new RegExp(sel.replace('.', '\\.') + '\\s*\\{[^}]*aspect-ratio:\\s*4\\s*/\\s*5'));
      assert.ok(m, `${sel} must use aspect-ratio 4 / 5`);
    }
    assert.ok(!/\.lead-img-wrap\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/.test(home),
      'hero must not keep the 16:9 crop');
    assert.ok(!/\.poster\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/.test(home),
      'article poster must not keep the 16:9 crop');
    assert.ok(!/\.card-img-wrap\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*10/.test(home),
      'card thumbnails must not keep the 16:10 crop');
  });

  test('Story navigation cannot blow out its grid column', () => {
    const home = read('index.html');
    assert.ok(/\.pnav-link\s*\{[^}]*min-width:\s*0/.test(home),
      '.pnav-link needs min-width: 0 so a long title cannot widen the grid');
    assert.ok(/\.pnav-title\s*\{[^}]*overflow-wrap:\s*break-word/.test(home),
      '.pnav-title needs overflow-wrap: break-word');
    assert.ok(/\.pnav-label\s*\{[^}]*min-width:\s*0/.test(home),
      '.pnav-label needs min-width: 0');
  });

  test('Header nav rules are scoped so they cannot leak into story nav or breadcrumbs', () => {
    const home = read('index.html');
    // The bare `nav a` rule forced white-space: nowrap (and overflow-x: auto)
    // onto every <nav>, which clipped story-nav titles to one line.
    assert.ok(/\.hwrap nav a\s*\{[^}]*white-space:\s*nowrap/.test(home),
      'header nav links keep nowrap, scoped to .hwrap nav');
    assert.ok(!/(^|[}\n])nav a\s*\{/.test(home),
      'no bare `nav a` rule may remain to leak nowrap into other navs');
    assert.ok(!/(^|[}\n])nav\s*\{[^}]*overflow-x:\s*auto/.test(home),
      'no bare `nav` rule may remain to clip .post-nav horizontally');
    assert.ok(/\.dispatch-rail\s*\{[^}]*align-self:\s*start/.test(home),
      'dispatch rail must not stretch to the tall 4:5 hero height');
  });

});

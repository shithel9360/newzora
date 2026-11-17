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

});

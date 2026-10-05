import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
const base = '/warhammer-vault/';
const index = readFileSync('dist/index.html', 'utf8'), fallback = readFileSync('dist/404.html', 'utf8');
const script = html => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
for (const route of ['units/wh_main_brt_inf_men_at_arms', 'calculator?unit=a%2Fb&x=a%26b#result', 'compare?left=a&right=b', 'units?q=성배&filter=evidence', 'notes', 'factions/bretonnia', 'lords/alberic']) {
  const original = new URL(base + route, 'https://example.github.io');
  let redirect;
  vm.runInNewContext(script(fallback), { location: { pathname: original.pathname, search: original.search, hash: original.hash, replace: url => { redirect = url; } } });
  const root = new URL(redirect, original.origin);
  let restored;
  vm.runInNewContext(script(index), { URL, URLSearchParams, location: root, history: { replaceState: (_, __, url) => { restored = url; } } });
  assert.equal(restored, original.pathname + original.search + original.hash);
}
let escaped = false;
vm.runInNewContext(script(index), { URL, URLSearchParams, location: new URL('https://example.github.io/warhammer-vault/?__vault_route=../../other'), history: { replaceState: () => { escaped = true; } } });
assert.equal(escaped, false);
for (const [, asset] of index.matchAll(/(?:src|href)="(\/warhammer-vault\/[^"?#]+)"/g)) assert(existsSync('dist/' + asset.slice(base.length)), `Missing built asset: ${asset}`);
assert(index.includes('/warhammer-vault/assets/'));
assert(!index.includes('%BASE_URL%'));
console.log('PASS Pages: 7 route/query/hash roundtrips; bounded same-origin restoration; built assets present.');

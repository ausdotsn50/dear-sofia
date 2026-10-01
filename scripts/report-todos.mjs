// Lists every missing business detail and unconfirmed price before launch.
// Run with `npm run todos`. Needs Node 22.18+ to import site.ts directly.
import { readFileSync } from 'node:fs';
import { site } from '../src/data/site.ts';

const root = new URL('../', import.meta.url);
const siteSource = readFileSync(new URL('src/data/site.ts', root), 'utf8');
const menu = JSON.parse(readFileSync(new URL('src/data/menu.json', root), 'utf8'));

// Map each key in site.ts to the hint in its TODO comment (same line or the line above).
const hints = new Map();
let pendingHint = null;
for (const line of siteSource.split('\n')) {
  const comment = line.match(/\/\/\s*TODO[:,]?\s*(.*)$/);
  const key = line.match(/^\s*(\w+):/);
  if (key) {
    const hint = comment ? comment[1] : pendingHint;
    if (hint !== null) hints.set(key[1], hint.trim());
    pendingHint = null;
  } else if (comment) {
    pendingHint = comment[1];
  }
}

function findNulls(value, path = []) {
  if (value === null) return [path.join('.')];
  if (typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([k, v]) => findNulls(v, [...path, k]));
}

const sections = [];
const hintFor = (path) => hints.get(path.split('.').at(-1)) ?? '';

const details = findNulls(site)
  .filter((path) => !(path === 'waitlist.endpoint' && !site.waitlist.enabled))
  .map((path) => [path, hintFor(path)]);
if (hints.has('url')) details.push(['url', `${hints.get('url')} (now ${site.url})`]);
sections.push(['Business details (src/data/site.ts)', details]);

const prices = [];
for (const category of menu.categories) {
  for (const item of category.items) {
    if (item.price === null) prices.push([item.name, category.name]);
  }
}
for (const extra of menu.extras) {
  if (extra.price === null) prices.push([extra.name, 'Extras']);
}
sections.push(['Prices to confirm (src/data/menu.json)', prices]);

const photos = menu.categories
  .flatMap((c) => c.items)
  .filter((item) => item.photo && item.photoConfirmed === false)
  .map((item) => [item.photo, `shown as ${item.name}`]);
sections.push(['Photo matches to confirm (src/data/menu.json)', photos]);

const blocked = [];
if (site.messenger.page === null) {
  blocked.push(['Send note on Messenger', 'hidden; the note offers Copy note only']);
  blocked.push(['Message us buttons', 'hidden']);
  blocked.push(['Order links without JavaScript', 'hidden, so drinks are not orderable with JS off']);
}
if (site.address.mapsUrl === null) blocked.push(['Get directions', 'hidden']);
sections.push(['Hidden until the details above are set', blocked]);

sections.push([
  'Also confirm (not in the data)',
  [
    ['Coffee prices', 'still match the soft-opening menu card'],
    ['Payment methods', 'the site only says "payment details" for now'],
    ['@kapestetik', 'permission to use their photo'],
    ['Logo', 'a real Dear Sofia logo to replace the seal placeholder'],
  ],
]);

let open = 0;
console.log('\nDear Sofia: open items before launch\n');
for (const [title, rows] of sections) {
  if (rows.length === 0) continue;
  console.log(title);
  const width = Math.max(...rows.map(([a]) => a.length));
  for (const [a, b] of rows) console.log(`  - ${a.padEnd(width)}  ${b}`.trimEnd());
  console.log('');
  if (!title.startsWith('Hidden')) open += rows.length;
}
console.log(`${open} open items.\n`);

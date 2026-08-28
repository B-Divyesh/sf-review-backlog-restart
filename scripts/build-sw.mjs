import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { isPrecacheAsset } from './precache-assets.mjs';

const root = new URL('../dist/', import.meta.url);
async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(path.pathname, entry.name);
    if (entry.isDirectory()) files.push(...await walk(new URL(`file://${full}/`)));
    else if (!['sw.js', '.DS_Store'].includes(entry.name)) files.push('/' + relative(root.pathname, full).replaceAll('\\', '/'));
  }
  return files;
}
const assets = (await walk(root)).filter(isPrecacheAsset);
const source = await readFile(new URL('../src/sw-template.js', import.meta.url), 'utf8');
const version = Date.now().toString(36);
await writeFile(new URL('sw.js', root), source.replace('__VERSION__', version).replace('__ASSETS__', JSON.stringify(assets)));
console.log(`service worker ${version}: ${assets.length} files precached`);

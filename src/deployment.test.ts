import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('../', import.meta.url);
const headers = readFileSync(new URL('public/_headers', root), 'utf8');

describe('static deployment response policy', () => {
  it('keeps hashed assets immutable while allowing the service worker to update', () => {
    expect(headers).toContain('/assets/*\n  Cache-Control: public, max-age=31536000, immutable');
    expect(headers).toContain('/sw.js\n  Cache-Control: no-cache');
  });

  it('serves an installable manifest and restrictive browser policies', () => {
    expect(headers).toContain('/manifest.webmanifest\n  Cache-Control: no-cache\n  Content-Type: application/manifest+json; charset=utf-8');
    expect(headers).toContain("worker-src 'self'");
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).toContain('Permissions-Policy:');
    expect(headers).toContain('X-Frame-Options: DENY');
  });

  it('does not need an unsafe inline-style CSP exception', () => {
    const offlinePage = readFileSync(new URL('offline.html', root), 'utf8');
    const appSource = readFileSync(new URL('src/main.ts', root), 'utf8');
    expect(headers).toContain("style-src 'self'");
    expect(offlinePage).not.toMatch(/<style|style=/i);
    expect(appSource).not.toContain('style="');
  });
});

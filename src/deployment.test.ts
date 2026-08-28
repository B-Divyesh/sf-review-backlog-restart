import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const { isPrecacheAsset } = await import(new URL('../scripts/precache-assets.mjs', import.meta.url).href) as {
  isPrecacheAsset: (assetPath: string) => boolean;
};

const root = new URL('../', import.meta.url);
const headers = readFileSync(new URL('public/_headers', root), 'utf8');
const staticWebAppConfig = JSON.parse(readFileSync(new URL('public/staticwebapp.config.json', root), 'utf8')) as {
  globalHeaders: Record<string, string>;
  routes: Array<{ route: string; headers: Record<string, string> }>;
  mimeTypes: Record<string, string>;
};

function routeHeaders(route: string): Record<string, string> {
  const match = staticWebAppConfig.routes.find((entry) => entry.route === route);
  if (!match) throw new Error(`Missing static-host route policy for ${route}`);
  return match.headers;
}

describe('static deployment response policy', () => {
  it('excludes deployment-only configuration from the browser precache', () => {
    expect(isPrecacheAsset('/staticwebapp.config.json')).toBe(false);
    expect(isPrecacheAsset('/_headers')).toBe(false);
    expect(isPrecacheAsset('/assets/main-abc123.js')).toBe(true);
    expect(isPrecacheAsset('/manifest.webmanifest')).toBe(true);
  });

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

  it('maps the portable response policy to the Azure Static Web Apps deployment configuration', () => {
    expect(routeHeaders('/assets/*')['Cache-Control']).toBe('public, max-age=31536000, immutable');
    expect(routeHeaders('/sw.js')['Cache-Control']).toBe('no-cache');
    expect(routeHeaders('/manifest.webmanifest')['Cache-Control']).toBe('no-cache');
    expect(staticWebAppConfig.mimeTypes['.webmanifest']).toBe('application/manifest+json; charset=utf-8');
    expect(staticWebAppConfig.globalHeaders['Content-Security-Policy']).toContain("worker-src 'self'");
    expect(staticWebAppConfig.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(staticWebAppConfig.globalHeaders['Permissions-Policy']).toContain('camera=()');
    expect(staticWebAppConfig.globalHeaders['X-Frame-Options']).toBe('DENY');
  });
});

// Azure Static Web Apps consumes these files as deployment configuration rather
// than publishing them. They must never be part of the browser cache manifest.
const DEPLOYMENT_ONLY_ASSETS = new Set(['/_headers', '/staticwebapp.config.json']);

export function isPrecacheAsset(assetPath) {
  return !DEPLOYMENT_ONLY_ASSETS.has(assetPath);
}

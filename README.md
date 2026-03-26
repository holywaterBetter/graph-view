# Graph View

Minimal React 18 + Vite setup configured for GitHub Pages.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## GitHub Pages deployment

Deployment is automated with GitHub Actions on every push to `main`:

1. Install dependencies with `npm ci`
2. Build the app with `npm run build`
3. Upload `dist/` as a Pages artifact
4. Deploy with official GitHub Pages actions

The Vite `base` is set to `/graph-view/`, so assets resolve correctly when served from the repository subpath.

Expected URL format:

`https://<YOUR_GITHUB_USERNAME>.github.io/graph-view/`

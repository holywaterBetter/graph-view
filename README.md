# Graph View

Production-style React 18 + TypeScript feature that recreates an Obsidian-inspired force-directed graph for enterprise skill mapping.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Skill Graph Feature Usage

### Installed libraries

- `react-force-graph-2d`
- `d3-force` (peer for simulation tuning)

### Feature entry

`src/App.tsx` mounts `SkillGraphView`.

```tsx
import SkillGraphView from './features/skill-graph/SkillGraphView';

const App = () => <SkillGraphView />;
```

### Folder overview

```text
src/features/skill-graph/
  SkillGraphView.tsx
  SkillGraphView.css
  constants/graphConfig.ts
  data/mockSkillGraphData.ts
  hooks/useSkillGraphData.ts
  types/graph.ts
  utils/graphUtils.ts
```

### Implemented behavior

- Force simulation with tuned charge/link/decay parameters.
- Smooth zoom and pan with zoom bounds.
- Hover and selected-node neighborhood highlighting.
- Dimming of unrelated nodes and links.
- Label rendering only when needed (hover/selected/high zoom).
- Local mock expansion flow to simulate lazy graph neighborhood loading.
- Position-preserving graph merge strategy to avoid jarring full resets.

### Integration notes for enterprise apps

1. Replace `mockSkillGraphData.ts` with API-backed graph seed and expansion endpoints.
2. Keep `useSkillGraphData` as the data/orchestration layer for caching and merging.
3. Extend side panel with rich metadata/permissions-aware detail rendering.
4. Add filter/search state and pass into hook utilities for progressive reveal.

## GitHub Pages deployment

Deployment is automated with GitHub Actions on every push to `main`:

1. Install dependencies with `npm ci`
2. Build the app with `npm run build`
3. Upload `dist/` as a Pages artifact
4. Deploy with official GitHub Pages actions

The Vite `base` is set to `/graph-view/`, so assets resolve correctly when served from the repository subpath.

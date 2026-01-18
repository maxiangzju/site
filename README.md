# Xiang's Island

A personal website built with **Astro** and **Tailwind CSS**, featuring an ocean-themed design with WebGL animations.

## Features

- **Blog** - Markdown/MDX posts with content collections
- **Game** - Canvas-based web game with pluggable engine architecture
- **Tools** - Online developer utilities (coming soon)
- **Algo-Viz** - LeetCode-style algorithm visualizations (coming soon)
- **Ocean Theme** - Dark navy color scheme with WebGL wave animations

## Current Status

- ✅ Blue ocean themed design with dark navy background
- ✅ WebGL animated header/footer (beach wave effect)
- ✅ View Transitions for seamless navigation
- ✅ Optimized page transitions (WebGL persists across navigation via `astro:page-load`)
- ✅ Wave animation - one-way ocean waves flowing toward shore

## Project Structure

```
site/
├── src/
│   ├── components/
│   │   ├── layout/BaseLayout.astro    # Navigation + footer + View Transitions
│   │   ├── MetaballHeader.astro       # WebGL wave header canvas
│   │   ├── MetaballFooter.astro       # WebGL wave footer canvas
│   │   └── game/
│   │       ├── GameCanvas.astro       # Game wrapper component
│   │       └── engines/               # Pluggable game engines
│   │           ├── types.ts           # GameEngine interface
│   │           ├── canvas2d.ts        # 2D Canvas renderer
│   │           └── three.ts           # Three.js placeholder
│   ├── content/
│   │   └── blog/                      # Blog posts (markdown/MDX)
│   ├── pages/
│   │   ├── index.astro                # Home page
│   │   ├── blog/                      # Blog listing + posts
│   │   ├── game.astro                 # Game page
│   │   ├── tools/                     # Tools section
│   │   └── algo-viz/                  # Algorithm visualizations
│   └── styles/
│       └── global.css                 # Tailwind + CSS variables
├── public/
│   └── metaball-animation.js          # WebGL beach wave shader
├── astro.config.mjs
└── package.json
```

## Commands

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Start dev server at `localhost:4321`        |
| `npm run build`   | Build for production to `./dist/`           |
| `npm run preview` | Preview production build locally            |

## Deployment

Deployed on **Cloudflare Pages** with GitHub integration. Auto-deploys on push to `main` branch.

- **Primary**: [xiangma.us](https://xiangma.us)
- **Fallback**: [site-evx.pages.dev](https://site-evx.pages.dev)

## Game Engine Architecture

The game uses a pluggable engine interface for easy renderer swapping:

```typescript
interface GameEngine {
  init(canvas: HTMLCanvasElement): void;
  start(): void;
  stop(): void;
  resize(width: number, height: number): void;
  dispose(): void;
}
```

Currently implements `Canvas2DEngine` with a placeholder for `ThreeJSEngine`.

## Adding Blog Posts

Create a new `.md` file in `src/content/blog/`:

```markdown
---
title: My Post Title
description: A brief description
pubDate: 2024-01-20
tags: [tag1, tag2]
---

Your content here...
```

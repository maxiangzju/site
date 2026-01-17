---
title: Getting Started with Astro
description: A quick guide to building fast websites with Astro.
pubDate: 2024-01-20
tags: [astro, tutorial, web-dev]
---

# Getting Started with Astro

Astro is a modern web framework that focuses on content-driven websites. It's perfect for blogs, marketing sites, and portfolios.

## Why Astro?

1. **Fast by Default**: Ships zero JavaScript by default
2. **Content Collections**: Built-in support for markdown and MDX
3. **Island Architecture**: Partial hydration for interactive components
4. **Framework Agnostic**: Use React, Vue, Svelte, or vanilla JS

## Creating Your First Page

Pages in Astro are simple `.astro` files in the `src/pages` directory:

```astro
---
// Component script (runs at build time)
const title = "My Page";
---

<html>
  <head>
    <title>{title}</title>
  </head>
  <body>
    <h1>{title}</h1>
  </body>
</html>
```

## Next Steps

Check out the [Astro documentation](https://docs.astro.build) to learn more!

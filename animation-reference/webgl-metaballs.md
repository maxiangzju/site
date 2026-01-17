# WebGL Metaball Header Animation

Reference implementation from [lucumr.pocoo.org](https://lucumr.pocoo.org/) (Armin Ronacher's blog).

## Overview

This animation creates organic, fluid blob shapes using WebGL metaballs. The blobs merge smoothly when they approach each other, creating a lava lamp-like effect.

## Architecture

```
┌─────────────────────────────────────────┐
│  .header-image (container)              │
│  ┌───────────────────────────────────┐  │
│  │  <canvas id="header-canvas">      │  │
│  │  WebGL context renders metaballs  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Key Components

### 1. HTML Structure

```html
<div class="header-image">
  <canvas id="header-canvas"></canvas>
</div>
```

### 2. CSS

```css
.header-image {
  position: relative;
  width: 100%;
  height: 150px;
  overflow: hidden;
}

.header-image canvas {
  width: 100%;
  height: 100%;
  display: block;
}

@media only screen and (max-width: 800px) {
  .header-image {
    height: 100px;
  }
}
```

## Core Algorithms

### Metaball Field Function

Metaballs work by summing smooth falloff values from multiple blob centers. When blobs get close, their fields add up and create smooth merging.

```glsl
// Polynomial falloff formula: (1 - r²)³
// r = distance from blob center (normalized)
// This creates soft edges that blend when overlapping

float influence = max(0.0, 1.0 - r2);  // r2 = r squared
float contrib = influence * influence * influence;
sum += contrib;
```

The final color is determined by thresholding this summed field value.

### Value Noise (Cheap Alternative to Simplex)

Used for warping coordinates and creating the wavy boundary:

```glsl
// Hash function - pseudo-random based on position
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Value noise with Hermite interpolation
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);  // Smooth interpolation
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  ) * 2.0 - 1.0;
}
```

### Coordinate Warping

Creates fluid motion without expensive noise calculations:

```glsl
vec2 warpCoords(vec2 p, float time) {
  float warp1 = vnoise(p * 0.5 + time * 0.05);
  float warp2 = vnoise(p * 0.3 - time * 0.03 + 100.0);
  return p + vec2(warp1, warp2) * 0.4;
}
```

## Visual Layers

The effect uses two blob layers for depth:

| Layer | Scale | Speed | Color | Purpose |
|-------|-------|-------|-------|---------|
| Bottom | 0.7x | Slow | Darker blue | Background depth |
| Top | 1.0x | Fast | Brighter blue | Foreground detail |

## Wave Boundary

Blobs "pool against" an animated wavy edge at the bottom:

```glsl
float boundary = baseHeight;
boundary += vnoise(vec2(xCoord * 0.008, u_time * 0.08)) * waveAmplitude;
boundary += vnoise(vec2(xCoord * 0.02, u_time * 0.04 + 50.0)) * waveAmplitude * 0.4;
```

## Color Scheme

Wind Waker-inspired palette with dark mode support:

### Light Mode
| Element | RGB | Hex |
|---------|-----|-----|
| Bright blob | (0.10, 0.42, 0.70) | #1a6bb3 |
| Dark blob | (0.04, 0.22, 0.44) | #0a3870 |
| Background | (1.0, 1.0, 1.0) | #ffffff |
| Accent (hover) | (0.804, 0.055, 0.055) | #cd0e0e |

### Dark Mode
| Element | RGB | Hex |
|---------|-----|-----|
| Bright blob | (0.32, 0.55, 0.82) | #528cd1 |
| Dark blob | (0.12, 0.24, 0.40) | #1f3d66 |
| Background | (0.106, 0.192, 0.337) | #1b3156 |
| Accent (hover) | (1.0, 0.4, 0.4) | #ff6666 |

## Hover Interaction

On mouse hover over the header:
1. ~8% of blobs become "accent" colored (red)
2. Blobs fade in with staggered delays (0-2 seconds)
3. Full animation completes in 2.65 seconds
4. Linear interpolation for smooth transitions

```glsl
// Determine if blob is accent (~8% chance)
float isAccent = step(0.92, hash(cellId + 0.5));

// Staggered delay per blob
float blobDelay = hash(cellId + 0.7) * 0.75;
float blobVisible = smoothstep(blobDelay, blobDelay + 0.25, u_hover);
```

## Performance Optimizations

1. **Frame Rate Cap**: ~30fps via `FRAME_INTERVAL = 33ms`
2. **Visibility Detection**: `IntersectionObserver` skips rendering for off-screen canvases
3. **Page Visibility API**: Pauses animation when tab is hidden
4. **Supersampling**: 1.5x resolution on low-DPI screens for smoother edges
5. **DPI Monitoring**: Handles monitor changes (e.g., dragging window between displays)

```javascript
// Skip rendering if page hidden or canvas not visible
if (!isPageVisible || visibleCanvases.size === 0) {
  requestAnimationFrame(render);
  return;
}

// Frame throttling
if (timestamp - lastFrameTime < FRAME_INTERVAL) {
  requestAnimationFrame(render);
  return;
}
```

## Shader Uniforms

| Uniform | Type | Description |
|---------|------|-------------|
| `u_resolution` | vec2 | Canvas dimensions in pixels |
| `u_time` | float | Elapsed time in seconds |
| `u_isDark` | float | 0.0 = light mode, 1.0 = dark mode |
| `u_fadeTop` | float | 0.0 = bottom fade, 1.0 = top fade (for footer) |
| `u_dpr` | float | Device pixel ratio (for scaling) |
| `u_hover` | float | Hover animation progress (0.0 to 1.0) |

## Implementation Checklist

- [ ] Create canvas element with container div
- [ ] Initialize WebGL context with `antialias: true`
- [ ] Compile vertex and fragment shaders
- [ ] Set up full-screen quad geometry (-1 to 1 coordinates)
- [ ] Configure uniforms for resolution, time, theme
- [ ] Implement resize handler with DPI awareness
- [ ] Add IntersectionObserver for visibility tracking
- [ ] Add hover event listeners for accent color effect
- [ ] Start animation loop with requestAnimationFrame

## Files

- `metaball-animation.js` - Complete JavaScript implementation
- `metaball-animation.css` - Required CSS styles

## Browser Support

- Requires WebGL 1.0 (supported in all modern browsers)
- Gracefully degrades if WebGL unavailable (canvas remains empty)
- Uses `matchMedia` for system dark mode detection
- Supports `data-theme` attribute for manual theme control

/**
 * WebGL Metaball Animation
 *
 * Creates organic, fluid blob shapes that merge smoothly.
 * Reference: https://lucumr.pocoo.org/
 *
 * Usage:
 *   1. Add <canvas id="header-canvas"></canvas> inside a container
 *   2. Include this script
 *   3. Animation starts automatically on DOMContentLoaded
 */
(function() {
  const FRAME_INTERVAL = 33; // ~30fps
  let initialized = false;
  let isPageVisible = true;
  let visibleCanvases = new Set();

  // Vertex Shader - Simple passthrough for full-screen quad
  const vsSource = `
    attribute vec2 a_position;
    varying vec2 v_position;
    void main() {
      gl_Position = vec4(a_position, 0, 1);
      v_position = a_position;
    }
  `;

  // Fragment Shader - Metaball rendering
  const fsSource = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_isDark;
    uniform float u_fadeTop;
    uniform float u_dpr;
    uniform float u_hover;
    varying vec2 v_position;

    // Cheap hash - single multiply-add chain for pseudo-random values
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    vec2 hash2(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return fract(sin(p) * 43758.5453);
    }

    // Simple value noise - much cheaper than simplex
    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);  // Hermite interpolation
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
      ) * 2.0 - 1.0;
    }

    // Metaball field - sums smooth falloff from nearby blob centers
    // When blobs approach, their fields add up and merge organically
    // Returns vec2(field, accentWeight) where accentWeight is 0-1 based on accent blob contribution
    vec2 metaball(vec2 p, float time) {
      vec2 i = floor(p);
      vec2 f = fract(p);

      float sum = 0.0;
      float accentSum = 0.0;

      // Check 3x3 neighborhood for blob centers
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 neighbor = vec2(float(x), float(y));
          vec2 cellId = i + neighbor;

          // Animated blob position within cell
          vec2 point = hash2(cellId);
          point = 0.5 + 0.4 * sin(time * 0.3 + 6.28 * point);

          vec2 diff = neighbor + point - f;
          float r2 = dot(diff, diff);

          // Smooth polynomial falloff: (1 - r^2)^3 for r^2 < 1, else 0
          // This creates soft edges that blend when overlapping
          float influence = max(0.0, 1.0 - r2);
          float contrib = influence * influence * influence;
          sum += contrib;

          // Check if this blob is an accent blob (~8% chance based on cell)
          float isAccent = step(0.92, hash(cellId + 0.5));
          // Random delay for staggered fade-in (0 to 0.75 of the 0-1 range = 0-2s of 2.65s total)
          float blobDelay = hash(cellId + 0.7) * 0.75;
          // Blob visibility based on hover progress and delay
          float blobVisible = smoothstep(blobDelay, blobDelay + 0.25, u_hover);
          accentSum += contrib * isAccent * blobVisible;
        }
      }

      // Normalize accent weight by total contribution
      float accentWeight = sum > 0.0 ? accentSum / sum : 0.0;
      return vec2(sum, accentWeight);
    }

    // Cheap warping using value noise for fluid motion
    vec2 warpCoords(vec2 p, float time) {
      float warp1 = vnoise(p * 0.5 + time * 0.05);
      float warp2 = vnoise(p * 0.3 - time * 0.03 + 100.0);
      return p + vec2(warp1, warp2) * 0.4;
    }

    void main() {
      float scale = 0.0133;
      vec2 p = gl_FragCoord.xy * scale;

      // Wind Waker-inspired color palette
      // Light mode colors
      vec3 lightBright = vec3(0.10, 0.42, 0.70);   // #1a6bb3
      vec3 lightDark = vec3(0.04, 0.22, 0.44);     // #0a3870
      vec3 lightPageBg = vec3(1.0, 1.0, 1.0);      // #ffffff

      // Dark mode colors
      vec3 darkBright = vec3(0.32, 0.55, 0.82);    // #528cd1
      vec3 darkDark = vec3(0.12, 0.24, 0.40);      // #1f3d66
      vec3 darkPageBg = vec3(0.106, 0.192, 0.337); // #1b3156

      // Hover accent colors (red)
      vec3 lightAccent = vec3(0.804, 0.055, 0.055);  // #cd0e0e
      vec3 darkAccent = vec3(1.0, 0.4, 0.4);         // #ff6666

      // Interpolate colors based on dark mode
      vec3 bright = mix(lightBright, darkBright, u_isDark);
      vec3 dark = mix(lightDark, darkDark, u_isDark);
      vec3 pageBg = mix(lightPageBg, darkPageBg, u_isDark);
      vec3 accent = mix(lightAccent, darkAccent, u_isDark);

      // Calculate wavy boundary that blobs pool against
      float baseHeight = 50.0 * u_dpr;
      float waveAmplitude = 25.0 * u_dpr;
      float xCoord = gl_FragCoord.x / u_dpr;
      float boundary = baseHeight;
      boundary += vnoise(vec2(xCoord * 0.008, u_time * 0.08)) * waveAmplitude;
      boundary += vnoise(vec2(xCoord * 0.02, u_time * 0.04 + 50.0)) * waveAmplitude * 0.4;

      // Distance to boundary (flip for footer canvas)
      float pixelY = mix(gl_FragCoord.y, u_resolution.y - gl_FragCoord.y, u_fadeTop);
      float distToBoundary = pixelY - boundary;

      // Wall influence - blobs pool against the boundary
      float wallRange = 40.0 * u_dpr;
      float wallInfluence = smoothstep(wallRange, 0.0, distToBoundary) * 0.25;

      // Bottom layer - darker, larger scale, slower movement
      vec2 p1 = p * 0.7 + vec2(u_time * 0.02, u_time * 0.015);
      vec2 meta1 = metaball(warpCoords(p1, u_time * 0.6), u_time * 0.6);
      float field1 = meta1.x + wallInfluence;
      float accent1 = meta1.y;

      // Top layer - brighter, smaller scale, faster movement
      vec2 p2 = p + vec2(u_time * 0.06, -u_time * 0.02);
      vec2 meta2 = metaball(warpCoords(p2 + 100.0, u_time), u_time);
      float field2 = meta2.x + wallInfluence;
      float accent2 = meta2.y;

      // Taper off fields below boundary (allows slight overhang)
      float taperRange = 30.0 * u_dpr;
      float taper = smoothstep(-taperRange, 0.0, distToBoundary);
      field1 *= taper;
      field2 *= taper;

      // Metaball thresholds - higher = smaller blobs, lower = more merging
      // Use smoothstep for ~0.5px anti-aliasing on low-DPI screens
      float aaWidth = 0.005 / max(u_dpr, 1.0);

      float blend1 = smoothstep(0.92 - aaWidth, 0.92 + aaWidth, field1);
      float blend2 = smoothstep(0.95 - aaWidth, 0.95 + aaWidth, field2);

      // Hard threshold for accent - blob is either accent or not
      float isAccent1 = step(0.5, accent1);
      float isAccent2 = step(0.5, accent2);

      // Blend accent color based on hover state
      vec3 dark1 = mix(dark, accent, isAccent1 * u_hover);
      vec3 bright2 = mix(bright, accent, isAccent2 * u_hover);

      // Composite layers
      vec3 color = mix(pageBg, dark1, blend1);
      color = mix(color, bright2, blend2);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  /**
   * Compile a WebGL shader
   */
  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /**
   * Detect dark mode from data-theme attribute or system preference
   */
  function getIsDark() {
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'dark') return 1.0;
    if (theme === 'light') return 0.0;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 1.0 : 0.0;
  }

  /**
   * Initialize WebGL effect for a canvas
   * @param {string} canvasId - ID of the canvas element
   * @param {boolean} fadeTop - If true, fade at top (for footer), else fade at bottom
   */
  function initWaterEffect(canvasId, fadeTop) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const gl = canvas.getContext('webgl', { antialias: true });
    if (!gl) {
      console.warn('WebGL not supported');
      return null;
    }

    // Compile shaders
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;

    // Link program
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return null;
    }

    gl.useProgram(program);

    // Set up full-screen quad geometry
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  // Bottom-left
       1, -1,  // Bottom-right
      -1,  1,  // Top-left
       1,  1   // Top-right
    ]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const isDarkLoc = gl.getUniformLocation(program, 'u_isDark');
    const fadeTopLoc = gl.getUniformLocation(program, 'u_fadeTop');
    const dprLoc = gl.getUniformLocation(program, 'u_dpr');
    const hoverLoc = gl.getUniformLocation(program, 'u_hover');

    // Set static uniforms
    gl.uniform1f(fadeTopLoc, fadeTop ? 1.0 : 0.0);

    return {
      canvas,
      gl,
      resolutionLoc,
      timeLoc,
      isDarkLoc,
      dprLoc,
      hoverLoc,
      hoverTarget: 0,
      hoverValue: 0,
      needsResize: true
    };
  }

  let effects = [];
  let startTime = performance.now();
  let lastFrameTime = 0;
  let currentDpr = window.devicePixelRatio;

  /**
   * Get effective DPI for rendering
   * Uses supersampling on low-DPI screens for smoother edges
   */
  function getEffectiveDpr() {
    const dpr = window.devicePixelRatio;
    return dpr <= 1 ? 1.5 : dpr;
  }

  /**
   * Main render loop
   */
  function render(timestamp) {
    // Skip rendering if page is hidden or no canvases are visible
    if (!isPageVisible || visibleCanvases.size === 0) {
      requestAnimationFrame(render);
      return;
    }

    // Frame rate limiting
    if (timestamp - lastFrameTime < FRAME_INTERVAL) {
      requestAnimationFrame(render);
      return;
    }
    lastFrameTime = timestamp;

    const elapsed = (performance.now() - startTime) / 1000.0;
    const isDark = getIsDark();

    // Detect DPI changes (e.g., moving window between monitors)
    const newDpr = window.devicePixelRatio;
    if (newDpr !== currentDpr) {
      currentDpr = newDpr;
      for (const effect of effects) {
        effect.needsResize = true;
      }
    }

    const effectiveDpr = getEffectiveDpr();
    const deltaTime = FRAME_INTERVAL / 1000.0;

    for (const effect of effects) {
      const { canvas, gl, resolutionLoc, timeLoc, isDarkLoc, dprLoc, hoverLoc } = effect;

      // Skip if this canvas is not visible
      if (!visibleCanvases.has(canvas)) continue;

      // Handle canvas resize
      if (effect.needsResize) {
        canvas.width = canvas.offsetWidth * effectiveDpr;
        canvas.height = canvas.offsetHeight * effectiveDpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
        effect.needsResize = false;
      }

      // Animate hover linearly (~2.65 second total for staggered blobs)
      const hoverSpeed = 1.0 / 2.65;
      if (effect.hoverTarget > effect.hoverValue) {
        effect.hoverValue = Math.min(effect.hoverTarget, effect.hoverValue + deltaTime * hoverSpeed);
      } else if (effect.hoverTarget < effect.hoverValue) {
        effect.hoverValue = Math.max(effect.hoverTarget, effect.hoverValue - deltaTime * hoverSpeed);
      }

      // Update uniforms and draw
      gl.uniform1f(timeLoc, elapsed);
      gl.uniform1f(isDarkLoc, isDark);
      gl.uniform1f(dprLoc, effectiveDpr);
      gl.uniform1f(hoverLoc, effect.hoverValue);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    requestAnimationFrame(render);
  }

  /**
   * Initialize the animation system
   */
  function init() {
    if (initialized) return;
    initialized = true;

    // Initialize effects for header and optional footer
    effects = [
      initWaterEffect('header-canvas', false),
      initWaterEffect('footer-canvas', true)
    ].filter(Boolean);

    if (effects.length === 0) return;

    // Set up hover listeners (each canvas has independent hover state)
    effects.forEach(function(effect) {
      const container = effect.canvas.parentElement;
      if (container) {
        container.addEventListener('mouseenter', function() {
          effect.hoverTarget = 1;
        });
        container.addEventListener('mouseleave', function() {
          effect.hoverTarget = 0;
        });
      }
    });

    // Track page visibility to pause when hidden
    document.addEventListener('visibilitychange', function() {
      isPageVisible = !document.hidden;
    });

    // Track canvas visibility with IntersectionObserver
    const observer = new IntersectionObserver(function(entries) {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          visibleCanvases.add(entry.target);
        } else {
          visibleCanvases.delete(entry.target);
        }
      }
    }, { threshold: 0 });

    for (const effect of effects) {
      observer.observe(effect.canvas);
    }

    // Handle window resize
    window.addEventListener('resize', function() {
      for (const effect of effects) {
        effect.needsResize = true;
      }
    });

    // Start render loop
    render(performance.now());
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

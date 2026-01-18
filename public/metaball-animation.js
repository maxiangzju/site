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

  // Fragment Shader - Ocean waves rushing to shore and receding
  const fsSource = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_isDark;
    uniform float u_fadeTop;
    uniform float u_dpr;
    uniform float u_hover;
    varying vec2 v_position;

    #define PI 3.14159265359

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
      );
    }

    // Fractal noise for foam texture
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
      for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
      }
      return v;
    }

    // Organic wave edge variation - more irregular
    float waveEdge(float x, float t, float seed) {
      float edge = 0.0;
      // Multiple overlapping sine waves at different frequencies
      edge += sin(x * 0.006 + t * 0.08 + seed) * 18.0;
      edge += sin(x * 0.015 + t * 0.05 + seed * 2.3) * 10.0;
      edge += sin(x * 0.028 + t * 0.12 + seed * 1.7) * 5.0;
      // Noise for irregularity
      edge += (noise(vec2(x * 0.01, t * 0.04 + seed)) - 0.5) * 20.0;
      edge += (noise(vec2(x * 0.025 + seed * 10.0, t * 0.06)) - 0.5) * 12.0;
      return edge;
    }

    void main() {
      vec2 px = gl_FragCoord.xy / u_dpr;
      float H = u_resolution.y / u_dpr;
      float y = mix(px.y, H - px.y, u_fadeTop);
      float x = px.x;
      float t = u_time;

      // Colors
      vec3 deepWater = mix(vec3(0.05, 0.30, 0.50), vec3(0.03, 0.18, 0.35), u_isDark);
      vec3 shallowWater = mix(vec3(0.15, 0.45, 0.60), vec3(0.08, 0.32, 0.48), u_isDark);
      vec3 foam = mix(vec3(0.92, 0.96, 1.0), vec3(0.80, 0.88, 0.94), u_isDark);
      vec3 foamTint = mix(vec3(0.70, 0.85, 0.92), vec3(0.50, 0.68, 0.78), u_isDark);
      vec3 bg = mix(vec3(1.0), vec3(0.106, 0.192, 0.337), u_isDark);

      // Zone definitions
      float shoreY = H * 0.08;      // Where waves fade out
      float oceanY = H * 0.90;      // Where waves originate
      float waveZone = H * 0.50;    // Mid zone

      // === ONE-WAY WAVES - continuously flowing toward shore ===
      // Multiple waves with different speeds and offsets
      float period1 = 10.0;
      float period2 = 14.0;
      float period3 = 8.0;

      // Continuous one-way progress (0 to 1, then reset)
      // Use sawtooth wave - smooth version with easing
      float raw1 = fract(t / period1);
      float raw2 = fract(t / period2 + 0.33);
      float raw3 = fract(t / period3 + 0.66);

      // Smooth easing for wave motion (slow start, steady middle, slow end)
      float wave1Progress = smoothstep(0.0, 0.15, raw1) * smoothstep(1.0, 0.85, raw1);
      float wave2Progress = smoothstep(0.0, 0.15, raw2) * smoothstep(1.0, 0.85, raw2);
      float wave3Progress = smoothstep(0.0, 0.15, raw3) * smoothstep(1.0, 0.85, raw3);

      // Wave position moves from ocean to shore (raw controls position)
      float pos1 = smoothstep(0.0, 1.0, raw1);  // 0=ocean, 1=shore
      float pos2 = smoothstep(0.0, 1.0, raw2);
      float pos3 = smoothstep(0.0, 1.0, raw3);

      // Wave edge positions - irregular
      float edge1 = waveEdge(x, t, 0.0);
      float edge2 = waveEdge(x, t, 7.0);
      float edge3 = waveEdge(x, t, 15.0);

      // Wave Y positions - moving from ocean toward shore
      float wave1Y = mix(oceanY, shoreY + edge1 * 0.5, pos1);
      float wave2Y = mix(oceanY + 20.0, shoreY + 15.0 + edge2 * 0.4, pos2);
      float wave3Y = mix(oceanY - 10.0, shoreY + 8.0 + edge3 * 0.3, pos3);

      // Fade waves out as they approach shore (and fade in from ocean)
      float fade1 = wave1Progress;
      float fade2 = wave2Progress;
      float fade3 = wave3Progress;

      // === WATER COVERAGE ===
      // Base water from all active waves
      float water1 = smoothstep(wave1Y - 10.0, wave1Y + 10.0, y) * fade1;
      float water2 = smoothstep(wave2Y - 8.0, wave2Y + 8.0, y) * fade2;
      float water3 = smoothstep(wave3Y - 8.0, wave3Y + 8.0, y) * fade3;

      // Combine waves
      float waterMask = max(max(water1, water2 * 0.7), water3 * 0.5);
      // Always water in deep ocean area
      waterMask = max(waterMask, smoothstep(waveZone, oceanY, y));

      // === FOAM ===
      // Waves get thinner as they approach shore (pos goes 0->1 from ocean to shore)
      float thinning1 = 1.0 - pos1 * 0.7;  // Shrinks to 30% at shore
      float thinning2 = 1.0 - pos2 * 0.7;
      float thinning3 = 1.0 - pos3 * 0.7;

      // Wave 1 foam
      float foamWidth1 = (15.0 + 5.0 * fade1) * thinning1;
      float foam1Y = wave1Y + fbm(vec2(x * 0.02, t * 0.05)) * 8.0 * thinning1;
      float mainFoam = smoothstep(foam1Y - foamWidth1, foam1Y - foamWidth1 * 0.1, y);
      mainFoam *= smoothstep(foam1Y + 6.0 * thinning1, foam1Y - 3.0, y);
      mainFoam *= fade1;

      // Wave 2 foam
      float foamWidth2 = (12.0 + 4.0 * fade2) * thinning2;
      float foam2Y = wave2Y + fbm(vec2(x * 0.025 + 30.0, t * 0.04)) * 7.0 * thinning2;
      float secondFoam = smoothstep(foam2Y - foamWidth2, foam2Y - foamWidth2 * 0.1, y);
      secondFoam *= smoothstep(foam2Y + 5.0 * thinning2, foam2Y - 2.5, y);
      secondFoam *= fade2 * 0.8;

      // Wave 3 foam
      float foamWidth3 = (10.0 + 3.0 * fade3) * thinning3;
      float foam3Y = wave3Y + fbm(vec2(x * 0.022 + 60.0, t * 0.045)) * 6.0 * thinning3;
      float thirdFoam = smoothstep(foam3Y - foamWidth3, foam3Y - foamWidth3 * 0.1, y);
      thirdFoam *= smoothstep(foam3Y + 4.0 * thinning3, foam3Y - 2.0, y);
      thirdFoam *= fade3 * 0.6;

      // Foam texture
      float foamTex = fbm(vec2(x * 0.05, y * 0.05 - t * 0.03));
      mainFoam *= 0.5 + foamTex * 0.6;
      secondFoam *= 0.4 + foamTex * 0.6;
      thirdFoam *= 0.4 + foamTex * 0.6;

      // Scattered foam in deep water - subtle constant texture
      float scatter = fbm(vec2(x * 0.03, y * 0.025 - t * 0.02));
      scatter = smoothstep(0.62, 0.82, scatter) * smoothstep(waveZone, oceanY, y) * 0.12;

      // Combine foam
      float totalFoam = max(max(mainFoam, secondFoam), thirdFoam);
      totalFoam = max(totalFoam, scatter);

      // Bright edge at each wave front - also thins near shore
      float sharpEdge1 = smoothstep(foam1Y + 3.0 * thinning1, foam1Y - 1.5, y) *
                         smoothstep(foam1Y - 8.0 * thinning1, foam1Y + 0.5, y) * fade1 * thinning1;
      float sharpEdge2 = smoothstep(foam2Y + 2.5 * thinning2, foam2Y - 1.2, y) *
                         smoothstep(foam2Y - 6.0 * thinning2, foam2Y + 0.4, y) * fade2 * thinning2 * 0.7;
      float sharpEdge3 = smoothstep(foam3Y + 2.0 * thinning3, foam3Y - 1.0, y) *
                         smoothstep(foam3Y - 5.0 * thinning3, foam3Y + 0.3, y) * fade3 * thinning3 * 0.5;
      float sharpEdge = max(max(sharpEdge1, sharpEdge2), sharpEdge3);

      // === WATER COLOR ===
      float depth = smoothstep(waveZone, oceanY, y);
      vec3 waterCol = mix(shallowWater, deepWater, depth);

      // === COMPOSITE ===
      vec3 col = bg;

      // Water
      col = mix(col, waterCol, waterMask);

      // Foam layers
      col = mix(col, foamTint, totalFoam * 0.6);
      col = mix(col, foam, totalFoam * totalFoam * 0.7);
      col = mix(col, foam, sharpEdge * 0.9);

      // === HOVER EFFECT ===
      // Golden shimmer on foam when hovering - subtle
      vec3 golden = mix(vec3(1.0, 0.94, 0.82), vec3(1.0, 0.88, 0.7), u_isDark);
      col = mix(col, mix(col, golden, 0.4), totalFoam * u_hover * 0.4);

      // Gentle sparkles on water - slower movement
      float sparkle = pow(fbm(vec2(x * 0.08 + t * 0.8, y * 0.08 + t * 0.6)), 3.0);
      sparkle = smoothstep(0.45, 0.65, sparkle) * waterMask * u_hover;
      col += sparkle * 0.18;

      // === EDGE FADE ===
      float topFade = smoothstep(H, H * 0.7, y);
      col = mix(bg, col, topFade);

      gl_FragColor = vec4(col, 1.0);
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
  // Use astro:page-load for View Transitions support
  function setupInit() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  // For Astro View Transitions - only reinit if canvases changed
  document.addEventListener('astro:page-load', function() {
    // Check if our canvases still exist and have WebGL context
    const headerCanvas = document.getElementById('header-canvas');
    const footerCanvas = document.getElementById('footer-canvas');

    // If canvases exist but effects array is empty or contexts lost, reinit
    const needsReinit = (headerCanvas || footerCanvas) &&
      (effects.length === 0 || effects.some(e => e && e.gl.isContextLost()));

    if (needsReinit) {
      initialized = false;
      effects = [];
      visibleCanvases = new Set();
      startTime = performance.now();
      init();
    }
  });

  // Initial load
  setupInit();
})();

// "The cursor is a brush": a small WebGL2 fluid simulation (stable fluids) whose dye is
// watercolour pigment. Moving the pointer pushes the water and lays pigment; a click or tap
// drops ink that blooms into suminagashi rings (ink and clear water, alternating), using the
// area-preserving marbling map so the rings push older paint outward like on real water.
//
// Pigment is stored as absorbance and shown as exp(-A) on a white canvas that is blended with
// `mix-blend-mode: multiply`, so it behaves like paint on the paper underneath. Everything
// fades within seconds, the loop sleeps when idle, and it never runs with reduced motion.

const STORAGE_KEY = 'marion-brush';
const SIM_RES = 128;
const DYE_RES = 640;
const PRESSURE_ITER = 18;
const CURL = 12;
const VEL_DISSIPATION = 0.965; // per 1/60 s
const DYE_DISSIPATION = 0.9945; // per 1/60 s: paint half-fades in ~2 s
const SPLAT_FORCE = 2600;
const SPLAT_RADIUS = 0.0005;
const IDLE_MS = 15000;

// Absorbance (-ln of colour at full strength) for the site's pigments.
const PIGMENTS: [number, number, number][] = [
  [1.55, 1.05, 1.35], // forest green
  [0.1, 0.3, 0.9], // gold / ochre
  [0.55, 0.38, 0.62], // sage
  [1.55, 1.05, 1.35], // forest again: the house colour leads
  [0.12, 0.45, 0.5], // soft rose
  [0.5, 0.42, 0.95], // olive
];

const VERT = `#version 300 es
precision highp float;
in vec2 aPos;
uniform vec2 texel;
out vec2 vUv, vL, vR, vT, vB;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vL = vUv - vec2(texel.x, 0.0);
  vR = vUv + vec2(texel.x, 0.0);
  vT = vUv + vec2(0.0, texel.y);
  vB = vUv - vec2(0.0, texel.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = {
  splat: `
uniform sampler2D uTarget; uniform float aspect; uniform vec3 color; uniform vec2 point; uniform float radius;
void main() {
  vec2 p = vUv - point; p.x *= aspect;
  vec3 s = exp(-dot(p, p) / radius) * color;
  o = vec4(texture(uTarget, vUv).xyz + s, 1.0);
}`,
  marble: `
uniform sampler2D uTarget; uniform float aspect; uniform vec2 point; uniform float r2; uniform vec3 color;
void main() {
  // Mathematical marbling: a drop of area pi*r2 pushes existing paint outward, area-preserving.
  vec2 p = vUv - point; p.x *= aspect;
  float d2 = max(dot(p, p), 1e-9);
  vec2 q = p * sqrt(max(1.0 - r2 / d2, 0.0)); q.x /= aspect;
  vec4 outside = texture(uTarget, point + q);
  float t = smoothstep(r2 * 0.85, r2 * 1.15, d2);
  o = mix(vec4(color, 1.0), outside, t);
}`,
  advect: `
uniform sampler2D uVelocity; uniform sampler2D uSource; uniform vec2 simTexel; uniform float dt; uniform float dissipation;
void main() {
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * simTexel;
  o = dissipation * texture(uSource, coord);
}`,
  divergence: `
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).x, R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y, B = texture(uVelocity, vB).y;
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x;
  if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
  o = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`,
  curl: `
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).y, R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x, B = texture(uVelocity, vB).x;
  o = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`,
  vorticity: `
uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt;
void main() {
  float L = texture(uCurl, vL).x, R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x, B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 1e-4;
  force *= curl * C; force.y *= -1.0;
  vec2 v = texture(uVelocity, vUv).xy + force * dt;
  o = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
}`,
  pressure: `
uniform sampler2D uPressure; uniform sampler2D uDivergence;
void main() {
  float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
  float d = texture(uDivergence, vUv).x;
  o = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0);
}`,
  gradient: `
uniform sampler2D uPressure; uniform sampler2D uVelocity;
void main() {
  float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
  vec2 v = texture(uVelocity, vUv).xy - vec2(R - L, T - B);
  o = vec4(v, 0.0, 1.0);
}`,
  scale: `
uniform sampler2D uTexture; uniform float value;
void main() { o = value * texture(uTexture, vUv); }`,
  shift: `
uniform sampler2D uTexture; uniform vec2 offset;
void main() {
  vec2 uv = vUv + offset;
  o = (uv.y < 0.0 || uv.y > 1.0) ? vec4(0.0) : texture(uTexture, uv);
}`,
  display: `
uniform sampler2D uDye; uniform vec2 dyeTexel;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 A = max(texture(uDye, vUv).rgb, 0.0);
  float c = A.r + A.g + A.b;
  float l = dot(texture(uDye, vUv - vec2(dyeTexel.x * 2.0, 0.0)).rgb, vec3(1.0));
  float r = dot(texture(uDye, vUv + vec2(dyeTexel.x * 2.0, 0.0)).rgb, vec3(1.0));
  float t = dot(texture(uDye, vUv + vec2(0.0, dyeTexel.y * 2.0)).rgb, vec3(1.0));
  float b = dot(texture(uDye, vUv - vec2(0.0, dyeTexel.y * 2.0)).rgb, vec3(1.0));
  float rim = clamp(length(vec2(r - l, t - b)) * 2.2, 0.0, 0.9);   // dried, darker edges
  float grain = 0.88 + 0.24 * hash(floor(gl_FragCoord.xy));        // pigment granulation
  vec3 T = exp(-A * (1.0 + rim) * grain * smoothstep(0.0, 0.04, c));
  o = vec4(T, 1.0);
}`,
};

type Program = { prog: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };
type FBO = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number; texel: [number, number]; attach(id: number): number };
type DoubleFBO = { read: FBO; write: FBO; swap(): void; w: number; h: number; texel: [number, number] };

function start(): void {
  const canvas = document.createElement('canvas');
  canvas.className = 'brush-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) return;
  gl.getExtension('OES_texture_float_linear');
  document.body.appendChild(canvas);

  // --- programs
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const programs: Record<string, Program> = {};
  for (const [name, body] of Object.entries(FRAG)) {
    const fs = compile(gl.FRAGMENT_SHADER, `#version 300 es\nprecision highp float;\nprecision highp sampler2D;\nin vec2 vUv, vL, vR, vT, vB;\nout vec4 o;\n${body}`);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
    const u: Program['u'] = {};
    const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(prog, i)!;
      u[info.name] = gl.getUniformLocation(prog, info.name);
    }
    programs[name] = { prog, u };
  }

  // --- full-screen triangle pair
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  const ibuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  const blit = (target: FBO | null) => {
    if (target) {
      gl.viewport(0, 0, target.w, target.h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    } else {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  };

  // --- framebuffers
  const createFBO = (w: number, h: number, internal: number, format: number): FBO => {
    gl.activeTexture(gl.TEXTURE0);
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, gl.HALF_FLOAT, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      tex, fbo, w, h, texel: [1 / w, 1 / h],
      attach(id: number) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        return id;
      },
    };
  };
  const createDouble = (w: number, h: number, internal: number, format: number): DoubleFBO => {
    let a = createFBO(w, h, internal, format);
    let b = createFBO(w, h, internal, format);
    return {
      w, h, texel: [1 / w, 1 / h],
      get read() { return a; },
      get write() { return b; },
      swap() { const t = a; a = b; b = t; },
    } as DoubleFBO;
  };
  const res = (base: number) => {
    const aspect = window.innerWidth / window.innerHeight;
    return aspect >= 1 ? [Math.round(base * aspect), base] : [base, Math.round(base / aspect)];
  };

  let velocity: DoubleFBO, dye: DoubleFBO, pressure: DoubleFBO, divergence: FBO, curl: FBO;
  const init = () => {
    const [sw, sh] = res(SIM_RES);
    const [dw, dh] = res(DYE_RES);
    velocity = createDouble(sw, sh, gl.RG16F, gl.RG);
    pressure = createDouble(sw, sh, gl.R16F, gl.RED);
    divergence = createFBO(sw, sh, gl.R16F, gl.RED);
    curl = createFBO(sw, sh, gl.R16F, gl.RED);
    dye = createDouble(dw, dh, gl.RGBA16F, gl.RGBA);
  };
  const resize = () => {
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(window.innerWidth * scale * 0.75);
    canvas.height = Math.round(window.innerHeight * scale * 0.75);
    init();
  };
  resize();

  const use = (name: string, texel: [number, number]) => {
    const p = programs[name];
    gl.useProgram(p.prog);
    if (p.u.texel) gl.uniform2f(p.u.texel, texel[0], texel[1]);
    return p.u;
  };

  // --- splats
  const aspect = () => canvas.width / canvas.height;
  const splat = (x: number, y: number, dx: number, dy: number, color: [number, number, number], radius = SPLAT_RADIUS) => {
    let u = use('splat', velocity.texel);
    gl.uniform1i(u.uTarget, velocity.read.attach(0));
    gl.uniform1f(u.aspect, aspect());
    gl.uniform2f(u.point, x, y);
    gl.uniform3f(u.color, dx, dy, 0);
    gl.uniform1f(u.radius, radius);
    blit(velocity.write);
    velocity.swap();

    u = use('splat', dye.texel);
    gl.uniform1i(u.uTarget, dye.read.attach(0));
    gl.uniform3f(u.color, color[0], color[1], color[2]);
    gl.uniform1f(u.radius, radius);
    blit(dye.write);
    dye.swap();
  };
  const marble = (x: number, y: number, r2: number, color: [number, number, number]) => {
    const u = use('marble', dye.texel);
    gl.uniform1i(u.uTarget, dye.read.attach(0));
    gl.uniform1f(u.aspect, aspect());
    gl.uniform2f(u.point, x, y);
    gl.uniform1f(u.r2, r2);
    gl.uniform3f(u.color, color[0], color[1], color[2]);
    blit(dye.write);
    dye.swap();
  };

  // Drops grow a little every frame: ink, clear water, ink, water, ink (suminagashi).
  type Ring = { color: [number, number, number]; area: number; frames: number };
  const drops: { x: number; y: number; rings: Ring[] }[] = [];
  const growDrops = () => {
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      const ring = d.rings[0];
      marble(d.x, d.y, ring.area / ring.frames, ring.color);
      if (--ring.frames <= 0) d.rings.shift();
      if (!d.rings.length) drops.splice(i, 1);
    }
  };

  // --- simulation step
  let scrollShift = 0;
  const step = (dt: number) => {
    if (drops.length) growDrops();
    if (scrollShift !== 0) {
      for (const target of [velocity, dye]) {
        const u = use('shift', target.texel);
        gl.uniform1i(u.uTexture, target.read.attach(0));
        gl.uniform2f(u.offset, 0, -scrollShift);
        blit(target.write);
        target.swap();
      }
      scrollShift = 0;
    }

    let u = use('curl', velocity.texel);
    gl.uniform1i(u.uVelocity, velocity.read.attach(0));
    blit(curl);

    u = use('vorticity', velocity.texel);
    gl.uniform1i(u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(u.uCurl, curl.attach(1));
    gl.uniform1f(u.curl, CURL);
    gl.uniform1f(u.dt, dt);
    blit(velocity.write);
    velocity.swap();

    u = use('divergence', velocity.texel);
    gl.uniform1i(u.uVelocity, velocity.read.attach(0));
    blit(divergence);

    u = use('scale', pressure.texel);
    gl.uniform1i(u.uTexture, pressure.read.attach(0));
    gl.uniform1f(u.value, 0.8);
    blit(pressure.write);
    pressure.swap();

    u = use('pressure', velocity.texel);
    gl.uniform1i(u.uDivergence, divergence.attach(0));
    for (let i = 0; i < PRESSURE_ITER; i++) {
      gl.uniform1i(u.uPressure, pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    u = use('gradient', velocity.texel);
    gl.uniform1i(u.uPressure, pressure.read.attach(0));
    gl.uniform1i(u.uVelocity, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    u = use('advect', velocity.texel);
    gl.uniform2f(u.simTexel, velocity.texel[0], velocity.texel[1]);
    gl.uniform1i(u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(u.uSource, velocity.read.attach(0));
    gl.uniform1f(u.dt, dt);
    gl.uniform1f(u.dissipation, Math.pow(VEL_DISSIPATION, dt * 60));
    blit(velocity.write);
    velocity.swap();

    u = use('advect', dye.texel);
    gl.uniform2f(u.simTexel, velocity.texel[0], velocity.texel[1]);
    gl.uniform1i(u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(u.uSource, dye.read.attach(1));
    gl.uniform1f(u.dt, dt);
    gl.uniform1f(u.dissipation, Math.pow(DYE_DISSIPATION, dt * 60));
    blit(dye.write);
    dye.swap();

    u = use('display', dye.texel);
    gl.uniform1i(u.uDye, dye.read.attach(0));
    gl.uniform2f(u.dyeTexel, dye.texel[0], dye.texel[1]);
    blit(null);
  };

  // --- loop that sleeps when idle
  let running = false;
  let last = 0;
  let lastInput = 0;
  let enabled = true;
  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    step(dt);
    if ((drops.length || performance.now() - lastInput < IDLE_MS) && enabled && !document.hidden) {
      requestAnimationFrame(frame);
    } else {
      running = false;
      clearAll();
    }
  };
  const wake = () => {
    lastInput = performance.now();
    if (!running && enabled) {
      running = true;
      canvas.classList.add('on');
      last = performance.now();
      requestAnimationFrame(frame);
    }
  };
  const clearAll = () => {
    for (const t of [velocity, dye, pressure]) {
      for (const f of [t.read, t.write]) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, f.fbo);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    canvas.classList.remove('on');
  };

  // --- input
  let pigment = 0;
  let px = -1;
  let py = -1;
  let lastMove = 0;
  const toUv = (e: PointerEvent): [number, number] => [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight];
  const colorFor = (amount: number): [number, number, number] => {
    const p = PIGMENTS[pigment % PIGMENTS.length];
    return [p[0] * amount, p[1] * amount, p[2] * amount];
  };

  window.addEventListener('pointermove', (e) => {
    if (!enabled || e.pointerType === 'touch') return;
    const [x, y] = toUv(e);
    const now = performance.now();
    if (now - lastMove > 900) {
      pigment++; // a new stroke dips the brush in the next colour
      px = x;
      py = y;
    }
    lastMove = now;
    const dx = x - px;
    const dy = y - py;
    const dist = Math.hypot(dx * aspect(), dy);
    if (dist < 0.0008) return;
    wake();
    const steps = Math.min(8, Math.ceil(dist / 0.012));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      splat(px + dx * t, py + dy * t, (dx * SPLAT_FORCE) / steps, (dy * SPLAT_FORCE) / steps, colorFor(0.07 / Math.sqrt(steps)));
    }
    px = x;
    py = y;
  }, { passive: true });

  // Ink drop: suminagashi rings — ink and clear water alternate; each new ring pushes the
  // older ones outward. Rings shrink toward the centre so the pattern stays delicate.
  const drop = (x: number, y: number) => {
    wake();
    window.dispatchEvent(new CustomEvent('marion:drop'));
    pigment++;
    const ink = colorFor(0.32);
    pigment++;
    const ink2 = colorFor(0.26);
    const water: [number, number, number] = [0, 0, 0];
    const areas = [0.0005, 0.00032, 0.0003, 0.00022, 0.0002, 0.00014, 0.0001];
    const colors = [ink, water, ink2, water, ink, water, ink2];
    drops.push({ x, y, rings: areas.map((area, i) => ({ area, color: colors[i], frames: 12 })) });
  };
  window.addEventListener('pointerdown', (e) => {
    if (!enabled) return;
    const target = e.target as Element | null;
    if (target?.closest('a, button, input, label, select, textarea, summary, audio')) return;
    const [x, y] = toUv(e);
    drop(x, y);
  }, { passive: true });

  let lastScroll = window.scrollY;
  window.addEventListener('scroll', () => {
    const d = window.scrollY - lastScroll;
    lastScroll = window.scrollY;
    if (running) scrollShift += -d / window.innerHeight;
  }, { passive: true });
  window.addEventListener('resize', () => {
    resize();
    clearAll();
  });

  // --- on/off switch (remembered per visitor)
  const setEnabled = (on: boolean) => {
    enabled = on;
    try {
      localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    } catch {
      /* storage may be unavailable */
    }
    document.querySelectorAll<HTMLButtonElement>('[data-brush-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', String(on));
      const label = b.querySelector('[data-brush-label]');
      if (label) label.textContent = on ? 'Štětec: zapnutý' : 'Štětec: vypnutý';
    });
    if (!on) clearAll();
  };
  let saved = 'on';
  try {
    saved = localStorage.getItem(STORAGE_KEY) ?? 'on';
  } catch {
    /* ignore */
  }
  document.querySelectorAll<HTMLButtonElement>('[data-brush-toggle]').forEach((b) => {
    b.hidden = false;
    b.addEventListener('click', () => setEnabled(!enabled));
  });
  setEnabled(saved !== 'off');
  clearAll();

  // A first, quiet drop in the hero so visitors discover the brush.
  const hero = document.querySelector('[data-hero]');
  if (hero && enabled) {
    window.setTimeout(() => {
      const r = hero.getBoundingClientRect();
      if (r.bottom > 0) drop(0.22, 1 - (r.top + r.height * 0.72) / window.innerHeight);
    }, 1400);
  }
}

const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
if (finePointer && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  try {
    start();
  } catch (err) {
    // The brush is decoration: if WebGL misbehaves, the site simply stays as it is.
    document.querySelector('.brush-canvas')?.remove();
    console.warn('brush disabled', err);
  }
}

export {};

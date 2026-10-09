// Quiet, optional sound for the site. Nothing ever plays until the visitor turns sound on.
//
//  - ambience: soft air, a faint singing-bowl hum and distant chimes, synthesised live
//    with Web Audio (no files, seamless, endless)
//  - breaths: the guided breath in the hero gets a real-sounding inhale (4 s) and exhale (6 s)
//  - "fuknutí": a soft puff of air when an ink drop falls (brush)
//  - whispers: short whispered phrases (ElevenLabs, /public/audio/whispers) when a section
//    first comes into view, at most one every few seconds, through a gentle reverb
//
// The choice is remembered per visitor; on the next page it resumes on the first interaction
// (browsers do not allow sound before that).

const STORAGE_KEY = 'marion-sound';

// Each phrase exists in 4 takes (name-1.mp3 … name-4.mp3); one is picked at random each time.
const TAKES = 4;
type Whisper = { file: string; gain?: number };
const WHISPERS: Record<string, Whisper> = {
  welcome: { file: 'vitejte' },
  slowDown: { file: 'zpomalte' },
  breatheIn: { file: 'nadechnete-se' },
  youAreHere: { file: 'jste-tady' },
  nothingToDo: { file: 'nic-nemusite' },
  returnToSelf: { file: 'navrat-k-sobe' },
};

// Section -> whisper, played once per page view when the section is 40 % visible.
const SECTION_WHISPERS: [string, keyof typeof WHISPERS][] = [
  ['#jak-se-citite', 'slowDown'],
  ['#o-mne', 'returnToSelf'],
  ['.voucher', 'nothingToDo'],
  ['#kontakt', 'youAreHere'],
];

class SoundScape {
  ctx: AudioContext;
  master: GainNode;
  reverb: ConvolverNode;
  wet: GainNode;
  buffers = new Map<string, AudioBuffer>();
  lastWhisper = 0;
  timers: number[] = [];
  noise: AudioBuffer;

  constructor() {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);

    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this.impulse(3.2, 2.4);
    this.wet = this.ctx.createGain();
    this.wet.gain.value = 0.55;
    this.reverb.connect(this.wet).connect(this.master);

    this.noise = this.makeNoise(6);
    this.ambience();
  }

  // ---------- building blocks
  impulse(seconds: number, decay: number): AudioBuffer {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  makeNoise(seconds: number): AudioBuffer {
    // brown-ish noise: soft and warm, like air in a room
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(1, len, rate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
    // crossfade the ends so the loop is seamless
    const fade = Math.floor(rate * 0.5);
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      d[len - fade + i] = d[len - fade + i] * (1 - t) + d[i] * t;
    }
    return buf;
  }

  noiseSource(loop = true): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = loop;
    src.loopStart = 0;
    src.loopEnd = this.noise.duration - 0.5;
    return src;
  }

  // ---------- ambience
  ambience() {
    const ctx = this.ctx;
    // air
    const air = this.noiseSource();
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'lowpass';
    airFilter.frequency.value = 520;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(airFilter.frequency);
    air.connect(airFilter).connect(airGain).connect(this.master);
    air.start();
    lfo.start();

    // singing bowl: inharmonic partials with slow beating, swelling very slowly
    const base = 174;
    const bowl = ctx.createGain();
    bowl.gain.value = 0.0;
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.03;
    const swellGain = ctx.createGain();
    swellGain.gain.value = 0.006;
    const bowlLevel = ctx.createConstantSource();
    bowlLevel.offset.value = 0.009;
    swell.connect(swellGain).connect(bowl.gain);
    bowlLevel.connect(bowl.gain);
    for (const [ratio, amp, beat] of [[1, 1, 0.4], [2.71, 0.45, 0.7], [5.08, 0.18, 1.1]] as const) {
      for (const detune of [-beat / 2, beat / 2]) {
        const o = ctx.createOscillator();
        o.frequency.value = base * ratio + detune;
        const g = ctx.createGain();
        g.gain.value = amp * 0.5;
        o.connect(g).connect(bowl);
        o.start();
      }
    }
    bowl.connect(this.master);
    bowl.connect(this.reverb);
    swell.start();
    bowlLevel.start();

    // distant chimes, now and then
    const notes = [587.3, 698.5, 784, 880, 1046.5, 1174.7];
    const chime = () => {
      const t = ctx.currentTime + 0.05;
      const f = notes[Math.floor(Math.random() * notes.length)];
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.random() * 1.4 - 0.7;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.018, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
      for (const [r, a] of [[1, 1], [2.76, 0.25], [5.4, 0.08]] as const) {
        const o = ctx.createOscillator();
        o.frequency.value = f * r;
        const og = ctx.createGain();
        og.gain.value = a;
        o.connect(og).connect(g);
        o.start(t);
        o.stop(t + 4.6);
      }
      g.connect(pan);
      pan.connect(this.master);
      pan.connect(this.reverb);
      this.timers.push(window.setTimeout(chime, 9000 + Math.random() * 14000));
    };
    this.timers.push(window.setTimeout(chime, 4000));
  }

  // ---------- breath (synthesised: shaped, filtered noise)
  breath(kind: 'in' | 'out', seconds: number) {
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.02;
    const src = this.noiseSource();
    // whiter noise for breath: highpass the brown noise and add a bandpass "throat"
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 300;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.7;
    const [f0, f1] = kind === 'in' ? [700, 1500] : [1300, 520];
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + seconds);
    const g = ctx.createGain();
    const peak = kind === 'in' ? 0.16 : 0.2;
    g.gain.setValueAtTime(0.0001, t);
    if (kind === 'in') {
      g.gain.exponentialRampToValueAtTime(peak, t + seconds * 0.55);
      g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    } else {
      g.gain.exponentialRampToValueAtTime(peak, t + 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    }
    src.connect(hp).connect(bp).connect(g);
    g.connect(this.master);
    g.connect(this.reverb);
    src.start(t, Math.random() * 3);
    src.stop(t + seconds + 0.1);
  }

  // soft puff of air for an ink drop
  puff() {
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    const src = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(1600, t);
    bp.frequency.exponentialRampToValueAtTime(380, t + 1.3);
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 0.8 - 0.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    src.connect(bp).connect(g).connect(pan);
    pan.connect(this.master);
    pan.connect(this.reverb);
    src.start(t, Math.random() * 3);
    src.stop(t + 1.5);
  }

  // ---------- whispers (samples)
  async load(name: string): Promise<AudioBuffer | null> {
    if (this.buffers.has(name)) return this.buffers.get(name)!;
    try {
      const res = await fetch(`/audio/whispers/${name}.mp3`);
      if (!res.ok) return null;
      const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
      this.buffers.set(name, buf);
      return buf;
    } catch {
      return null;
    }
  }

  /** Milliseconds until another whisper may play (whispers never crowd each other). */
  wait(): number {
    return Math.max(0, this.lastWhisper + 9000 - performance.now());
  }

  async whisper(key: keyof typeof WHISPERS, force = false) {
    if (!force && this.wait() > 0) return;
    this.lastWhisper = performance.now();
    const w = WHISPERS[key];
    const buf = await this.load(`${w.file}-${1 + Math.floor(Math.random() * TAKES)}`);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = Math.random() * 0.6 - 0.3;
    const g = this.ctx.createGain();
    g.gain.value = 0.55 * (w.gain ?? 1);
    src.connect(g).connect(pan);
    pan.connect(this.master);
    pan.connect(this.reverb);
    src.start();
  }

  fade(to: number, seconds: number) {
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(to, t + seconds);
  }
}

// ---------------------------------------------------------------- wiring
let scape: SoundScape | null = null;
let on = false;
let observer: IntersectionObserver | null = null;

const remember = (value: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off');
  } catch {
    /* storage may be unavailable */
  }
};

const updateButtons = () => {
  document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]').forEach((b) => {
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Vypnout zvuk' : 'Zapnout zvuk');
    const label = b.querySelector('[data-sound-label]');
    if (label) label.textContent = on ? 'Zvuk zapnutý' : 'Zvuk';
  });
};

const watchSections = () => {
  if (observer || !('IntersectionObserver' in window)) return;
  const played = new Set<string>();
  const visible = new Set<string>();
  const attempt = (sel: string, key: keyof typeof WHISPERS) => {
    if (!on || !scape || played.has(sel) || !visible.has(sel)) return;
    const wait = scape.wait();
    if (wait > 0) {
      // another whisper is still in the air: try again when it has faded
      window.setTimeout(() => attempt(sel, key), wait + 300);
      return;
    }
    played.add(sel);
    scape.whisper(key);
  };
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const match = SECTION_WHISPERS.find(([sel]) => e.target.matches(sel));
        if (!match) continue;
        if (e.isIntersecting) {
          visible.add(match[0]);
          attempt(match[0], match[1]);
        } else {
          visible.delete(match[0]);
        }
      }
    },
    { threshold: 0.4 },
  );
  for (const [sel] of SECTION_WHISPERS) {
    const el = document.querySelector(sel);
    if (el) observer.observe(el);
  }
};

const enable = (greet: boolean) => {
  if (!scape) scape = new SoundScape();
  scape.ctx.resume();
  on = true;
  scape.fade(1, 2.5);
  remember(true);
  updateButtons();
  watchSections();
  if (greet) window.setTimeout(() => scape?.whisper('welcome', true), 900);
};

const disable = () => {
  on = false;
  remember(false);
  updateButtons();
  if (scape) {
    scape.fade(0, 0.8);
    const s = scape;
    window.setTimeout(() => {
      if (!on) s.ctx.suspend();
    }, 900);
  }
};

document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]').forEach((b) => {
  b.addEventListener('click', () => (on ? disable() : enable(true)));
});

// Remembered as "on": resume quietly at the first interaction on this page.
let saved = 'off';
try {
  saved = localStorage.getItem(STORAGE_KEY) ?? 'off';
} catch {
  /* ignore */
}
if (saved === 'on') {
  const first = (e: Event) => {
    if ((e.target as Element | null)?.closest('[data-sound-toggle]')) return;
    enable(false);
  };
  window.addEventListener('pointerdown', first, { once: true, capture: true });
  window.addEventListener('keydown', first, { once: true, capture: true });
}

// Events from the breath guide and the brush.
window.addEventListener('marion:breath', (e) => {
  if (!on || !scape) return;
  const phase = (e as CustomEvent<string>).detail;
  if (phase === 'in') scape.breath('in', 4);
  if (phase === 'out') scape.breath('out', 6);
  if (phase === 'end') scape.whisper('youAreHere', true);
});
window.addEventListener('marion:drop', () => {
  if (on && scape) scape.puff();
});

export {};

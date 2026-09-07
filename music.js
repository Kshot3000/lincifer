/**
 * Procedural hell ambient MUSIC via Web Audio API.
 * Dark minor drones, evolving pads, distant choir, tonal tritone stabs —
 * not filtered noise / static.
 */
(function () {
  const STORAGE_KEY = "lincifer-music-muted";
  const DEFAULT_VOLUME = 0.25;

  let audioCtx = null;
  let masterGain = null;
  let started = false;
  let muted = false;
  let nodes = [];
  let timers = [];

  try {
    muted = localStorage.getItem(STORAGE_KEY) === "1";
  } catch (_) {
    muted = false;
  }

  function ensureContext() {
    if (audioCtx) return audioCtx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : DEFAULT_VOLUME;
    masterGain.connect(audioCtx.destination);
    return audioCtx;
  }

  function track(node) {
    nodes.push(node);
    return node;
  }

  function addOsc(ctx, type, freq, gainVal, detune) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (typeof detune === "number") osc.detune.value = detune;
    g.gain.value = gainVal;
    osc.connect(g);
    g.connect(masterGain);
    osc.start();
    track(osc);
    track(g);
    return { osc, g };
  }

  function addLfo(ctx, targetParam, rate, depth, base) {
    const lfo = ctx.createOscillator();
    const g = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = rate;
    g.gain.value = depth;
    lfo.connect(g);
    g.connect(targetParam);
    if (typeof base === "number") targetParam.value = base;
    lfo.start();
    track(lfo);
    track(g);
    return { lfo, g };
  }

  /** Soft lowpass on a gain bus so pads stay warm, never harsh. */
  function createPadBus(ctx, cutoff) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    filter.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = 1;
    filter.connect(g);
    g.connect(masterGain);
    track(filter);
    track(g);
    return { filter, g };
  }

  function addOscToBus(ctx, bus, type, freq, gainVal, detune) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (typeof detune === "number") osc.detune.value = detune;
    g.gain.value = gainVal;
    osc.connect(g);
    g.connect(bus.filter);
    osc.start();
    track(osc);
    track(g);
    return { osc, g };
  }

  function scheduleTimeout(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function buildHellscape(ctx) {
    // --- Dark minor foundation: D minor (D2 / F2 / A2) + low fifth ---
    // Frequencies (Hz): D2=73.42, F2=87.31, A2=110, A1=55, D1=36.71
    const chordBus = createPadBus(ctx, 900);

    const foundation = [
      { type: "sine", f: 36.71, g: 0.18, d: 0 },     // D1 sub
      { type: "sine", f: 55.0, g: 0.12, d: -3 },      // A1
      { type: "sine", f: 73.42, g: 0.14, d: 0 },      // D2
      { type: "triangle", f: 73.42, g: 0.06, d: 4 },  // D2 soft triangle
      { type: "sine", f: 87.31, g: 0.11, d: -2 },     // F2
      { type: "triangle", f: 87.31, g: 0.05, d: 6 },  // F2 soft
      { type: "sine", f: 110.0, g: 0.09, d: 0 },      // A2
      { type: "triangle", f: 110.0, g: 0.04, d: -5 }, // A2 soft
    ];

    foundation.forEach(({ type, f, g, d }) => {
      const { osc, g: gainNode } = addOscToBus(ctx, chordBus, type, f, g, d);
      // Slow LFO detune — organic drift, not vibrato chatter
      addLfo(ctx, osc.detune, 0.02 + Math.random() * 0.03, 6 + Math.random() * 10, d);
      // Very slow amplitude breathe
      addLfo(ctx, gainNode.gain, 0.015 + Math.random() * 0.025, g * 0.22, g);
    });

    // Slow evolving lowpass on the whole chord pad
    addLfo(ctx, chordBus.filter.frequency, 0.018, 280, 900);

    // --- Slow evolving pad (higher partials of the same chord, long swell) ---
    const padBus = createPadBus(ctx, 1400);
    const padVoices = [
      { f: 146.83, g: 0.035, d: -8 },  // D3
      { f: 174.61, g: 0.028, d: 5 },   // F3
      { f: 220.0, g: 0.022, d: -4 },   // A3
      { f: 293.66, g: 0.014, d: 10 },  // D4 (quiet)
    ];

    padVoices.forEach(({ f, g, d }, i) => {
      const { osc, g: gainNode } = addOscToBus(ctx, padBus, "sine", f, 0.0001, d);
      // Long attack into resting level
      const now = ctx.currentTime;
      const attack = 4 + i * 1.5;
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(g, now + attack);
      addLfo(ctx, osc.detune, 0.025 + i * 0.01, 8 + i * 3, d);
      addLfo(ctx, gainNode.gain, 0.02 + i * 0.008, g * 0.4, g);
    });
    addLfo(ctx, padBus.filter.frequency, 0.012, 350, 1400);

    // --- Distant low "choir" — stacked sines + gentle vibrato ---
    const choirBus = createPadBus(ctx, 1100);
    const choirNotes = [
      { f: 146.83, g: 0.018 }, // D3
      { f: 174.61, g: 0.015 }, // F3
      { f: 207.65, g: 0.012 }, // Ab3 (flat 5th — hellish color)
      { f: 220.0, g: 0.014 },  // A3
    ];

    choirNotes.forEach(({ f, g }, i) => {
      // Three slightly detuned sines per note = choir thickness
      [-9, 0, 11].forEach((cents, j) => {
        const voiceGain = g * (j === 1 ? 1 : 0.55);
        const { osc, g: gainNode } = addOscToBus(
          ctx,
          choirBus,
          "sine",
          f,
          voiceGain * 0.0001,
          cents
        );
        const now = ctx.currentTime;
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(voiceGain, now + 6 + i);
        // Slow vibrato (choir-ish)
        addLfo(ctx, osc.detune, 4.2 + j * 0.35, 4 + j, cents);
        // Slow amplitude shimmer
        addLfo(ctx, gainNode.gain, 0.03 + i * 0.01, voiceGain * 0.25, voiceGain);
      });
    });
    addLfo(ctx, choirBus.filter.frequency, 0.015, 200, 1100);
    // Keep choir quiet overall
    choirBus.g.gain.value = 0.85;

    // --- Occasional dissonant TRITONE stabs (tonal, not noise) ---
    // Tritone above D: Ab (G#). Pair D3 + Ab3 / D2 + Ab2 as short tonal hits.
    function scheduleStab() {
      if (!audioCtx || audioCtx.state === "closed") return;
      const now = audioCtx.currentTime;
      const root = 73.42 * (Math.random() < 0.5 ? 1 : 2); // D2 or D3
      const tri = root * Math.pow(2, 6 / 12); // +tritone
      const peak = 0.045 + Math.random() * 0.035;
      const dur = 0.9 + Math.random() * 1.4;

      [root, tri].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        const lp = audioCtx.createBiquadFilter();
        osc.type = idx === 0 ? "sine" : "triangle";
        osc.frequency.value = freq;
        lp.type = "lowpass";
        lp.frequency.value = 1200;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(peak * (idx === 0 ? 1 : 0.75), now + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        osc.connect(lp);
        lp.connect(g);
        g.connect(masterGain);
        osc.start(now);
        osc.stop(now + dur + 0.05);
      });

      const wait = (7 + Math.random() * 11) * 1000;
      scheduleTimeout(scheduleStab, wait);
    }
    scheduleTimeout(scheduleStab, 3500 + Math.random() * 2500);

    // Occasional darker minor-second / flat-five swell (still tonal)
    function scheduleDissonantSwell() {
      if (!audioCtx || audioCtx.state === "closed") return;
      const now = audioCtx.currentTime;
      const base = 55 + Math.random() * 20; // around A1–ish
      const peak = 0.04 + Math.random() * 0.03;
      const attack = 1.2 + Math.random() * 1.5;
      const hold = 1.5 + Math.random();
      const release = 2.5 + Math.random() * 2;

      const freqs = [base, base * Math.pow(2, 1 / 12), base * Math.pow(2, 6 / 12)];
      freqs.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = i === 0 ? "sine" : "triangle";
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(peak * (0.7 - i * 0.15), now + attack);
        g.gain.setValueAtTime(peak * (0.7 - i * 0.15), now + attack + hold);
        g.gain.exponentialRampToValueAtTime(0.0001, now + attack + hold + release);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(now);
        osc.stop(now + attack + hold + release + 0.1);
      });

      scheduleTimeout(scheduleDissonantSwell, (12 + Math.random() * 16) * 1000);
    }
    scheduleTimeout(scheduleDissonantSwell, 8000 + Math.random() * 4000);

    // --- Extremely subtle room tone (optional quiet lowpassed noise) ---
    // Gain kept tiny so it never reads as static; heavily lowpassed.
    try {
      const seconds = 3;
      const len = Math.floor(ctx.sampleRate * seconds);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.015 * white) / 1.015;
        data[i] = last * 2.2;
      }
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = buf;
      noiseSrc.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 180;
      lp.Q.value = 0.5;
      const ng = ctx.createGain();
      ng.gain.value = 0.012; // barely audible bed
      noiseSrc.connect(lp);
      lp.connect(ng);
      ng.connect(masterGain);
      noiseSrc.start();
      track(noiseSrc);
      track(lp);
      track(ng);
    } catch (_) {
      /* skip room tone if buffer creation fails */
    }
  }

  function startMusic() {
    const ctx = ensureContext();
    if (!ctx) return false;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    if (!started) {
      buildHellscape(ctx);
      started = true;
    }
    applyMute();
    return true;
  }

  function applyMute() {
    if (!masterGain || !audioCtx) return;
    const now = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setTargetAtTime(muted ? 0 : DEFAULT_VOLUME, now, 0.05);
  }

  function setMuted(next) {
    muted = !!next;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    } catch (_) {}
    applyMute();
    updateButton();
    if (!muted) startMusic();
  }

  function toggleMute() {
    setMuted(!muted);
  }

  function updateButton() {
    const btn = document.getElementById("music-toggle");
    if (!btn) return;
    btn.setAttribute("aria-pressed", muted ? "true" : "false");
    btn.title = muted ? "Unmute hell music" : "Mute hell music";
    btn.setAttribute("aria-label", muted ? "Unmute hell music" : "Mute hell music");
    const icon = btn.querySelector(".music-toggle-icon");
    const label = btn.querySelector(".music-toggle-label");
    if (icon) icon.textContent = muted ? "🔇" : "🔊";
    if (label) label.textContent = muted ? "Muted" : "Hell BGM";
    btn.classList.toggle("is-muted", muted);
  }

  function onFirstGesture() {
    startMusic();
  }

  function bindGestureUnlock() {
    const events = ["pointerdown", "keydown", "touchstart", "click"];
    const once = (ev) => {
      // Let the mute button own its click (avoid start+toggle race)
      if (ev.target && ev.target.closest && ev.target.closest("#music-toggle")) return;
      events.forEach((e) => document.removeEventListener(e, once, true));
      onFirstGesture();
    };
    events.forEach((e) => document.addEventListener(e, once, { capture: true, passive: true }));
  }

  function initButton() {
    const btn = document.getElementById("music-toggle");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const firstUnlock = !started;
      startMusic();
      // First press while default-unmuted: unlock & play (don't immediately mute)
      if (firstUnlock && !muted) {
        updateButton();
        return;
      }
      toggleMute();
    });
    updateButton();
  }

  // Expose tiny API for debugging / other modules
  window.LinciferMusic = {
    start: startMusic,
    toggleMute,
    setMuted,
    isMuted: () => muted,
    isStarted: () => started,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initButton();
      bindGestureUnlock();
      // Try autoplay; browsers may block until gesture
      if (!muted) {
        startMusic();
      }
    });
  } else {
    initButton();
    bindGestureUnlock();
    if (!muted) startMusic();
  }
})();

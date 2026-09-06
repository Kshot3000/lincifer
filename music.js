/**
 * Procedural hell ambient bed via Web Audio API.
 * No external audio files — drones, dissonance, rumble, filtered noise.
 */
(function () {
  const STORAGE_KEY = "lincifer-music-muted";
  const DEFAULT_VOLUME = 0.25;

  let audioCtx = null;
  let masterGain = null;
  let started = false;
  let muted = false;
  let nodes = [];

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

  function makeNoiseBuffer(ctx, seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      // Brown-ish noise for deeper rumble
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    return buf;
  }

  function addOsc(ctx, type, freq, gainVal, detune) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (detune) osc.detune.value = detune;
    g.gain.value = gainVal;
    osc.connect(g);
    g.connect(masterGain);
    osc.start();
    nodes.push(osc, g);
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
    nodes.push(lfo, g);
  }

  function buildHellscape(ctx) {
    // Sub rumble / heartbeat of the pit
    addOsc(ctx, "sine", 36, 0.22);
    addOsc(ctx, "sine", 48, 0.14, -8);
    addOsc(ctx, "triangle", 55, 0.08);

    // Dark dissonant drones (tritone + minor seconds)
    const drones = [
      { f: 73.42, g: 0.09, d: 0 },    // D2
      { f: 87.31, g: 0.07, d: 6 },    // F2 slightly sharp
      { f: 103.83, g: 0.06, d: -4 },  // Ab2
      { f: 110, g: 0.05, d: 12 },     // A2
      { f: 146.83, g: 0.04, d: -10 }, // D3
      { f: 207.65, g: 0.03, d: 18 },  // Ab3 dissonant
    ];
    drones.forEach(({ f, g, d }) => {
      const { osc, g: gainNode } = addOsc(ctx, "sawtooth", f, g, d);
      // Slow filter-ish amplitude wobble
      addLfo(ctx, gainNode.gain, 0.07 + Math.random() * 0.12, g * 0.35, g);
      addLfo(ctx, osc.detune, 0.03 + Math.random() * 0.05, 18 + Math.random() * 25, d);
    });

    // High eerie whisps (quiet sine clusters)
    [415.3, 466.16, 554.37].forEach((f, i) => {
      const { g } = addOsc(ctx, "sine", f, 0.012 + i * 0.004, (i - 1) * 14);
      addLfo(ctx, g.gain, 0.11 + i * 0.04, 0.008, 0.012 + i * 0.004);
    });

    // Filtered noise bed (wind / fire roar / screams-in-distance)
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = makeNoiseBuffer(ctx, 4);
    noiseSrc.loop = true;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 80;
    hp.Q.value = 0.5;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 420;
    bp.Q.value = 0.7;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1600;
    lp.Q.value = 0.8;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.11;

    noiseSrc.connect(hp);
    hp.connect(bp);
    bp.connect(lp);
    lp.connect(noiseGain);
    noiseGain.connect(masterGain);
    noiseSrc.start();
    nodes.push(noiseSrc, hp, bp, lp, noiseGain);

    addLfo(ctx, bp.frequency, 0.08, 180, 420);
    addLfo(ctx, lp.frequency, 0.05, 400, 1600);
    addLfo(ctx, noiseGain.gain, 0.04, 0.04, 0.11);

    // Occasional dissonant "demon growl" pulses via gain swell on a low osc
    const growl = addOsc(ctx, "sawtooth", 62, 0.001);
    const swell = growl.g;
    function scheduleGrowl() {
      if (!audioCtx || audioCtx.state === "closed") return;
      const now = audioCtx.currentTime;
      const peak = 0.06 + Math.random() * 0.05;
      const wait = 4 + Math.random() * 8;
      swell.gain.cancelScheduledValues(now);
      swell.gain.setValueAtTime(0.001, now);
      swell.gain.linearRampToValueAtTime(peak, now + 0.8);
      swell.gain.exponentialRampToValueAtTime(0.001, now + 2.2 + Math.random());
      growl.osc.frequency.setValueAtTime(50 + Math.random() * 30, now);
      setTimeout(scheduleGrowl, wait * 1000);
    }
    scheduleGrowl();

    // Distant metallic scrape / dissonant pulse
    const pulse = addOsc(ctx, "square", 98, 0.001);
    function schedulePulse() {
      if (!audioCtx || audioCtx.state === "closed") return;
      const now = audioCtx.currentTime;
      const wait = 6 + Math.random() * 10;
      pulse.g.gain.cancelScheduledValues(now);
      pulse.g.gain.setValueAtTime(0.001, now);
      pulse.g.gain.linearRampToValueAtTime(0.025, now + 0.05);
      pulse.g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      pulse.osc.frequency.setValueAtTime(80 + Math.random() * 60, now);
      setTimeout(schedulePulse, wait * 1000);
    }
    schedulePulse();
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

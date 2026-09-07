(function () {
  const stage = document.getElementById("hell-stage");
  const face = document.getElementById("hell-face");
  const pit = document.getElementById("hell-pit");
  const canvas = document.getElementById("hell-flames");
  const splash = document.getElementById("hell-splash");
  const toast = document.getElementById("hell-toast");
  const scoreEl = document.getElementById("hell-score");
  const resetBtn = document.getElementById("hell-reset");
  const hint = document.getElementById("hell-hint");

  if (!stage || !face || !pit || !canvas) return;

  let score = 0;
  let dragging = false;
  let cast = false;
  let pointerId = null;
  let offsetX = 0;
  let offsetY = 0;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let lastT = 0;
  let velX = 0;
  let velY = 0;
  let throwRaf = null;

  const ctx = canvas.getContext("2d");
  let W = 400;
  let H = 220;

  // Realistic fire particle layers
  let baseFlames = [];
  let midFlames = [];
  let coreFlames = [];
  let embers = [];
  let smoke = [];
  let hitSparks = [];
  let shimmerPhase = 0;

  function resizeCanvas() {
    const rect = pit.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(280, Math.floor(rect.width));
    H = Math.max(160, Math.floor(rect.height));
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initFlames();
  }

  function makeFlame(layer) {
    const spread = layer === "core" ? 0.28 : layer === "mid" ? 0.38 : 0.48;
    return {
      x: W * 0.5 + (Math.random() - 0.5) * W * spread * 2,
      y: H * (0.72 + Math.random() * 0.2),
      life: Math.random(),
      maxLife: 0.55 + Math.random() * 0.7,
      speed: (layer === "core" ? 1.4 : layer === "mid" ? 1.1 : 0.85) * (0.7 + Math.random() * 0.6),
      w: (layer === "core" ? 8 : layer === "mid" ? 14 : 22) * (0.6 + Math.random() * 0.8),
      h: (layer === "core" ? 28 : layer === "mid" ? 42 : 58) * (0.7 + Math.random() * 0.7),
      sway: (Math.random() - 0.5) * 0.04,
      phase: Math.random() * Math.PI * 2,
      turb: 0.5 + Math.random() * 1.2,
      layer,
    };
  }

  function makeEmber() {
    return {
      x: W * 0.5 + (Math.random() - 0.5) * W * 0.55,
      y: H * (0.55 + Math.random() * 0.35),
      vx: (Math.random() - 0.5) * 0.6,
      vy: -(0.4 + Math.random() * 1.4),
      r: 0.8 + Math.random() * 2.2,
      life: 0.4 + Math.random() * 0.9,
      maxLife: 0.8 + Math.random() * 1.2,
      hue: 20 + Math.random() * 40,
    };
  }

  function makeSmoke() {
    return {
      x: W * 0.5 + (Math.random() - 0.5) * W * 0.4,
      y: H * (0.35 + Math.random() * 0.25),
      vx: (Math.random() - 0.5) * 0.35,
      vy: -(0.15 + Math.random() * 0.35),
      r: 10 + Math.random() * 28,
      life: 0.3 + Math.random() * 0.8,
      maxLife: 1.2 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
    };
  }

  function initFlames() {
    baseFlames = [];
    midFlames = [];
    coreFlames = [];
    embers = [];
    smoke = [];
    const nBase = Math.max(18, Math.floor(W / 14));
    const nMid = Math.max(14, Math.floor(W / 18));
    const nCore = Math.max(10, Math.floor(W / 22));
    for (let i = 0; i < nBase; i++) baseFlames.push(makeFlame("base"));
    for (let i = 0; i < nMid; i++) midFlames.push(makeFlame("mid"));
    for (let i = 0; i < nCore; i++) coreFlames.push(makeFlame("core"));
    for (let i = 0; i < 40; i++) embers.push(makeEmber());
    for (let i = 0; i < 16; i++) smoke.push(makeSmoke());
  }

  function spawnHitSparks(cx, cy) {
    // convert stage-local coords roughly into canvas-local
    const stageRect = stage.getBoundingClientRect();
    const pitRect = pit.getBoundingClientRect();
    const lx = cx - (pitRect.left - stageRect.left);
    const ly = cy - (pitRect.top - stageRect.top);
    for (let i = 0; i < 48; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.5 + Math.random() * 5.5;
      hitSparks.push({
        x: lx,
        y: ly,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 2,
        r: 1 + Math.random() * 3.5,
        life: 0.5 + Math.random() * 0.7,
        maxLife: 0.5 + Math.random() * 0.7,
        hue: Math.random() < 0.35 ? 45 + Math.random() * 20 : 10 + Math.random() * 30,
      });
    }
  }

  function updateFlame(f, dt) {
    f.life += dt * f.speed * 0.55;
    f.phase += dt * f.turb;
    f.x += Math.sin(f.phase * 2.1) * f.sway * 40 * dt + Math.sin(f.phase * 5.3) * 0.15;
    f.y -= (0.8 + f.speed * 0.6) * 28 * dt;
    if (f.life >= f.maxLife || f.y < H * 0.15) {
      Object.assign(f, makeFlame(f.layer));
      f.life = 0;
    }
  }

  function drawFlameBlob(f, t) {
    const progress = f.life / f.maxLife;
    const flicker = 0.75 + Math.sin(t * 0.012 + f.phase) * 0.15 + Math.sin(t * 0.031 + f.phase * 2) * 0.1;
    const grow = Math.sin(progress * Math.PI);
    const w = f.w * (0.6 + grow * 0.7) * flicker;
    const h = f.h * (0.5 + grow * 0.85) * flicker;
    const sway = Math.sin(f.phase * 1.7) * (8 + progress * 14);
    const x = f.x + sway;
    const y = f.y;
    const alpha = Math.min(1, grow * 1.4) * (1 - progress * 0.35);

    const grad = ctx.createRadialGradient(x, y - h * 0.15, 1, x, y - h * 0.2, Math.max(w, h) * 0.9);
    if (f.layer === "core") {
      grad.addColorStop(0, `rgba(255,255,245,${0.95 * alpha})`);
      grad.addColorStop(0.25, `rgba(255,245,180,${0.9 * alpha})`);
      grad.addColorStop(0.55, `rgba(255,200,60,${0.55 * alpha})`);
      grad.addColorStop(1, `rgba(255,140,0,0)`);
    } else if (f.layer === "mid") {
      grad.addColorStop(0, `rgba(255,220,90,${0.85 * alpha})`);
      grad.addColorStop(0.35, `rgba(255,140,20,${0.75 * alpha})`);
      grad.addColorStop(0.7, `rgba(255,60,0,${0.4 * alpha})`);
      grad.addColorStop(1, `rgba(180,20,0,0)`);
    } else {
      grad.addColorStop(0, `rgba(255,90,10,${0.7 * alpha})`);
      grad.addColorStop(0.4, `rgba(220,30,0,${0.55 * alpha})`);
      grad.addColorStop(0.75, `rgba(120,0,0,${0.3 * alpha})`);
      grad.addColorStop(1, `rgba(40,0,0,0)`);
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 + Math.sin(f.phase) * 0.08, 1);
    ctx.beginPath();
    ctx.moveTo(-w * 0.35, 0);
    ctx.quadraticCurveTo(-w * 0.55, -h * 0.35, -w * 0.15 + sway * 0.05, -h * 0.7);
    ctx.quadraticCurveTo(0, -h * 1.05, w * 0.1 + sway * 0.08, -h * 0.65);
    ctx.quadraticCurveTo(w * 0.5, -h * 0.3, w * 0.35, 0);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.globalCompositeOperation = f.layer === "base" ? "source-over" : "lighter";
    ctx.fill();
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
  }

  function drawFlames(t) {
    const dt = 0.016;
    shimmerPhase = t * 0.0025;
    ctx.clearRect(0, 0, W, H);

    // deep pit void
    const voidGrad = ctx.createRadialGradient(W / 2, H * 0.88, 8, W / 2, H * 0.72, W * 0.58);
    voidGrad.addColorStop(0, "rgba(0,0,0,0.98)");
    voidGrad.addColorStop(0.45, "rgba(35,0,0,0.9)");
    voidGrad.addColorStop(0.8, "rgba(60,8,0,0.35)");
    voidGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = voidGrad;
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.8, W * 0.44, H * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // ambient heat glow under flames
    const glow = ctx.createRadialGradient(W / 2, H * 0.78, 4, W / 2, H * 0.7, W * 0.5);
    glow.addColorStop(0, "rgba(255,120,20,0.35)");
    glow.addColorStop(0.45, "rgba(255,40,0,0.18)");
    glow.addColorStop(1, "rgba(255,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, H * 0.25, W, H * 0.75);

    // smoke (behind flames)
    smoke.forEach((s) => {
      s.life += dt * 0.45;
      s.x += s.vx + Math.sin(t * 0.001 + s.phase) * 0.25;
      s.y += s.vy;
      s.r += dt * 8;
      const p = s.life / s.maxLife;
      if (p >= 1) {
        Object.assign(s, makeSmoke());
        s.life = 0;
        return;
      }
      const a = (1 - p) * 0.22;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(40,30,28,${a})`;
      ctx.fill();
    });

    // layered flames: base -> mid -> core
    baseFlames.forEach((f) => {
      updateFlame(f, dt);
      drawFlameBlob(f, t);
    });
    midFlames.forEach((f) => {
      updateFlame(f, dt);
      drawFlameBlob(f, t);
    });
    coreFlames.forEach((f) => {
      updateFlame(f, dt);
      drawFlameBlob(f, t);
    });

    // rising turbulent embers
    embers.forEach((e) => {
      e.life += dt * 0.5;
      e.x += e.vx + Math.sin(t * 0.004 + e.x * 0.05) * 0.4;
      e.y += e.vy;
      e.vy -= dt * 0.15;
      const p = e.life / e.maxLife;
      if (p >= 1 || e.y < 0) {
        Object.assign(e, makeEmber());
        e.life = 0;
        return;
      }
      const a = (1 - p) * 0.9;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * (1 - p * 0.4), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${e.hue},100%,${55 + (1 - p) * 25}%,${a})`;
      ctx.shadowColor = `hsla(${e.hue},100%,60%,0.8)`;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // hit sparks
    for (let i = hitSparks.length - 1; i >= 0; i--) {
      const s = hitSparks[i];
      s.life -= dt;
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.12;
      s.vx *= 0.98;
      if (s.life <= 0) {
        hitSparks.splice(i, 1);
        continue;
      }
      const p = s.life / s.maxLife;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * p, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${s.hue},100%,${60 + p * 30}%,${p})`;
      ctx.shadowColor = `hsla(${s.hue},100%,50%,1)`;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // heat shimmer bands near top of flames
    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 5; i++) {
      const yy = H * 0.28 + i * 10;
      const amp = 3 + Math.sin(shimmerPhase + i) * 2;
      ctx.beginPath();
      ctx.moveTo(W * 0.12, yy);
      for (let x = W * 0.12; x < W * 0.88; x += 8) {
        const wave = Math.sin(x * 0.08 + shimmerPhase * 3 + i) * amp;
        ctx.lineTo(x, yy + wave);
      }
      ctx.strokeStyle = "rgba(255,220,160,0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();

    // outer rim glow
    const rim = ctx.createRadialGradient(W / 2, H * 0.75, W * 0.12, W / 2, H * 0.68, W * 0.52);
    rim.addColorStop(0, "rgba(255,90,10,0.12)");
    rim.addColorStop(1, "rgba(255,30,0,0)");
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, W, H);

    requestAnimationFrame(drawFlames);
  }

  function faceSize() {
    return face.offsetWidth || 96;
  }

  function faceHeight() {
    return face.offsetHeight || faceSize();
  }

  function clampFace(x, y) {
    const s = faceSize();
    const h = faceHeight();
    const maxX = stage.clientWidth - s;
    const maxY = stage.clientHeight - h;
    return {
      x: Math.max(0, Math.min(maxX, x)),
      y: Math.max(0, Math.min(maxY, y)),
    };
  }

  function setFacePos(x, y) {
    const p = clampFace(x, y);
    face.style.left = p.x + "px";
    face.style.top = p.y + "px";
    return p;
  }

  function homePosition() {
    const s = faceSize();
    return {
      x: (stage.clientWidth - s) / 2,
      y: 8,
    };
  }

  function resetFace(animate) {
    cancelAnimationFrame(throwRaf);
    throwRaf = null;
    cast = false;
    face.classList.remove("is-cast", "is-dragging", "is-flying");
    face.style.visibility = "visible";
    face.style.transform = "";
    face.style.opacity = "1";
    face.style.pointerEvents = "auto";
    const home = homePosition();
    if (animate) {
      face.style.transition = "left .35s ease, top .35s ease, opacity .35s ease, transform .35s ease";
    } else {
      face.style.transition = "none";
    }
    setFacePos(home.x, home.y);
    if (hint) hint.hidden = false;
    if (resetBtn) resetBtn.hidden = true;
    pit.classList.remove("is-hot", "is-feeding");
    if (splash) {
      splash.classList.remove("burst");
      splash.innerHTML = "";
    }
    requestAnimationFrame(() => {
      face.style.transition = "";
    });
  }

  function pointInPit(cx, cy) {
    const stageRect = stage.getBoundingClientRect();
    const pitRect = pit.getBoundingClientRect();
    const pitLeft = pitRect.left - stageRect.left;
    const pitTop = pitRect.top - stageRect.top;
    const pitW = pitRect.width;
    const pitH = pitRect.height;
    const ex = pitLeft + pitW / 2;
    const ey = pitTop + pitH * 0.62;
    const rx = pitW * 0.42;
    const ry = pitH * 0.38;
    const dx = (cx - ex) / rx;
    const dy = (cy - ey) / ry;
    return dx * dx + dy * dy <= 1;
  }

  function faceCenter() {
    const s = faceSize();
    const h = faceHeight();
    return {
      x: parseFloat(face.style.left || "0") + s / 2,
      y: parseFloat(face.style.top || "0") + h / 2,
    };
  }

  function showToast() {
    if (!toast) return;
    toast.hidden = false;
    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.hidden = true;
      }, 400);
    }, 1800);
  }

  function burstSplash(cx, cy) {
    if (!splash) return;
    splash.innerHTML = "";
    splash.classList.add("burst");
    const stageRect = stage.getBoundingClientRect();
    const pitRect = pit.getBoundingClientRect();
    splash.style.left = cx - (pitRect.left - stageRect.left) + "px";
    splash.style.top = cy - (pitRect.top - stageRect.top) + "px";

    for (let i = 0; i < 28; i++) {
      const bit = document.createElement("span");
      bit.className = "ember";
      const angle = (Math.PI * 2 * i) / 28 + Math.random() * 0.4;
      const dist = 40 + Math.random() * 110;
      bit.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      bit.style.setProperty("--dy", Math.sin(angle) * dist - 40 + "px");
      bit.style.setProperty("--delay", Math.random() * 0.12 + "s");
      bit.style.setProperty("--size", 4 + Math.random() * 12 + "px");
      bit.style.setProperty("--hue", 8 + Math.random() * 45 + "");
      splash.appendChild(bit);
    }
    const bloom = document.createElement("span");
    bloom.className = "flame-bloom";
    splash.appendChild(bloom);
  }

  function castIntoHell() {
    if (cast) return;
    cast = true;
    dragging = false;
    face.classList.remove("is-dragging", "is-flying");
    face.classList.add("is-cast");
    face.style.pointerEvents = "none";

    const c = faceCenter();
    burstSplash(c.x, c.y);
    spawnHitSparks(c.x, c.y);
    pit.classList.add("is-feeding");
    showToast();

    score += 1;
    if (scoreEl) scoreEl.textContent = String(score);
    if (hint) hint.hidden = true;
    if (resetBtn) resetBtn.hidden = false;

    face.style.transition =
      "transform .55s cubic-bezier(.4,0,.2,1), opacity .45s ease, top .55s ease, left .55s ease";
    const pitRect = pit.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const targetX = pitRect.left - stageRect.left + pitRect.width / 2 - faceSize() / 2;
    const targetY = pitRect.top - stageRect.top + pitRect.height * 0.45;
    setFacePos(targetX, targetY);
    face.style.transform = "scale(0.15) rotate(480deg)";
    face.style.opacity = "0";

    setTimeout(() => {
      face.style.visibility = "hidden";
      face.style.transition = "";
    }, 560);
  }

  function missReturn() {
    face.classList.remove("is-dragging", "is-flying");
    face.style.transition =
      "left .4s cubic-bezier(.2,.8,.2,1), top .4s cubic-bezier(.2,.8,.2,1), transform .35s ease";
    face.style.transform = "";
    const home = homePosition();
    setFacePos(home.x, home.y);
    setTimeout(() => {
      face.style.transition = "";
    }, 420);
  }

  function throwFace() {
    face.classList.add("is-flying");
    face.classList.remove("is-dragging");
    const s = faceSize();
    const h = faceHeight();
    let x = parseFloat(face.style.left || "0");
    let y = parseFloat(face.style.top || "0");
    let vx = velX;
    let vy = velY;
    const gravity = 0.55;
    const friction = 0.985;

    function step() {
      vx *= friction;
      vy = vy * friction + gravity;
      x += vx;
      y += vy;

      const maxX = stage.clientWidth - s;
      const maxY = stage.clientHeight - h;

      if (x < 0) {
        x = 0;
        vx *= -0.4;
      } else if (x > maxX) {
        x = maxX;
        vx *= -0.4;
      }

      face.style.left = x + "px";
      face.style.top = y + "px";
      face.style.transform = `rotate(${vx * 3}deg)`;

      const cx = x + s / 2;
      const cy = y + h / 2;

      if (pointInPit(cx, cy) && vy > 0) {
        castIntoHell();
        return;
      }

      if (y > maxY - 4 || (Math.abs(vx) < 0.4 && Math.abs(vy) < 0.4 && y > stage.clientHeight * 0.55)) {
        if (pointInPit(cx, cy)) {
          castIntoHell();
        } else {
          missReturn();
        }
        return;
      }

      if (y > stage.clientHeight) {
        missReturn();
        return;
      }

      throwRaf = requestAnimationFrame(step);
    }
    throwRaf = requestAnimationFrame(step);
  }

  function onPointerDown(e) {
    if (cast) return;
    e.preventDefault();
    dragging = true;
    pointerId = e.pointerId;
    face.setPointerCapture(pointerId);
    face.classList.add("is-dragging");
    face.style.transition = "none";
    face.style.transform = "scale(1.08)";
    pit.classList.add("is-hot");
    if (hint) hint.hidden = true;

    const stageRect = stage.getBoundingClientRect();
    const left = parseFloat(face.style.left || "0");
    const top = parseFloat(face.style.top || "0");
    offsetX = e.clientX - stageRect.left - left;
    offsetY = e.clientY - stageRect.top - top;
    startX = left;
    startY = top;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = performance.now();
    velX = 0;
    velY = 0;
  }

  function onPointerMove(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    e.preventDefault();
    const stageRect = stage.getBoundingClientRect();
    const x = e.clientX - stageRect.left - offsetX;
    const y = e.clientY - stageRect.top - offsetY;
    setFacePos(x, y);

    const now = performance.now();
    const dt = Math.max(16, now - lastT);
    velX = ((e.clientX - lastX) / dt) * 16;
    velY = ((e.clientY - lastY) / dt) * 16;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = now;

    const c = faceCenter();
    if (pointInPit(c.x, c.y)) {
      pit.classList.add("is-feeding");
    } else {
      pit.classList.remove("is-feeding");
    }
  }

  function onPointerUp(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    try {
      face.releasePointerCapture(pointerId);
    } catch (_) {}
    pointerId = null;
    pit.classList.remove("is-hot");

    const c = faceCenter();
    const speed = Math.hypot(velX, velY);

    if (pointInPit(c.x, c.y)) {
      castIntoHell();
      return;
    }

    if (speed > 4) {
      throwFace();
      return;
    }

    if (pointInPit(c.x, c.y + faceHeight() * 0.2)) {
      castIntoHell();
    } else {
      missReturn();
      if (hint) hint.hidden = false;
    }
  }

  face.addEventListener("pointerdown", onPointerDown);
  face.addEventListener("pointermove", onPointerMove);
  face.addEventListener("pointerup", onPointerUp);
  face.addEventListener("pointercancel", onPointerUp);

  face.querySelector("img")?.addEventListener("dragstart", (e) => e.preventDefault());

  if (resetBtn) {
    resetBtn.addEventListener("click", () => resetFace(true));
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
    if (!dragging && !cast) resetFace(false);
  });

  resizeCanvas();
  resetFace(false);
  requestAnimationFrame(drawFlames);
})();

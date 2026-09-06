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
  let flames = [];
  let W = 400;
  let H = 220;

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

  function initFlames() {
    const count = Math.floor(W / 8);
    flames = [];
    for (let i = 0; i < count; i++) {
      flames.push({
        x: (i / count) * W + Math.random() * 10,
        y: H * 0.55 + Math.random() * H * 0.35,
        baseY: H * 0.7,
        h: 40 + Math.random() * 70,
        w: 10 + Math.random() * 18,
        speed: 0.04 + Math.random() * 0.08,
        phase: Math.random() * Math.PI * 2,
        hue: 10 + Math.random() * 30,
      });
    }
  }

  function drawFlames(t) {
    ctx.clearRect(0, 0, W, H);

    // pit void
    const voidGrad = ctx.createRadialGradient(W / 2, H * 0.85, 10, W / 2, H * 0.7, W * 0.55);
    voidGrad.addColorStop(0, "rgba(0,0,0,0.95)");
    voidGrad.addColorStop(0.5, "rgba(40,0,0,0.85)");
    voidGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = voidGrad;
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.78, W * 0.42, H * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // embers rising
    for (let i = 0; i < 18; i++) {
      const ex = (Math.sin(t * 0.001 + i * 1.7) * 0.5 + 0.5) * W * 0.7 + W * 0.15;
      const ey = H - ((t * 0.05 + i * 37) % (H * 0.9));
      const er = 1 + (i % 3);
      ctx.fillStyle = `rgba(255,${120 + (i % 80)},40,${0.35 + (i % 5) * 0.1})`;
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
    }

    flames.forEach((f, i) => {
      const sway = Math.sin(t * f.speed + f.phase) * 12;
      const flicker = 0.75 + Math.sin(t * f.speed * 2.2 + f.phase) * 0.25;
      const top = f.y - f.h * flicker;
      const midY = (f.y + top) / 2;

      const grad = ctx.createLinearGradient(f.x, f.y, f.x + sway * 0.3, top);
      grad.addColorStop(0, `hsla(${f.hue}, 100%, 45%, 0.95)`);
      grad.addColorStop(0.35, `hsla(${f.hue + 15}, 100%, 55%, 0.85)`);
      grad.addColorStop(0.7, `hsla(${f.hue + 35}, 100%, 65%, 0.55)`);
      grad.addColorStop(1, `hsla(${f.hue + 50}, 100%, 80%, 0)`);

      ctx.beginPath();
      ctx.moveTo(f.x - f.w / 2, f.y);
      ctx.quadraticCurveTo(f.x - f.w * 0.2 + sway, midY, f.x + sway * 0.6, top);
      ctx.quadraticCurveTo(f.x + f.w * 0.3 + sway * 0.4, midY, f.x + f.w / 2, f.y);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // inner white-hot core
      if (i % 2 === 0) {
        ctx.beginPath();
        ctx.moveTo(f.x - f.w * 0.2, f.y);
        ctx.quadraticCurveTo(f.x + sway * 0.3, midY + 10, f.x + sway * 0.4, top + f.h * 0.35);
        ctx.quadraticCurveTo(f.x + f.w * 0.15, midY + 10, f.x + f.w * 0.2, f.y);
        ctx.fillStyle = `rgba(255, 230, 160, ${0.35 * flicker})`;
        ctx.fill();
      }
    });

    // orange glow rim
    const rim = ctx.createRadialGradient(W / 2, H * 0.75, W * 0.15, W / 2, H * 0.7, W * 0.5);
    rim.addColorStop(0, "rgba(255,80,0,0.15)");
    rim.addColorStop(1, "rgba(255,40,0,0)");
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, W, H);

    requestAnimationFrame(drawFlames);
  }

  function faceSize() {
    return face.offsetWidth || 96;
  }

  function clampFace(x, y) {
    const s = faceSize();
    const maxX = stage.clientWidth - s;
    const maxY = stage.clientHeight - s;
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
      y: 12,
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
    const localX = cx;
    const localY = cy;
    const pitLeft = pitRect.left - stageRect.left;
    const pitTop = pitRect.top - stageRect.top;
    const pitW = pitRect.width;
    const pitH = pitRect.height;
    // elliptical hit area in lower portion of pit
    const ex = pitLeft + pitW / 2;
    const ey = pitTop + pitH * 0.62;
    const rx = pitW * 0.42;
    const ry = pitH * 0.38;
    const dx = (localX - ex) / rx;
    const dy = (localY - ey) / ry;
    return dx * dx + dy * dy <= 1;
  }

  function faceCenter() {
    const s = faceSize();
    return {
      x: parseFloat(face.style.left || "0") + s / 2,
      y: parseFloat(face.style.top || "0") + s / 2,
    };
  }

  function showToast() {
    if (!toast) return;
    toast.hidden = false;
    toast.classList.remove("show");
    // force reflow
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

    for (let i = 0; i < 22; i++) {
      const bit = document.createElement("span");
      bit.className = "ember";
      const angle = (Math.PI * 2 * i) / 22 + Math.random() * 0.4;
      const dist = 40 + Math.random() * 90;
      bit.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      bit.style.setProperty("--dy", Math.sin(angle) * dist - 30 + "px");
      bit.style.setProperty("--delay", Math.random() * 0.12 + "s");
      bit.style.setProperty("--size", 4 + Math.random() * 10 + "px");
      bit.style.setProperty("--hue", 10 + Math.random() * 40 + "");
      splash.appendChild(bit);
    }
    // big flame bloom
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
    pit.classList.add("is-feeding");
    showToast();

    score += 1;
    if (scoreEl) scoreEl.textContent = String(score);
    if (hint) hint.hidden = true;
    if (resetBtn) resetBtn.hidden = false;

    // suck face into pit
    face.style.transition = "transform .55s cubic-bezier(.4,0,.2,1), opacity .45s ease, top .55s ease, left .55s ease";
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
    face.style.transition = "left .4s cubic-bezier(.2,.8,.2,1), top .4s cubic-bezier(.2,.8,.2,1), transform .35s ease";
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
      const maxY = stage.clientHeight - s;

      // bounce soft walls
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
      const cy = y + s / 2;

      if (pointInPit(cx, cy) && vy > 0) {
        castIntoHell();
        return;
      }

      // landed past pit without hit, or stopped
      if (y > maxY - 4 || (Math.abs(vx) < 0.4 && Math.abs(vy) < 0.4 && y > stage.clientHeight * 0.55)) {
        if (pointInPit(cx, cy)) {
          castIntoHell();
        } else {
          missReturn();
        }
        return;
      }

      // fell off bottom of stage
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

    // drop directly in pit
    if (pointInPit(c.x, c.y)) {
      castIntoHell();
      return;
    }

    // fling with velocity
    if (speed > 4) {
      // boost downward throws toward pit
      throwFace();
      return;
    }

    // gentle release — check if over pit or snap home
    if (pointInPit(c.x, c.y + faceSize() * 0.2)) {
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

  // prevent image drag ghost
  face.querySelector("img")?.addEventListener("dragstart", (e) => e.preventDefault());

  if (resetBtn) {
    resetBtn.addEventListener("click", () => resetFace(true));
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
    if (!dragging && !cast) resetFace(false);
  });

  // init
  resizeCanvas();
  resetFace(false);
  requestAnimationFrame(drawFlames);
})();

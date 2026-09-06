(function () {
  const canvas = document.getElementById("hellscape-bg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W = 0;
  let H = 0;
  let dpr = 1;
  let mountains = [];
  let flames = [];
  let embers = [];
  let demons = [];
  let t0 = performance.now();

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildMountains();
    initFlames();
    initEmbers();
    initDemons();
  }

  function buildMountains() {
    // layered volcanic ridges (normalized 0..1 across width)
    mountains = [
      {
        yBase: 0.62,
        amp: 0.22,
        color: "#0a0000",
        peaks: [
          [0, 0.35], [0.08, 0.55], [0.16, 0.18], [0.22, 0.42], [0.3, 0.08],
          [0.38, 0.38], [0.48, 0.12], [0.55, 0.45], [0.62, 0.2], [0.72, 0.05],
          [0.8, 0.4], [0.88, 0.22], [0.95, 0.48], [1, 0.3],
        ],
      },
      {
        yBase: 0.7,
        amp: 0.18,
        color: "#120202",
        peaks: [
          [0, 0.4], [0.1, 0.15], [0.2, 0.5], [0.32, 0.1], [0.42, 0.35],
          [0.52, 0.05], [0.62, 0.4], [0.74, 0.12], [0.85, 0.38], [1, 0.2],
        ],
      },
      {
        yBase: 0.78,
        amp: 0.12,
        color: "#1a0500",
        peaks: [
          [0, 0.3], [0.12, 0.55], [0.25, 0.2], [0.4, 0.5], [0.55, 0.15],
          [0.7, 0.45], [0.85, 0.25], [1, 0.4],
        ],
      },
    ];
  }

  function mountainY(layer, nx) {
    const pts = layer.peaks;
    let i = 0;
    while (i < pts.length - 1 && pts[i + 1][0] < nx) i++;
    const a = pts[i];
    const b = pts[Math.min(i + 1, pts.length - 1)];
    const t = b[0] === a[0] ? 0 : (nx - a[0]) / (b[0] - a[0]);
    const smooth = t * t * (3 - 2 * t);
    const h = a[1] + (b[1] - a[1]) * smooth;
    return H * (layer.yBase - h * layer.amp);
  }

  function initFlames() {
    flames = [];
    const count = Math.max(40, Math.floor(W / 18));
    for (let i = 0; i < count; i++) {
      flames.push({
        x: (i / count) * W + Math.random() * 20,
        baseY: H * (0.72 + Math.random() * 0.2),
        h: 30 + Math.random() * 70,
        w: 10 + Math.random() * 24,
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 1.4,
        layer: i % 3, // 0 base red, 1 orange, 2 core
      });
    }
  }

  function initEmbers() {
    embers = [];
    const count = Math.max(55, Math.floor(W / 14));
    for (let i = 0; i < count; i++) {
      embers.push(makeEmber(true));
    }
  }

  function makeEmber(anywhere) {
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : H * (0.55 + Math.random() * 0.4),
      vx: (Math.random() - 0.5) * 0.35,
      vy: -(0.15 + Math.random() * 0.55),
      r: 0.6 + Math.random() * 2.4,
      life: Math.random(),
      maxLife: 2 + Math.random() * 4,
      hue: 15 + Math.random() * 35,
      ash: Math.random() < 0.35,
    };
  }

  function initDemons() {
    demons = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      demons.push({
        x: Math.random() * W,
        y: H * (0.08 + Math.random() * 0.42),
        scale: 0.55 + Math.random() * 0.9,
        speed: 0.35 + Math.random() * 0.85,
        dir: Math.random() < 0.5 ? 1 : -1,
        flap: Math.random() * Math.PI * 2,
        flapSpeed: 3 + Math.random() * 4,
        bob: Math.random() * Math.PI * 2,
        bobAmp: 8 + Math.random() * 18,
        opacity: 0.28 + Math.random() * 0.35,
      });
    }
  }

  function drawSky(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#050000");
    g.addColorStop(0.35, "#120202");
    g.addColorStop(0.55, "#2a0600");
    g.addColorStop(0.75, "#4a0a00");
    g.addColorStop(1, "#1a0200");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // distant lava glow behind mountains
    const glow = ctx.createRadialGradient(W * 0.5, H * 0.78, 10, W * 0.5, H * 0.72, W * 0.7);
    glow.addColorStop(0, "rgba(255,80,10,0.35)");
    glow.addColorStop(0.4, "rgba(180,20,0,0.18)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, H * 0.4, W, H * 0.6);

    // subtle pulsing hell light
    const pulse = 0.5 + Math.sin(t * 0.0008) * 0.15;
    const pulseG = ctx.createRadialGradient(W * 0.72, H * 0.55, 5, W * 0.72, H * 0.55, W * 0.35);
    pulseG.addColorStop(0, `rgba(255,40,0,${0.12 * pulse})`);
    pulseG.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = pulseG;
    ctx.fillRect(0, 0, W, H);
  }

  function drawMountains() {
    for (let mi = 0; mi < mountains.length; mi++) {
      const layer = mountains[mi];
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 6) {
        const nx = x / W;
        ctx.lineTo(x, mountainY(layer, nx));
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = layer.color;
      ctx.fill();

      // ridge lava veins on front-most layers
      if (mi >= 1) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 8) {
          const nx = x / W;
          const y = mountainY(layer, nx);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(255,60,0,${0.08 + mi * 0.06})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  function drawDemon(d, t) {
    const flap = Math.sin(t * 0.001 * d.flapSpeed + d.flap);
    const wingUp = -28 - flap * 22;
    const wingDown = 10 + flap * 8;
    const y = d.y + Math.sin(t * 0.0012 + d.bob) * d.bobAmp;
    const s = d.scale;
    const facing = d.dir;

    ctx.save();
    ctx.translate(d.x, y);
    ctx.scale(facing * s, s);
    ctx.globalAlpha = d.opacity;
    ctx.fillStyle = "#050000";

    // body
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // head + horns
    ctx.beginPath();
    ctx.arc(12, -4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, -10);
    ctx.lineTo(6, -22);
    ctx.lineTo(14, -12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(16, -9);
    ctx.lineTo(20, -20);
    ctx.lineTo(18, -8);
    ctx.closePath();
    ctx.fill();

    // left wing
    ctx.beginPath();
    ctx.moveTo(-2, -2);
    ctx.quadraticCurveTo(-30, wingUp, -48, -6);
    ctx.quadraticCurveTo(-28, 4, -8, 6);
    ctx.closePath();
    ctx.fill();

    // right wing (smaller trailing)
    ctx.beginPath();
    ctx.moveTo(-4, 2);
    ctx.quadraticCurveTo(-24, wingDown + 8, -40, 14);
    ctx.quadraticCurveTo(-20, 10, -6, 8);
    ctx.closePath();
    ctx.fill();

    // tail
    ctx.beginPath();
    ctx.moveTo(-12, 4);
    ctx.quadraticCurveTo(-28, 18, -22, 28);
    ctx.quadraticCurveTo(-18, 18, -10, 8);
    ctx.closePath();
    ctx.fill();

    // glowing eye
    ctx.fillStyle = "rgba(255,40,0,0.85)";
    ctx.beginPath();
    ctx.arc(15, -5, 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawFlamesAlongRidges(t) {
    flames.forEach((f, i) => {
      const nx = f.x / W;
      // sit just above front mountain ridge
      const ridgeY = mountainY(mountains[mountains.length - 1], Math.min(1, Math.max(0, nx)));
      const baseY = Math.min(f.baseY, ridgeY + 8);
      const sway = Math.sin(t * 0.003 * f.speed + f.phase) * 10;
      const flicker = 0.7 + Math.sin(t * 0.008 * f.speed + f.phase) * 0.3;
      const top = baseY - f.h * flicker;
      const midY = (baseY + top) / 2;

      const grad = ctx.createLinearGradient(f.x, baseY, f.x + sway * 0.2, top);
      if (f.layer === 2) {
        grad.addColorStop(0, "rgba(255,200,80,0.55)");
        grad.addColorStop(0.4, "rgba(255,240,200,0.7)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
      } else if (f.layer === 1) {
        grad.addColorStop(0, "rgba(255,90,0,0.5)");
        grad.addColorStop(0.45, "rgba(255,160,30,0.55)");
        grad.addColorStop(1, "rgba(255,200,80,0)");
      } else {
        grad.addColorStop(0, "rgba(160,0,0,0.45)");
        grad.addColorStop(0.4, "rgba(255,40,0,0.4)");
        grad.addColorStop(1, "rgba(255,80,0,0)");
      }

      ctx.globalCompositeOperation = f.layer === 0 ? "source-over" : "lighter";
      ctx.beginPath();
      ctx.moveTo(f.x - f.w / 2, baseY);
      ctx.quadraticCurveTo(f.x - f.w * 0.2 + sway, midY, f.x + sway * 0.5, top);
      ctx.quadraticCurveTo(f.x + f.w * 0.25 + sway * 0.3, midY, f.x + f.w / 2, baseY);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // occasional spark climb
      if (i % 5 === 0) {
        const ey = baseY - ((t * 0.04 * f.speed + i * 40) % (f.h * 1.2));
        ctx.beginPath();
        ctx.arc(f.x + sway * 0.3, ey, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,200,80,0.55)";
        ctx.fill();
      }
    });
  }

  function drawEmbers(dt, t) {
    embers.forEach((e) => {
      e.life += dt;
      e.x += e.vx + Math.sin(t * 0.001 + e.y * 0.01) * 0.2;
      e.y += e.vy;
      if (e.life > e.maxLife || e.y < -10 || e.x < -20 || e.x > W + 20) {
        Object.assign(e, makeEmber(false));
        e.life = 0;
        return;
      }
      const p = e.life / e.maxLife;
      const a = (1 - p) * (e.ash ? 0.35 : 0.7);
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * (1 - p * 0.3), 0, Math.PI * 2);
      if (e.ash) {
        ctx.fillStyle = `rgba(80,60,50,${a})`;
      } else {
        ctx.fillStyle = `hsla(${e.hue},100%,${55 + (1 - p) * 25}%,${a})`;
      }
      ctx.fill();
    });
  }

  function frame(now) {
    const t = now - t0;
    const dt = 0.016;
    ctx.clearRect(0, 0, W, H);
    drawSky(t);
    drawMountains();
    drawFlamesAlongRidges(t);

    demons.forEach((d) => {
      d.x += d.speed * d.dir;
      if (d.dir > 0 && d.x > W + 80) {
        d.x = -80;
        d.y = H * (0.08 + Math.random() * 0.42);
      } else if (d.dir < 0 && d.x < -80) {
        d.x = W + 80;
        d.y = H * (0.08 + Math.random() * 0.42);
      }
      drawDemon(d, t);
    });

    drawEmbers(dt, t);

    // soft readability veil over lower content area (keeps text readable)
    const veil = ctx.createLinearGradient(0, 0, 0, H);
    veil.addColorStop(0, "rgba(0,0,0,0.15)");
    veil.addColorStop(0.35, "rgba(0,0,0,0.05)");
    veil.addColorStop(0.7, "rgba(0,0,0,0.25)");
    veil.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, W, H);

    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
})();

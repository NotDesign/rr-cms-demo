/* Drifting embers and fractal lightning with brief, localised bloom. No flame sheets. */
(() => {
  'use strict';
  const canvas = document.querySelector('#energy');
  const ctx = canvas.getContext('2d');
  const button = document.querySelector('#motion');
  if (!ctx) { button.disabled = true; button.textContent = '特效不可用'; return; }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const qa = new URLSearchParams(location.search).has('effects-test');
  const random = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const caps = Object.freeze({ particles: 128, flames: 0, bolts: 1, branches: 5, points: 65 });
  const base = { intensity: .7, hue: 108, particleDensity: 1, lightning: 1, energyLeft: .6, energyRight: 1.04, lightningLeft: .62, lightningRight: 1.02, lightningHeight: 1 };
  const profile = { ...base };
  let sceneMix = { fromId: null, toId: null, blend: 0 };
  let width = 0, height = 0, dpr = 1, tier = 'desktop', budget = 128;
  let lowPower = false, fpsTarget = 30, slowFrames = 0, averageDrawMs = 0;
  let manualPause = false, frame = 0, lastRender = null, elapsed = 0, renderedFrames = 0;
  let glassArea = null, safeAreas = [];
  let nextBolt = random(.35, .85), boltSequence = 0;
  const history = [];
  const particles = Array.from({ length: caps.particles }, () => ({}));
  const paths = Array.from({ length: caps.branches + 1 }, () => ({ count: 0, strength: 1, points: new Float32Array(caps.points * 2) }));
  const bolt = { active: false, age: 0, duration: .4, afterDelay: .16, afterStrength: .28, decay: .06, count: 0 };
  const paused = () => manualPause || reduced.matches;
  const canAnimate = () => !paused() && !document.hidden;

  function makeGlow(size, stops) {
    const sprite = document.createElement('canvas'); sprite.width = sprite.height = size;
    const paint = sprite.getContext('2d'), radius = size / 2;
    const glow = paint.createRadialGradient(radius, radius, 0, radius, radius, radius);
    stops.forEach(([offset, color]) => glow.addColorStop(offset, color));
    paint.fillStyle = glow; paint.fillRect(0, 0, size, size); return sprite;
  }
  const emberSprites = [
    makeGlow(32, [[0, '#cfff9e'], [.12, 'rgba(171,255,110,.95)'], [.35, 'rgba(112,238,66,.28)'], [1, 'rgba(90,218,48,0)']]),
    makeGlow(32, [[0, '#a5ff8b'], [.12, 'rgba(140,255,108,.9)'], [.35, 'rgba(92,238,75,.22)'], [1, 'rgba(74,218,62,0)']])
  ];
  const lightningGlow = makeGlow(256, [[0, 'rgba(207,255,169,.65)'], [.16, 'rgba(153,255,129,.38)'], [.44, 'rgba(89,214,72,.13)'], [1, 'rgba(70,198,57,0)']]);

  function resetParticle(p, seed = false) {
    p.duration = random(3.2, 7.6); p.life = seed ? random(0, p.duration) : 0;
    p.x = random(0, 1); p.travel = random(.25, .68); p.drift = random(-.05, .035);
    p.size = random(5, 12); p.phase = random(0, Math.PI * 2);
    p.sprite = Math.random() < .65 ? 0 : 1; p.stretch = random(1, 1.65);
  }
  particles.forEach(p => resetParticle(p, true));

  function measureSafety() {
    const r = document.querySelector('.login-card').getBoundingClientRect();
    glassArea = { x: r.x, y: r.y, width: r.width, height: r.height };
    safeAreas = [...document.querySelectorAll('dialog[open]')].map(el => {
      const box = el.getBoundingClientRect();
      return { x: box.x - 16, y: box.y - 16, width: box.width + 32, height: box.height + 32 };
    });
  }
  function resize() {
    width = innerWidth; height = innerHeight;
    tier = width < 600 ? 'mobile' : width < 1200 ? 'tablet' : 'desktop';
    budget = lowPower ? 36 : tier === 'mobile' ? 56 : tier === 'tablet' ? 88 : 128;
    dpr = Math.min(devicePixelRatio || 1, lowPower ? 1 : 1.5);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    measureSafety(); if (!document.hidden) render();
  }
  function setPoint(path, i, x, y) { path.points[i * 2] = x; path.points[i * 2 + 1] = y; }
  function fracture(path, startX, startY, endX, endY, depth, roughness) {
    // Subdivide in screen pixels: the same irregular angles survive narrow viewports.
    const sx = width * (profile.lightningRight - profile.lightningLeft);
    const sy = height * profile.lightningHeight;
    const segments = 2 ** depth; path.count = segments + 1;
    setPoint(path, 0, startX, startY); setPoint(path, segments, endX, endY);
    function split(first, last, ax, ay, bx, by, offset) {
      if (last - first < 2) return;
      const dx = bx - ax, dy = by - ay, length = Math.hypot(dx, dy) || 1;
      const middle = (first + last) / 2, along = random(.38, .62), bend = random(-offset, offset);
      const mx = ax + dx * along - dy / length * bend;
      const my = ay + dy * along + dx / length * bend;
      setPoint(path, middle, mx / sx, my / sy);
      split(first, middle, ax, ay, mx, my, offset * .48);
      split(middle, last, mx, my, bx, by, offset * .48);
    }
    split(0, segments, startX * sx, startY * sy, endX * sx, endY * sy,
      Math.hypot((endX - startX) * sx, (endY - startY) * sy) * roughness);
  }
  function newBolt() {
    const main = paths[0]; main.strength = 1;
    const startX = random(.3, .88), endX = clamp(startX + random(-.32, .22), .08, .96);
    fracture(main, startX, random(-.045, .015), endX, random(.22, .42), 5, random(.12, .23));
    bolt.count = Math.floor(random(3, caps.branches + 1)) + 1;
    for (let j = 1; j < bolt.count; j++) {
      const path = paths[j], origin = Math.floor(random(5, main.count - 6));
      const ox = main.points[origin * 2], oy = main.points[origin * 2 + 1];
      const direction = Math.random() < .5 ? -1 : 1;
      path.strength = random(.3, .65);
      fracture(path, ox, oy, ox + direction * random(.08, .26), oy + random(.035, .13), 4, random(.13, .24));
    }
    bolt.active = true; bolt.age = 0;
    bolt.decay = random(.045, .075); bolt.afterDelay = random(.13, .2); bolt.afterStrength = random(.2, .34);
    bolt.duration = bolt.afterDelay + random(.16, .23);
    canvas.dataset.lightning = 'active'; boltSequence++;
    if (qa) {
      history.push({ id: boltSequence, start: elapsed, duration: bolt.duration, branches: bolt.count - 1,
        afterDelay: bolt.afterDelay, afterStrength: bolt.afterStrength, points: main.count,
        signature: Array.from(main.points.slice(0, main.count * 2), n => +n.toFixed(3)).join(',') });
      if (history.length > 12) history.shift();
    }
  }
  function update(delta) {
    elapsed += delta;
    for (let i = 0; i < budget; i++) {
      const p = particles[i]; p.life += delta;
      if (p.life >= p.duration) resetParticle(p);
    }
    if (bolt.active) {
      bolt.age += delta;
      if (bolt.age >= bolt.duration) {
        bolt.active = false; canvas.dataset.lightning = 'idle';
        nextBolt = elapsed + random(1.1, 2.4);
      }
    } else if (elapsed >= nextBolt) newBolt();
  }
  function envelope(age, decay) {
    if (age < 0) return 0;
    return Math.min(1, (age + .012) / .018) * Math.exp(-age / decay);
  }
  function drawLightning() {
    if (!bolt.active || reduced.matches) return;
    const alpha = clamp(envelope(bolt.age, bolt.decay) + bolt.afterStrength * envelope(bolt.age - bolt.afterDelay, .045), 0, 1);
    const intensity = alpha * profile.lightning * profile.intensity;
    const xAt = (p, k) => width * (profile.lightningLeft + p.points[k * 2] * (profile.lightningRight - profile.lightningLeft));
    const yAt = (p, k) => height * p.points[k * 2 + 1] * profile.lightningHeight;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // Diffuse cloud illumination sits behind the channel and vanishes with the flash.
    const radius = clamp(Math.min(width, height) * .19, 65, 180);
    const main = paths[0]; ctx.globalAlpha = intensity * .62;
    for (const fraction of [.12, .42, .7]) {
      const k = Math.floor((main.count - 1) * fraction), x = xAt(main, k), y = yAt(main, k);
      ctx.drawImage(lightningGlow, x - radius, y - radius * .72, radius * 2, radius * 1.44);
    }
    for (let i = 0; i < bolt.count; i++) {
      const p = paths[i]; ctx.globalAlpha = intensity * p.strength; ctx.beginPath();
      for (let k = 0; k < p.count; k++) {
        const x = xAt(p, k), y = yAt(p, k);
        if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = 'rgba(102,238,88,.18)'; ctx.lineWidth = i ? 5 : 13;
      ctx.shadowColor = '#9dff75'; ctx.shadowBlur = lowPower ? 12 : 30; ctx.stroke();
      ctx.strokeStyle = 'rgba(180,255,146,.42)'; ctx.lineWidth = i ? 1.8 : 4;
      ctx.shadowBlur = lowPower ? 5 : 12; ctx.stroke();
      ctx.shadowBlur = 4; ctx.strokeStyle = '#c9ff9b';
      // A hot trunk narrows towards the tip; the branches are finer and dimmer.
      for (let k = 1; k < p.count; k++) {
        ctx.beginPath(); ctx.moveTo(xAt(p, k - 1), yAt(p, k - 1)); ctx.lineTo(xAt(p, k), yAt(p, k));
        ctx.lineWidth = (i ? .85 : 1.6) * (1 - .65 * k / p.count); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function render() {
    const start = performance.now();
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < budget; i++) {
      const weight = clamp(profile.particleDensity * budget - i, 0, 1); if (!weight) continue;
      const p = particles[i], t = p.life / p.duration;
      const x = width * (profile.energyLeft + p.x * (profile.energyRight - profile.energyLeft) + p.drift * t) + Math.sin(t * 5 + p.phase) * 9;
      const y = height * (1.04 - p.travel * t);
      ctx.globalAlpha = Math.sin(Math.PI * t) * profile.intensity * weight * .9;
      const h = p.size * p.stretch;
      ctx.drawImage(emberSprites[p.sprite], x - p.size / 2, y - h / 2, p.size, h);
    }
    ctx.globalAlpha = 1; drawLightning();
    // Keep real pixels behind the glass, with lower contrast under form text.
    if (glassArea) {
      ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.roundRect(glassArea.x, glassArea.y, glassArea.width, glassArea.height, 32); ctx.fill(); ctx.restore();
    }
    safeAreas.forEach(r => ctx.clearRect(r.x, r.y, r.width, r.height));
    renderedFrames++; averageDrawMs = averageDrawMs * .95 + (performance.now() - start) * .05;
  }
  function tick(time) {
    frame = 0; if (!canAnimate()) return;
    if (lastRender === null) lastRender = time;
    const delta = (time - lastRender) / 1000;
    if (delta >= 1 / fpsTarget - .001) {
      lastRender = time; update(Math.min(delta, .1)); render();
      slowFrames = averageDrawMs > 10 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (!lowPower && slowFrames >= 45) { lowPower = true; fpsTarget = 20; resize(); }
    }
    frame = requestAnimationFrame(tick);
  }
  function syncMotion() {
    cancelAnimationFrame(frame); frame = 0; lastRender = null;
    document.body.classList.toggle('paused', paused());
    button.setAttribute('aria-pressed', String(paused()));
    button.setAttribute('aria-disabled', String(reduced.matches));
    button.title = reduced.matches ? '已遵循系統的減少動態效果設定。' : '暫停或播放粒子與閃電';
    button.innerHTML = `<span aria-hidden="true">${paused() ? '▷' : 'Ⅱ'}</span> ${reduced.matches ? '已減少動效' : manualPause ? '播放特效' : '暫停特效'}`;
    if (reduced.matches) { bolt.active = false; canvas.dataset.lightning = 'idle'; }
    document.dispatchEvent(new CustomEvent('rr:motion', { detail: { paused: paused(), reduced: reduced.matches } }));
    if (!document.hidden) render();
    if (canAnimate()) frame = requestAnimationFrame(tick);
  }
  document.addEventListener('rr:scene-blend', event => {
    const { from, to, blend, fromId, toId } = event.detail;
    const mix = clamp(blend, 0, 1);
    for (const key of Object.keys(base)) profile[key] = (from[key] ?? base[key]) * (1 - mix) + (to[key] ?? base[key]) * mix;
    sceneMix = { fromId, toId, blend: mix };
    if (!canAnimate() && !document.hidden) render();
  });
  button.addEventListener('click', () => { if (!reduced.matches) manualPause = !manualPause; syncMotion(); });
  reduced.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('resize', resize);
  const refreshSafety = () => { measureSafety(); if (!document.hidden) render(); };
  window.addEventListener('scroll', refreshSafety, { passive: true });
  const observer = new ResizeObserver(refreshSafety);
  document.querySelectorAll('.login-card,#modal').forEach(el => observer.observe(el));
  new MutationObserver(refreshSafety).observe(document.querySelector('#modal'), { attributes: true, attributeFilter: ['open'] });
  if (qa) Object.defineProperty(window, '__rrEffects', { value: Object.freeze({ snapshot: () => ({
    tier, profile: { ...profile }, sceneMix: { ...sceneMix }, particleCount: budget,
    visibleParticleBudget: Math.ceil(budget * clamp(profile.particleDensity, 0, 1)), flameCount: 0, haze: false,
    lightningStyle: 'fractal-green-core-local-bloom', lightningBloom: bolt.active && !reduced.matches,
    caps, elapsed, renderedFrames, fpsTarget, lowPower, averageDrawMs, dpr,
    running: canAnimate(), reduced: reduced.matches, hidden: document.hidden, pendingFrame: !!frame,
    boltActive: bolt.active, boltAge: bolt.age, boltDuration: bolt.duration, boltSequence, nextBolt,
    history: history.map(item => ({ ...item })), glassArea: { ...glassArea }, safeAreas: safeAreas.map(r => ({ ...r }))
  }) }) });
  resize(); syncMotion();
})();

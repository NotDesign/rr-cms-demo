(() => {
  'use strict';
  const config = window.RR_SCENES;
  const host = document.querySelector('.backdrop');
  const toolbar = document.querySelector('#scene-controls');
  const previousButton = document.querySelector('#scene-previous');
  const nextButton = document.querySelector('#scene-next');
  const pauseButton = document.querySelector('#scene-pause');
  const label = document.querySelector('#scene-label');
  const status = document.querySelector('#scene-status');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let slides = [], failures = [], current = 0, transition = null, progress = 0;
  let autoPaused = false, transitionPaused = false, globalPaused = reduced.matches;
  let focused = false, hovering = false, frame = 0, previousTime = null, remaining = config.intervalMs;
  const motionAllowed = () => !reduced.matches && !globalPaused && !document.hidden;
  const autoAllowed = () => motionAllowed() && !autoPaused && !focused && !hovering && slides.length > 1;
  function weights() {
    if (!slides.length) return;
    let from = slides[current], to = from, blend = 0;
    if (transition) {
      from = slides[transition.from];to = slides[transition.to];
      blend = progress * progress * (3 - 2 * progress);
    }
    // Keep the outgoing image opaque below the incoming one: effective visual weights are (1-blend, blend), avoiding a dark dip or additive brightness peak.
    slides.forEach((slide, index) => {
      const opacity = transition ? index === transition.from ? 1 : index === transition.to ? blend : 0 : index === current ? 1 : 0;
      slide.image.style.opacity = String(opacity);
      slide.image.style.zIndex = transition && index === transition.to ? '2' : '1';
    });
    document.dispatchEvent(new CustomEvent('rr:scene-blend', { detail: {
      from: from.effect, to: to.effect, blend, fromId: from.id, toId: to.id
    } }));
  }
  function updateControls() {
    const usable = slides.length > 1;
    previousButton.disabled = !usable;nextButton.disabled = !usable;
    pauseButton.disabled = !usable || reduced.matches;
    const paused = autoPaused || globalPaused || reduced.matches;
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.textContent = reduced.matches ? '減少動態' : paused ? '播放輪播' : '暫停輪播';
    const selected = transition ? transition.to : current;
    label.textContent = slides.length ? `${selected + 1} / ${slides.length}` : '載入中';
    toolbar.setAttribute('aria-label', slides.length ? `背景輪播，目前${slides[selected].label}` : '背景輪播，載入中');
  }
  function settle(index, announce) {
    current = index;transition = null;progress = 0;remaining = config.intervalMs;
    weights();updateControls();
    if (announce) status.textContent = `背景已切換為${slides[current].label}。`;
  }
  function start(index, manual = false) {
    if (slides.length < 2) return;
    index = (index + slides.length) % slides.length;
    if (manual) { autoPaused = true;transitionPaused = false; }
    if (transition) {
      // For this two-slide carousel, reversing a fade preserves its current weights.
      if (index === transition.from) {
        [transition.from, transition.to] = [transition.to, transition.from];
        progress = 1 - progress;transition.announce = manual;
      }
    } else if (index !== current) transition = { from: current, to: index, announce: manual };
    if (!motionAllowed() && transition) settle(index, manual);
    updateControls();schedule();
  }
  function tick(time) {
    frame = 0;
    const delta = previousTime === null ? 0 : Math.min(time - previousTime, 100);
    previousTime = time;
    if (transition && motionAllowed() && !transitionPaused) {
      progress = Math.min(1, progress + delta / config.fadeMs);weights();
      if (progress === 1) settle(transition.to, transition.announce);
    } else if (!transition && autoAllowed()) {
      remaining -= delta;
      if (remaining <= 0) { start((current + 1) % slides.length);return; }
    }
    if ((transition && motionAllowed() && !transitionPaused) || autoAllowed()) frame = requestAnimationFrame(tick);
  }
  function schedule() {
    cancelAnimationFrame(frame);frame = 0;previousTime = null;
    if ((transition && motionAllowed() && !transitionPaused) || autoAllowed()) frame = requestAnimationFrame(tick);
  }
  function move(direction) { start((transition ? transition.to : current) + direction, true); }
  previousButton.addEventListener('click', () => move(-1));nextButton.addEventListener('click', () => move(1));
  pauseButton.addEventListener('click', () => {
    if (pauseButton.disabled) return;
    autoPaused = !autoPaused;transitionPaused = autoPaused;updateControls();schedule();
  });
  toolbar.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key) || slides.length < 2) return;
    event.preventDefault();
    if (event.key === 'Home') start(0, true);
    else if (event.key === 'End') start(slides.length - 1, true);
    else move(event.key === 'ArrowLeft' ? -1 : 1);
  });
  toolbar.addEventListener('pointerenter', () => { hovering = true;schedule(); });
  toolbar.addEventListener('pointerleave', () => { hovering = false;schedule(); });
  document.addEventListener('focusin', () => {
    focused = !!document.activeElement?.closest('main,#scene-controls,dialog');schedule();
  });
  document.addEventListener('focusout', () => queueMicrotask(() => {
    focused = !!document.activeElement?.closest('main,#scene-controls,dialog');schedule();
  }));
  document.addEventListener('visibilitychange', schedule);
  document.addEventListener('rr:motion', event => {
    globalPaused = event.detail.paused;updateControls();schedule();
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches && transition) settle(transition.to, transition.announce);
    updateControls();schedule();
  });
  async function loadImage(src) {
    const image = new Image();image.src = src;await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Invalid image');
    return image;
  }
  (async () => {
    // Load only the specifically configured, verified sources; never guess a substitute.
    for (const item of config.slides) {
      if (!item.src || !(item.libraryId || item.source)) { failures.push(item.id);continue; }
      try {
        const image = await loadImage(item.src);image.className = 'scene-image';image.alt = '';
        image.dataset.scene = item.id;image.style.opacity = '0';host.append(image);slides.push({ ...item, image });
      } catch { failures.push(item.id); }
    }
    try {
      const image = await loadImage(config.logo.src), logo = document.querySelector('.brand');
      logo.src = image.src;logo.hidden = false;document.querySelector('.brand-placeholder').hidden = true;
    } catch { /* Keep the explicitly labelled placeholder while source bytes are unavailable. */ }
    weights();updateControls();schedule();
    status.textContent = failures.length ? '部分背景無法載入，請確認本機素材檔案。' : '背景已載入。';
  })();
  updateControls();
  if (new URLSearchParams(location.search).has('effects-test')) {
    Object.defineProperty(window, '__rrCarousel', { value: Object.freeze({ snapshot: () => ({
      loaded: slides.map(s => s.id), failures: [...failures], current, transition: transition && { ...transition },
      progress, remaining, autoPaused, globalPaused, reduced: reduced.matches, running: !!frame,
      weights: slides.map((s, index) => { const mix = progress * progress * (3 - 2 * progress);return transition ? index === transition.from ? 1 - mix : index === transition.to ? mix : 0 : index === current ? 1 : 0; }), calibratedAgainstImages: config.calibratedAgainstImages
    }) }) });
  }
})();

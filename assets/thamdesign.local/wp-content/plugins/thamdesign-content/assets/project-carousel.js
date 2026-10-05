(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const initialized = new WeakSet();
  const AUTOPLAY_DELAY = 4200;

  function initialize(view) {
    if (initialized.has(view)) return;
    const track = view.querySelector('.work-grid');
    const cards = [...track?.querySelectorAll('.work-card') || []];
    if (!track || !cards.length) return;
    initialized.add(view);

    const modes = [...view.querySelectorAll('[data-project-mode]')];
    const navigation = view.querySelector('[data-project-navigation]');
    const previous = view.querySelector('[data-project-step="-1"]');
    const next = view.querySelector('[data-project-step="1"]');
    const counter = view.querySelector('.tham-project-position');
    const toolbar = view.querySelector('.tham-project-toolbar');
    let frame;
    let resumeAt = 0;
    let pointerInside = false;
    let keyboardInside = false;
    let normalizing = false;

    const ensureClones = () => {
      if (track.querySelector('.is-carousel-clone')) return;
      // A duplicate sequence makes the change from the final card back to the first seamless.
      cards.forEach((card) => {
        const clone = card.cloneNode(true);
        clone.classList.add('is-carousel-clone');
        clone.setAttribute('aria-hidden', 'true');
        clone.querySelectorAll('a, button, input, select, textarea').forEach((element) => element.setAttribute('tabindex', '-1'));
        track.append(clone);
      });
    };
    const removeClones = () => track.querySelectorAll('.is-carousel-clone').forEach((clone) => clone.remove());

    const metrics = () => {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const step = cards[0].getBoundingClientRect().width + gap;
      return { step, visible: Math.max(1, Math.round((track.clientWidth + gap) / step)) };
    };
    const isCarousel = () => view.classList.contains('is-carousel');
    const isPaused = () => reducedMotion.matches || document.hidden || pointerInside || keyboardInside || Date.now() < resumeAt;
    const resetTo = (left) => {
      normalizing = true;
      track.scrollTo({ left, behavior: 'instant' });
      requestAnimationFrame(() => { normalizing = false; });
    };
    const update = () => {
      const carousel = isCarousel();
      navigation.hidden = !carousel;
      modes.forEach((button) => button.setAttribute('aria-pressed', String((button.dataset.projectMode === 'carousel') === carousel)));
      const { step, visible } = metrics();
      const index = Math.max(0, Math.round(track.scrollLeft / step)) % cards.length;
      const end = ((index + visible - 1) % cards.length) + 1;
      previous.disabled = !carousel;
      next.disabled = !carousel;
      counter.textContent = `${index + 1}–${end} / ${cards.length}`;
    };
    const move = (direction, immediate = false) => {
      if (!isCarousel()) return;
      const { step } = metrics();
      const cycle = cards.length * step;
      if (direction < 0 && track.scrollLeft <= 1) resetTo(cycle);
      track.scrollBy({ left: direction * step, behavior: immediate || reducedMotion.matches ? 'instant' : 'smooth' });
    };
    const autoplay = () => {
      if (!isCarousel() || isPaused()) return;
      const { step } = metrics();
      const cycle = cards.length * step;
      if (track.scrollLeft >= cycle - step / 2) resetTo(0);
      move(1);
    };

    modes.forEach((button) => button.addEventListener('click', () => {
      const useCarousel = button.dataset.projectMode === 'carousel';
      view.classList.toggle('is-carousel', useCarousel);
      if (useCarousel) ensureClones(); else removeClones();
      resetTo(0);
      resumeAt = Date.now() + AUTOPLAY_DELAY;
      update();
    }));
    previous.addEventListener('click', () => { resumeAt = Date.now() + AUTOPLAY_DELAY; move(-1); });
    next.addEventListener('click', () => { resumeAt = Date.now() + AUTOPLAY_DELAY; move(1); });
    track.addEventListener('keydown', (event) => {
      if (event.target !== track || !isCarousel()) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        resumeAt = Date.now() + AUTOPLAY_DELAY;
        move(event.key === 'ArrowRight' ? 1 : -1);
      }
    });
    track.addEventListener('pointerenter', () => { pointerInside = true; });
    track.addEventListener('pointerleave', () => { pointerInside = false; });
    track.addEventListener('pointerdown', () => { resumeAt = Date.now() + AUTOPLAY_DELAY; }, { passive: true });
    track.addEventListener('focusin', () => { keyboardInside = true; });
    track.addEventListener('focusout', () => { keyboardInside = false; });
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const { step } = metrics();
        const cycle = cards.length * step;
        if (isCarousel() && !normalizing && track.scrollLeft >= cycle - step / 3) resetTo(track.scrollLeft - cycle);
        update();
      });
    }, { passive: true });
    new ResizeObserver(() => {
      if (!isCarousel()) return update();
      const { step } = metrics();
      const index = Math.round(track.scrollLeft / step) % cards.length;
      resetTo(index * step);
      update();
    }).observe(track);
    reducedMotion.addEventListener('change', update);
    if (isCarousel()) ensureClones();
    toolbar.hidden = false;
    window.setInterval(autoplay, AUTOPLAY_DELAY);
    update();
  }

  const scan = () => document.querySelectorAll('[data-project-view]').forEach(initialize);
  scan();
  new MutationObserver(scan).observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
})();

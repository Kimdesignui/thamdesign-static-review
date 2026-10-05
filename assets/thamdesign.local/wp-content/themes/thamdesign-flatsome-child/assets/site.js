const header = document.querySelector('.site-header');
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');

toggle?.addEventListener('click', () => {
	const isOpen = nav.classList.toggle('is-open');
	toggle.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('.main-nav a').forEach((link) => {
	link.addEventListener('click', () => {
		nav.classList.remove('is-open');
		toggle?.setAttribute('aria-expanded', 'false');
	});
});

const setHeaderState = () => {
	header?.classList.toggle('is-scrolled', window.scrollY > 24);
};

setHeaderState();
window.addEventListener('scroll', setHeaderState, { passive: true });

// Animate on entry without hiding content when JavaScript is unavailable.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const activeReveals = new Set();
const revealedElements = new WeakSet();
let revealObserver;

const setupReveals = () => {
	revealObserver?.disconnect();
	if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
	revealObserver = new IntersectionObserver((entries) => {
		entries.forEach(({ target, isIntersecting }) => {
			if (!isIntersecting || revealedElements.has(target)) return;
			revealedElements.add(target);
			revealObserver.unobserve(target);
			if (typeof target.animate !== 'function') return;
			const siblings = [...target.parentElement.children];
			const stagger = target.matches('.work-card, .news-card, .article-card, .service-card');
			const animation = target.animate([
				{ opacity: 0.3, transform: 'translateY(14px)' },
				{ opacity: 1, transform: 'translateY(0)' },
			], {
				duration: 480,
				delay: stagger ? Math.min(siblings.indexOf(target), 2) * 65 : 0,
				easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
			});
			activeReveals.add(animation);
			animation.finished.catch(() => {}).finally(() => activeReveals.delete(animation));
		});
	}, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
	document.querySelectorAll('main .hero-copy, main .hero-art, main .page-hero, main .section-heading, main .service-card, main .work-card, main .article-card, main .news-card, main .service-detail, main .contact-panel, main .contact-form-shell').forEach((element) => {
		if (!revealedElements.has(element)) revealObserver.observe(element);
	});
};

const heroArt = document.querySelector('.site-home-hero .hero-art');
const tiltClasses = ['portrait-left', 'portrait-right', 'portrait-up', 'portrait-down'];
let pointerFrame;
let pointerPosition;
const resetPortrait = () => {
	cancelAnimationFrame(pointerFrame);
	pointerFrame = undefined;
	heroArt?.classList.remove(...tiltClasses);
};

heroArt?.addEventListener('pointermove', (event) => {
	if (reducedMotion.matches || !finePointer.matches) return;
	pointerPosition = { x: event.clientX, y: event.clientY };
	if (pointerFrame !== undefined) return;
	pointerFrame = requestAnimationFrame(() => {
		pointerFrame = undefined;
		const rect = heroArt.getBoundingClientRect();
		const x = (pointerPosition.x - rect.left) / rect.width;
		const y = (pointerPosition.y - rect.top) / rect.height;
		heroArt.classList.toggle('portrait-left', x < 0.4);
		heroArt.classList.toggle('portrait-right', x > 0.6);
		heroArt.classList.toggle('portrait-up', y < 0.4);
		heroArt.classList.toggle('portrait-down', y > 0.6);
	});
}, { passive: true });
heroArt?.addEventListener('pointerleave', resetPortrait);
finePointer.addEventListener('change', resetPortrait);
reducedMotion.addEventListener('change', () => {
	activeReveals.forEach((animation) => animation.cancel());
	resetPortrait();
	setupReveals();
});
setupReveals();

// Desktop motion is decorative only: touch devices and reduced-motion users keep the static layout.
const motionRoot = document.documentElement;
const interactiveCards = document.querySelectorAll('.work-card, .service-card, .news-card');
let motionFrame;
let latestPointer;
let pointerMotionController;
let previousPointer;

const clearCardTilt = (card) => {
	card.style.removeProperty('--card-rotate-x');
	card.style.removeProperty('--card-rotate-y');
	card.classList.remove('has-pointer-tilt');
};

const clearPointerMotion = () => {
	cancelAnimationFrame(motionFrame);
	motionFrame = undefined;
	pointerMotionController?.abort();
	pointerMotionController = undefined;
	motionRoot.classList.remove('has-fine-pointer');
	document.querySelector('.pointer-aura')?.remove();
	document.querySelectorAll('.pointer-ink-mark').forEach((mark) => mark.remove());
	interactiveCards.forEach(clearCardTilt);
	motionRoot.style.removeProperty('--hero-parallax');
};

const setupPointerMotion = () => {
	clearPointerMotion();
	if (reducedMotion.matches || !finePointer.matches) return;

	motionRoot.classList.add('has-fine-pointer');
	pointerMotionController = new AbortController();
	const aura = document.createElement('div');
	aura.className = 'pointer-aura';
	aura.setAttribute('aria-hidden', 'true');
	const pencil = document.createElement('span');
	pencil.className = 'pointer-pencil';
	aura.append(pencil);
	document.body.append(aura);

	window.addEventListener('pointermove', (event) => {
		latestPointer = { x: event.clientX, y: event.clientY, target: event.target };
		if (motionFrame !== undefined) return;
		motionFrame = requestAnimationFrame(() => {
			motionFrame = undefined;
			aura.style.setProperty('--pointer-x', `${latestPointer.x}px`);
			aura.style.setProperty('--pointer-y', `${latestPointer.y}px`);
			const deltaX = previousPointer ? latestPointer.x - previousPointer.x : 0;
			const tilt = Math.max(-16, Math.min(16, deltaX * 1.5));
			aura.style.setProperty('--pencil-tilt', `${tilt - 18}deg`);
			aura.style.setProperty('--pencil-scale', latestPointer.target?.closest?.('a, button, .work-card, .service-card, .news-card') ? '1.1' : '1');
			previousPointer = latestPointer;
		});
	}, { passive: true, signal: pointerMotionController.signal });

	window.addEventListener('pointerdown', (event) => {
		if (event.button !== 0) return;
		const mark = document.createElement('span');
		mark.className = 'pointer-ink-mark';
		mark.setAttribute('aria-hidden', 'true');
		mark.style.setProperty('--ink-x', `${event.clientX}px`);
		mark.style.setProperty('--ink-y', `${event.clientY}px`);
		document.body.append(mark);
		mark.addEventListener('animationend', () => mark.remove(), { once: true });
	}, { passive: true, signal: pointerMotionController.signal });

	interactiveCards.forEach((card) => {
		card.addEventListener('pointermove', (event) => {
			const rect = card.getBoundingClientRect();
			const rotateY = ((event.clientX - rect.left) / rect.width - 0.5) * 3;
			const rotateX = ((event.clientY - rect.top) / rect.height - 0.5) * -3;
			card.style.setProperty('--card-rotate-x', `${rotateX.toFixed(2)}deg`);
			card.style.setProperty('--card-rotate-y', `${rotateY.toFixed(2)}deg`);
			card.classList.add('has-pointer-tilt');
		}, { passive: true, signal: pointerMotionController.signal });
		card.addEventListener('pointerleave', () => clearCardTilt(card), { signal: pointerMotionController.signal });
	});

	const setHeroParallax = () => {
		const offset = Math.min(window.scrollY * -0.035, 26);
		motionRoot.style.setProperty('--hero-parallax', `${offset.toFixed(1)}px`);
	};
	setHeroParallax();
	window.addEventListener('scroll', setHeroParallax, { passive: true, signal: pointerMotionController.signal });
};

finePointer.addEventListener('change', setupPointerMotion);
reducedMotion.addEventListener('change', setupPointerMotion);
setupPointerMotion();

// Discourage casual copying of portfolio imagery while keeping the native lightbox usable.
document.addEventListener('contextmenu', (event) => {
	if (event.target.closest('[data-protected-project-media], .mfp-wrap')) event.preventDefault();
});
document.addEventListener('dragstart', (event) => {
	if (event.target.closest('[data-protected-project-media], .mfp-wrap')) event.preventDefault();
});

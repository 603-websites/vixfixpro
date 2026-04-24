// Mobile nav toggle
const toggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

toggle?.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

navLinks?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// Sticky nav — add .scrolled class after 80px scroll
const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  header?.classList.toggle('scrolled', window.scrollY > 80);
}, { passive: true });

// Smooth scroll for anchor links — skip Free Estimate triggers (modal handles them)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    if (anchor.hasAttribute('data-estimate-trigger')) return;
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Estimate modal — open/close, focus trap, body scroll lock, Esc to close
function initEstimateModal() {
  const modal = document.getElementById('estimate-modal');
  if (!modal) return;

  const card = modal.querySelector('.modal-card');
  const closeBtn = modal.querySelector('.modal-close');
  const focusableSel = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
  let lastTrigger = null;

  function open(trigger) {
    lastTrigger = trigger || null;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('modal-open'));
    document.body.classList.add('modal-lock');
    modal.setAttribute('aria-hidden', 'false');
    const first = modal.querySelector('input, button, [tabindex]');
    first?.focus();
  }

  function close() {
    modal.classList.remove('modal-open');
    document.body.classList.remove('modal-lock');
    modal.setAttribute('aria-hidden', 'true');
    setTimeout(() => { modal.hidden = true; }, 220);
    lastTrigger?.focus();
  }

  // Bind every Free Estimate trigger in capture phase so CTAs never follow
  // their fallback href before the modal opens.
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-estimate-trigger]');
    if (!trigger) return;
    e.preventDefault();
    e.stopPropagation();
    open(trigger);
  }, true);

  closeBtn?.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  document.addEventListener('keydown', e => {
    if (modal.hidden) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'Tab') {
      const focusables = Array.from(card.querySelectorAll(focusableSel)).filter(el => !el.hasAttribute('disabled'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Submit feedback on the modal form
  const mform = modal.querySelector('form');
  mform?.addEventListener('submit', () => {
    const sb = mform.querySelector('button[type="submit"]');
    if (sb) { sb.textContent = 'Sending...'; sb.disabled = true; }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEstimateModal);
} else {
  initEstimateModal();
}

// Basic form submit feedback
const form = document.querySelector('.contact-form');
form?.addEventListener('submit', () => {
  const btn = form.querySelector('button[type="submit"]');
  btn.textContent = 'Sending...';
  btn.disabled = true;
});

// Lightbox
const lightbox = document.getElementById('lightbox');
const lightboxImg = lightbox?.querySelector('.lightbox-img');

function openLightbox(src, alt) {
  lightboxImg.src = src;
  lightboxImg.alt = alt;
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox?.classList.remove('open');
  document.body.style.overflow = '';
}

// Event-delegated so Swiper loop clones also trigger lightbox
document.addEventListener('click', e => {
  const img = e.target.closest('.project-img img, .before-after-img img');
  if (!img) return;
  openLightbox(img.src, img.alt);
});

lightbox?.addEventListener('click', e => {
  if (e.target === lightbox) closeLightbox();
});

lightbox?.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

// Shared mobile carousel behavior helpers
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Mobile-only Swipers — Testimonials, FAQ, Blog, Cities, Why Choose, Reviews
// Disabled at ≥769px so desktop grid CSS takes over.
// Smooth mobile UX: autoplay w/ pause-on-touch, loop, momentum swipe, tap vs swipe threshold.
document.querySelectorAll('.testimonials-swiper, .faq-swiper, .blog-card-swiper, .city-swiper, .sa-why-swiper, .reviews-swiper').forEach(el => {
  const isFaq = el.classList.contains('faq-swiper');
  const delay = isFaq ? 6000 : 5000; // FAQ needs reading time
  new Swiper(el, {
    slidesPerView: 1,
    spaceBetween: 16,
    loop: true,
    grabCursor: true,
    speed: 450,
    threshold: 8, // tap-vs-swipe: ignore drags under 8px
    touchStartPreventDefault: false,
    resistance: true,
    resistanceRatio: 0.65,
    autoplay: prefersReducedMotion ? false : {
      delay,
      disableOnInteraction: false,
      pauseOnMouseEnter: false
    },
    pagination: {
      el: el.querySelector('.swiper-pagination'),
      clickable: true
    },
    a11y: { enabled: true },
    keyboard: { enabled: true, onlyInViewport: true },
    breakpoints: {
      769: { enabled: false, autoplay: false }
    }
  });
});

// Projects-page category carousels — active on ALL screen sizes.
// Desktop: 2 slides visible, arrow nav, no autoplay. Mobile: 1 slide, no arrows, autoplay 4s.
document.querySelectorAll('.projects-cat-swiper').forEach(el => {
  const wrap = el.closest('.projects-cat-carousel');
  const delay = parseInt(el.dataset.autoplayDelay, 10) || 4000;
  new Swiper(el, {
    slidesPerView: 1,
    spaceBetween: 16,
    loop: true,
    grabCursor: true,
    speed: 450,
    threshold: 8,
    resistance: true,
    resistanceRatio: 0.65,
    autoplay: prefersReducedMotion ? false : {
      delay,
      disableOnInteraction: false,
      pauseOnMouseEnter: true
    },
    pagination: {
      el: el.querySelector('.swiper-pagination'),
      clickable: true
    },
    navigation: wrap ? {
      prevEl: wrap.querySelector('.projects-cat-prev'),
      nextEl: wrap.querySelector('.projects-cat-next')
    } : false,
    a11y: { enabled: true },
    keyboard: { enabled: true, onlyInViewport: true },
    breakpoints: {
      769: {
        slidesPerView: 2,
        spaceBetween: 24,
        autoplay: false
      }
    }
  });
});

// Brands marquee — continuous linear scroll, pause on hover/touch, respects reduced motion.
document.querySelectorAll('.brands-swiper').forEach(el => {
  new Swiper(el, {
    slidesPerView: 'auto',
    spaceBetween: 56,
    loop: true,
    allowTouchMove: true,
    speed: 5000,
    grabCursor: false,
    a11y: { enabled: true },
    autoplay: prefersReducedMotion ? false : {
      delay: 0,
      disableOnInteraction: false,
      pauseOnMouseEnter: true
    },
    breakpoints: {
      769: {
        spaceBetween: 72
      }
    }
  });
});

// Services carousel — vanilla JS infinite loop, 3 visible desktop / 1 mobile
(function () {
  const GAP = 24;
  const CLONES = 3; // front and back clone count (equals max visible)

  function initCarousel(el) {
    const trackWrap = el.querySelector('.svc-track-wrap');
    const track = el.querySelector('.svc-track');
    const dotsWrap = el.querySelector('.svc-dots');
    const prevBtn = el.querySelector('.svc-prev');
    const nextBtn = el.querySelector('.svc-next');

    const origCards = Array.from(track.querySelectorAll('.svc-card'));
    const total = origCards.length;
    let current = 0;
    let transitioning = false;
    let autoTimer = null;

    function visible() {
      return window.innerWidth >= 769 ? 3 : 1;
    }

    function cardWidth() {
      return Math.floor((trackWrap.offsetWidth - GAP * (visible() - 1)) / visible());
    }

    // Prepend clones of last CLONES cards (in order: last-2, last-1, last)
    const frontClones = origCards.slice(-CLONES).map(c => {
      const cl = c.cloneNode(true);
      cl.setAttribute('aria-hidden', 'true');
      return cl;
    });
    frontClones.slice().reverse().forEach(cl => track.prepend(cl));

    // Append clones of first CLONES cards
    origCards.slice(0, CLONES).forEach(c => {
      const cl = c.cloneNode(true);
      cl.setAttribute('aria-hidden', 'true');
      track.appendChild(cl);
    });

    const allCards = Array.from(track.querySelectorAll('.svc-card'));

    // Build dots
    origCards.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'svc-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', 'Slide ' + (i + 1));
      dot.addEventListener('click', () => { goTo(i); resetAuto(); });
      dotsWrap.appendChild(dot);
    });
    const dots = Array.from(dotsWrap.querySelectorAll('.svc-dot'));

    function sizeCards() {
      const w = cardWidth();
      allCards.forEach(c => { c.style.width = w + 'px'; c.style.marginRight = GAP + 'px'; });
    }

    function setPos(animate) {
      const offset = (current + CLONES) * (cardWidth() + GAP);
      track.style.transition = animate ? 'transform 0.4s ease' : 'none';
      track.style.transform = 'translateX(-' + offset + 'px)';
      const real = ((current % total) + total) % total;
      dots.forEach((d, i) => d.classList.toggle('active', i === real));
    }

    function jump() {
      transitioning = false;
      if (current < 0) { current = total + current; setPos(false); }
      else if (current >= total) { current -= total; setPos(false); }
    }

    function prev() {
      if (transitioning) return;
      transitioning = true;
      current--;
      setPos(true);
    }

    function next() {
      if (transitioning) return;
      transitioning = true;
      current++;
      setPos(true);
    }

    function goTo(idx) {
      transitioning = false;
      current = idx;
      setPos(true);
    }

    function startAuto() { autoTimer = setInterval(next, 5000); }
    function stopAuto() { clearInterval(autoTimer); }
    function resetAuto() { stopAuto(); startAuto(); }

    track.addEventListener('transitionend', jump);
    prevBtn.addEventListener('click', () => { prev(); resetAuto(); });
    nextBtn.addEventListener('click', () => { next(); resetAuto(); });
    el.addEventListener('mouseenter', stopAuto);
    el.addEventListener('mouseleave', startAuto);

    // Touch / swipe
    let tx = 0, td = 0;
    track.addEventListener('touchstart', e => { tx = e.touches[0].clientX; td = 0; stopAuto(); }, { passive: true });
    track.addEventListener('touchmove', e => { td = e.touches[0].clientX - tx; }, { passive: true });
    track.addEventListener('touchend', () => { if (Math.abs(td) > 40) { td < 0 ? next() : prev(); } startAuto(); });

    // Resize — debounced
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { sizeCards(); setPos(false); }, 150);
    });

    // Init
    sizeCards();
    setPos(false);
    startAuto();
  }

  document.querySelectorAll('[data-svc-carousel]').forEach(initCarousel);
}());

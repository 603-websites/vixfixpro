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

// Wire every contact form on the page (homepage hero, contact section,
// service-area pages, modal) to POST into the Website Upgrader Pro SaaS
// /api/v1/contact endpoint OR the /api/v1/bookings endpoint, depending on
// the form's data attribute. The `netlify` attribute on the form tags is a
// vestige from before this site moved to Vercel — it does nothing here.
function initContactForms() {
  if (!window.WUP_SAAS) return;
  const API_BASE = window.WUP_SAAS.base;
  const API_KEY  = window.WUP_SAAS.apiKey;

  // Opt-in: only forms explicitly tagged data-wup-contact / data-wup-booking
  // post to the SaaS. Selecting by shape was over-eager and would silently
  // auto-attach to a future search/login form and burn rate limit.
  const selectors = 'form[data-wup-contact], form[data-wup-booking]';
  document.querySelectorAll(selectors).forEach(form => {
    const isBooking = form.hasAttribute('data-wup-booking');
    // Spam honeypot — bots fill every visible field including hidden ones
    // with display:none, so we use absolute-positioned-off-screen and an
    // aria-hidden flag. Real users don't fill it.
    const honeypot = form.querySelector('input[name="company_website"]');

    form.addEventListener('submit', async (e) => {
      // Honeypot tripped → bail silently. Don't show success or error;
      // bots see no signal and abandon.
      if (honeypot && honeypot.value) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const orig = btn ? btn.textContent : '';

      const fields = {};
      form.querySelectorAll('input, textarea, select').forEach(el => {
        if (!el.name || !el.value) return;
        fields[el.name] = el.value.trim();
      });

      const name = [fields['first-name'], fields['last-name']].filter(Boolean).join(' ').trim()
        || fields.name || fields['full-name'] || '';
      const message = fields['project-description'] || fields.message || '';
      const email = fields.email;
      const phone = fields.phone || undefined;

      if (!name || !email || !message) return;

      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

      try {
        let res;
        if (isBooking) {
          // Map an estimate-request form into the BookingRequest schema:
          //   - bandName carries a short, dashboard-list-friendly title
          //     (a service if the form has one, else a 60-char preview of
          //     the project description, else "Estimate request")
          //   - service-needed dropdown (if present) becomes the genre/type
          //   - the full description goes into `message`
          const titlePreview = message.length > 60 ? message.slice(0, 57) + '…' : message;
          const bandName = fields['service-needed'] || titlePreview || 'Estimate request';
          const genre = fields['service-needed'] || fields['property-type'] || undefined;
          const preferredDate = fields['preferred-date'] || undefined;
          res = await fetch(API_BASE + '/api/v1/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
            body: JSON.stringify({
              bandName,
              contactName: name,
              contactEmail: email,
              contactPhone: phone,
              genre,
              preferredDate,
              message,
            }),
          });
        } else {
          res = await fetch(API_BASE + '/api/v1/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
            body: JSON.stringify({ name, email, phone, message }),
          });
        }
        if (!res.ok) throw new Error('failed');
        if (typeof window.plausible === 'function') {
          window.plausible(isBooking ? 'Estimate Request' : 'Contact Submitted', {
            props: { path: location.pathname },
          });
        }
        // Replace the form with a success message
        const wrap = document.createElement('div');
        wrap.style.cssText = 'padding:1.25rem;border-radius:0.5rem;background:#e8f5e9;color:#1b5e20;font-weight:600;text-align:center;';
        wrap.textContent = isBooking
          ? 'Thanks! We got your request and will text or call you back fast with your free estimate.'
          : 'Thanks! We got your message and will be in touch shortly.';
        form.replaceWith(wrap);
      } catch {
        if (btn) { btn.disabled = false; btn.textContent = orig; }
        alert('Something went wrong sending that. Please try again or call us directly.');
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContactForms);
} else {
  initContactForms();
}

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

// Brands marquee — duplicated track for a true seamless loop with static fallback.
(function () {
  const selectors = '[data-brands-marquee]';

  function buildMarquee(root) {
    const track = root.querySelector('.brands-track');
    const originalSet = root.querySelector('.brands-set');
    if (!track || !originalSet) return;

    track.querySelectorAll('.brands-set.is-clone').forEach(node => node.remove());
    root.classList.remove('is-ready');

    const clone = originalSet.cloneNode(true);
    clone.classList.add('is-clone');
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);

    const updateMetrics = () => {
      const distance = Math.ceil(originalSet.getBoundingClientRect().width);
      if (!distance) return;
      root.style.setProperty('--brands-loop-distance', `${distance}px`);
      const pixelsPerSecond = window.innerWidth <= 768 ? 68 : 82;
      const duration = Math.max(distance / pixelsPerSecond, 16);
      root.style.setProperty('--brands-loop-duration', `${duration}s`);
      root.classList.add('is-ready');
    };

    const logoImages = Array.from(originalSet.querySelectorAll('img'));
    let pending = logoImages.filter(img => !img.complete).length;

    if (pending === 0) {
      updateMetrics();
    } else {
      const onAssetReady = () => {
        pending -= 1;
        if (pending <= 0) updateMetrics();
      };
      logoImages.forEach(img => {
        if (img.complete) return;
        img.addEventListener('load', onAssetReady, { once: true });
        img.addEventListener('error', onAssetReady, { once: true });
      });
    }

    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(updateMetrics);
      observer.observe(originalSet);
    } else {
      window.addEventListener('resize', updateMetrics, { passive: true });
    }

    root.addEventListener('pointerdown', () => root.classList.add('is-paused'));
    root.addEventListener('pointerup', () => root.classList.remove('is-paused'));
    root.addEventListener('pointercancel', () => root.classList.remove('is-paused'));
    root.addEventListener('focusin', () => root.classList.add('is-paused'));
    root.addEventListener('focusout', () => root.classList.remove('is-paused'));
  }

  const init = () => document.querySelectorAll(selectors).forEach(buildMarquee);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());

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
    let dragging = false;
    let dragStartX = 0;
    let dragDeltaX = 0;

    function visible() {
      return window.innerWidth >= 769 ? 3 : 1;
    }

    function isMobile() {
      return window.innerWidth < 769;
    }

    function cardWidth() {
      return Math.floor((trackWrap.offsetWidth - GAP * (visible() - 1)) / visible());
    }

    function baseOffset() {
      return (current + CLONES) * (cardWidth() + GAP);
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
      const offset = baseOffset();
      track.style.transition = animate ? 'transform 0.46s cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none';
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

    function startAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(next, 5000);
    }
    function stopAuto() { clearInterval(autoTimer); }
    function resetAuto() { stopAuto(); startAuto(); }
    function syncControls() {
      const mobile = isMobile();
      if (prevBtn) prevBtn.hidden = mobile;
      if (nextBtn) nextBtn.hidden = mobile;
      el.classList.toggle('svc-carousel-mobile', mobile);
    }

    track.addEventListener('transitionend', jump);
    prevBtn?.addEventListener('click', () => { prev(); resetAuto(); });
    nextBtn?.addEventListener('click', () => { next(); resetAuto(); });
    el.addEventListener('mouseenter', stopAuto);
    el.addEventListener('mouseleave', startAuto);

    // Touch / swipe — mobile only. Drag the track with the finger, then snap.
    trackWrap.addEventListener('touchstart', e => {
      if (!isMobile() || transitioning) return;
      dragging = true;
      dragStartX = e.touches[0].clientX;
      dragDeltaX = 0;
      stopAuto();
      track.style.transition = 'none';
    }, { passive: true });

    trackWrap.addEventListener('touchmove', e => {
      if (!dragging || !isMobile()) return;
      dragDeltaX = e.touches[0].clientX - dragStartX;
      const offset = Math.max(Math.min(dragDeltaX, 84), -84);
      track.style.transform = 'translateX(' + (-baseOffset() + offset) + 'px)';
    }, { passive: true });

    trackWrap.addEventListener('touchend', () => {
      if (!dragging) return;
      dragging = false;
      const threshold = Math.min(72, cardWidth() * 0.18);
      if (Math.abs(dragDeltaX) > threshold) {
        dragDeltaX < 0 ? next() : prev();
      } else {
        setPos(true);
      }
      dragDeltaX = 0;
      startAuto();
    });

    trackWrap.addEventListener('touchcancel', () => {
      if (!dragging) return;
      dragging = false;
      dragDeltaX = 0;
      setPos(true);
      startAuto();
    });

    // Resize — debounced
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        syncControls();
        sizeCards();
        setPos(false);
      }, 150);
    });

    // Init
    syncControls();
    sizeCards();
    setPos(false);
    startAuto();
  }

  document.querySelectorAll('[data-svc-carousel]').forEach(initCarousel);
}());

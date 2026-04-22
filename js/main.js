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

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

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

document.querySelectorAll('.project-img img, .before-after-img img').forEach(img => {
  img.style.cursor = 'zoom-in';
  img.addEventListener('click', () => openLightbox(img.src, img.alt));
});

lightbox?.addEventListener('click', e => {
  if (e.target === lightbox) closeLightbox();
});

lightbox?.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

// Mobile-only Swipers — Testimonials, FAQ, Blog, Cities, Why Choose, Reviews
// Disabled at ≥769px so desktop grid CSS takes over
document.querySelectorAll('.testimonials-swiper, .faq-swiper, .blog-card-swiper, .city-swiper, .sa-why-swiper, .reviews-swiper').forEach(el => {
  new Swiper(el, {
    slidesPerView: 1,
    spaceBetween: 16,
    loop: false,
    grabCursor: true,
    pagination: {
      el: el.querySelector('.swiper-pagination'),
      clickable: true
    },
    breakpoints: {
      769: { enabled: false }
    }
  });
});

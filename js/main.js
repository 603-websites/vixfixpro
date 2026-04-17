// Mobile nav toggle
const toggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

toggle?.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

navLinks?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// Sticky header shadow
const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  header.style.boxShadow = window.scrollY > 10 ? '0 2px 24px rgba(0,0,0,0.4)' : 'none';
});

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

// Services Swiper — always active on desktop and mobile
document.querySelectorAll('.services-swiper').forEach(el => {
  new Swiper(el, {
    slidesPerView: 1,
    spaceBetween: 24,
    loop: true,
    autoplay: {
      delay: 7000,
      pauseOnMouseEnter: true,
      disableOnInteraction: false
    },
    pagination: {
      el: el.querySelector('.swiper-pagination'),
      clickable: true
    },
    navigation: {
      nextEl: el.querySelector('.swiper-button-next'),
      prevEl: el.querySelector('.swiper-button-prev')
    },
    breakpoints: {
      640: { slidesPerView: 2, spaceBetween: 20 },
      1024: { slidesPerView: 3, spaceBetween: 24 }
    }
  });
});

// Mobile-only Swipers — Testimonials, Projects, Process, Reviews
// Disabled at ≥769px so desktop grid CSS takes over
document.querySelectorAll('.testimonials-swiper, .projects-home-swiper, .process-swiper, .reviews-swiper').forEach(el => {
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

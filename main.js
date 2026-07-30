/**
 * HOMEO ELIXIR — main.js
 * Cinematic Preloader · Sticky Header · Hero Entrance
 */

'use strict';

/* ──────────────────────────────────────────
   UTILITY: DOM selectors
────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ──────────────────────────────────────────
   PRELOADER
────────────────────────────────────────── */
(function initPreloader() {
  const preloader  = $('#preloader');
  const video      = $('#intro-video');
  const fallback   = $('#preloader-fallback');

  if (!preloader) return;

  // Check if intro has already played in this session
  if (sessionStorage.getItem('homeo_intro_played')) {
    preloader.classList.add('is-hidden');
    const hero = $('#hero');
    if (hero) hero.classList.add('is-visible');
    return;
  }

  // Lock scroll while loading
  document.body.classList.add('is-loading');

  /**
   * Smoothly fade out the preloader and reveal the page.
   * @param {number} [delay=0] — additional delay in ms before fading
   */
  function dismissPreloader(delay = 0) {
    // Store flag in sessionStorage so we don't play it again in this session
    sessionStorage.setItem('homeo_intro_played', 'true');

    setTimeout(() => {
      preloader.classList.add('is-fading');

      // Trigger hero entrance after preloader starts fading
      setTimeout(() => {
        const hero = $('#hero');
        if (hero) hero.classList.add('is-visible');
      }, 400);

      // Remove from DOM after transition completes
      preloader.addEventListener('transitionend', () => {
        preloader.classList.add('is-hidden');
        document.body.classList.remove('is-loading');
      }, { once: true });
    }, delay);
  }

  /* ── Video Path Exists ── */
  if (video) {
    // Show video once metadata is ready
    video.addEventListener('canplaythrough', () => {
      video.classList.add('is-loaded');
    }, { once: true });

    // When video ends → dismiss preloader
    video.addEventListener('ended', () => {
      dismissPreloader(200);
    }, { once: true });

    // If video errors (file missing) → show fallback logo
    video.addEventListener('error', showFallback, { once: true });

    // Also handle source error
    const source = video.querySelector('source');
    if (source) {
      source.addEventListener('error', showFallback, { once: true });
    }

    // Safety timeout: if video hasn't ended in 12s, dismiss anyway
    const safetyTimer = setTimeout(() => dismissPreloader(0), 12000);

    video.addEventListener('ended', () => clearTimeout(safetyTimer), { once: true });
    video.addEventListener('error', () => clearTimeout(safetyTimer), { once: true });

    // Try to play (handle autoplay policy)
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay blocked — show fallback
        showFallback();
      });
    }
  } else {
    // No video element at all
    showFallback();
  }

  function showFallback() {
    if (video) video.style.display = 'none';
    fallback.classList.add('is-visible');

    // Dismiss after 2.4 seconds of showing the logo
    dismissPreloader(2400);
  }
})();

/* ──────────────────────────────────────────
   STICKY HEADER + LOGO SRC SWAP
────────────────────────────────────────── */
(function initStickyHeader() {
  const header  = $('#site-header');
  const infoBar = $('#info-bar');
  const logoImg = $('#header-logo-img');
  if (!header) return;

  const LOGO_LIGHT = 'assets/header-logo.svg'; // transparent header
  const LOGO_DARK  = 'assets/header-logo.svg';   // solid/scrolled header
  const SCROLL_THRESHOLD = 40;
  let ticking = false;
  let wasScrolled = false; // track state to avoid redundant DOM writes

  function updateHeader() {
    const scrollY = window.scrollY || window.pageYOffset;
    const isScrolled = scrollY > SCROLL_THRESHOLD;

    // Only update DOM when state actually changes
    if (isScrolled === wasScrolled) {
      ticking = false;
      return;
    }
    wasScrolled = isScrolled;

    // Header class (controls bg / blur / text color)
    header.classList.toggle('is-scrolled', isScrolled);
    if (infoBar) {
      infoBar.classList.toggle('is-scrolled', isScrolled);
    }

    // Logo src swap — SVG rendered exactly as-is, no filter applied
    if (logoImg) {
      logoImg.src = isScrolled ? LOGO_DARK : LOGO_LIGHT;
    }

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Run immediately on load
  updateHeader();
})();

/* ──────────────────────────────────────────
   MOBILE NAV (Hamburger Toggle)
────────────────────────────────────────── */
(function initMobileNav() {
  const hamburger = $('#hamburger-btn');
  const mobileNav = $('#mobile-nav');
  const header    = $('#site-header');

  if (!hamburger || !mobileNav) return;

  const logoImg = $('#header-logo-img');
  const LOGO_LIGHT = 'assets/header-logo.svg';
  const LOGO_DARK  = 'assets/main-logo.svg';

  function toggleNav(forceClose = false) {
    const isOpen = hamburger.getAttribute('aria-expanded') === 'true';
    const shouldOpen = forceClose ? false : !isOpen;

    hamburger.setAttribute('aria-expanded', String(shouldOpen));
    mobileNav.setAttribute('aria-hidden', String(!shouldOpen));
    mobileNav.classList.toggle('is-open', shouldOpen);
    header.classList.toggle('nav-open', shouldOpen);
    document.body.style.overflow = shouldOpen ? 'hidden' : '';

    // Swap logo: dark version on white drawer, light version when closed
    // (only swap if header isn't already scrolled — scroll state takes precedence)
    if (logoImg && !header.classList.contains('is-scrolled')) {
      logoImg.src = shouldOpen ? LOGO_DARK : LOGO_LIGHT;
    }
  }

  // Toggle on hamburger click
  hamburger.addEventListener('click', () => toggleNav());

  // Close when a mobile nav link is clicked
  $$('.header__mobile-nav-link, .header__mobile-cta').forEach(link => {
    link.addEventListener('click', () => toggleNav(true));
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggleNav(true);
  });

  // Close when clicking outside the nav
  document.addEventListener('click', (e) => {
    if (
      !mobileNav.contains(e.target) &&
      !hamburger.contains(e.target) &&
      mobileNav.classList.contains('is-open')
    ) {
      toggleNav(true);
    }
  });
})();

/* ──────────────────────────────────────────
   SMOOTH SCROLL for anchor links
────────────────────────────────────────── */
(function initSmoothScroll() {
  const headerH = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
    10
  ) || 80;

  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    const targetId = anchor.getAttribute('href').slice(1);
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    e.preventDefault();

    const top = target.getBoundingClientRect().top + window.scrollY - headerH;

    window.scrollTo({ top, behavior: 'smooth' });
  });
})();

/* ──────────────────────────────────────────
   ACTIVE NAV LINK (Intersection Observer)
────────────────────────────────────────── */
(function initActiveNavLinks() {
  const sections  = $$('section[id], main > *[id]');
  const navLinks  = $$('.header__nav-link');

  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach((link) => {
            const href = link.getAttribute('href');
            const isActive = href === `#${id}`;
            link.setAttribute('aria-current', isActive ? 'page' : 'false');
          });
        }
      });
    },
    {
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0,
    }
  );

  sections.forEach((section) => observer.observe(section));
})();

/* ──────────────────────────────────────────
   HERO — Kenburns / parallax on scroll
────────────────────────────────────────── */
(function initHeroParallax() {
  const heroBg = $('.hero__bg');
  if (!heroBg) return;

  let ticking = false;

  function updateParallax() {
    const scrollY = window.scrollY || window.pageYOffset;
    const vH = window.innerHeight;

    // Only apply within viewport
    if (scrollY < vH) {
      const progress = scrollY / vH; // 0 → 1
      const translateY = progress * 40; // max 40px shift
      heroBg.style.transform = `scale(1) translateY(${translateY}px)`;
    }
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });
})();

/* ──────────────────────────────────────────
   SCROLL REVEAL — About Section
────────────────────────────────────────── */
(function initAboutReveal() {
  const targets = $$('.about__media, .about__content');
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); // animate once
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -60px 0px',
    }
  );

  targets.forEach((el) => observer.observe(el));
})();

/* ──────────────────────────────────────────
   SCROLL REVEAL — Meet Dr. Farhin Section
────────────────────────────────────────── */
(function initDoctorReveal() {

  /* Portrait col + content column */
  const colTargets = $$('.doctor__portrait-col, .doctor__content');

  if (colTargets.length) {
    const colObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            colObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -50px 0px' }
    );
    colTargets.forEach((el) => colObserver.observe(el));
  }

  /* Specialty cards — each observed individually so stagger works */
  const cards = $$('.doctor__specialty-card');

  if (cards.length) {
    const cardObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            cardObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -40px 0px' }
    );
    cards.forEach((card) => cardObserver.observe(card));
  }

  /* Quote block */
  const quote = $('.doctor__quote');

  if (quote) {
    const quoteObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            quoteObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    quoteObserver.observe(quote);
  }

})();

/* ──────────────────────────────────────────
   SCROLL REVEAL — Homepage Sections & Cards
────────────────────────────────────────── */
(function initNewSectionsReveal() {
  const elements = $$(
    '.foundation__card, .why-us__card, .process__step, .services-preview__card, .conditions-preview__card, .testimonials__card, .about-foundation__card, .about-values__card, .about-philosophy__card, .doctor-values__card, .doctor-expertise__card, .doctor-timeline__step, .doctor-credentials__card'
  );

  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  elements.forEach((el) => observer.observe(el));
})();

/* ──────────────────────────────────────────
   INTERACTIVE GALLERY PREVIEW CAROUSEL
────────────────────────────────────────── */
(function initGalleryCarousel() {
  const carousel = document.getElementById('gallery-carousel');
  if (!carousel) return;

  const cards = Array.from(carousel.querySelectorAll('.gallery-carousel__card'));
  const prevBtn = document.getElementById('gallery-prev-btn');
  const nextBtn = document.getElementById('gallery-next-btn');

  if (!cards.length) return;

  let activeIndex = 0;
  const total = cards.length;

  function updateCarousel() {
    cards.forEach((card, index) => {
      card.classList.remove('is-active', 'is-prev', 'is-next');
      
      if (index === activeIndex) {
        card.classList.add('is-active');
      } else if (index === (activeIndex - 1 + total) % total) {
        card.classList.add('is-prev');
      } else if (index === (activeIndex + 1) % total) {
        card.classList.add('is-next');
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + total) % total;
      updateCarousel();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % total;
      updateCarousel();
    });
  }

  // Initialize carousel state
  updateCarousel();
})();

/* ──────────────────────────────────────────
   CONSULTATION BOOKING FORM (WHATSAPP INTEGRATION)
   ────────────────────────────────────────── */
(function initConsultationForm() {
  const form = document.getElementById('consultation-form');
  if (!form) return;

  const nameInput = document.getElementById('form-name');
  const mobileInput = document.getElementById('form-mobile');
  const emailInput = document.getElementById('form-email');
  const concernInput = document.getElementById('form-concern');
  const typeInput = document.getElementById('form-type');
  const dateInput = document.getElementById('form-date');
  const slotInput = document.getElementById('form-slot');
  const messageInput = document.getElementById('form-message');

  const errorName = document.getElementById('error-name');
  const errorMobile = document.getElementById('error-mobile');
  const errorConcern = document.getElementById('error-concern');
  const errorSlot = document.getElementById('error-slot');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Clear previous errors
    errorName.textContent = '';
    errorMobile.textContent = '';
    errorConcern.textContent = '';
    errorSlot.textContent = '';
    
    let isValid = true;

    if (!nameInput.value.trim()) {
      errorName.textContent = 'Please enter your full name.';
      isValid = false;
    }

    if (!mobileInput.value.trim()) {
      errorMobile.textContent = 'Please enter your mobile number.';
      isValid = false;
    }

    if (!concernInput.value.trim()) {
      errorConcern.textContent = 'Please enter your health concern or condition.';
      isValid = false;
    }

    if (!slotInput.value) {
      errorSlot.textContent = 'Please select a preferred time slot.';
      isValid = false;
    }

    if (!isValid) return;

    // Gather values
    const name = nameInput.value.trim();
    const mobile = mobileInput.value.trim();
    const email = emailInput.value.trim() || 'N/A';
    const concern = concernInput.value.trim();
    const mode = typeInput.value;
    const date = dateInput.value || 'N/A';
    const slot = slotInput.value;
    const message = messageInput.value.trim() || 'None';

    // Construct the WhatsApp message
    const msgText = `Hello Dr. Farhin,

I would like to book a consultation at Homeo Elixir.

Patient Details:

Name:
${name}

Mobile:
${mobile}

Email:
${email}

Health Concern:
${concern}

Consultation Mode:
${mode}

Preferred Appointment Date:
${date}

Preferred Consultation Slot:
${slot}

Message:
${message}

Thank you.
I look forward to your response.`;

    const waUrl = `https://wa.me/918141277377?text=${encodeURIComponent(msgText)}`;
    window.open(waUrl, '_blank');
  });
})();




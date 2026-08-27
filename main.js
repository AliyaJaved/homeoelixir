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
  if (!header) return;

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

  function toggleNav(forceClose = false) {
    const isOpen = hamburger.getAttribute('aria-expanded') === 'true';
    const shouldOpen = forceClose ? false : !isOpen;

    hamburger.setAttribute('aria-expanded', String(shouldOpen));
    mobileNav.setAttribute('aria-hidden', String(!shouldOpen));
    mobileNav.classList.toggle('is-open', shouldOpen);
    header.classList.toggle('nav-open', shouldOpen);
  }

  // Toggle on hamburger click
  hamburger.addEventListener('click', () => toggleNav());

  // Toggle collapsible Conditions menu inside mobile nav
  const mobileConditionsLink = mobileNav.querySelector('.header__dropdown > .header__mobile-nav-link');
  if (mobileConditionsLink) {
    mobileConditionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const parentDropdown = mobileConditionsLink.closest('.header__dropdown');
      if (parentDropdown) {
        parentDropdown.classList.toggle('is-active');
      }
    });
  }

  // Close when a mobile nav link or sublink is clicked (except the collapsible parent)
  $$('.header__mobile-nav-link, .dropdown-menu__link, .header__mobile-cta').forEach(link => {
    if (link === mobileConditionsLink) return;
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
    '.foundation__card, .why-us__card, .process__step, .services-preview__card, .conditions-preview__card, .testimonials__card, .about-foundation__card, .about-values__card, .about-philosophy__card, .doctor-values__card, .doctor-expertise__card, .doctor-timeline__step, .doctor-credentials__card, .guides__card'
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

  // Lazy load card background images when the carousel enters the viewport
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          cards.forEach(card => {
            const inner = card.querySelector('.gallery-carousel__card-inner');
            if (inner && inner.hasAttribute('data-bg')) {
              inner.style.backgroundImage = `url('${inner.getAttribute('data-bg')}')`;
              inner.removeAttribute('data-bg');
            }
          });
          obs.unobserve(carousel);
        }
      });
    }, { rootMargin: '150px' });
    observer.observe(carousel);
  } else {
    // Fallback if IntersectionObserver is not supported
    cards.forEach(card => {
      const inner = card.querySelector('.gallery-carousel__card-inner');
      if (inner && inner.hasAttribute('data-bg')) {
        inner.style.backgroundImage = `url('${inner.getAttribute('data-bg')}')`;
        inner.removeAttribute('data-bg');
      }
    });
  }

  let activeIndex = 2;
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

  // Side-card click navigation
  cards.forEach((card) => {
    card.addEventListener('click', (e) => {
      if (card.classList.contains('is-prev')) {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + total) % total;
        updateCarousel();
      } else if (card.classList.contains('is-next')) {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % total;
        updateCarousel();
      }
    });
  });

  // Touch swipe support
  let touchStartX = 0;
  let touchEndX = 0;

  carousel.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  carousel.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleGesture();
  }, { passive: true });

  function handleGesture() {
    const swipeThreshold = 40;
    if (touchEndX < touchStartX - swipeThreshold) {
      activeIndex = (activeIndex + 1) % total;
      updateCarousel();
    } else if (touchEndX > touchStartX + swipeThreshold) {
      activeIndex = (activeIndex - 1 + total) % total;
      updateCarousel();
    }
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
I would like to book a consultation.

Name: ${name}
Phone: ${mobile}
Email: ${email}
Condition: ${concern}
Message: ${message}

Please let me know the available consultation timings.`;

    const waUrl = `https://wa.me/917874277377?text=${encodeURIComponent(msgText)}`;
    window.open(waUrl, '_blank');
  });
})();

/* ──────────────────────────────────────────
   FREE GUIDES CAROUSEL & DOWNLOAD HANDLER
   ────────────────────────────────────────── */
(function initFreeGuidesCarousel() {
  const carousel = document.getElementById('guides-carousel');
  const prevBtn = document.getElementById('guides-prev-btn');
  const nextBtn = document.getElementById('guides-next-btn');
  const dotsContainer = document.getElementById('guides-dots');

  if (!carousel) return;

  const cards = Array.from(carousel.querySelectorAll('.guides__card'));
  if (!cards.length) return;

  // Dynamically calculate card width including flex gap
  function getCardWidth() {
    const card = cards[0];
    const style = window.getComputedStyle(carousel);
    const gap = parseFloat(style.gap) || 24;
    return card.offsetWidth + gap;
  }

  // Generate pagination dots dynamically
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    cards.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.className = 'guides__dot';
      dot.setAttribute('aria-label', `Go to guide ${index + 1}`);
      dotsContainer.appendChild(dot);
    });
  }

  // Update controls: active dot and arrow disabled status
  function updateControls() {
    const cardWidth = getCardWidth();
    if (!cardWidth) return;

    const scrollLeft = carousel.scrollLeft;
    const activeIndex = Math.round(scrollLeft / cardWidth);

    // Update active state on dots
    if (dotsContainer) {
      const dots = Array.from(dotsContainer.children);
      dots.forEach((dot, index) => {
        dot.classList.toggle('is-active', index === activeIndex);
      });
    }

    // Disable navigation arrows at boundaries
    const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;
    if (prevBtn) {
      prevBtn.disabled = scrollLeft <= 4;
    }
    if (nextBtn) {
      nextBtn.disabled = scrollLeft >= maxScrollLeft - 4;
    }
  }

  // Prev & Next Buttons Event Listeners
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const cardWidth = getCardWidth();
      carousel.scrollBy({ left: -cardWidth, behavior: 'smooth' });
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const cardWidth = getCardWidth();
      carousel.scrollBy({ left: cardWidth, behavior: 'smooth' });
    });
  }

  // Pagination Dots Event Listeners
  if (dotsContainer) {
    dotsContainer.addEventListener('click', (e) => {
      const dot = e.target.closest('.guides__dot');
      if (!dot) return;
      
      const dots = Array.from(dotsContainer.children);
      const index = dots.indexOf(dot);
      if (index !== -1) {
        const cardWidth = getCardWidth();
        carousel.scrollTo({
          left: index * cardWidth,
          behavior: 'smooth'
        });
      }
    });
  }

  // Scroll and Resize Event Listeners (with passive option)
  carousel.addEventListener('scroll', updateControls, { passive: true });
  window.addEventListener('resize', updateControls, { passive: true });

  // Initialize controls layout
  updateControls();
  // Safe delay initialization in case layouts are shifting on load
  setTimeout(updateControls, 300);


})();

/* ──────────────────────────────────────────
   COLLAPSE ALL DETAILS ON PAGE LOAD
   (Prevents browsers from restoring open state on refresh)
────────────────────────────────────────── */
(function initFaqCollapse() {
  document.querySelectorAll('details').forEach(el => {
    el.removeAttribute('open');
  });
})();



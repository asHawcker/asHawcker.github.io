/**
 * Carousel Shortcode Engine (hugo-theme-monochrome)
 * Supports image slides, video slides, YouTube/Vimeo embeds, markdown slides,
 * touch swipe, keyboard navigation, and responsive controls.
 */

(function () {
  'use strict';

  function initCarousel(container) {
    const track = container.querySelector('.mc-carousel-track');
    const items = container.querySelectorAll('.mc-carousel-item');
    const prevBtn = container.querySelector('.mc-carousel-prev');
    const nextBtn = container.querySelector('.mc-carousel-next');
    const dotsContainer = container.querySelector('.mc-carousel-dots');
    const counter = container.querySelector('.mc-carousel-counter');
    const captionEl = container.querySelector('.mc-carousel-caption');

    const total = items.length;
    if (total === 0) return;

    let currentIndex = 0;
    const isAutoplay = container.dataset.autoplay === 'true';
    const intervalMs = parseInt(container.dataset.interval || '5000', 10);
    let autoplayTimer = null;

    // Single item handling: hide navigation controls
    if (total === 1) {
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      if (counter) counter.style.display = 'none';
      if (dotsContainer) dotsContainer.style.display = 'none';
      const cap = items[0].getAttribute('data-caption');
      if (captionEl && cap) captionEl.textContent = cap;
      return;
    }

    // Build dots
    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const dot = document.createElement('button');
        dot.className = `mc-carousel-dot${i === 0 ? ' active' : ''}`;
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
      }
    }

    function updateSlide() {
      // Move track
      track.style.transform = `translateX(-${currentIndex * 100}%)`;

      // Update counter
      if (counter) {
        counter.textContent = `${currentIndex + 1} / ${total}`;
      }

      // Update dots
      if (dotsContainer) {
        const dots = dotsContainer.querySelectorAll('.mc-carousel-dot');
        dots.forEach((dot, idx) => {
          dot.classList.toggle('active', idx === currentIndex);
        });
      }

      // Update caption
      if (captionEl) {
        const currentItem = items[currentIndex];
        const cap = currentItem.getAttribute('data-caption') || '';
        captionEl.style.opacity = '0';
        setTimeout(() => {
          captionEl.textContent = cap;
          captionEl.style.opacity = '1';
        }, 120);
      }

      // Pause videos on other slides
      items.forEach((item, idx) => {
        if (idx !== currentIndex) {
          const video = item.querySelector('video');
          if (video && !video.paused) {
            video.pause();
          }
        }
      });
    }

    function goToSlide(index) {
      currentIndex = (index + total) % total;
      updateSlide();
      resetAutoplay();
    }

    function nextSlide() {
      goToSlide(currentIndex + 1);
    }

    function prevSlide() {
      goToSlide(currentIndex - 1);
    }

    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);

    // Keyboard navigation when hovered or focused
    container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      }
    });

    // Touch swipe support
    let touchStartX = 0;
    let touchEndX = 0;

    container.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 45) {
        if (diff > 0) nextSlide();
        else prevSlide();
      }
    }, { passive: true });

    // Autoplay logic
    function startAutoplay() {
      if (!isAutoplay) return;
      stopAutoplay();
      autoplayTimer = setInterval(nextSlide, intervalMs);
    }

    function stopAutoplay() {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }

    function resetAutoplay() {
      if (isAutoplay) {
        stopAutoplay();
        startAutoplay();
      }
    }

    if (isAutoplay) {
      container.addEventListener('mouseenter', stopAutoplay);
      container.addEventListener('mouseleave', startAutoplay);
      startAutoplay();
    }

    // Initial state
    updateSlide();
  }

  function init() {
    const carousels = document.querySelectorAll('.mc-carousel-container');
    carousels.forEach(initCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

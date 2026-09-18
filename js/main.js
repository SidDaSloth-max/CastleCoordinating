// Mobile nav toggle
var navToggle = document.getElementById('navToggle');
var mainNav = document.getElementById('mainNav');
navToggle.addEventListener('click', function () {
  var isOpen = mainNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
});

// Close mobile nav after clicking a link
mainNav.querySelectorAll('a').forEach(function (link) {
  link.addEventListener('click', function () { mainNav.classList.remove('open'); });
});

var yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Fade the nav in once the user scrolls past the top of the hero
var siteHeader = document.querySelector('.site-header');
function updateHeaderVisibility() {
  if (window.scrollY > 80) {
    siteHeader.classList.add('visible');
  } else {
    siteHeader.classList.remove('visible');
    mainNav.classList.remove('open');
  }
}
window.addEventListener('scroll', updateHeaderVisibility, { passive: true });
updateHeaderVisibility();

// GA4 event tracking
function trackCall(label) {
  if (typeof gtag === 'function') {
    gtag('event', 'call_click', { event_category: 'engagement', event_label: label });
  }
}

function trackFormSubmit(label) {
  if (typeof gtag === 'function') {
    gtag('event', 'form_submit', { event_category: 'engagement', event_label: label });
  }
}

function trackOutbound(label) {
  if (typeof gtag === 'function') {
    gtag('event', 'outbound_click', { event_category: 'engagement', event_label: label });
  }
}

// Netlify Forms AJAX submission
function initContactForm() {
  var form = document.getElementById('contactFormEl');
  var status = document.getElementById('contactFormStatus');
  if (!form || !status) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var submitBtn = form.querySelector('button[type="submit"]');
    var originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    status.textContent = '';
    status.className = 'form-status';

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Submission failed');
        trackFormSubmit('contact_form');
        form.style.display = 'none';
        status.textContent = "Thank you! Your message has been sent — I'll be in touch soon.";
        status.className = 'form-status success';
      })
      .catch(function () {
        status.textContent = 'Something went wrong sending your message. Please call (360) 381-4022 instead.';
        status.className = 'form-status error';
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      });
  });
}

// Gallery carousel: no arrow buttons — swipe/trackpad, arrow keys, mouse drag,
// or click a faded neighbor photo to bring it to the center.
function initGalleryCarousel() {
  var track = document.getElementById('carouselTrack');
  if (!track) return;
  var realSlides = Array.prototype.slice.call(track.querySelectorAll('.carousel-slide'));
  var count = realSlides.length;
  var CLONES = Math.min(3, count);

  // Looping: pad both ends with copies of the opposite end's slides. Once scrolling
  // settles on a copy, jump (invisibly) to the identical real slide.
  function makeClone(slide) {
    var c = slide.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    c.querySelectorAll('img').forEach(function (img) { img.alt = ''; img.loading = 'eager'; });
    return c;
  }
  for (var i = 0; i < CLONES; i++) {
    track.insertBefore(makeClone(realSlides[count - 1 - i]), track.firstChild);
    track.appendChild(makeClone(realSlides[i]));
  }
  var slides = track.querySelectorAll('.carousel-slide');

  function centerScroll(slide) {
    return slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2;
  }
  function centerOn(slide) {
    track.scrollTo({ left: centerScroll(slide), behavior: 'smooth' });
  }
  function jumpTo(left) {
    track.style.scrollSnapType = 'none';
    track.scrollLeft = left;
    setTimeout(function () { track.style.scrollSnapType = ''; }, 60);
  }
  function startPosition() {
    jumpTo(centerScroll(slides[CLONES]));
  }
  var settleTimer = null, touching = false;
  function settle() {
    if (dragging || touching) return;
    var list = Array.prototype.slice.call(slides);
    var idx = list.indexOf(nearestSlide());
    var blockWidth = slides[CLONES + count].offsetLeft - slides[CLONES].offsetLeft;
    if (idx < CLONES) jumpTo(track.scrollLeft + blockWidth);
    else if (idx >= CLONES + count) jumpTo(track.scrollLeft - blockWidth);
  }
  track.addEventListener('scroll', function () {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, 140);
  }, { passive: true });
  track.addEventListener('touchstart', function () { touching = true; }, { passive: true });
  track.addEventListener('touchend', function () { touching = false; }, { passive: true });
  function nearestSlide() {
    var mid = track.scrollLeft + track.clientWidth / 2, best = null, bestDist = Infinity;
    slides.forEach(function (s) {
      var d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid);
      if (d < bestDist) { bestDist = d; best = s; }
    });
    return best;
  }

  var startX = 0, startScroll = 0, dragging = false, moved = false;
  track.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    dragging = true; moved = false;
    startX = e.clientX; startScroll = track.scrollLeft;
    track.classList.add('dragging');
  });
  window.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    track.scrollLeft = startScroll - dx;
  });
  window.addEventListener('pointerup', function () {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('dragging');
    if (moved) centerOn(nearestSlide());
  });

  track.addEventListener('click', function (e) {
    if (moved) { moved = false; return; }
    var slide = e.target.closest('.carousel-slide');
    if (slide && slide !== nearestSlide()) centerOn(slide);
  });

  track.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var list = Array.prototype.slice.call(slides);
    var i = list.indexOf(nearestSlide()) + (e.key === 'ArrowRight' ? 1 : -1);
    if (i >= 0 && i < list.length) { e.preventDefault(); centerOn(list[i]); }
  });

  startPosition();
  window.addEventListener('load', startPosition);
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { centerOn(nearestSlide()); }, 150);
  });
}

// Netlify Forms AJAX submission (generic, works for any form id/status pair)
function initNetlifyForm(formId, statusId, successMessage, failureMessage) {
  var form = document.getElementById(formId);
  var status = document.getElementById(statusId);
  if (!form || !status) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var submitBtn = form.querySelector('button[type="submit"]');
    var originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    status.textContent = '';
    status.className = 'form-status';

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Submission failed');
        trackFormSubmit(formId);
        form.style.display = 'none';
        status.textContent = successMessage;
        status.className = 'form-status success';
      })
      .catch(function () {
        status.textContent = failureMessage;
        status.className = 'form-status error';
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      });
  });
}

function initAll() {
  initContactForm();
  initGalleryCarousel();
  initNetlifyForm(
    'feedbackFormEl',
    'feedbackFormStatus',
    "Thanks for letting me know — I'll take a look.",
    'Something went wrong sending your feedback. Please email castlecoordinating@gmail.com instead.'
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  setTimeout(initAll, 0);
}

// Album page photo viewer
(function initAlbumLightbox() {
  var grid = document.getElementById('albumGrid');
  if (!grid) return;
  var items = Array.prototype.slice.call(grid.querySelectorAll('.album-item'));
  var box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Photo viewer');
  box.innerHTML =
    '<button type="button" class="lightbox-btn lightbox-close" aria-label="Close">&times;</button>' +
    '<button type="button" class="lightbox-btn lightbox-prev" aria-label="Previous photo">&#8249;</button>' +
    '<img alt="">' +
    '<button type="button" class="lightbox-btn lightbox-next" aria-label="Next photo">&#8250;</button>';
  document.body.appendChild(box);
  var big = box.querySelector('img'), current = 0, lastFocus = null;

  function show(i) {
    current = (i + items.length) % items.length;
    var src = items[current].querySelector('img');
    big.src = src.currentSrc || src.src;
    big.alt = src.alt;
  }
  function open(i) {
    lastFocus = document.activeElement;
    show(i);
    box.classList.add('open');
    document.body.style.overflow = 'hidden';
    box.querySelector('.lightbox-close').focus();
  }
  function close() {
    box.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  items.forEach(function (it, i) { it.addEventListener('click', function () { open(i); }); });
  box.querySelector('.lightbox-close').addEventListener('click', close);
  box.querySelector('.lightbox-prev').addEventListener('click', function () { show(current - 1); });
  box.querySelector('.lightbox-next').addEventListener('click', function () { show(current + 1); });
  box.addEventListener('click', function (e) { if (e.target === box) close(); });
  document.addEventListener('keydown', function (e) {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(current - 1);
    else if (e.key === 'ArrowRight') show(current + 1);
  });
})();

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

// Fade the nav in once the user scrolls past the top of the homepage hero.
// Inner pages have no full-screen hero, so their nav is always visible.
var siteHeader = document.querySelector('.site-header');
var hasHomeHero = !!document.querySelector('.hero');
function updateHeaderVisibility() {
  if (!hasHomeHero || window.scrollY > 80) {
    siteHeader.classList.add('visible');
  } else {
    siteHeader.classList.remove('visible');
    mainNav.classList.remove('open');
  }
}
window.addEventListener('scroll', updateHeaderVisibility, { passive: true });
updateHeaderVisibility();

// GA4 event tracking. Events: call_click, email_click, outbound_click, review_click,
// generate_lead (quote / contact form) and feedback_submit. "link_location" = which button or link was used.
// (GA4's own auto-collected event is named form_submit, so the forms use generate_lead to avoid clashing with it.)
function trackCall(label) {
  if (typeof gtag === 'function') {
    gtag('event', 'call_click', { link_location: label });
  }
}

function trackEmail(label) {
  if (typeof gtag === 'function') {
    gtag('event', 'email_click', { link_location: label });
  }
}

function trackFormSubmit(formName) {
  if (typeof gtag === 'function') {
    gtag('event', formName === 'website-feedback' ? 'feedback_submit' : 'generate_lead', { form_name: formName });
  }
}

function trackOutbound(label) {
  if (typeof gtag === 'function') {
    gtag('event', 'outbound_click', { link_location: label });
  }
}

// Phone and email links that have no inline handler (footer, contact cards) are still counted
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a[href^="tel:"], a[href^="mailto:"]');
  if (!a || a.hasAttribute('onclick')) return;
  var where = a.closest('footer') ? 'footer' : (a.closest('.contact-card') ? 'contact_card' : 'page');
  if (a.getAttribute('href').indexOf('tel:') === 0) trackCall(where + '_phone_link');
  else trackEmail(where + '_email_link');
});

function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
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
        trackFormSubmit(form.getAttribute('name'));
        form.style.display = 'none';
        status.textContent = "Thank you! Your message has been sent — I'll be in touch soon.";
        status.className = 'form-status success';
        status.setAttribute('tabindex', '-1');
        status.focus();
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
    c.querySelectorAll('img').forEach(function (img) { img.alt = ''; });
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
    track.scrollTo({ left: centerScroll(slide), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
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

  // Re-center once everything has loaded (fonts/images can shift layout), but never yank
  // the carousel back if the visitor has already started swiping or scrolling it.
  var interacted = false;
  ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(function (evt) {
    track.addEventListener(evt, function () { interacted = true; }, { passive: true });
  });
  startPosition();
  window.addEventListener('load', function () { if (!interacted) startPosition(); });
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
        trackFormSubmit(form.getAttribute('name'));
        form.style.display = 'none';
        status.textContent = successMessage;
        status.className = 'form-status success';
        status.setAttribute('tabindex', '-1');
        status.focus();
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

// Album page photo viewer: thumbnails in the grid, full-size photo + group/date/photographer caption in the viewer.
// Arrow keys, Esc, swipe on touch screens, focus stays inside the viewer while it is open.
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
    '<figure class="lightbox-figure"><img alt=""><figcaption class="lightbox-caption"></figcaption></figure>' +
    '<button type="button" class="lightbox-btn lightbox-next" aria-label="Next photo">&#8250;</button>';
  document.body.appendChild(box);
  var big = box.querySelector('img'), caption = box.querySelector('.lightbox-caption');
  var buttons = box.querySelectorAll('.lightbox-btn');
  var behind = document.querySelectorAll('header.site-header, main, footer.site-footer');
  var current = 0, lastFocus = null;

  function captionFor(item) {
    var group = item.closest('.album-group');
    if (!group) return '';
    var parts = [];
    ['h2', '.album-date', '.album-credit'].forEach(function (sel) {
      var el = group.querySelector(sel);
      if (el) parts.push(el.textContent.trim());
    });
    return parts.join(' \u00b7 ');
  }
  function fullSrc(item) {
    return item.getAttribute('data-full') || item.querySelector('img').src;
  }
  function show(i) {
    current = (i + items.length) % items.length;
    var item = items[current], thumb = item.querySelector('img'), full = fullSrc(item);
    big.alt = thumb.alt;
    caption.textContent = captionFor(item);
    // Show the already-loaded thumbnail instantly, then swap in the sharp full-size photo
    big.src = thumb.currentSrc || thumb.src;
    var sharp = new Image();
    sharp.onload = function () { if (items[current] === item) big.src = full; };
    sharp.src = full;
    // Warm the cache for the neighbours so next/previous feels instant
    [current - 1, current + 1].forEach(function (n) { new Image().src = fullSrc(items[(n + items.length) % items.length]); });
  }
  function setBackgroundInert(on) {
    Array.prototype.forEach.call(behind, function (el) { if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert'); });
  }
  function open(i) {
    if (!box.classList.contains('open')) lastFocus = document.activeElement;
    show(i);
    box.classList.add('open');
    setBackgroundInert(true);
    document.body.style.overflow = 'hidden';
    box.querySelector('.lightbox-close').focus();
  }
  function close() {
    box.classList.remove('open');
    setBackgroundInert(false);
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
    else if (e.key === 'Tab') {
      // Keep keyboard focus inside the viewer
      var first = buttons[0], last = buttons[buttons.length - 1];
      if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Swipe left/right on touch screens
  var touchX = 0, touchY = 0;
  box.addEventListener('touchstart', function (e) {
    touchX = e.changedTouches[0].clientX; touchY = e.changedTouches[0].clientY;
  }, { passive: true });
  box.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();

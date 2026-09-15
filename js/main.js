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

// Gallery carousel prev/next
function initGalleryCarousel() {
  var track = document.getElementById('carouselTrack');
  var prev = document.getElementById('carouselPrev');
  var next = document.getElementById('carouselNext');
  if (!track || !prev || !next) return;

  function step() {
    return track.clientWidth;
  }
  prev.addEventListener('click', function () {
    track.scrollBy({ left: -step(), behavior: 'smooth' });
  });
  next.addEventListener('click', function () {
    track.scrollBy({ left: step(), behavior: 'smooth' });
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

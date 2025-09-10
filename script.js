document.addEventListener('DOMContentLoaded', () => {
  const starContainer = document.getElementById('stars');
  if (!starContainer) return;

  // static stars
  for (let i = 0; i < 120; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.top = Math.random() * 100 + '%';
    s.style.left = Math.random() * 100 + '%';
    starContainer.appendChild(s);
  }

// shooting stars (now use the separate class)
function createShootingStar() {
  const s = document.createElement('div');
  s.classList.add('shooting-star'); // <<< IMPORTANT
  s.style.top = Math.random() * window.innerHeight + 'px';
  s.style.left = Math.random() * window.innerWidth + 'px';
  starContainer.appendChild(s);
  setTimeout(() => s.remove(), 1000);
}

setInterval(createShootingStar, 2000);
  if (window.AOS) AOS.init({ duration: 800, once: true });
});
// CONTACT FORM (AJAX to Formspree)
(() => {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const statusEl = document.getElementById('form-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.textContent = 'Sending…';

    const data = new FormData(form);
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: data
      });

      if (res.ok) {
        form.reset();
        statusEl.textContent = 'Thanks! We’ll be in touch shortly.';
        statusEl.style.color = '#7ee0f7';
      } else {
        const err = await res.json().catch(() => ({}));
        statusEl.textContent = (err && err.errors && err.errors[0]?.message) || 'Something went wrong. Please try again.';
        statusEl.style.color = '#ff8080';
      }
    } catch {
      statusEl.textContent = 'Network error. Please try again.';
      statusEl.style.color = '#ff8080';
    }
  });
})();
// AJAX submit with nice status messages
const form = document.getElementById('contact-form');
const statusEl = document.getElementById('form-status');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    statusEl.textContent = 'Sending…';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        form.reset();
        statusEl.textContent = 'Thanks! We’ll be in touch shortly.';
      } else {
        // Try to surface Formspree validation messages, if any
        let msg = 'Oops—something went wrong. Please try again.';
        try {
          const data = await res.json();
          if (data && data.errors) {
            msg = data.errors.map(e => e.message).join(', ');
          }
        } catch {}
        statusEl.textContent = msg;
      }
    } catch {
      statusEl.textContent = 'Network error. Please try again.';
    } finally {
      submitBtn.disabled = false;
    }
  });
}

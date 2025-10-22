/* =========================================================================
   Cloud Drop – site scripts (cleaned)
   - AOS init
   - Contact form (Formspree AJAX)
   - Contract form (Supabase + signature pad + print + live bindings)
   - Venue PIN gate (no persistence; asks every refresh)
   ========================================================================= */

/* Optional: Initialize AOS if it's on the page */
(() => {
  if (typeof AOS !== 'undefined') {
    AOS.init({ once: true, duration: 700, easing: 'ease-out' });
  }
})();

/* -----------------------------
   CONTACT FORM (Formspree AJAX)
   ----------------------------- */
(() => {
  const contactForm   = document.getElementById('contact-form');
  const contactStatus = document.getElementById('form-status');
  if (!contactForm || !contactStatus) return;

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    contactStatus.style.color = '';
    contactStatus.textContent = 'Sending…';

    try {
      const res = await fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        contactForm.reset();
        contactStatus.style.color = '#9ee7ff';
        contactStatus.textContent = 'Thanks! We’ll be in touch shortly.';
      } else {
        let msg = 'Oops—something went wrong. Please try again.';
        try {
          const data = await res.json();
          if (data?.errors?.length) msg = data.errors.map(e => e.message).join(', ');
        } catch {}
        contactStatus.style.color = '#ffb4a8';
        contactStatus.textContent = msg;
      }
    } catch {
      contactStatus.style.color = '#ffb4a8';
      contactStatus.textContent = 'Network error. Please try again.';
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();

/* -------------------------------------------
   CONTRACT FORM (Supabase + Canvas signature)
   ------------------------------------------- */
(() => {
  const contractForm   = document.getElementById('contract-form');
  const contractStatus = document.getElementById('contract-status');
  const canvas         = document.getElementById('sigPad');
  const clearBtn       = document.getElementById('clearSig');
  if (!contractForm || !contractStatus || !canvas) return;

  /* ---------- Paper-like extras (date, id, live bindings, print) ---------- */
  // Fill dates and a lightweight "agreement id"
  const today = new Date();
  const fmt = today.toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' });
  const el1 = document.getElementById('contract-date');
  const el2 = document.getElementById('contract-date-2');
  if (el1) el1.textContent = fmt;
  if (el2) el2.textContent = fmt;
  const idEl = document.getElementById('contract-id');
  if (idEl) idEl.textContent = Math.random().toString(36).slice(2,7).toUpperCase();

  // Live-bind inputs (via data-bind="#selector")
  (function wireBindings(form) {
    form.querySelectorAll('[data-bind]').forEach(input => {
      const sel = input.getAttribute('data-bind');
      const out = document.querySelector(sel);
      if (!out) return;
      if (!out.dataset.fallback) out.dataset.fallback = out.textContent || '';
      const sync = () => {
        const v = (input.value || '').trim();
        out.textContent = v || out.dataset.fallback;
        if (sel === '#prev-manager') {
          const m2 = document.getElementById('prev-manager-2');
          if (m2) m2.textContent = v || (m2.dataset.fallback || m2.textContent);
        }
        const phoneWrap = document.getElementById('prev-phone-wrap');
        if (phoneWrap && sel === '#prev-phone') {
          phoneWrap.style.display = v ? '' : 'none';
        }
      };
      input.addEventListener('input', sync);
      sync();
    });
  })(contractForm);

  // Print / Save PDF button
  document.getElementById('printContract')?.addEventListener('click', () => window.print());

  /* ---------- Supabase setup & signature pad ---------- */
  // TODO: replace with your real project values
  const SUPABASE_URL  = 'https://YOUR-PROJECT-REF.supabase.co';
  const SUPABASE_ANON = 'YOUR-ANON-KEY';

  if (typeof supabase === 'undefined') {
    console.error('Supabase SDK not found. Make sure the CDN script is above script.js');
    contractStatus.style.color = '#ffb4a8';
    contractStatus.textContent = 'Setup error: Supabase not loaded.';
    return;
  }
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  // Simple signature pad
  const ctx = canvas.getContext('2d');
  function initCanvas() {
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const h    = 180;
    canvas.width  = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width  = rect.width + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b0b0d';
    ctx.fillRect(0, 0, rect.width, h);
    ctx.strokeStyle = '#7ee0f7';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }
  initCanvas();
  window.addEventListener('resize', initCanvas);

  let drawing = false, last = null, isBlank = true;
  const pt = (e) => {
    const r = canvas.getBoundingClientRect();
    const c = e.touches ? e.touches[0] : e;
    return { x: c.clientX - r.left, y: c.clientY - r.top };
  };
  const start = (e) => { drawing = true; last = pt(e); e.preventDefault(); };
  const move  = (e) => {
    if (!drawing) return;
    const p = pt(e);
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last = p; isBlank = false; e.preventDefault();
  };
  const end   = () => { drawing = false; };

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('mouseleave', end);
  canvas.addEventListener('touchstart', start, { passive:false });
  canvas.addEventListener('touchmove',  move,  { passive:false });
  canvas.addEventListener('touchend',   end);

  clearBtn?.addEventListener('click', () => { initCanvas(); isBlank = true; });

  // Submit handler
  contractForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    contractStatus.style.color = '#cfefff';
    contractStatus.textContent = 'Submitting…';

    const fd      = new FormData(contractForm);
    const venue   = (fd.get('venue')   || '').toString().trim();
    const manager = (fd.get('manager') || '').toString().trim();
    const email   = (fd.get('email')   || '').toString().trim();
    const phone   = (fd.get('phone')   || '').toString().trim();
    const notes   = (fd.get('notes')   || '').toString().trim();
    const agree   = !!fd.get('agree');

    if (!venue || !manager || !email || !agree) {
      contractStatus.style.color = '#ffb4a8';
      contractStatus.textContent = 'Please complete venue, manager, email, and check the agreement.';
      return;
    }
    if (isBlank) {
      contractStatus.style.color = '#ffb4a8';
      contractStatus.textContent = 'Please add your signature.';
      return;
    }

    const signatureDataUrl = canvas.toDataURL('image/png');

    try {
      const { error } = await sb.from('Contract').insert([{
        phone: phone || null,
        message: JSON.stringify({
          venue, manager, email, notes, terms_agreed: true,
          ua: navigator.userAgent
        }),
        signature_url: signatureDataUrl,
        signed_at: new Date().toISOString()
      }]);
      if (error) throw error;

      contractForm.reset();
      clearBtn?.click();
      contractStatus.style.color = '#9ee7ff';
      contractStatus.textContent = 'Thanks! Your agreement was submitted.';
    } catch (err) {
      console.error(err);
      contractStatus.style.color = '#ffb4a8';
      contractStatus.textContent = 'Error submitting agreement. Please try again.';
    }
  });
})();

/* -------------------------------------------------
   Venue Gate (PIN modal) – reveal #contract section
   (no persistence: asks for code every refresh)
   ------------------------------------------------- */
(() => {
  const ACCESS_PIN = 'Cloud2025'; // <-- set your code

  const gateEl   = document.getElementById('venue-gate');
  const openBtn  = document.getElementById('open-venue-gate');
  const cancelBt = document.getElementById('cancel-venue');
  const submitBt = document.getElementById('submit-venue');
  const inputEl  = document.getElementById('venue-pin');
  const msgEl    = document.getElementById('venue-msg');
  const contract = document.getElementById('contract');
  if (!gateEl || !contract) return;

  const unlock = () => {
    contract.classList.remove('contract-locked');
    gateEl.classList.add('hidden');
  };

  // Optional: secret URL auto-unlock (?partner=1&key=PIN)
  const checkParam = () => {
    const params = new URLSearchParams(location.search);
    const p = params.get('partner');
    const key = params.get('key');
    if (p === '1' && key && key === ACCESS_PIN) unlock();
  };

  const tryUnlock = () => {
    const val = (inputEl?.value || '').trim();
    if (val === ACCESS_PIN) {
      msgEl && (msgEl.textContent = '');
      unlock();
    } else {
      msgEl && (msgEl.textContent = 'Incorrect code. Please try again.');
    }
  };

  // Always locked until code entered
  openBtn?.addEventListener('click', () => {
    gateEl.classList.remove('hidden');
    inputEl?.focus();
  });
  cancelBt?.addEventListener('click', () => {
    gateEl.classList.add('hidden');
    if (msgEl) msgEl.textContent = '';
    if (inputEl) inputEl.value = '';
  });
  submitBt?.addEventListener('click', tryUnlock);
  inputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); tryUnlock(); }
  });

  checkParam();
})();
(() => {
  const els = [...document.querySelectorAll('.reveal-up')];
  if (!els.length) return;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if (e.isIntersecting){
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin:'-10% 0px -10% 0px', threshold:0.1 });
  els.forEach(el=>io.observe(el));
})();
/* Lightweight reveal fallback (works even if AOS is missing) */
(() => {
  const els = Array.from(document.querySelectorAll('.reveal-up'));
  if (!els.length) return;
  // If AOS exists, let AOS handle it
  if (typeof AOS !== 'undefined') return;

  // Otherwise, do a simple reveal
  els.forEach(el => el.classList.add('reveal-up')); // ensure class is there
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '-10% 0px -10% 0px', threshold: 0.1 });

  els.forEach(el => io.observe(el));
})();
/* ==== Layout balance adjustments ==== */

/* 1) Make most containers wider for breathing room */
.container{
  max-width: 1280px; /* comfortable wide view */
}
@media (min-width: 1500px){
  .container{ max-width: 1380px; }
}

/* 2) Let specific visual sections go extra-wide */
.container.wide{
  max-width: 1500px;
}

/* 3) Slightly increase side padding for balance */
section{
  padding-left: clamp(24px, 5vw, 72px);
  padding-right: clamp(24px, 5vw, 72px);
}

/* 4) Restore a narrower width for the "Now Live" section */
#live .container{
  max-width: 1000px;   /* keeps gallery tight & refined */
}

/* 5) Tweak the gallery layout so photos stay neat */
#live .live-gallery{
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  justify-items: center;
}
#live .live-photo img{
  width: 100%;
  height: 100%;
  border-radius: 12px;
  object-fit: cover;
  max-height: 420px;
}

/* 6) Everything else remains wider */
#machine .container,
#about .container,
#contact .container{
  max-width: 1400px;
}

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

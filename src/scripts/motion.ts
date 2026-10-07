// Quiet motion for the whole site. Movement uses the `translate` property directly on the
// painted element (never on a wrapper), so `mix-blend-mode: multiply` keeps reaching the paper.
// Nothing here hides content; everything is skipped
// when the visitor prefers reduced motion.
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Paintings settle in (sharpen) as they enter the view.
const settles = document.querySelectorAll<HTMLElement>('.paint.settle');
if ('IntersectionObserver' in window && !reduce) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  settles.forEach((el) => io.observe(el));
} else {
  settles.forEach((el) => el.classList.add('is-in'));
}

if (!reduce) {
  // Gentle scroll drift for decorative paintings: data-drift="0.08"
  const drifters = [...document.querySelectorAll<HTMLElement>('[data-drift]')];
  // Pointer parallax inside the hero: data-pointer="12" (px)
  const followers = [...document.querySelectorAll<HTMLElement>('[data-pointer]')];
  let px = 0;
  let py = 0;
  let queued = false;

  const frame = () => {
    queued = false;
    const vh = window.innerHeight;
    for (const el of drifters) {
      const r = el.parentElement!.getBoundingClientRect();
      const offset = (r.top + r.height / 2 - vh / 2) * Number(el.dataset.drift);
      el.style.translate = `0 ${offset.toFixed(1)}px`;
    }
    for (const el of followers) {
      const k = Number(el.dataset.pointer);
      el.style.translate = `${(px * k).toFixed(1)}px ${(py * k).toFixed(1)}px`;
    }
  };
  const queue = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(frame);
    }
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  if (window.matchMedia('(pointer: fine)').matches && followers.length) {
    window.addEventListener('pointermove', (e) => {
      px = e.clientX / window.innerWidth - 0.5;
      py = e.clientY / window.innerHeight - 0.5;
      queue();
    });
  }
  queue();
}

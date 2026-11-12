// Общий скрипт: проявление блоков, курсор-круг над обложками, видео играют только в экране.
(() => {
  const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-in', e.isIntersecting)), { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // видео: autoplay только когда видно, чтобы не грузить всё сразу
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { if (!v.src && v.dataset.src) v.src = v.dataset.src; v.play().catch(() => {}); }
    else v.pause();
  }), { threshold: .2 });
  document.querySelectorAll('video[data-auto]').forEach(v => vio.observe(v));

  // курсор как на maryrose.by: маленькая точка, над работами вырастает в стеклянный кружок с подписью
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cur = document.createElement('span'); cur.className = 'cur'; cur.setAttribute('aria-hidden', 'true');
  const label = document.createElement('i'); cur.appendChild(label); document.body.appendChild(cur);
  const T = '[data-cursor], .fly a, .wk, .proj__card';
  const en = () => document.documentElement.lang === 'en';
  const word = el => {
    const t = el.dataset.cursor || 'Смотреть';
    if (!en()) return t;
    return ({ 'Смотреть': 'View', 'Смотреть кейс': 'View case', 'Открыть сайт': 'Open site' })[t] || t;
  };
  let x = -100, y = -100, tx = x, ty = y;
  addEventListener('pointermove', e => {
    tx = e.clientX; ty = e.clientY; cur.classList.add('is-on');
    const box = e.target.closest && e.target.closest(T);
    if (box) { label.textContent = word(box); cur.classList.add('is-big'); }
    else cur.classList.remove('is-big');
  }, { passive: true });
  document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
  (function loop() {
    x += (tx - x) * .3; y += (ty - y) * .3;
    cur.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  })();
})();

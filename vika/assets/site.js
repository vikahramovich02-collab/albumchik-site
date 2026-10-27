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

  // круг вместо курсора: текст берём из data-cursor
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  const cur = document.createElement('div'); cur.className = 'cur'; document.body.appendChild(cur);
  let x = -200, y = -200, tx = x, ty = y;
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
  (function loop() {
    x += (tx - x) * .22; y += (ty - y) * .22;
    cur.style.setProperty('--cx', x + 'px'); cur.style.setProperty('--cy', y + 'px');
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll('[data-cursor]').forEach(el => {
    el.addEventListener('pointerenter', () => { cur.textContent = el.dataset.cursor; cur.classList.add('is-on'); });
    el.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
  });
})();

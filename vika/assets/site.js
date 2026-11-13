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

// лид в два тона (как у Dalee): после первого предложения текст абзаца приглушается.
// DOM не трогаем (иначе сломается перевод), красим через CSS Custom Highlight API.
(() => {
  if (!window.CSS || !CSS.highlights || typeof Highlight === 'undefined') return;
  const run = () => {
    const ranges = [];
    document.querySelectorAll('.ch__text > h2 + p').forEach(p => {
      const text = p.textContent; const m = text.match(/[.!?](\s)/);
      if (!m) return;
      let cut = m.index + 1, w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT), n, pos = 0;
      while ((n = w.nextNode())) {
        const len = n.nodeValue.length;
        if (pos + len >= cut) { const r = document.createRange(); r.setStart(n, cut - pos); r.setEndAfter(p.lastChild); ranges.push(r); break; }
        pos += len;
      }
    });
    CSS.highlights.set('tone', new Highlight(...ranges));
  };
  addEventListener('load', run);
  document.addEventListener('click', e => { if (e.target.closest('.lang')) setTimeout(run, 0); });
})();

// этапы кейса закреплены слева: видно, на каком шаге читатель (Вика, 12.11)
(() => {
  const chs = [...document.querySelectorAll('.chapters .ch[id]')].filter(c => c.querySelector('.ch__n'));
  if (chs.length < 2) return;
  const nav = document.createElement('nav'); nav.className = 'rail'; nav.setAttribute('aria-label', 'Этапы кейса');
  chs.forEach(c => {
    const sp = c.querySelectorAll('.ch__n span');
    const a = document.createElement('a'); a.href = '#' + c.id;
    const n = document.createElement('i'); n.textContent = sp[0] ? sp[0].textContent : '';
    const t = document.createElement('span'); t.textContent = sp[1] ? sp[1].textContent : '';
    a.append(n, t); nav.appendChild(a);
  });
  document.body.appendChild(nav); document.body.classList.add('has-rail');
  const links = [...nav.querySelectorAll('a')];
  const mains = [...document.querySelectorAll('.chapters')];
  const set = () => {
    const top = mains[0].getBoundingClientRect().top, bottom = mains[mains.length - 1].getBoundingClientRect().bottom;
    const nr = nav.getBoundingClientRect();
    const covered = [...document.querySelectorAll('.bleed,.flowwide,.nums--row')].some(b => { const r = b.getBoundingClientRect(); return r.left < nr.right && r.top < nr.bottom && r.bottom > nr.top; });
    nav.classList.toggle('is-on', top < innerHeight * .6 && bottom > innerHeight * .4 && !covered);
    let cur = 0; chs.forEach((c, i) => { if (c.getBoundingClientRect().top < innerHeight * .45) cur = i; });
    links.forEach((a, i) => a.classList.toggle('is-cur', i === cur));
  };
  addEventListener('scroll', set, { passive: true }); addEventListener('resize', set); set();
})();

// переключатель темы: тёмная по умолчанию, светлая по кнопке, выбор запоминается
(() => {
  const btn = document.querySelector('.theme'); if (!btn) return;
  const lbl = btn.querySelector('span');
  const sync = () => { const light = document.documentElement.dataset.theme === 'light', en = document.documentElement.lang === 'en'; lbl.textContent = light ? (en ? 'Dark' : 'Тёмная') : (en ? 'Light' : 'Светлая'); };
  document.addEventListener('click', e => { if (e.target.closest('.lang')) setTimeout(sync, 0); });
  addEventListener('load', sync);
  btn.addEventListener('click', () => {
    const light = document.documentElement.dataset.theme !== 'light';
    if (light) document.documentElement.dataset.theme = 'light'; else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('theme', light ? 'light' : 'dark'); } catch (e) {}
    sync();
  });
  sync();
})();

// блок «орбита»: текст подсвечивается по мере скролла, работы кружат вокруг
(() => {
  const sec = document.querySelector('.orbit'); if (!sec) return;
  const p = sec.querySelector('.orbit__text'), imgs = [...sec.querySelectorAll('.orbit__ring img')];
  const hl = window.CSS && CSS.highlights && typeof Highlight !== 'undefined';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t0 = performance.now();
  const prog = () => { const r = sec.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / (r.height - innerHeight))); };
  const light = k => {
    if (!hl) { p.style.color = 'var(--fg)'; return; }
    const n = p.firstChild; if (!n || n.nodeType !== 3) return;
    const len = Math.round(n.nodeValue.length * Math.min(1, k * 1.25));
    const r = document.createRange(); r.setStart(n, 0); r.setEnd(n, len);
    CSS.highlights.set('lit', new Highlight(r));
  };
  (function loop(now) {
    const k = prog(); light(k);
    if (!reduce) {
      const W = innerWidth, H = innerHeight, rx = Math.min(W * .42, 620), ry = H * .36;
      const a0 = (now - t0) / 1000 * .12 + k * Math.PI * 1.2;
      imgs.forEach((im, i) => {
        const a = a0 + i / imgs.length * Math.PI * 2;
        const x = Math.cos(a) * rx, y = Math.sin(a) * ry, z = (Math.sin(a) + 1) / 2;
        im.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${.75 + z * .35})`;
        im.style.zIndex = Math.round(z * 10); im.style.opacity = (.55 + z * .45).toFixed(2);
      });
    }
    requestAnimationFrame(loop);
  })(performance.now());
})();

// полноширинные ряды внутри колонки главы: сдвиг на левый край экрана (Вика, 13.11)
(() => {
  const rows = [...document.querySelectorAll('.ch__media .bleed')];
  if (!rows.length) return;
  const fit = () => rows.forEach(r => { const p = r.parentElement.getBoundingClientRect(); r.style.setProperty('--bx', p.left + 'px'); });
  fit(); addEventListener('resize', fit); addEventListener('load', fit);
})();

// картинка всплывает у курсора при наведении на строку ссылки (Вика, 13.11)
(() => {
  const links = [...document.querySelectorAll('a[data-img]')];
  if (!links.length || !matchMedia('(hover:hover)').matches) return;
  const pop = document.createElement('img'); pop.className = 'hover-pop'; pop.alt = ''; document.body.appendChild(pop);
  let x = 0, y = 0, cx = 0, cy = 0, raf = 0;
  const loop = () => { cx += (x - cx) * .18; cy += (y - cy) * .18; pop.style.transform = `translate(${cx + 28}px, ${cy - 110}px)`; raf = requestAnimationFrame(loop); };
  links.forEach(a => {
    a.addEventListener('mouseenter', e => { pop.src = a.dataset.img; x = cx = e.clientX; y = cy = e.clientY; pop.classList.add('is-on'); if (!raf) loop(); });
    a.addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; });
    a.addEventListener('mouseleave', () => { pop.classList.remove('is-on'); cancelAnimationFrame(raf); raf = 0; });
  });
})();

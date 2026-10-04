/* ALBUMCHIK — анимации, аналитика, cookie */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---------- Аналитика: ID вписать на финальном этапе ---------- */
  const ANALYTICS = { metrika: '', ga4: '' };
  const track = (goal) => {
    if (window.ym && ANALYTICS.metrika) ym(ANALYTICS.metrika, 'reachGoal', goal);
    if (window.gtag) gtag('event', goal);
  };
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-goal]');
    if (el) track(el.dataset.goal);
  });
  const loadCounters = () => {
    if (ANALYTICS.metrika) {
      (function (m, e, t, r, i, k, a) { m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); }; m[i].l = +new Date(); k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a); })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
      ym(ANALYTICS.metrika, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
    }
    if (ANALYTICS.ga4) {
      const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ANALYTICS.ga4; document.head.appendChild(s);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
      gtag('js', new Date()); gtag('config', ANALYTICS.ga4);
    }
  };
  const consent = $('.consent');
  let choice = null;
  try { choice = localStorage.getItem('albumchik-consent'); } catch (_) {}
  if (choice === 'yes') loadCounters();
  else if (!choice && consent) setTimeout(() => (consent.hidden = false), 2500);
  consent?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-consent]'); if (!b) return;
    try { localStorage.setItem('albumchik-consent', b.dataset.consent); } catch (_) {}
    consent.hidden = true;
    if (b.dataset.consent === 'yes') loadCounters();
  });

  /* ---------- Меню на телефоне ---------- */
  const menu = $('.menu');
  const burger = $('[data-menu-open]');
  const openMenu = () => {
    menu.hidden = false; burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => menu.classList.add('is-open'));
    $('[data-menu-close]').focus();
  };
  const closeMenu = () => {
    menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(() => (menu.hidden = true), 400);
    burger.focus({ preventScroll: true });
  };
  burger?.addEventListener('click', openMenu);
  $('[data-menu-close]')?.addEventListener('click', closeMenu);
  menu?.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });

  /* ---------- Прелоадер (один раз за сессию) ---------- */
  const loader = $('.loader');
  let seen = false;
  try { seen = sessionStorage.getItem('albumchik-loaded') === '1'; } catch (_) {}
  const startPage = () => document.documentElement.classList.add('is-ready');
  if (!loader || reduce || seen) {
    document.documentElement.classList.add('no-loader');
    startPage();
  } else {
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      loader.classList.add('is-done');
      document.body.style.overflow = '';
      startPage();
      try { sessionStorage.setItem('albumchik-loaded', '1'); } catch (_) {}
      setTimeout(() => loader.remove(), 1100);
    }, 1400);
  }

  /* ---------- Раскрытие: срабатывает при КАЖДОМ заходе в экран ---------- */
  const revealEls = $$('[data-reveal], [data-split], [data-clip], [data-shelf], .service, .step');
  if (reduce) {
    revealEls.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        // ждём конца прелоадера, чтобы первый экран не проиграл анимацию под шторкой
        const apply = () => en.target.classList.toggle('is-in', en.isIntersecting);
        if (document.documentElement.classList.contains('is-ready')) apply();
        else setTimeout(apply, 1500);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Скролл: навигация, параллакс, книга, лента ---------- */
  const nav = $('[data-nav]');
  const parallax = $$('[data-parallax]');
  const book = $('#book');
  const bookBody = $('[data-book]');
  const leaves = $$('.leaf');
  const bookNum = $('[data-book-num]');
  const track2 = $('.marquee__track');

  // дублируем ленту, чтобы она шла бесконечно
  if (track2) track2.innerHTML += track2.innerHTML;

  let lastY = scrollY, velocity = 0, marqueeX = 0, ticking = false;

  const renderBook = () => {
    if (!book) return;
    const r = book.getBoundingClientRect();
    const total = book.offsetHeight - innerHeight;
    const p = clamp(-r.top / total);
    const n = leaves.length;
    const f = p * (n + 0.4);            // небольшой «запас» в конце, чтобы задняя обложка постояла
    leaves.forEach((leaf, i) => {
      const t = clamp(f - i);
      const eased = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      leaf.style.setProperty('--rot', (-180 * eased).toFixed(2));
      leaf.style.setProperty('--z', eased > .5 ? i + 1 : n - i + 1);
      leaf.style.setProperty('--shade', (Math.sin(eased * Math.PI) * .9).toFixed(3));
    });
    // книга закрыта — обложка по центру; открыта — разворот по центру; в конце — задняя обложка по центру
    const open = clamp(f), close = clamp(f - (n - 1));
    const shift = -.25 + open * .25 + close * .25;
    bookBody.style.setProperty('--shift', shift.toFixed(4));
    const spread = Math.min(n, Math.floor(f + .5));
    bookNum.textContent = String(spread).padStart(2, '0');
  };

  const onScroll = () => {
    const y = scrollY;
    const dy = y - lastY;
    velocity = dy;
    if (nav) {
      nav.classList.toggle('is-solid', y > 40);
      nav.classList.toggle('is-hidden', dy > 4 && y > 400);
      if (dy < -4) nav.classList.remove('is-hidden');
    }
    lastY = y;
    if (!reduce) {
      parallax.forEach((img) => {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        img.style.setProperty('--py', (c * -60).toFixed(1) + 'px');
      });
    }
    renderBook();
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  // лента кадров: постоянный ход + ускорение от скорости прокрутки
  if (track2 && !reduce) {
    let boost = 0;
    const loop = () => {
      boost += (Math.abs(velocity) * .6 - boost) * .08;
      velocity *= .9;
      marqueeX -= .5 + boost;
      const half = track2.scrollWidth / 2;
      if (-marqueeX >= half) marqueeX += half;
      track2.style.transform = `translate3d(${marqueeX}px,0,0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------- Полка и просмотрщик альбома ---------- */
  const ALBUMS = {
    pakeersh: { title: 'PAKEERSH', meta: 'Журнал о себе · 2026', pages: 26, ratio: 840 / 1181 },
    polina:   { title: 'POLINA. MY 23’S', meta: 'Альбом в подарок · 2026', pages: 42, ratio: 840 / 1162 },
    mary:     { title: 'Александр. Спецвыпуск', meta: 'Журнал в подарок · единственный экземпляр · 2026', pages: 3, ratio: 840 / 1189 },
    evgenij:  { title: 'Евгений', soon: true },
    your:     { title: 'Ваш альбом', meta: 'Пока пустая обложка', blank: true },
  };
  const pageSrc = (key, i) => `img/albums/${key}/${String(i + 1).padStart(2, '0')}.webp`;
  const shelf = $('[data-shelf]');
  const viewer = $('.viewer');
  const vBook = $('[data-viewer-book]');
  const vNum = $('[data-viewer-num]');
  const vTotal = $('[data-viewer-total]');
  const vPrev = $('[data-viewer-prev]');
  const vNext = $('[data-viewer-next]');
  const vBlank = $('[data-viewer-blank]');
  const toast = $('.toast');
  let toastT;
  const say = (msg) => { toast.textContent = msg; toast.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('is-on'), 2800); };

  // чипы подсвечивают альбом и наоборот
  const hot = (key, on) => {
    $$(`[data-album="${key}"]`).forEach((el) => el.classList.toggle('is-hot', on));
    shelf.classList.toggle('has-focus', on);
  };
  $$('[data-chip]').forEach((c) => {
    c.addEventListener('mouseenter', () => hot(c.dataset.chip, true));
    c.addEventListener('mouseleave', () => hot(c.dataset.chip, false));
    c.addEventListener('click', () => openAlbum(c.dataset.chip, $(`[data-album="${c.dataset.chip}"]`)));
  });
  $$('[data-album]').forEach((a) => {
    a.addEventListener('click', () => openAlbum(a.dataset.album, a));
  });

  let cur = null, idx = 0, leafEls = [], opener = null;
  // на телефоне разворот ужимается до 170px на страницу — там показываем по одной
  const isSolo = () => matchMedia('(max-width: 700px), (max-height: 560px)').matches;
  let solo = false, soloImgs = [];

  const loadAround = () => {
    // грузим только соседние страницы — альбомы по 40 полос не тянем целиком
    const list = solo ? soloImgs : leafEls;
    list.forEach((el, i) => {
      if (Math.abs(i - idx) > 2) return;
      const imgs = solo ? [el] : [...el.querySelectorAll('img[data-src]')];
      imgs.forEach((img) => { if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); } });
    });
  };

  const render = () => {
    if (solo) {
      soloImgs.forEach((img, i) => img.classList.toggle('is-cur', i === idx));
      vNum.textContent = String(idx + 1).padStart(2, '0');
      vPrev.disabled = idx === 0;
      vNext.disabled = idx === soloImgs.length - 1;
      loadAround();
      return;
    }
    const n = leafEls.length;
    leafEls.forEach((leaf, i) => {
      const flipped = i < idx;
      leaf.style.setProperty('--rot', flipped ? -180 : 0);
      // во время переворота лист сверху, после — в своей стопке
      leaf.style.setProperty('--z', leaf.dataset.moving ? 100 : flipped ? i + 1 : n - i + 1);
    });
    const shift = idx === 0 ? -.25 : idx === n ? .25 : 0;
    vBook.style.setProperty('--shift', shift);
    vNum.textContent = String(idx).padStart(2, '0');
    vPrev.disabled = idx === 0;
    vNext.disabled = idx === n;
    loadAround();
  };

  const go = (dir) => {
    if (cur && ALBUMS[cur]?.blank) return;
    if (solo) {
      const next = clamp(idx + dir, 0, soloImgs.length - 1);
      if (next === idx) return;
      soloImgs[next].style.setProperty('--from', dir > 0 ? '28px' : '-28px');
      idx = next;
      render();
      track('album_flip');
      return;
    }
    const n = leafEls.length;
    const next = clamp(idx + dir, 0, n);
    if (next === idx) return;
    const leaf = leafEls[dir > 0 ? idx : idx - 1];
    leaf.dataset.moving = '1';
    idx = next;
    render();
    setTimeout(() => { delete leaf.dataset.moving; render(); }, reduce ? 0 : 1000);
    track('album_flip');
  };

  const buildBook = (key) => {
    const a = ALBUMS[key];
    vBook.innerHTML = '';
    vBook.style.setProperty('--ratio', a.ratio);
    solo = isSolo();
    vBook.classList.toggle('is-solo', solo);
    leafEls = []; soloImgs = [];
    if (solo) {
      for (let i = 0; i < a.pages; i++) {
        const img = document.createElement('img');
        img.alt = `${a.title} — страница ${i + 1}`;
        img.dataset.src = pageSrc(key, i);
        img.decoding = 'async';
        vBook.appendChild(img);
        soloImgs.push(img);
      }
      vTotal.textContent = String(a.pages).padStart(2, '0');
      return;
    }
    const leaves = Math.ceil(a.pages / 2);
    for (let i = 0; i < leaves; i++) {
      const leaf = document.createElement('div');
      leaf.className = 'leaf';
      const face = (p, cls) => {
        const f = document.createElement('div');
        f.className = 'leaf__face ' + cls;
        if (p < a.pages) {
          const img = document.createElement('img');
          img.alt = `${a.title} — страница ${p + 1}`;
          img.dataset.src = pageSrc(key, p);
          img.decoding = 'async';
          f.appendChild(img);
        }
        return f;
      };
      leaf.append(face(i * 2, 'leaf__front'), face(i * 2 + 1, 'leaf__back'));
      vBook.appendChild(leaf);
      leafEls.push(leaf);
    }
    vTotal.textContent = String(leaves).padStart(2, '0');
  };

  function openAlbum(key, from) {
    const a = ALBUMS[key];
    if (a.blank) {
      cur = key; opener = from;
      $('#viewer-title').textContent = a.title;
      $('[data-viewer-meta]').textContent = a.meta;
      vBook.hidden = true; vBlank.hidden = false;
      viewer.classList.add('is-blank');
      viewer.hidden = false;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => viewer.classList.add('is-open'));
      $('[data-viewer-close]').focus();
      track('album_blank');
      return;
    }
    vBook.hidden = false; vBlank.hidden = true;
    viewer.classList.remove('is-blank');
    if (a.soon) {
      from?.classList.remove('is-shake'); void from?.offsetWidth; from?.classList.add('is-shake');
      say('Альбом Евгения ещё собирается — скоро здесь можно будет полистать');
      track('album_soon');
      return;
    }
    cur = key; idx = 0; opener = from;
    $('#viewer-title').textContent = a.title;
    $('[data-viewer-meta]').textContent = a.meta;
    buildBook(key);
    viewer.hidden = false;
    document.body.style.overflow = 'hidden';
    vBook.classList.add('is-hidden');
    render();
    requestAnimationFrame(() => viewer.classList.add('is-open'));
    track('album_open_' + key);

    // обложка «вылетает» с полки в просмотрщик
    const srcImg = from?.querySelector('.album__cover img');
    const target = solo ? soloImgs[0] : leafEls[0]?.querySelector('.leaf__front');
    const land = () => { vBook.classList.remove('is-hidden'); if (!solo) setTimeout(() => go(1), reduce ? 0 : 450); };
    if (!srcImg || !target || reduce) { land(); $('[data-viewer-close]').focus(); return; }
    requestAnimationFrame(() => {
      const r0 = srcImg.getBoundingClientRect();
      const r1 = target.getBoundingClientRect();
      const fly = srcImg.cloneNode();
      fly.className = 'flight';
      Object.assign(fly.style, { left: r1.left + 'px', top: r1.top + 'px', width: r1.width + 'px', height: r1.height + 'px' });
      document.body.appendChild(fly);
      const dx = r0.left - r1.left, dy = r0.top - r1.top, s = r0.width / r1.width;
      fly.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${s})`, transformOrigin: '0 0' },
        { transform: 'translate(0, 0) scale(1) rotate(-3deg)', transformOrigin: '0 0', offset: .7 },
        { transform: 'none', transformOrigin: '0 0' },
      ], { duration: 850, easing: 'cubic-bezier(.2,.7,.1,1)' }).onfinish = () => { land(); fly.remove(); };
      $('[data-viewer-close]').focus();
    });
  }

  const closeViewer = () => {
    viewer.classList.remove('is-open', 'is-blank');
    document.body.style.overflow = '';
    setTimeout(() => { viewer.hidden = true; vBook.innerHTML = ''; }, 500);
    opener?.focus({ preventScroll: true });
    cur = null;
  };

  // повернули телефон или потянули окно — пересобираем книгу под новый режим
  let reflowT;
  addEventListener('resize', () => {
    if (!cur || ALBUMS[cur]?.blank || isSolo() === solo) return;
    clearTimeout(reflowT);
    reflowT = setTimeout(() => {
      const page = solo ? idx : idx * 2;            // где мы были, в страницах
      const wasSolo = solo;
      buildBook(cur);
      idx = wasSolo ? Math.min(Math.floor(page / 2), leafEls.length) : Math.min(page, soloImgs.length - 1);
      render();
    }, 200);
  });

  $('[data-viewer-close]').addEventListener('click', closeViewer);
  vPrev.addEventListener('click', () => go(-1));
  vNext.addEventListener('click', () => go(1));
  vBook.addEventListener('click', (e) => {
    const r = vBook.getBoundingClientRect();
    go(e.clientX > r.left + r.width / 2 ? 1 : -1);
  });
  addEventListener('keydown', (e) => {
    if (!cur) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  });
  let sx = null;
  vBook.addEventListener('pointerdown', (e) => (sx = e.clientX));
  vBook.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const d = e.clientX - sx; sx = null;
    if (Math.abs(d) > 40) { e.stopPropagation(); go(d < 0 ? 1 : -1); vBook.dataset.swiped = '1'; setTimeout(() => delete vBook.dataset.swiped, 50); }
  });
  vBook.addEventListener('click', (e) => { if (vBook.dataset.swiped) e.stopImmediatePropagation(); }, true);

  if (!fine || reduce) return;

  /* ---------- Курсор с подписью над фото ---------- */
  const cursor = $('.cursor');
  const label = $('.cursor__label');
  let mx = -100, my = -100, cx = -100, cy = -100;
  addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; cursor.classList.add('is-on'); }, { passive: true });
  document.addEventListener('mouseleave', () => cursor.classList.remove('is-on'));
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest('[data-cursor]');
    cursor.classList.toggle('is-big', !!t);
    if (t) label.textContent = t.dataset.cursor;
  });

  /* ---------- Превью услуги летит за курсором ---------- */
  const preview = $('.preview');
  let px = 0, py = 0;
  $$('.service').forEach((row) => {
    row.addEventListener('mouseenter', () => { preview.src = row.dataset.preview; preview.classList.add('is-on'); });
    row.addEventListener('mouseleave', () => preview.classList.remove('is-on'));
  });

  /* ---------- Магнитные ссылки ---------- */
  $$('.magnet').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px, ${(e.clientY - r.top - r.height / 2) * .35}px)`;
    });
    el.addEventListener('mouseleave', () => (el.style.transform = ''));
  });

  const follow = () => {
    cx += (mx - cx) * .2; cy += (my - cy) * .2;
    px += (mx - px) * .12; py += (my - py) * .12;
    cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`;
    preview.style.left = px + 'px'; preview.style.top = py + 'px';
    requestAnimationFrame(follow);
  };
  requestAnimationFrame(follow);
})();

/* ==========================================================================
   Cartelito — lógica de la app
   - Navegación por secciones con el hash (#inicio, #pelis, ...)
   - Formularios con vista previa en vivo y validación de Bootstrap
   - Tarjetas tipo póster minimalista 4:5, descargables en PNG 1080 × 1350
   - Colección en localStorage: buscar, filtrar, ordenar, favoritas, editar,
     duplicar, borrar con "Deshacer", exportar e importar JSON
   - Lámina: junta hasta 9 tarjetas con un título y descárgala para Instagram
   ========================================================================== */

(() => {
  'use strict';

  /* ---------- Utilidades ---------- */
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const hash = (str) => {
    let h = 2166136261;
    for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const fmtMin = (m) => {
    m = Math.round(Number(m) || 0);
    const h = Math.floor(m / 60), r = m % 60;
    if (!h) return `${r} min`;
    return r ? `${h} h ${r} min` : `${h} h`;
  };

  const mmssToMin = (s) => {
    const [a, b] = String(s || '').split(':').map(Number);
    return (a || 0) + (b || 0) / 60;
  };

  const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tarjeta';
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const splitNames = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 3);

  /* Tonos apagados para el fondo cuando no hay foto */
  const HUES = [12, 28, 42, 95, 160, 195, 215, 250, 290, 330];
  const hueFor = (title) => HUES[hash(title || '?') % HUES.length];

  /* Papeles del póster */
  const PAPERS = [
    { v: 'papel',  name: 'Papel',      bg: '#E8E4DB', ink: '#1F1D1A', muted: '#77716A' },
    { v: 'hueso',  name: 'Hueso',      bg: '#F5F3EF', ink: '#1F1D1A', muted: '#7A766F' },
    { v: 'niebla', name: 'Niebla',     bg: '#DCDEE1', ink: '#1C1E22', muted: '#686D75' },
    { v: 'rosa',   name: 'Rosa viejo', bg: '#EBDAD5', ink: '#2A1E1C', muted: '#806660' },
    { v: 'salvia', name: 'Salvia',     bg: '#DAE0D1', ink: '#1E221B', muted: '#67705F' },
    { v: 'noche',  name: 'Noche',      bg: '#1C1C1E', ink: '#EEEAE3', muted: '#9C978F' }
  ];
  const paperOf = (d) => PAPERS.find((p) => p.v === d.papel) || PAPERS[0];

  const TYPE = {
    peli:   { label: 'Película', view: 'pelis',  form: '#form-peli' },
    serie:  { label: 'Serie',    view: 'series', form: '#form-serie' },
    musica: { label: 'Canción',  view: 'musica', form: '#form-musica' }
  };

  /* ---------- Datos de ejemplo ---------- */
  const SAMPLES = {
    peli: [
      { titulo: 'Parásitos', anio: '2019', director: 'Bong Joon-ho', empresa: 'Barunson E&A', genero: 'Thriller', duracion: '132', reparto: 'Song Kang-ho, Lee Sun-kyun, Cho Yeo-jeong, Choi Woo-shik', nota: '5', papel: 'papel' },
      { titulo: 'El laberinto del fauno', anio: '2006', director: 'Guillermo del Toro', empresa: 'Tequila Gang', genero: 'Fantasía', duracion: '118', reparto: 'Ivana Baquero, Sergi López, Maribel Verdú, Doug Jones', nota: '5', papel: 'papel' },
      { titulo: 'El viaje de Chihiro', anio: '2001', director: 'Hayao Miyazaki', empresa: 'Studio Ghibli', genero: 'Animación', duracion: '125', reparto: 'Rumi Hiiragi, Miyu Irino, Mari Natsuki', nota: '4', papel: 'hueso' }
    ],
    serie: [
      { titulo: 'Dark', anio: '2017', creador: 'Baran bo Odar y Jantje Friese', plataforma: 'Netflix', genero: 'Ciencia ficción', temporadas: '3', capitulos: '26', duracion: '60', estado: 'Finalizada', reparto: 'Louis Hofmann, Lisa Vicari, Oliver Masucci', nota: '5', papel: 'niebla' },
      { titulo: 'Breaking Bad', anio: '2008', creador: 'Vince Gilligan', plataforma: 'AMC', genero: 'Drama', temporadas: '5', capitulos: '62', duracion: '47', estado: 'Finalizada', reparto: 'Bryan Cranston, Aaron Paul, Anna Gunn', nota: '5', papel: 'papel' },
      { titulo: 'Arcane', anio: '2021', creador: 'Christian Linke y Alex Yee', plataforma: 'Netflix', genero: 'Animación', temporadas: '2', capitulos: '18', duracion: '40', estado: 'Finalizada', reparto: 'Hailee Steinfeld, Ella Purnell, Katie Leung', nota: '4', papel: 'noche' }
    ],
    musica: [
      { titulo: 'Bohemian Rhapsody', autor: 'Queen', album: 'A Night at the Opera', anio: '1975', duracion: '5:55', nota: '5', papel: 'papel' },
      { titulo: 'Ojitos Lindos', autor: 'Bad Bunny y Bomba Estéreo', album: 'Un Verano Sin Ti', anio: '2022', duracion: '4:18', nota: '4', papel: 'salvia' },
      { titulo: 'Como la Flor', autor: 'Selena', album: 'Entre a Mi Mundo', anio: '1992', duracion: '3:04', nota: '5', papel: 'rosa' }
    ]
  };

  /* ==========================================================================
     Render de tarjetas (póster minimalista)
     ========================================================================== */
  const ICONS = {
    peli: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M7 4v16M17 4v16M3 8h4M3 12h4M3 16h4M17 8h4M17 12h4M17 16h4"/></svg>',
    serie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="2.5" y="5" width="19" height="13" rx="1.5"/><path d="M8 21h8M9 2l3 3 3-3"/></svg>',
    musica: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 5.5a6.5 6.5 0 0 1 6.5 6.5"/></svg>'
  };

  function photoHTML(d) {
    const img = d.imagen
      ? `<img src="${esc(d.imagen)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`
      : '';
    return `<div class="pc-photo${d.bn ? ' is-bw' : ''}">
        <div class="pc-ph" style="--h:${hueFor(d.titulo)}">${ICONS[d.type] || ICONS.peli}</div>${img}
      </div>`;
  }

  const row = (label, values) => {
    const vals = (Array.isArray(values) ? values : [values]).filter((v) => v != null && String(v).trim() !== '');
    if (!vals.length) return '';
    return `<div><dt>${label}</dt><dd>${vals.map((v) => `<span>${esc(v)}</span>`).join('')}</dd></div>`;
  };

  const starsRow = (n) => {
    n = Number(n) || 0;
    if (!n) return '';
    return `<div><dt>mi nota</dt><dd><span class="pc-stars" aria-label="${n} de 5">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span></dd></div>`;
  };

  const titleHTML = (d, fallback) =>
    `<h3 class="pc-title">${esc(d.titulo || fallback)}${d.anio ? `<span class="pc-year">${esc(d.anio)}</span>` : ''}</h3>`;

  function shell(d, inner) {
    const p = paperOf(d);
    return `<article class="pcard pcard--${d.type}" style="--pc-bg:${p.bg};--pc-ink:${p.ink};--pc-muted:${p.muted}">
      <div class="pc-in">${photoHTML(d)}${inner}</div>
    </article>`;
  }

  function renderPeli(d) {
    const reparto = splitNames(d.reparto);
    return shell(d, `
      ${titleHTML(d, 'Título')}
      <dl class="pc-meta">
        ${row('duración', d.duracion ? `${d.duracion} minutos` : '')}
        ${row('dirigida por', d.director)}
        ${row('producida por', d.empresa)}
        ${reparto.length ? '<span class="pc-space"></span>' + row('reparto', reparto) : ''}
        ${starsRow(d.nota)}
      </dl>`);
  }

  function renderSerie(d) {
    const reparto = splitNames(d.reparto);
    const eps = [
      d.temporadas ? `${d.temporadas} ${Number(d.temporadas) === 1 ? 'temporada' : 'temporadas'}` : '',
      d.capitulos ? `${d.capitulos} capítulos` : '',
      d.duracion ? `${d.duracion} min` : ''
    ];
    return shell(d, `
      ${titleHTML(d, 'Título')}
      <dl class="pc-meta">
        ${row('episodios', eps)}
        ${row('creada por', d.creador)}
        ${row('dónde verla', [d.plataforma, d.estado])}
        ${reparto.length ? '<span class="pc-space"></span>' + row('reparto', reparto) : ''}
        ${starsRow(d.nota)}
      </dl>`);
  }

  function renderMusica(d) {
    const dur = /^\d{1,2}:[0-5]\d$/.test(d.duracion || '') ? d.duracion : '0:00';
    const totalSec = Math.round(mmssToMin(dur) * 60);
    const p = 24 + (hash(d.titulo || 'm') % 40);
    const cur = Math.round(totalSec * p / 100);
    const curTxt = `${Math.floor(cur / 60)}:${String(cur % 60).padStart(2, '0')}`;
    const artist = [d.autor || 'Artista', d.album].filter(Boolean).map(esc).join(' · ');
    return shell(d, `
      ${titleHTML(d, 'Canción')}
      <p class="pc-artist">${artist}</p>
      <div class="pc-player">
        <span>${curTxt}</span>
        <div class="pc-bar"><i style="--p:${p}%"></i></div>
        <span>-${esc(dur)}</span>
      </div>
      <div class="pc-controls" aria-hidden="true">
        <svg class="pc-side" viewBox="0 0 24 24" fill="${d.fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.6 4.5 7.1 4.5c2 0 3.6 1.2 4.9 3 1.3-1.8 2.9-3 4.9-3 3.5 0 5.7 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>
        <svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="5" width="2.4" height="14" rx="1"/><path d="M20 5.5v13L8.5 12z"/></svg>
        <svg class="pc-play" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.5" fill="currentColor"/><path d="M9.6 7.6v8.8L16.6 12z" style="fill:var(--pc-bg)"/></svg>
        <svg viewBox="0 0 24 24" fill="currentColor"><rect x="17.6" y="5" width="2.4" height="14" rx="1"/><path d="M4 5.5v13L15.5 12z"/></svg>
        <svg class="pc-side" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11V9a3 3 0 0 1 3-3h12l-3-3M20 13v2a3 3 0 0 1-3 3H5l3 3"/></svg>
      </div>`);
  }

  const renderCard = (d) => d.type === 'serie' ? renderSerie(d) : d.type === 'musica' ? renderMusica(d) : renderPeli(d);

  /* ==========================================================================
     Almacenamiento
     ========================================================================== */
  const KEY = 'cartelito.coleccion.v1';
  const OLD_KEY = 'taquilla.coleccion.v1';
  const PICK_KEY = 'cartelito.lamina';

  function makeSamples() {
    const now = Date.now();
    const out = [];
    let i = 0;
    for (const type of ['peli', 'serie', 'musica']) {
      SAMPLES[type].forEach((s) => {
        out.push({ ...s, type, id: uid() + i, createdAt: now - (i++) * 60000, ejemplo: true, fav: i === 1 });
      });
    }
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
      if (raw === null) return makeSamples();
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : makeSamples();
    } catch (e) { return makeSamples(); }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cards)); } catch (e) { /* sin almacenamiento */ }
    $('#nav-count').textContent = cards.length;
  }

  let cards = load();

  /* ==========================================================================
     Toast
     ========================================================================== */
  const toast = bootstrap.Toast.getOrCreateInstance($('#toast'), { delay: 5000 });
  let toastFn = null;

  function notify(text, action) {
    $('#toast-text').textContent = text;
    const btn = $('#toast-action');
    if (action) { btn.textContent = action.label; btn.hidden = false; toastFn = action.fn; }
    else { btn.hidden = true; toastFn = null; }
    toast.show();
  }
  $('#toast-action').addEventListener('click', () => { if (toastFn) toastFn(); toastFn = null; toast.hide(); });

  /* ==========================================================================
     Exportar a PNG (html-to-image)
     ========================================================================== */
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  let fontCSS = null;
  const corsCache = new Map();

  async function corsOk(url) {
    if (corsCache.has(url)) return corsCache.get(url);
    let ok = false;
    try { const r = await fetch(url, { mode: 'cors', referrerPolicy: 'no-referrer' }); ok = r.ok; } catch (e) { ok = false; }
    corsCache.set(url, ok);
    return ok;
  }

  function saveBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  async function exportPNG(html, width, pixelRatio, filename, btn) {
    if (!window.htmlToImage) {
      notify('No se pudo cargar la herramienta de descarga. Revisa tu conexión a internet y recarga la página.');
      return;
    }
    const label = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Generando…'; }

    const stage = document.createElement('div');
    stage.className = 'export-stage';
    stage.style.width = width + 'px';
    stage.innerHTML = html;
    document.body.appendChild(stage);
    const node = stage.firstElementChild;

    try {
      await document.fonts.ready;
      const imgs = $$('img', stage);
      await Promise.all(imgs.map((img) => img.complete ? null : new Promise((r) => { img.addEventListener('load', r); img.addEventListener('error', r); })));
      const blocked = [];
      for (const img of $$('img', stage)) {
        if (!img.naturalWidth || !(await corsOk(img.src))) { blocked.push(img.src); img.remove(); }
      }
      if (!fontCSS) fontCSS = await htmlToImage.getFontEmbedCSS(node);
      const blob = await htmlToImage.toBlob(node, { pixelRatio, fontEmbedCSS: fontCSS, imagePlaceholder: BLANK, cacheBust: false });
      saveBlob(blob, filename);
      notify(blocked.length
        ? `Se descargó ${filename}, pero ${blocked.length === 1 ? 'una foto no se pudo usar' : blocked.length + ' fotos no se pudieron usar'}: ese sitio no permite copiar sus imágenes. Prueba con otra URL.`
        : `Se descargó ${filename}.`);
    } catch (err) {
      console.error(err);
      notify('No se pudo generar la imagen. Recarga la página e inténtalo otra vez.');
    } finally {
      stage.remove();
      if (btn) { btn.disabled = false; btn.innerHTML = label; }
    }
  }

  const downloadCard = (d, btn) => exportPNG(renderCard(d), 540, 2, `${slug(d.titulo)}.png`, btn);

  /* ==========================================================================
     Navegación
     ========================================================================== */
  const VIEWS = ['inicio', 'pelis', 'series', 'musica', 'coleccion'];
  const NAMES = { inicio: 'Cartelito', pelis: 'Pelis · Cartelito', series: 'Series · Cartelito', musica: 'Música · Cartelito', coleccion: 'Mi colección · Cartelito' };
  const menu = bootstrap.Collapse.getOrCreateInstance($('#menu'), { toggle: false });
  let currentView = 'inicio';

  function route() {
    const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'inicio';
    currentView = v;
    $$('[data-view]').forEach((s) => { s.hidden = s.dataset.view !== v; });
    $$('[data-nav]').forEach((a) => {
      const on = a.dataset.nav === v;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = NAMES[v];
    if (v === 'coleccion') renderCollection();
    updateLaminaBar();
    menu.hide();
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', route);

  /* ==========================================================================
     Tema claro / oscuro
     ========================================================================== */
  const themeBtn = $('#btn-tema');
  function paintThemeBtn() {
    const dark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    themeBtn.innerHTML = `<i class="bi ${dark ? 'bi-sun' : 'bi-moon-stars'}" aria-hidden="true"></i>`;
    themeBtn.setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  }
  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', next);
    try { localStorage.setItem('cartelito.tema', next); } catch (e) {}
    paintThemeBtn();
  });

  /* ==========================================================================
     Formularios
     ========================================================================== */
  const forms = $$('form[data-type]');
  const sampleIdx = { peli: 0, serie: 0, musica: 0 };

  // Muestras de papel
  $$('.js-swatches').forEach((box) => {
    const p = box.dataset.prefix;
    box.innerHTML = PAPERS.map((pp, i) => `
      <input type="radio" class="btn-check" name="papel" id="${p}-c${i}" value="${pp.v}" ${i === 0 ? 'checked' : ''}>
      <label class="swatch swatch--paper" for="${p}-c${i}" style="--sw:${pp.bg};--sw-ink:${pp.ink}" title="${pp.name}">
        <span class="visually-hidden">${pp.name}</span>
      </label>`).join('');
  });

  // Vista previa: tarjeta + botón de descarga
  $$('.js-preview').forEach((box) => {
    box.innerHTML = `
      <div class="js-preview-card w-100"></div>
      <div class="preview-actions">
        <button class="btn btn-ghost js-download-preview" type="button"><i class="bi bi-download" aria-hidden="true"></i> Descargar PNG</button>
      </div>
      <span class="size-note">1080 × 1350 px · formato vertical de Instagram</span>`;
  });

  function readForm(form) {
    const d = { type: form.dataset.type, bn: false };
    for (const [k, v] of new FormData(form)) d[k] = typeof v === 'string' ? v.trim() : v;
    d.bn = d.bn === '1' || d.bn === true;
    return d;
  }

  function previewData(form) {
    const d = readForm(form);
    const existing = d.id ? cards.find((c) => c.id === d.id) : null;
    if (existing) d.fav = existing.fav;
    return d;
  }

  function updatePreview(form) {
    $(`#preview-${form.dataset.type} .js-preview-card`).innerHTML = renderCard(previewData(form));
  }

  function setEditing(form, card) {
    $('.edit-banner', form).hidden = !card;
    $('.js-submit-label', form).textContent = card ? 'Guardar cambios' : 'Guardar en colección';
    if (card) $('.js-edit-name', form).textContent = `«${card.titulo}»`;
  }

  function fillForm(form, d) {
    form.reset();
    form.classList.remove('was-validated');
    for (const el of form.elements) {
      if (!el.name || !(el.name in d)) continue;
      const v = d[el.name] ?? '';
      if (el.type === 'radio') el.checked = String(v) === el.value;
      else if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v;
    }
    if (!d.papel || !PAPERS.some((p) => p.v === d.papel)) $('input[name="papel"]', form).checked = true;
    $('input[name="id"]', form).value = d.id || '';
    resetImgStatus(form);
    checkImage($('.js-img-url', form));
    updatePreview(form);
  }

  function clearForm(form) {
    form.reset();
    $('input[name="id"]', form).value = '';
    form.classList.remove('was-validated');
    setEditing(form, null);
    resetImgStatus(form);
    updatePreview(form);
  }

  // Estado de la URL de imagen
  const imgDefaults = new Map();
  function setStatus(st, text, cls) {
    st.textContent = text;
    st.classList.remove('is-ok', 'is-bad');
    if (cls) st.classList.add(cls);
  }
  function resetImgStatus(form) {
    const st = $('.js-img-status', form);
    if (!imgDefaults.has(st)) imgDefaults.set(st, st.textContent);
    setStatus(st, imgDefaults.get(st));
  }
  let imgTimer;
  function checkImage(input) {
    const form = input.form;
    const st = $('.js-img-status', form);
    clearTimeout(imgTimer);
    const url = input.value.trim();
    if (!url) { resetImgStatus(form); return; }
    if (!input.checkValidity()) { setStatus(st, 'Eso no parece una URL. Debe empezar con https://', 'is-bad'); return; }
    setStatus(st, 'Revisando imagen…');
    imgTimer = setTimeout(() => {
      const probe = new Image();
      probe.referrerPolicy = 'no-referrer';
      probe.onload = async () => {
        if (input.value.trim() !== url) return;
        const ok = await corsOk(url);
        if (input.value.trim() !== url) return;
        if (ok) setStatus(st, 'Imagen lista. También saldrá en el PNG.', 'is-ok');
        else setStatus(st, 'Se ve en la página, pero ese sitio no deja usarla en el PNG. Si vas a descargar, prueba con otra URL.', 'is-bad');
      };
      probe.onerror = () => { if (input.value.trim() === url) setStatus(st, 'No se pudo cargar esa imagen; se usará un fondo de color.', 'is-bad'); };
      probe.src = url;
    }, 350);
  }

  forms.forEach((form) => {
    const type = form.dataset.type;

    form.addEventListener('input', (e) => {
      updatePreview(form);
      if (e.target.classList.contains('js-img-url')) checkImage(e.target);
    });
    form.addEventListener('change', () => updatePreview(form));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        const bad = $(':invalid', form);
        if (bad) bad.focus();
        notify('Faltan datos: revisa los campos marcados en rojo.');
        return;
      }
      const d = readForm(form);
      const goTo = { label: 'Ver colección', fn: () => { location.hash = 'coleccion'; } };
      if (d.id) {
        const i = cards.findIndex((c) => c.id === d.id);
        if (i > -1) {
          cards[i] = { ...cards[i], ...d, ejemplo: false };
          save();
          notify(`Cambios guardados en «${d.titulo}».`, goTo);
        }
      } else {
        Object.assign(d, { id: uid(), createdAt: Date.now(), fav: false });
        cards.unshift(d);
        save();
        notify(`«${d.titulo}» se guardó en tu colección.`, goTo);
      }
      clearForm(form);
    });

    $('.js-sample', form).addEventListener('click', () => {
      const list = SAMPLES[type];
      const s = list[sampleIdx[type]++ % list.length];
      fillForm(form, { ...s, id: $('input[name="id"]', form).value });
    });
    $('.js-clear', form).addEventListener('click', () => clearForm(form));
    $('.js-cancel', form).addEventListener('click', () => { clearForm(form); location.hash = 'coleccion'; });
    $(`#preview-${type} .js-download-preview`).addEventListener('click', (e) => downloadCard(previewData(form), e.currentTarget));

    updatePreview(form);
  });

  function openInForm(card, asCopy) {
    const form = $(TYPE[card.type].form);
    location.hash = TYPE[card.type].view;
    fillForm(form, asCopy ? { ...card, id: '' } : card);
    setEditing(form, asCopy ? null : card);
    setTimeout(() => $('input[name="titulo"]', form).focus({ preventScroll: true }), 50);
  }

  /* ==========================================================================
     Colección
     ========================================================================== */
  const state = { q: '', filtro: 'todo', orden: 'recientes' };

  function visibleCards() {
    const q = norm(state.q);
    const list = cards.filter((c) => {
      if (state.filtro === 'fav' && !c.fav) return false;
      if (TYPE[state.filtro] && c.type !== state.filtro) return false;
      if (!q) return true;
      return norm([c.titulo, c.director, c.creador, c.autor, c.album, c.empresa, c.plataforma, c.genero, c.reparto, c.anio].join(' ')).includes(q);
    });
    const by = {
      recientes: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
      titulo: (a, b) => String(a.titulo).localeCompare(String(b.titulo), 'es'),
      'anio-desc': (a, b) => (Number(b.anio) || 0) - (Number(a.anio) || 0),
      'anio-asc': (a, b) => (Number(a.anio) || 0) - (Number(b.anio) || 0),
      nota: (a, b) => (Number(b.nota) || 0) - (Number(a.nota) || 0)
    }[state.orden];
    return list.sort(by);
  }

  function renderStats() {
    const n = { peli: 0, serie: 0, musica: 0 };
    let minutos = 0;
    cards.forEach((c) => {
      n[c.type] = (n[c.type] || 0) + 1;
      if (c.type === 'peli') minutos += Number(c.duracion) || 0;
      if (c.type === 'serie') minutos += (Number(c.capitulos) || 0) * (Number(c.duracion) || 0);
      if (c.type === 'musica') minutos += mmssToMin(c.duracion);
    });
    const plural = (k, s, p) => `${k} ${k === 1 ? s : p}`;
    $('#stats-line').textContent = cards.length
      ? `${plural(n.peli, 'película', 'películas')} · ${plural(n.serie, 'serie', 'series')} · ${plural(n.musica, 'canción', 'canciones')} · ${fmtMin(minutos)} de contenido en total`
      : 'Tu colección está vacía.';
  }

  function actionBtn(action, icon, title, extra = '') {
    return `<button class="btn${extra}" type="button" data-action="${action}" title="${title}"><i class="bi ${icon}" aria-hidden="true"></i><span class="visually-hidden">${title}</span></button>`;
  }

  function renderCollection() {
    renderStats();
    const list = visibleCards();
    $('#grid').innerHTML = list.map((c) => {
      const picked = lam.ids.includes(c.id);
      return `
      <div class="grid-item${picked ? ' is-picked' : ''}" data-id="${esc(c.id)}">
        ${renderCard(c)}
        <div class="card-actions">
          ${actionBtn('fav', c.fav ? 'bi-heart-fill' : 'bi-heart', c.fav ? 'Quitar de favoritas' : 'Marcar como favorita', c.fav ? ' is-fav' : '')}
          ${actionBtn('pick', picked ? 'bi-check2' : 'bi-grid-3x3-gap', picked ? 'Quitar de la lámina' : 'Agregar a la lámina', picked ? ' is-picked' : '')}
          ${actionBtn('png', 'bi-download', 'Descargar PNG')}
          ${actionBtn('edit', 'bi-pencil', 'Editar')}
          ${actionBtn('dup', 'bi-copy', 'Duplicar como nueva')}
          ${actionBtn('del', 'bi-trash3', 'Borrar', ' btn-del')}
        </div>
        ${c.ejemplo ? '<span class="sample-chip">Ejemplo</span>' : ''}
      </div>`;
    }).join('');

    const empty = $('#empty');
    empty.hidden = list.length > 0;
    if (!list.length) {
      const filtered = cards.length > 0;
      $('#empty-title').textContent = filtered ? 'Nada coincide con tu búsqueda' : 'Aún no hay tarjetas aquí';
      $('#empty-text').textContent = filtered
        ? 'Prueba con otra palabra o cambia el filtro.'
        : 'Crea una en Pelis, Series o Música y aparecerá aquí.';
    }
  }

  $('#grid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.closest('.grid-item').dataset.id;
    const i = cards.findIndex((c) => c.id === id);
    if (i < 0) return;
    const c = cards[i];

    switch (btn.dataset.action) {
      case 'fav':
        c.fav = !c.fav; save(); renderCollection();
        notify(c.fav ? `«${c.titulo}» está en favoritas.` : `«${c.titulo}» salió de favoritas.`);
        break;
      case 'pick':
        togglePick(c);
        break;
      case 'png':
        downloadCard(c, btn);
        break;
      case 'edit':
        openInForm(c, false);
        break;
      case 'dup': {
        const copy = { ...c, id: uid(), createdAt: Date.now(), titulo: `${c.titulo} (copia)`, ejemplo: false, fav: false };
        cards.splice(i, 0, copy); save(); renderCollection();
        notify(`Se creó una copia de «${c.titulo}».`, { label: 'Editarla', fn: () => openInForm(copy, false) });
        break;
      }
      case 'del': {
        const [removed] = cards.splice(i, 1);
        const pickPos = lam.ids.indexOf(removed.id);
        if (pickPos > -1) { lam.ids.splice(pickPos, 1); savePicks(); }
        save(); renderCollection(); updateLaminaBar();
        notify(`«${removed.titulo}» se borró.`, {
          label: 'Deshacer',
          fn: () => {
            cards.splice(i, 0, removed);
            if (pickPos > -1) { lam.ids.splice(pickPos, 0, removed.id); savePicks(); }
            save(); renderCollection(); updateLaminaBar();
          }
        });
        break;
      }
    }
  });

  $('#buscar').addEventListener('input', (e) => { state.q = e.target.value; renderCollection(); });
  $$('input[name="filtro"]').forEach((r) => r.addEventListener('change', (e) => { state.filtro = e.target.value; renderCollection(); }));
  $('#orden').addEventListener('change', (e) => { state.orden = e.target.value; renderCollection(); });

  // Exportar / importar JSON
  $('#btn-exportar').addEventListener('click', () => {
    saveBlob(new Blob([JSON.stringify(cards, null, 2)], { type: 'application/json' }),
      `cartelito-coleccion-${new Date().toISOString().slice(0, 10)}.json`);
    notify(`Exportaste ${cards.length} tarjetas.`);
  });

  $('#importar').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('formato');
        const ids = new Set(cards.map((c) => c.id));
        let added = 0;
        data.filter((c) => c && TYPE[c.type] && c.titulo).forEach((c) => {
          if (!c.id || ids.has(c.id)) c.id = uid();
          ids.add(c.id);
          cards.push({ createdAt: Date.now(), ...c });
          added++;
        });
        save(); renderCollection();
        notify(added ? `Se importaron ${added} tarjetas.` : 'El archivo no tenía tarjetas válidas.');
      } catch (err) {
        notify('No se pudo leer el archivo. Debe ser un JSON exportado desde Cartelito.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  $('#btn-ejemplos').addEventListener('click', () => {
    const extra = makeSamples().map((c) => ({ ...c, createdAt: Date.now(), fav: false }));
    cards = extra.concat(cards);
    save(); renderCollection();
    notify(`Se agregaron ${extra.length} tarjetas de ejemplo.`);
  });

  /* ==========================================================================
     Lámina (varias tarjetas en una imagen)
     ========================================================================== */
  const MAX_PICKS = 9;
  const FORMATS = { post: [1080, 1350], cuadrado: [1080, 1080], historia: [1080, 1920] };
  const LAMINA_BGS = [
    { v: 'perla',  name: 'Gris perla', bg: '#EDECEF', ink: '#1B1B1F' },
    { v: 'papel',  name: 'Papel',      bg: '#E8E4DB', ink: '#1F1D1A' },
    { v: 'blanco', name: 'Blanco',     bg: '#FFFFFF', ink: '#1B1B1F' },
    { v: 'noche',  name: 'Noche',      bg: '#141416', ink: '#F1EEE8' }
  ];

  function loadPicks() {
    try { const a = JSON.parse(localStorage.getItem(PICK_KEY) || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function savePicks() { try { localStorage.setItem(PICK_KEY, JSON.stringify(lam.ids)); } catch (e) {} }

  const lam = {
    ids: loadPicks().filter((id) => cards.some((c) => c.id === id)),
    titulo: 'mis pelis de confort',
    tituloTocado: false,
    usuario: '',
    formato: 'post',
    fondo: 'perla'
  };

  function suggestedTitle(items) {
    const types = new Set(items.map((c) => c.type));
    if (types.size !== 1) return 'lo que me acompañó este año';
    return { peli: 'mis pelis de confort', serie: 'series que volvería a ver', musica: 'canciones en repetición' }[[...types][0]];
  }

  function togglePick(c) {
    const pos = lam.ids.indexOf(c.id);
    if (pos > -1) lam.ids.splice(pos, 1);
    else if (lam.ids.length >= MAX_PICKS) { notify(`La lámina admite hasta ${MAX_PICKS} tarjetas. Quita una para agregar otra.`); return; }
    else lam.ids.push(c.id);
    savePicks(); renderCollection(); updateLaminaBar();
  }

  function updateLaminaBar() {
    const n = lam.ids.length;
    const show = n > 0 && currentView === 'coleccion';
    $('#lamina-bar').hidden = !show;
    document.body.classList.toggle('has-lamina-bar', show);
    $('#lamina-bar-text').textContent = `${n} ${n === 1 ? 'tarjeta' : 'tarjetas'} en la lámina`;
  }

  function laminaItems() {
    return lam.ids.map((id) => cards.find((c) => c.id === id)).filter(Boolean).slice(0, MAX_PICKS);
  }

  function laminaHTML() {
    const [W, H] = FORMATS[lam.formato];
    const items = laminaItems();
    const n = Math.max(items.length, 1);
    const bg = LAMINA_BGS.find((b) => b.v === lam.fondo) || LAMINA_BGS[0];
    const pad = 64;
    const gap = n > 4 ? 30 : 40;
    const capH = lam.titulo ? 72 + 52 : 0;

    let cols = n <= 3 ? n : n === 4 ? 2 : 3;
    if (lam.formato === 'historia' && n >= 4 && n <= 6) cols = 2;
    const rows = Math.ceil(n / cols);
    const availW = W - pad * 2;
    const availH = H - pad * 2 - capH - (lam.usuario ? 24 : 0);
    const cw = Math.floor(Math.min((availW - gap * (cols - 1)) / cols, ((availH - gap * (rows - 1)) / rows) * 0.8, 520));

    const grid = items.length
      ? items.map((c) => `<div class="lamina__cell">${renderCard(c)}</div>`).join('')
      : `<p style="font:600 34px/1.3 var(--font-display);opacity:.5;text-align:center;max-width:640px;margin:0">Agrega tarjetas desde tu colección con el botón de cuadrícula.</p>`;

    return `<div class="lamina" style="width:${W}px;height:${H}px;background:${bg.bg};color:${bg.ink};--cw:${cw}px;--gap:${gap}px">
      <div class="lamina__grid" style="max-width:${cols * cw + (cols - 1) * gap}px">${grid}</div>
      ${lam.titulo ? `<p class="lamina__caption">${esc(lam.titulo)}</p>` : ''}
      ${lam.usuario ? `<span class="lamina__handle">${esc(lam.usuario)}</span>` : ''}
    </div>`;
  }

  function renderLamina() {
    const [W, H] = FORMATS[lam.formato];
    const frame = $('#lamina-frame');
    const scale = Math.min(frame.clientWidth / W, (window.innerHeight * 0.7) / H);
    frame.style.height = `${Math.round(H * scale)}px`;
    const sc = $('#lamina-scale');
    sc.innerHTML = laminaHTML();
    sc.style.left = `${Math.round((frame.clientWidth - W * scale) / 2)}px`;
    sc.style.transform = `scale(${scale})`;
    $('#lamina-size').textContent = `${W} × ${H} px`;

    const items = laminaItems();
    $('#lamina-count').textContent = items.length;
    $('#lamina-list').innerHTML = items.map((c, i) => `
      <li data-id="${esc(c.id)}">
        <span>${esc(c.titulo)}</span>
        <button class="btn" type="button" data-move="-1" ${i === 0 ? 'disabled' : ''} title="Mover antes"><i class="bi bi-arrow-up" aria-hidden="true"></i><span class="visually-hidden">Mover antes</span></button>
        <button class="btn" type="button" data-move="1" ${i === items.length - 1 ? 'disabled' : ''} title="Mover después"><i class="bi bi-arrow-down" aria-hidden="true"></i><span class="visually-hidden">Mover después</span></button>
        <button class="btn" type="button" data-remove title="Quitar"><i class="bi bi-x-lg" aria-hidden="true"></i><span class="visually-hidden">Quitar</span></button>
      </li>`).join('') || '<li><span>Sin tarjetas todavía.</span></li>';
    $('#lamina-descargar').disabled = items.length === 0;
  }

  $('#lamina-fondos').innerHTML = LAMINA_BGS.map((b, i) => `
    <input type="radio" class="btn-check" name="lamina-fondo" id="lb-${b.v}" value="${b.v}" ${i === 0 ? 'checked' : ''}>
    <label class="swatch swatch--paper" for="lb-${b.v}" style="--sw:${b.bg};--sw-ink:${b.ink}" title="${b.name}"><span class="visually-hidden">${b.name}</span></label>`).join('');

  const modalEl = $('#modal-lamina');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  function openLamina() {
    if (!lam.ids.length) {
      lam.ids = visibleCards().slice(0, MAX_PICKS).map((c) => c.id);
      savePicks();
      if (currentView === 'coleccion') renderCollection();
    }
    updateLaminaBar();
    if (!lam.tituloTocado) {
      lam.titulo = suggestedTitle(laminaItems());
      $('#lamina-titulo').value = lam.titulo;
    }
    modal.show();
  }

  $('#btn-lamina').addEventListener('click', openLamina);
  $('#lamina-bar-open').addEventListener('click', openLamina);
  $('#lamina-bar-clear').addEventListener('click', () => {
    const before = lam.ids.slice();
    lam.ids = []; savePicks(); renderCollection(); updateLaminaBar();
    notify('Vaciaste la lámina.', { label: 'Deshacer', fn: () => { lam.ids = before; savePicks(); renderCollection(); updateLaminaBar(); } });
  });

  modalEl.addEventListener('shown.bs.modal', renderLamina);
  modalEl.addEventListener('hidden.bs.modal', () => { if (currentView === 'coleccion') renderCollection(); updateLaminaBar(); });
  new ResizeObserver(() => { if (modalEl.classList.contains('show')) renderLamina(); }).observe($('#lamina-frame'));

  $('#lamina-titulo').addEventListener('input', (e) => { lam.titulo = e.target.value.trim(); lam.tituloTocado = true; renderLamina(); });
  $('#lamina-usuario').addEventListener('input', (e) => { lam.usuario = e.target.value.trim(); renderLamina(); });
  $$('input[name="lamina-formato"]').forEach((r) => r.addEventListener('change', (e) => { lam.formato = e.target.value; renderLamina(); }));
  $$('input[name="lamina-fondo"]').forEach((r) => r.addEventListener('change', (e) => { lam.fondo = e.target.value; renderLamina(); }));

  $('#lamina-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.closest('li').dataset.id;
    const i = lam.ids.indexOf(id);
    if (i < 0) return;
    if (btn.hasAttribute('data-remove')) lam.ids.splice(i, 1);
    else {
      const j = i + Number(btn.dataset.move);
      [lam.ids[i], lam.ids[j]] = [lam.ids[j], lam.ids[i]];
    }
    savePicks(); renderLamina();
  });

  $('#lamina-descargar').addEventListener('click', (e) => {
    const [W] = FORMATS[lam.formato];
    exportPNG(laminaHTML(), W, 1, `lamina-${slug(lam.titulo || 'cartelito')}-${lam.formato}.png`, e.currentTarget);
  });

  /* ==========================================================================
     Inicio: pila del hero y carrusel
     ========================================================================== */
  $('#hero-stack').innerHTML = [
    { ...SAMPLES.musica[2], type: 'musica' },
    { ...SAMPLES.serie[0], type: 'serie' },
    { ...SAMPLES.peli[1], type: 'peli' }
  ].map(renderCard).join('');

  const SLIDES = [
    { type: 'peli', i: 1, text: 'Formato vertical 4:5, el mismo de un post de Instagram. Se descarga en PNG a 1080 × 1350 px.' },
    { type: 'serie', i: 1, text: 'Temporadas, capítulos, plataforma y reparto. Escribe el reparto separado por comas y se acomoda solo.' },
    { type: 'musica', i: 0, text: 'Las canciones llevan portada cuadrada, barra de tiempo y controles de reproductor.' },
    { type: 'peli', i: 0, bn: true, text: 'Activa “Foto en blanco y negro” para un póster clásico. Sin URL de imagen se usa un fondo de color.' },
    { type: 'serie', i: 2, text: 'Cambia el papel: hueso, niebla, rosa viejo, salvia o noche.' },
    { type: 'musica', i: 2, text: 'En Mi colección junta hasta 9 tarjetas en una lámina con título, lista para subir.' }
  ];
  const slideData = (s) => ({ ...SAMPLES[s.type][s.i], type: s.type, ...(s.bn ? { bn: true } : {}) });

  $('#carrusel-slides').innerHTML = SLIDES.map((s, n) => {
    const d = slideData(s);
    const dot = { peli: 'dot--peli', serie: 'dot--serie', musica: 'dot--musica' }[s.type];
    return `
      <div class="carousel-item${n === 0 ? ' active' : ''}">
        <div class="slide-row">
          ${renderCard(d)}
          <div class="slide-copy">
            <p class="eyebrow"><span class="dot ${dot}"></span>Ejemplo · ${TYPE[s.type].label}</p>
            <h3>${esc(d.titulo)}</h3>
            <p>${esc(s.text)}</p>
            <button class="btn btn-ink js-use-sample" type="button" data-slide="${n}">
              <i class="bi bi-pencil-square" aria-hidden="true"></i> Usar como plantilla
            </button>
          </div>
        </div>
      </div>`;
  }).join('');

  $('#carrusel-indicadores').innerHTML = SLIDES.map((s, n) =>
    `<button type="button" data-bs-target="#carrusel" data-bs-slide-to="${n}" ${n === 0 ? 'class="active" aria-current="true"' : ''} aria-label="Ejemplo ${n + 1}"></button>`
  ).join('');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  bootstrap.Carousel.getOrCreateInstance($('#carrusel'), { interval: reduceMotion ? false : 6500, ride: reduceMotion ? false : 'carousel', pause: 'hover' });

  $('#carrusel-slides').addEventListener('click', (e) => {
    const b = e.target.closest('.js-use-sample');
    if (!b) return;
    openInForm(slideData(SLIDES[Number(b.dataset.slide)]), true);
    notify('Plantilla cargada. Cambia lo que quieras y guarda.');
  });

  /* ---------- Arranque ---------- */
  $('#anio-actual').textContent = new Date().getFullYear();
  paintThemeBtn();
  save();
  route();
})();

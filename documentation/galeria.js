// Galeria: copiar CSS, mostrar o código por trecho, forçar estados de hover e
// recarregar sozinha quando o custom.css muda (servidor local: npm run galeria).
(() => {
  const URL_CSS = '../nuvemshop/custom.css';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  let texto = '';
  let trechos = {};

  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1800); };
  const kb = s => (new Blob([s]).size / 1024).toFixed(1) + ' KB';

  async function copiar(str) {
    try { await navigator.clipboard.writeText(str); return true; } catch {
      const ta = document.createElement('textarea'); ta.value = str; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    }
  }

  // Trechos: /* ===== [id] Título ===== */ até o próximo marcador
  function separar(css) {
    const re = /\/\* =+ \[([a-z0-9-]+)\] (.+?) =+ \*\//g; const marcas = []; let m;
    while ((m = re.exec(css))) marcas.push({ id: m[1], titulo: m[2], ini: m.index });
    const out = {};
    marcas.forEach((mk, i) => { out[mk.id] = { titulo: mk.titulo, css: css.slice(mk.ini, i + 1 < marcas.length ? marcas[i + 1].ini : css.length).trim() + '\n' }; });
    return out;
  }

  const encurta = css => css.replace(/url\("data:image\/svg\+xml,[^"]{60,}"\)/g, s => s.slice(0, 48) + '…")');

  function montarTrechos() {
    const box = $('#css-trechos'); box.innerHTML = '';
    for (const [id, t] of Object.entries(trechos)) {
      const d = document.createElement('details'); d.className = 'doc-trecho'; d.id = 'css-' + id;
      const s = document.createElement('summary');
      s.innerHTML = `<span></span><small>${kb(t.css)}</small>`; s.firstChild.textContent = t.titulo;
      const pre = document.createElement('pre'); pre.textContent = id === 'svgs' ? encurta(t.css) : t.css;
      const acoes = document.createElement('div'); acoes.className = 'doc-copiar';
      acoes.innerHTML = `<button type="button" class="doc-link" data-copiar="${id}">copiar este trecho</button>` + (id === 'svgs' ? '<small class="doc-legenda" style="margin:0">(os desenhos aparecem encurtados aqui; a cópia leva tudo)</small>' : '');
      d.append(s, pre, acoes); box.appendChild(d);
    }
  }

  // Estados forçados: cada regra com :hover/:focus-visible ganha uma cópia com .pz-hover
  function clonarHover() {
    const css = [];
    const percorre = (regras, envolver = x => x) => {
      for (const r of regras) {
        if (r.cssRules && r.media) { percorre(r.cssRules, x => `@media ${r.media.mediaText}{${x}}`); continue; }
        if (!r.selectorText || !/:hover|:focus-visible/.test(r.selectorText)) continue;
        const sel = r.selectorText.split(',').filter(s => /:hover|:focus-visible/.test(s)).map(s => s.replace(/:hover|:focus-visible/g, '.pz-hover')).join(',');
        css.push(envolver(`${sel}{${r.style.cssText}}`));
      }
    };
    try { percorre($('#pz-css').sheet.cssRules); } catch { return; }
    let st = $('#pz-hover'); if (!st) { st = document.createElement('style'); st.id = 'pz-hover'; $('#pz-css').after(st); }
    st.textContent = css.join('\n');
  }

  async function carregar(primeira) {
    const r = await fetch(URL_CSS, { cache: 'no-store' }); if (!r.ok) throw new Error(r.status);
    const novo = await r.text();
    if (novo === texto) return;
    const mudou = !!texto; texto = novo; trechos = separar(texto);
    montarTrechos();
    $('#status').textContent = `custom.css · ${kb(texto)}`;
    if (mudou) {
      const link = $('#pz-css'); const n = link.cloneNode(); n.href = URL_CSS + '?v=' + Date.now();
      n.onload = () => { link.remove(); clonarHover(); }; link.after(n);
      toast('CSS atualizado');
    } else if (primeira) {
      const link = $('#pz-css');
      if (link.sheet) clonarHover(); else link.addEventListener('load', clonarHover);
    }
  }

  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-copiar]');
    if (b) {
      e.preventDefault();
      if (!texto) return toast('Abra pela galeria (abrir-galeria.cmd) para copiar');
      const id = b.dataset.copiar; const str = id === 'tudo' ? texto : trechos[id]?.css;
      if (!str) return toast('Trecho não encontrado');
      toast((await copiar(str)) ? `Copiado: ${id === 'tudo' ? 'CSS completo' : trechos[id].titulo} (${kb(str)})` : 'Não deu para copiar');
      return;
    }
    const c = e.target.closest('.doc-cor');
    if (c) { await copiar(c.dataset.hex); toast('Copiado ' + c.dataset.hex); return; }
    if (e.target.closest('.doc-conteudo a[href="#"]')) e.preventDefault();
  });

  // Telas: mostra as fotos que existirem
  const TELAS = [['reskin', 'loja Paintzoas'], ['reskin-demo', 'demo Ipanema']];
  const PAGS = [['home', 'home'], ['categoria', 'categoria'], ['busca', 'busca'], ['produto', 'produto']];
  (async () => {
    const lista = $('#telas-lista'); let n = 0;
    for (const [pasta, loja] of TELAS) for (const vp of ['desktop', 'celular']) for (const [arq, nome] of PAGS) {
      const src = `../screenshots/${pasta}/${arq}-${vp}.png`;
      const ok = await new Promise(res => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = src; });
      if (!ok) continue; n++;
      const a = document.createElement('a'); a.href = src; a.target = '_blank'; a.rel = 'noopener'; if (vp === 'celular') a.className = 'doc-celular';
      a.innerHTML = `<img loading="lazy" alt=""><span></span>`; a.querySelector('img').src = src; a.querySelector('span').textContent = `${loja} · ${nome} · ${vp}`;
      lista.appendChild(a);
    }
    if (!n) lista.innerHTML = '<p class="doc-desc">Nenhuma foto ainda. Rode <code>npm run fotos -- --demo</code> em ferramentas/.</p>';
  })();

  if (location.protocol === 'file:') { $('#aviso-arquivo').hidden = false; return; }
  carregar(true).catch(() => { $('#status').textContent = 'custom.css não encontrado'; });
  setInterval(() => carregar(false).catch(() => {}), 1500);
})();

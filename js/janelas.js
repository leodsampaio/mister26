// Mister 26 — gestor de janelas e controlos no estilo Windows 95.
// Tudo em DOM puro; sem dependências.
(function () {
  const ecra = () => document.getElementById('ecra');
  let z = 10;
  const abertas = [];

  function el(tag, attrs = {}, ...filhos) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'html') e.innerHTML = v;
      else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? '' : v);
    }
    for (const f of filhos.flat()) if (f !== null && f !== undefined) e.append(f.nodeType ? f : document.createTextNode(String(f)));
    return e;
  }

  /** Posiciona com coordenadas absolutas tipo Delphi (Left, Top, Width, Height). */
  function pos(e, l, t, w, h) {
    e.classList.add('abs');
    e.style.left = l + 'px'; e.style.top = t + 'px';
    if (w !== undefined) e.style.width = w + 'px';
    if (h !== undefined) e.style.height = h + 'px';
    return e;
  }

  function rotulo(texto, l, t, w, h, extra = {}) {
    const e = el('div', { class: 'rotulo ' + (extra.class || '') }, texto);
    if (w !== undefined) { e.style.overflow = 'hidden'; e.style.textOverflow = 'ellipsis'; }
    if (extra.style) Object.assign(e.style, extra.style);
    return pos(e, l, t, w, h);
  }

  function botao(texto, l, t, w, h, onclick, extra = {}) {
    const b = el('button', { onclick, class: extra.class || '' }, texto);
    if (extra.icone) { b.classList.add('grande'); b.innerHTML = ''; b.append(el('span', { class: 'icone' }, extra.icone), el('span', {}, texto)); }
    if (extra.predef) b.classList.add('predef');
    return pos(b, l, t, w, h);
  }

  function bevel(l, t, w, h) { return pos(el('div', { class: 'bevel' }), l, t, w, h); }
  function painel(l, t, w, h, ...filhos) { return pos(el('div', { class: 'painel' }, ...filhos), l, t, w, h); }
  function grupo(titulo, l, t, w, h, ...filhos) {
    return pos(el('div', { class: 'grupo' }, el('span', { class: 'legenda' }, titulo), ...filhos), l, t, w, h);
  }

  /** Lista de seleção (TListBox). itens: [{texto|html, valor, classe}] */
  function lista(l, t, w, h, itens, { onsel, ondbl, sel, normal } = {}) {
    const e = pos(el('div', { class: 'lista' + (normal ? ' normal' : '') }), l, t, w, h);
    e.tabIndex = 0;
    e.valor = sel ?? null;
    e.preencher = novos => {
      e.innerHTML = '';
      novos.forEach((it, i) => {
        const d = el('div', { class: (it.classe || '') + (it.valor === e.valor && it.valor !== undefined ? ' sel' : '') });
        if (it.html) d.innerHTML = it.html; else d.textContent = it.texto;
        if (it.cab) { d.classList.add('cab'); e.append(d); return; }
        d.onclick = () => { e.valor = it.valor ?? i; [...e.children].forEach(c => c.classList.remove('sel')); d.classList.add('sel'); onsel && onsel(e.valor, it); };
        d.ondblclick = () => ondbl && ondbl(it.valor ?? i, it);
        e.append(d);
      });
    };
    e.preencher(itens);
    return e;
  }

  function campo(l, t, w, h, valor = '', extra = {}) {
    const i = el('input', { type: extra.tipo || 'text', value: valor, maxlength: extra.max });
    if (extra.oninput) i.addEventListener('input', extra.oninput);
    if (extra.onenter) i.addEventListener('keydown', ev => { if (ev.key === 'Enter') extra.onenter(); });
    if (extra.min !== undefined) i.min = extra.min;
    if (extra.step !== undefined) i.step = extra.step;
    if (extra.negrito) i.style.fontWeight = 'bold';
    return pos(i, l, t, w, h);
  }

  function combo(l, t, w, h, opcoes, valor, onchange) {
    const s = el('select', { onchange: () => onchange && onchange(s.value) });
    for (const o of opcoes) s.append(el('option', { value: o.valor, selected: o.valor == valor }, o.texto));
    return pos(s, l, t, w, h);
  }

  function opcao(tipo, nome, texto, l, t, marcado, onchange) {
    const i = el('input', { type: tipo, name: nome, onchange: () => onchange && onchange(i.checked) });
    i.checked = !!marcado;
    const lab = el('label', { class: 'opcao' }, i, el('span', {}, texto));
    lab.style.position = 'absolute';
    lab.input = i;
    return pos(lab, l, t);
  }

  /** Medidor de 0..100 (TGauge). bi=true pinta metade esquerda/direita (TBiGauge: casa vs fora). */
  function medidor(l, t, w, h, valor, { texto, cor, bi } = {}) {
    const m = pos(el('div', { class: 'medidor' }), l, t, w, h);
    m.definir = (v, txt) => {
      m.innerHTML = '';
      if (bi) {
        const pct = Math.max(0, Math.min(100, v));
        m.append(el('div', { class: 'bi', style: { left: 0, width: pct + '%', background: cor || '#000080' } }));
        m.append(el('div', { class: 'bi', style: { left: pct + '%', right: 0, background: '#c00000' } }));
      } else m.append(el('div', { class: 'barra', style: { width: Math.max(0, Math.min(100, v)) + '%', background: cor || '#000080' } }));
      m.append(el('div', { class: 'texto' }, txt ?? texto ?? ''));
    };
    m.definir(valor, texto);
    return m;
  }

  function abas(l, t, w, nomes, ativa, onsel, { sup } = {}) {
    const e = pos(el('div', { class: sup ? 'abas-sup' : 'abas' }), l, t, w);
    nomes.forEach((n, i) => e.append(el('div', { class: i === ativa ? 'ativa' : '', onclick: () => { [...e.children].forEach(c => c.classList.remove('ativa')); e.children[i].classList.add('ativa'); onsel(i); } }, n)));
    return e;
  }

  /** Cria uma janela. opts: {titulo, largura, altura, verde, modal, fechar(), menu, classe, x, y} */
  function janela(opts) {
    const j = el('div', { class: 'janela ' + (opts.verde ? 'verde ' : '') + (opts.classe || '') });
    const titulo = el('div', { class: 'titulo' }, el('span', { class: 'texto' }, opts.titulo || ''));
    const botoes = el('div', { class: 'botoes' });
    if (opts.fechar !== false) botoes.append(el('button', { onclick: () => { j.fechar(); } }, '✕'));
    titulo.append(botoes);
    j.append(titulo);
    const cliente = el('div', { class: 'cliente' });
    if (opts.menu) j.append(opts.menu);
    j.append(cliente);
    j.cliente = cliente;
    j.style.width = (opts.largura + 8) + 'px';
    j.style.height = (opts.altura + 8 + 18 + (opts.menu ? 20 : 0)) + 'px';
    const e = ecra();
    const ew = e.clientWidth, eh = e.clientHeight - 22;
    j.style.left = Math.max(0, opts.x ?? Math.round((ew - opts.largura - 8) / 2)) + 'px';
    j.style.top = Math.max(0, opts.y ?? Math.round((eh - opts.altura - 26) / 2)) + 'px';
    j.style.zIndex = ++z;
    j.modal = !!opts.modal;
    let veu = null;
    if (opts.modal) {
      veu = el('div', { style: { position: 'absolute', inset: 0, zIndex: z - 1, background: 'transparent' } });
      e.append(veu);
    }
    j.fechar = () => {
      if (!j.isConnected) return;
      opts.aoFechar && opts.aoFechar();
      j.remove(); veu && veu.remove();
      const i = abertas.indexOf(j); if (i >= 0) abertas.splice(i, 1);
      atualizarFoco();
    };
    j.frente = () => { j.style.zIndex = ++z; if (veu) veu.style.zIndex = z - 1; atualizarFoco(); };
    j.addEventListener('mousedown', j.frente);
    // arrastar pela barra de título
    titulo.addEventListener('mousedown', ev => {
      if (ev.target.tagName === 'BUTTON') return;
      const r = j.getBoundingClientRect(), er = e.getBoundingClientRect();
      const esc = er.width / e.offsetWidth || 1;
      const dx = ev.clientX - r.left, dy = ev.clientY - r.top;
      const mover = m => { j.style.left = Math.round((m.clientX - er.left) / esc - dx / esc) + 'px'; j.style.top = Math.max(0, Math.round((m.clientY - er.top) / esc - dy / esc)) + 'px'; };
      const largar = () => { window.removeEventListener('mousemove', mover); window.removeEventListener('mouseup', largar); };
      window.addEventListener('mousemove', mover); window.addEventListener('mouseup', largar);
    });
    e.append(j); abertas.push(j); atualizarFoco();
    return j;
  }

  function atualizarFoco() {
    let topo = null;
    for (const j of abertas) if (!topo || +j.style.zIndex > +topo.style.zIndex) topo = j;
    for (const j of abertas) j.classList.toggle('inativa', j !== topo);
  }

  /** Caixa de mensagem. tipo: info|aviso|erro|pergunta. Devolve Promise com o texto do botão. */
  function mensagem(texto, { titulo, tipo = 'info', botoes = ['OK'] } = {}) {
    return new Promise(res => {
      const icones = { info: 'ℹ️', aviso: '⚠️', erro: '⛔', pergunta: '❓', dinheiro: '💰', golo: '⚽' };
      const titulos = { info: 'Informação', aviso: 'Aviso', erro: 'Erro', pergunta: 'Confirmação' };
      const j = janela({ titulo: titulo || titulos[tipo] || 'Mister 26', largura: 340, altura: 10, modal: true, classe: 'msg', fechar: false });
      const corpo = el('div', { class: 'texto-msg' }, el('span', { class: 'icone' }, icones[tipo] || 'ℹ️'), el('span', {}, texto));
      const bot = el('div', { class: 'botoes-msg' });
      botoes.forEach((b, i) => bot.append(el('button', { class: i === 0 ? 'predef' : '', onclick: () => { j.fechar(); res(b); } }, b)));
      j.cliente.append(corpo, bot);
      j.style.height = 'auto';
      j.cliente.style.minHeight = '60px';
      const okTecla = ev => { if (ev.key === 'Enter') { j.fechar(); res(botoes[0]); window.removeEventListener('keydown', okTecla); } if (ev.key === 'Escape') { j.fechar(); res(botoes[botoes.length - 1]); window.removeEventListener('keydown', okTecla); } };
      window.addEventListener('keydown', okTecla);
    });
  }

  /** Pedido de texto simples (TInputDlg). */
  function pedirTexto(titulo, rotuloTxt, valor = '', { max = 30 } = {}) {
    return new Promise(res => {
      const j = janela({ titulo, largura: 300, altura: 100, modal: true, verde: true, fechar: false });
      const c = campo(16, 36, 268, 22, valor, { max, onenter: () => ok() });
      const ok = () => { j.fechar(); res(c.value.trim()); };
      j.cliente.append(bevel(8, 8, 284, 60), rotulo(rotuloTxt, 16, 14), c,
        botao('OK', 116, 74, 75, 23, ok, { predef: true }), botao('Cancelar', 200, 74, 75, 23, () => { j.fechar(); res(null); }));
      setTimeout(() => c.focus(), 0);
    });
  }

  /** Barra de menus: itens = [{titulo, itens:[{texto, accao, sep, marcado, inativo}]}] */
  function menu(itens) {
    const barra = el('div', { class: 'menu-barra' });
    let abertoEl = null;
    const fecharTudo = () => { if (abertoEl) { abertoEl.classList.remove('aberto'); abertoEl.querySelector('.menu-lista')?.remove(); abertoEl = null; } };
    document.addEventListener('mousedown', ev => { if (!barra.contains(ev.target)) fecharTudo(); });
    for (const m of itens) {
      const d = el('div', {}, m.titulo);
      const abrir = () => {
        fecharTudo();
        const l = el('div', { class: 'menu-lista' });
        const fonte = typeof m.itens === 'function' ? m.itens() : m.itens;
        for (const it of fonte) {
          if (it.sep) { l.append(el('div', { class: 'sep' })); continue; }
          l.append(el('div', { class: (it.marcado ? 'marcado ' : '') + (it.inativo ? 'inativo' : ''), onclick: ev => { ev.stopPropagation(); if (it.inativo) return; fecharTudo(); it.accao && it.accao(); } }, it.texto));
        }
        d.append(l); d.classList.add('aberto'); abertoEl = d;
      };
      d.addEventListener('mousedown', ev => { ev.stopPropagation(); if (ev.target.closest('.menu-lista')) return; if (abertoEl === d) fecharTudo(); else abrir(); });
      d.addEventListener('mouseenter', () => { if (abertoEl && abertoEl !== d) abrir(); });
      barra.append(d);
    }
    return barra;
  }

  window.UI = { el, pos, rotulo, botao, bevel, painel, grupo, lista, campo, combo, opcao, medidor, abas, janela, mensagem, pedirTexto, menu, abertas };
})();

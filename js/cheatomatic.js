// Cheat O'Matic 26 — motor paralelo de batota, em homenagem ao Cheat-O-Matic dos anos 90.
// Altera o dinheiro em caixa (e outros valores) de qualquer equipa do jogo em curso.
(function () {
  const { el, pos, rotulo, botao, lista, campo, combo, janela, mensagem } = UI;
  let aberta = null;

  const ARTE = String.raw`
  ___ _  _ ___   _  _____    ___  _ __  __   _  _____ ___ ___
 / __| || | __| /_\|_   _|  / _ \( )  \/  | /_\|_   _|_ _/ __|
| (__| __ | _| / _ \ | |   | (_) |/| |\/| |/ _ \ | |  | | (__
 \___|_||_|___/_/ \_\|_|    \___/  |_|  |_/_/ \_\|_| |___\___|  v2.6`;

  function abrir(estado, aoAlterar) {
    if (aberta && aberta.isConnected) { aberta.frente(); return; }
    const j = janela({ titulo: "Cheat O'Matic 26 — Memory Scanner", largura: 560, altura: 430, classe: 'cheat', aoFechar: () => { aberta = null; } });
    aberta = j;
    const arte = pos(el('pre', { style: { margin: 0, fontSize: '9px', lineHeight: '10px', color: '#00ff00', whiteSpace: 'pre' } }, ARTE), 8, 2, 544, 56);
    const equipas = Object.values(estado.equipas).sort((a, b) => a.nomeCurto.localeCompare(b.nomeCurto));
    let sel = estado.equipas[estado.treinadores[estado.treinadorAtual || 0].equipa];
    const filtro = campo(8, 86, 200, 22, '', { oninput: () => preencher() });
    const l = lista(8, 112, 200, 230, [], { onsel: v => { sel = estado.equipas[v]; mostrar(); }, normal: true });
    const preencher = () => { const f = filtro.value.toLowerCase(); l.valor = sel.id; l.preencher(equipas.filter(e => e.nomeCurto.toLowerCase().includes(f)).map(e => ({ valor: e.id, texto: (e.humano !== null ? '* ' : '  ') + e.nomeCurto }))); };
    const campoSel = combo(220, 86, 150, 22, [{ texto: 'Dinheiro em caixa', valor: 'dinheiro' }, { texto: 'Empréstimo', valor: 'emprestimo' }, { texto: 'Moral (0-100)', valor: 'moral' }, { texto: 'Capacidade do estádio', valor: 'capacidade' }], 'dinheiro', () => mostrar());
    const atual = pos(el('div', { style: { fontSize: '12px', whiteSpace: 'pre' } }), 220, 116, 332, 70);
    const novo = campo(220, 196, 200, 24, '', { tipo: 'number', step: 1000 });
    novo.style.fontSize = '14px';
    const registo = pos(el('div', { class: 'memo', style: { background: '#000', color: '#00c000', border: '1px solid #005000', fontSize: '11px', fontFamily: '"Courier New", monospace' } }), 220, 268, 332, 74);
    const log = t => { registo.textContent += `> ${t}\n`; registo.scrollTop = 1e6; };
    const mostrar = () => {
      const c = campoSel.value;
      const v = sel[c];
      atual.textContent = `Alvo: ${sel.nome}\nCampo: ${c}\nEndereço: 0x${(Motor.hash(sel.id + c) >>> 0).toString(16).toUpperCase().padStart(8, '0')}\nValor atual: ${c === 'dinheiro' || c === 'emprestimo' ? Motor.dinheiro(v, estado.opcoes.moeda) : v}`;
      novo.value = Math.round(v);
    };
    const aplicar = (valor, texto) => {
      const c = campoSel.value;
      let v = Number(valor);
      if (!Number.isFinite(v)) return log('ERRO: valor inválido');
      if (c === 'moral') v = Math.max(0, Math.min(100, v));
      if (c === 'capacidade') v = Math.max(1000, Math.round(v));
      if (c === 'emprestimo') v = Math.max(0, v);
      const antes = sel[c];
      sel[c] = v;
      if (c === 'dinheiro') { sel.balanco.push({ jornada: estado.jornada, texto: "Cheat O'Matic", valor: v - antes }); if (sel.balanco.length > 40) sel.balanco.shift(); }
      log(`${texto || 'POKE'} ${sel.nomeCurto}.${c}: ${antes} -> ${v}`);
      mostrar(); aoAlterar && aoAlterar();
    };
    j.cliente.append(arte,
      rotulo('Processo: MISTER26.EXE · Estado: ATTACHED', 8, 62, 400, 14, { style: { fontWeight: 'normal', fontSize: '11px' } }),
      rotulo('Equipa:', 8, 70, 100, 14, { style: { fontWeight: 'normal', fontSize: '11px' } }), filtro, l,
      rotulo('Campo:', 220, 70, 100, 14, { style: { fontWeight: 'normal', fontSize: '11px' } }), campoSel, atual,
      rotulo('Novo valor:', 220, 180, 100, 14, { style: { fontWeight: 'normal', fontSize: '11px' } }), novo,
      botao('POKE', 430, 196, 60, 24, () => aplicar(novo.value)),
      botao('Dinheiro ∞', 220, 230, 104, 26, () => { campoSel.value = 'dinheiro'; aplicar(999999999, 'INFINITE'); }),
      botao('Zerar dívida', 334, 230, 104, 26, () => { campoSel.value = 'emprestimo'; aplicar(0, 'CLEAR'); }),
      botao('Moral 100', 448, 230, 104, 26, () => { campoSel.value = 'moral'; aplicar(100, 'MAX'); }),
      rotulo('Registo:', 220, 254, 100, 14, { style: { fontWeight: 'normal', fontSize: '11px' } }), registo,
      rotulo('* equipas com treinador humano. Alterar valores torna a carreira "burlada", como nos bons velhos tempos. Nada disto afeta o ficheiro de dados.', 8, 350, 544, 40, { style: { whiteSpace: 'normal', fontWeight: 'normal', fontSize: '11px', color: '#00a000' } }),
      botao('Fechar', 480, 396, 72, 24, () => j.fechar()));
    preencher(); mostrar();
    log("Cheat O'Matic 26 iniciado. Memória do jogo mapeada.");
    log('Dica: Ctrl+Alt+C abre esta janela a qualquer momento.');
  }

  window.CheatOMatic = { abrir };
})();

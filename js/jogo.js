// Mister 26 — interface do jogo (janela principal e diálogos), fluxo de época e gravação.
(function () {
  const { el, pos, rotulo, botao, bevel, painel, grupo, lista, campo, combo, opcao, medidor, abas, janela, mensagem, pedirTexto, menu } = UI;
  const M = Motor;
  const CHAVE_JOGOS = 'mister26.jogos';
  const CHAVE_DADOS = 'mister26.dados';

  let estado = null;        // estado do jogo em curso
  let nomeJogo = null;      // nome do ficheiro (8 letras)
  let principal = null;     // janela principal
  let ui = {};              // referências a controlos da janela principal
  let jogadorSel = null;    // jogador selecionado na lista
  let paginaAtual = 0;

  const $ = (...a) => M.dinheiro(a[0], estado?.opcoes.moeda);
  const bandeira = (cod, pequena) => el('span', { class: 'bandeira' + (pequena ? ' pequena' : ''), title: Bandeiras.nome(cod) }, Bandeiras.emoji(cod));
  const cores = e => el('span', { class: 'cores' }, el('i', { style: { background: e.cor1 } }), el('i', { style: { background: e.cor2 } }));
  const divisaoDe = e => estado.divisoes.find(d => d.id === e.divisao);
  const treinadorAtual = () => estado.treinadores[estado.treinadorAtual || 0];
  const equipaAtual = () => estado.equipas[treinadorAtual().equipa];
  const rotuloEpoca = () => { const d = estado.divisoes[0]; return d && d.pais === 'BRA' ? String(estado.epoca) : `${estado.epoca}/${String(estado.epoca + 1).slice(2)}`; };
  const posicaoNaTabela = e => M.classificacao(estado, divisaoDe(e)).indexOf(e) + 1;

  // ---------- dados base ----------
  function dadosBase() {
    let d = window.DADOS_EQUIPAS;
    try { const g = JSON.parse(localStorage.getItem(CHAVE_DADOS)); if (g && g.gerado > (d?.gerado || '')) d = g; } catch (e) { /* ignorar */ }
    return d;
  }

  // ---------- gravação ----------
  function lerJogos() { try { return JSON.parse(localStorage.getItem(CHAVE_JOGOS)) || {}; } catch (e) { return {}; } }
  function gravar(silencioso) {
    if (!estado || !nomeJogo) return;
    const jogos = lerJogos();
    const t = estado.treinadores.map(x => `${x.nome} (${estado.equipas[x.equipa].nomeCurto})`).join(', ');
    jogos[nomeJogo] = { data: new Date().toISOString(), descricao: `Época ${rotuloEpoca()}, jornada ${Math.min(estado.jornada, M.totalJornadas(estado))}\n${t}`, estado };
    try { localStorage.setItem(CHAVE_JOGOS, JSON.stringify(jogos)); if (!silencioso) mensagem('Jogo gravado.'); }
    catch (e) { mensagem('Não foi possível gravar: ' + e.message, { tipo: 'erro' }); }
  }

  // ---------- arranque: escolher jogo ----------
  function ecraInicial() {
    const j = janela({ titulo: 'Mister 26', largura: 473, altura: 347, verde: true, modal: true, fechar: false });
    const jogos = lerJogos();
    const nomes = Object.keys(jogos).sort();
    let modo = nomes.length ? 'continuar' : 'novo';
    const nome = campo(236, 72, 109, 21, '', { max: 8, negrito: true });
    nome.style.color = '#0000ff';
    const aviso = rotulo('', 32, 100, 313, 14, { class: 'centrado vermelho', style: { fontWeight: 'bold' } });
    const avisar = t => { aviso.textContent = t; aviso.style.background = t ? '#fff' : 'transparent'; };
    const descricao = rotulo('', 24, 200, 137, 125, { style: { whiteSpace: 'pre-wrap', fontWeight: 'normal' } });
    const l = lista(172, 160, 173, 165, nomes.map(n => ({ texto: n, valor: n })), {
      onsel: v => { modo = 'continuar'; rContinuar.input.checked = true; descricao.textContent = jogos[v].descricao + '\n' + new Date(jogos[v].data).toLocaleDateString('pt-PT'); },
      ondbl: () => ok(),
    });
    l.style.color = '#0000ff';
    const rNovo = opcao('radio', 'modo', 'Quero começar um jogo do início', 24, 36, modo === 'novo', () => { modo = 'novo'; nome.focus(); });
    const rContinuar = opcao('radio', 'modo', 'Quero continuar um jogo', 24, 132, modo === 'continuar', () => { modo = 'continuar'; });
    for (const r of [rNovo, rContinuar]) { r.style.color = '#000080'; r.style.fontWeight = 'bold'; }
    const ok = () => {
      if (modo === 'novo') {
        const n = nome.value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
        if (n.length < 1 || n.length > 8) { avisar('Nome do ficheiro inválido (1 a 8 letras)'); return; }
        if (jogos[n]) { avisar('Já existe um jogo com esse nome'); return; }
        j.fechar(); escolherPaises(n);
      } else {
        if (!l.valor) { avisar('Escolha um jogo gravado'); return; }
        j.fechar(); carregar(l.valor);
      }
    };
    j.cliente.append(bevel(8, 8, 361, 325), rNovo, rotulo('Nome do ficheiro (8 letras):', 68, 76), nome, aviso,
      pos(el('div', { class: 'painel' }), 8, 120, 361, 5), rContinuar, rotulo('Jogos gravados:', 68, 164), l, descricao,
      botao('OK', 392, 12, 64, 64, ok, { icone: '✔', predef: true }), botao('Apagar jogo', 392, 88, 64, 64, async () => {
        if (!l.valor) return;
        if (await mensagem(`Apagar o jogo gravado "${l.valor}"?`, { tipo: 'pergunta', botoes: ['Sim', 'Não'] }) === 'Sim') { delete jogos[l.valor]; localStorage.setItem(CHAVE_JOGOS, JSON.stringify(jogos)); j.fechar(); ecraInicial(); }
      }, { icone: '🗑' }));
    nome.addEventListener('keydown', ev => { if (ev.key === 'Enter') ok(); });
    if (modo === 'novo') setTimeout(() => nome.focus(), 0);
  }

  function carregar(nome) {
    const g = lerJogos()[nome];
    if (!g) { mensagem('Jogo não encontrado.', { tipo: 'erro' }); return ecraInicial(); }
    estado = g.estado; nomeJogo = nome;
    estado.treinadorAtual = estado.treinadorAtual || 0;
    abrirPrincipal();
  }

  // ---------- novo jogo: países e treinadores ----------
  function escolherPaises(nome) {
    const dados = dadosBase();
    const paises = [...new Set(dados.divisoes.map(d => d.pais))];
    const j = janela({ titulo: 'Países', largura: 420, altura: 300, verde: true, modal: true, fechar: false });
    const marcados = new Set(paises);
    const l = lista(16, 40, 240, 180, paises.map(p => ({ html: `${Bandeiras.emoji(p)} ${Bandeiras.nome(p)} — ${dados.divisoes.filter(d => d.pais === p).map(d => d.equipas.length).join(' + ')} equipas`, valor: p, classe: 'sel' })), {
      onsel: (v, it) => { if (marcados.has(v)) marcados.delete(v); else marcados.add(v); [...l.children].forEach((c, i) => c.classList.toggle('sel', marcados.has(paises[i]))); },
    });
    l.style.fontWeight = 'normal';
    j.cliente.append(bevel(8, 8, 256, 284), rotulo('Países que entram no jogo (clique para marcar):', 16, 16), l,
      rotulo(`Dados: ${new Date(dados.gerado).toLocaleDateString('pt-PT')} · ${dados.fonte}`, 16, 232, 240, 50, { style: { whiteSpace: 'normal', fontWeight: 'normal', fontSize: '11px' } }),
      botao('OK', 332, 12, 64, 64, () => { if (!marcados.size) return; j.fechar(); escolherTreinadores(nome, [...marcados]); }, { icone: '✔', predef: true }),
      botao('Cancelar', 332, 88, 64, 64, () => { j.fechar(); ecraInicial(); }, { icone: '✖' }));
  }

  function escolherTreinadores(nome, paises) {
    const dados = dadosBase();
    const j = janela({ titulo: 'Treinadores', largura: 411, altura: 295, modal: true, fechar: false });
    const campos = [], equipasLbl = [], sorteio = [];
    const elegiveis = M.baralhar(dados.divisoes.filter(d => paises.includes(d.pais)).flatMap(d => d.equipas));
    j.cliente.append(bevel(8, 8, 393, 201), rotulo('Nome', 88, 24, 60, 13, { class: 'negrito' }), rotulo('Equipa', 208, 24, 80, 13, { class: 'negrito' }));
    for (let i = 0; i < 6; i++) {
      j.cliente.append(rotulo(`Treinador ${i + 1}`, 16, 48 + i * 24, 70, 13));
      const c = campo(88, 46 + i * 24, 105, 19, i === 0 ? 'Mister' : '', { max: 16 }); campos.push(c);
      const lb = rotulo('', 208, 48 + i * 24, 180, 17, { class: 'negrito' }); equipasLbl.push(lb);
      j.cliente.append(c, lb);
    }
    const sortear = () => {
      sorteio.length = 0;
      const livres = [...elegiveis];
      campos.forEach((c, i) => {
        if (!c.value.trim()) { equipasLbl[i].textContent = ''; return; }
        const id = livres.shift(); sorteio[i] = id;
        equipasLbl[i].textContent = dados.equipas[id].nomeCurto + ' (' + dados.divisoes.find(d => d.equipas.includes(id)).nome + ')';
      });
    };
    const comecar = () => {
      const treinadores = campos.map((c, i) => c.value.trim() ? { nome: c.value.trim(), equipa: sorteio[i] } : null).filter(Boolean);
      if (!treinadores.length) { mensagem('Indique pelo menos um treinador.', { tipo: 'aviso' }); return; }
      if (treinadores.some(t => !t.equipa)) sortear();
      j.fechar();
      estado = M.novoJogo({ dados, paises, treinadores: campos.map((c, i) => c.value.trim() ? { nome: c.value.trim(), equipa: sorteio[i] } : null).filter(Boolean) });
      estado.treinadorAtual = 0; nomeJogo = nome;
      gravar(true);
      abrirPrincipal();
      mensagem(`Bem-vindo, ${estado.treinadores[0].nome}!\n\nA sua equipa é o ${equipaAtual().nomeCurto} (${divisaoDe(equipaAtual()).nome}).\nComece por escolher a táctica no menu "Seleccionar" e carregue em "Jogar" na página Selecção.`, { titulo: 'Mister 26' });
    };
    j.cliente.append(botao('Sortear equipas', 149, 224, 113, 64, sortear, { icone: '🎲' }), botao('Começar', 300, 224, 100, 64, comecar, { icone: '⚽', predef: true }));
    sortear();
  }

  // ---------- janela principal ----------
  function abrirPrincipal() {
    if (principal) principal.fechar();
    jogadorSel = null; paginaAtual = 0;
    const barra = menu([
      { titulo: 'Mister 26', itens: [
        { texto: 'Gravar', accao: () => gravar() }, { texto: 'Opções...', accao: dlgOpcoes }, { sep: true },
        { texto: 'Cheat O\'Matic...', accao: () => CheatOMatic.abrir(estado, atualizarTudo) }, { sep: true },
        { texto: 'Registo...', accao: dlgRegisto }, { texto: 'Acerca...', accao: dlgAcerca }, { sep: true },
        { texto: 'Sair sem gravar', accao: async () => { if (await mensagem('Sair sem gravar o jogo?', { tipo: 'pergunta', botoes: ['Sim', 'Não'] }) === 'Sim') { principal.fechar(); principal = null; estado = null; ecraInicial(); } } },
        { texto: 'Sair', accao: () => { gravar(true); principal.fechar(); principal = null; estado = null; ecraInicial(); } },
      ] },
      { titulo: 'Seleccionar', itens: () => [
        ...M.TACTICAS.map(t => ({ texto: t, marcado: equipaAtual().tactica === t, accao: () => { M.selecaoAutomatica(equipaAtual(), t); atualizarTudo(); } })),
        { sep: true },
        { texto: 'Automático', accao: () => { M.selecaoAutomatica(equipaAtual(), equipaAtual().tactica); atualizarTudo(); } },
        { texto: 'Melhores', accao: () => { const e = equipaAtual(); let melhor = null, f = 0; for (const t of M.TACTICAS) { M.selecaoAutomatica(e, t); const x = M.forcaEquipa(e); if (x.ataque + x.defesa > f) { f = x.ataque + x.defesa; melhor = t; } } M.selecaoAutomatica(e, melhor); atualizarTudo(); } },
      ] },
      { titulo: 'Equipa', itens: [
        { texto: 'Pedir / pagar empréstimo...', accao: dlgEmprestimo }, { texto: 'Estádio...', accao: dlgEstadio }, { texto: 'Balanço...', accao: () => dlgBalanco(equipaAtual()) },
        { texto: 'Plantel...', accao: () => dlgPlantel(equipaAtual()) }, { texto: 'Historial...', accao: dlgHistorialEquipa },
      ] },
      { titulo: 'Jogador', itens: [
        { texto: 'Vender', accao: () => { if (!jogadorSel) return mensagem('Escolha primeiro um jogador na lista.', { tipo: 'aviso' }); mostrarPagina(5); } },
        { texto: 'Renovar contrato', accao: () => { if (!jogadorSel) return mensagem('Escolha primeiro um jogador na lista.', { tipo: 'aviso' }); mostrarPagina(6); } },
        { texto: 'Procurar / comprar...', accao: () => dlgProcurar() }, { sep: true },
        { texto: 'Últimas transferências...', accao: dlgTransferencias },
      ] },
      { titulo: 'Campeonato', itens: [
        { texto: 'Classificação...', accao: dlgClassificacao }, { texto: 'Melhores marcadores...', accao: dlgMarcadores }, { texto: 'Calendário...', accao: () => dlgCalendario(equipaAtual()) },
        { texto: 'Resultados da jornada...', accao: () => dlgResultados(ultimosResultados, true) }, { sep: true }, { texto: 'Últimos vencedores...', accao: dlgVencedores },
      ] },
      { titulo: 'Treinador', itens: [
        { texto: 'História...', accao: dlgHistoriaTreinador }, { texto: 'Gestão de treinadores...', accao: dlgTreinadores }, { texto: 'Ranking...', accao: dlgRanking }, { sep: true }, { texto: 'Perfil...', accao: dlgPerfil },
      ] },
      { titulo: 'Dados', itens: [
        { texto: 'Atualizar planteis da Wikipédia...', accao: () => Atualizador.manual() }, { texto: 'Sobre os dados...', accao: () => mensagem(`Planteis gerados em ${new Date(estado.fonteDados || dadosBase().gerado).toLocaleString('pt-PT')}.\nFonte: Wikipédia inglesa (CC BY-SA 4.0).\n\nUm jogo em curso mantém os planteis com que começou; a atualização aplica-se a jogos novos.`) },
      ] },
    ]);
    principal = janela({ titulo: 'Mister 26', largura: 632, altura: 434, verde: true, menu: barra, fechar: false, x: 10, y: 10 });
    const c = principal.cliente;
    ui = {};
    ui.treinador = rotulo('', 48, 8, 300, 22, { style: { fontFamily: '"Times New Roman", serif', fontSize: '16px' } });
    ui.bandeira = pos(el('span', { class: 'bandeira' }), 8, 32, 39, 29);
    ui.equipa = rotulo('', 56, 34, 300, 20, { style: { fontSize: '14px' } });
    ui.divisao = rotulo('', 56, 54, 300, 16, { style: { fontWeight: 'normal' } });
    ui.epoca = rotulo('', 440, 6, 185, 19, { class: 'direita' });
    ui.adversario = rotulo('', 360, 32, 265, 33, { style: { whiteSpace: 'normal', fontWeight: 'normal' } });
    ui.listaJog = lista(4, 72, 353, 353, [], { onsel: v => { jogadorSel = equipaAtual().jogadores.find(j => j.id === v); mostrarPagina(1); }, ondbl: v => alternarTitular(v) });
    const caderno = pos(el('div'), 358, 72, 273, 329);
    ui.paginas = ['Jogo', 'Jogador', 'Finanças', 'Selecção', 'Adversário', 'Vender', 'Contrato', 'Mensagem'].map(n => { const p = el('div', { class: 'pagina' }); caderno.append(p); return p; });
    ui.abas = abas(368, 400, 257, ['Jogo', 'Jogador', 'Finanças', 'Selecção', 'Adversário'], 0, i => mostrarPagina(i));
    c.append(ui.treinador, ui.bandeira, ui.equipa, ui.divisao, rotulo('Adversário', 360, 8), ui.adversario, ui.epoca, ui.listaJog, caderno, ui.abas);
    construirPaginas();
    mostrarPagina(0);
    atualizarTudo();
    atualizarRodape();
  }

  function construirPaginas() {
    const p = ui.paginas;
    // Jogo
    ui.miniClass = lista(0, 16, 273, 34, [], { normal: true });
    ui.arbitro = rotulo('', 16, 120, 201, 16);
    ui.ultimo = rotulo('', 80, 168, 185, 24);
    ui.dinheiro2 = rotulo('', 16, 232, 249, 33, { style: { whiteSpace: 'normal' } });
    ui.moral = medidor(8, 296, 257, 25, 50, { bi: true, cor: '#000080' });
    p[0].append(ui.miniClass, rotulo('Árbitro', 16, 96, undefined, undefined, { style: { fontWeight: 'normal' } }), ui.arbitro,
      rotulo('Último jogo', 16, 168, undefined, undefined, { style: { fontWeight: 'normal' } }), ui.ultimo, ui.dinheiro2,
      rotulo('Moral', 16, 272, undefined, undefined, { style: { fontWeight: 'normal' } }), ui.moral);
    // Jogador
    ui.jNome = rotulo('', 8, 0, 260, 22, { style: { fontSize: '15px' } });
    ui.jBandeira = pos(el('span', { class: 'bandeira' }), 8, 24, 39, 29);
    ui.jPais = rotulo('', 56, 32, 200, 16, { style: { fontWeight: 'normal' } });
    ui.jInfo = rotulo('', 8, 56, 257, 41, { style: { whiteSpace: 'normal', fontWeight: 'normal' } });
    ui.jComp = rotulo('', 100, 8, 85, 14); ui.jGolosEpoca = rotulo('', 110, 32, 75, 14);
    ui.jJogos = rotulo('', 112, 16, 62, 14, { class: 'direita' }); ui.jGolos = rotulo('', 124, 35, 50, 14, { class: 'direita' });
    ui.jVermelhos = rotulo('', 124, 53, 50, 14, { class: 'direita' }); ui.jLesoes = rotulo('', 124, 72, 50, 14, { class: 'direita' });
    const grp = grupo('Historial', 0, 48, 185, 97, rotulo('Jogos', 8, 16), ui.jJogos, rotulo('Golos', 8, 35), ui.jGolos, rotulo('Cartões vermelhos', 8, 53), ui.jVermelhos, rotulo('Lesões', 8, 72), ui.jLesoes);
    for (const r of grp.querySelectorAll('.rotulo')) r.style.fontWeight = 'normal'; grp.querySelector('.legenda').style.fontWeight = 'bold';
    const pan = painel(32, 96, 185, 153, rotulo('Comportamento', 0, 8), rotulo('Golos esta época', 0, 32), ui.jComp, ui.jGolosEpoca, grp);
    pan.style.color = '#000'; pan.style.background = 'var(--cinza)';
    for (const r of pan.querySelectorAll('.rotulo')) r.style.color = '#000';
    ui.jSuspenso = rotulo('', 8, 248, 261, 14, { style: { fontStyle: 'italic' } });
    ui.jLesionado = rotulo('', 8, 264, 261, 14, { style: { fontStyle: 'italic' } });
    const panSal = painel(8, 280, 257, 49, botao('Renovar contrato', 8, 12, 120, 25, () => mostrarPagina(6), { class: 'pequeno' }), botao('Vender...', 136, 12, 112, 25, () => mostrarPagina(5)));
    p[1].append(ui.jNome, ui.jBandeira, ui.jPais, ui.jInfo, pan, ui.jSuspenso, ui.jLesionado, panSal);
    // Finanças
    ui.balanco = lista(16, 8, 249, 233, [], { normal: true });
    ui.fSal = rotulo('', 140, 248, 117, 16, { class: 'direita' }); ui.fJuros = rotulo('', 140, 264, 117, 17, { class: 'direita' }); ui.fDin = rotulo('', 140, 288, 117, 17, { class: 'direita' });
    ui.fPreco = campo(112, 309, 60, 20, '', { tipo: 'number', min: 1, oninput: () => { const v = parseInt(ui.fPreco.value, 10); if (v >= 1 && v <= 500) { equipaAtual().precoBilhete = v; } } });
    p[2].append(ui.balanco, rotulo('Total de salários', 16, 251, undefined, undefined, { style: { fontWeight: 'normal' } }), ui.fSal, rotulo('Juros do empréstimo', 16, 264, undefined, undefined, { style: { fontWeight: 'normal' } }), ui.fJuros,
      rotulo('Dinheiro em caixa', 16, 288, undefined, undefined, { style: { fontWeight: 'normal' } }), ui.fDin, rotulo('Preço dos bilhetes', 16, 312, undefined, undefined, { style: { fontWeight: 'normal' } }), ui.fPreco, rotulo('por bilhete', 178, 312, undefined, undefined, { style: { fontWeight: 'normal' } }));
    // Selecção
    ui.selInfo = rotulo('', 8, 16, 257, 120, { style: { whiteSpace: 'pre-wrap', fontWeight: 'normal' } });
    p[3].append(ui.selInfo, botao('Automático', 16, 150, 110, 25, () => { M.selecaoAutomatica(equipaAtual(), equipaAtual().tactica); atualizarTudo(); }),
      botao('Melhores', 146, 150, 110, 25, () => { const e = equipaAtual(); let melhor = null, f = 0; for (const t of M.TACTICAS) { M.selecaoAutomatica(e, t); const x = M.forcaEquipa(e); if (x.ataque + x.defesa > f) { f = x.ataque + x.defesa; melhor = t; } } M.selecaoAutomatica(e, melhor); atualizarTudo(); }),
      rotulo('Duplo clique num jogador da lista troca titular/suplente.', 8, 185, 257, 30, { style: { whiteSpace: 'normal', fontWeight: 'normal', fontSize: '11px' } }),
      botao('Jogar', 104, 232, 64, 64, jogar, { icone: '⚽', predef: true }));
    // Adversário
    ui.aNome = rotulo('', 8, 8, 241, 25, { class: 'centrado', style: { fontSize: '14px' } });
    ui.aMoral = medidor(8, 48, 241, 25, 50, { bi: true, cor: '#c00000' });
    ui.aTreinador = rotulo('', 88, 136, 161, 16);
    ui.aInfo = rotulo('', 16, 84, 233, 48, { style: { whiteSpace: 'normal', fontWeight: 'normal' } });
    ui.aClass = rotulo('', 16, 160, 233, 80, { style: { whiteSpace: 'pre-wrap', fontWeight: 'normal' } });
    p[4].append(ui.aNome, ui.aMoral, ui.aInfo, rotulo('Treinador', 16, 136, 65, 16, { style: { fontWeight: 'normal' } }), ui.aTreinador, ui.aClass,
      botao('Calendário', 112, 256, 64, 64, () => { const g = M.jogoDe(estado, equipaAtual().id); if (g) dlgCalendario(g.casa === equipaAtual() ? g.fora : g.casa); }, { icone: '📅' }),
      botao('Plantel', 184, 256, 64, 64, () => { const g = M.jogoDe(estado, equipaAtual().id); if (g) dlgPlantel(g.casa === equipaAtual() ? g.fora : g.casa); }, { icone: '👥' }));
    // Vender
    ui.vTitulo = rotulo('Vender', 0, 16, 273, 33, { class: 'centrado', style: { fontSize: '14px', whiteSpace: 'normal' } });
    ui.vInfo = rotulo('Preço de venda', 16, 72, 241, 41, { style: { whiteSpace: 'normal', fontWeight: 'normal' } });
    ui.vPreco = campo(64, 128, 121, 24, '', { tipo: 'number', min: 0, step: 1000, negrito: true });
    p[5].append(ui.vTitulo, ui.vInfo, ui.vPreco, botao('Vender', 61, 208, 64, 64, vender, { icone: '💰' }), botao('Cancelar', 149, 208, 64, 64, () => mostrarPagina(1), { icone: '✖' }));
    // Contrato
    ui.cTitulo = rotulo('Renovar contrato', 0, 16, 273, 33, { class: 'centrado', style: { fontSize: '14px', whiteSpace: 'normal' } });
    ui.cInfo = rotulo('', 16, 56, 241, 36, { style: { whiteSpace: 'normal', fontWeight: 'normal' } });
    ui.cSalario = campo(136, 96, 105, 34, '', { tipo: 'number', min: 0, step: 10, negrito: true });
    ui.cSalario.style.fontSize = '16px';
    p[6].append(ui.cTitulo, ui.cInfo, rotulo('Novo salário:', 32, 104), ui.cSalario, botao('Propôr', 56, 200, 64, 64, propor, { icone: '🤝' }), botao('Cancelar', 152, 200, 64, 64, () => mostrarPagina(1), { icone: '✖' }));
    // Mensagem
    ui.mensagem = rotulo('', 24, 64, 225, 185, { style: { whiteSpace: 'pre-wrap', fontWeight: 'normal' } });
    p[7].append(ui.mensagem);
  }

  function mostrarPagina(i) {
    paginaAtual = i;
    ui.paginas.forEach((p, k) => p.classList.toggle('ativa', k === i));
    [...ui.abas.children].forEach((a, k) => a.classList.toggle('ativa', k === i));
    if (i === 1) atualizarJogador();
    if (i === 5 && jogadorSel) { ui.vTitulo.textContent = `Vender ${jogadorSel.nome}`; const v = M.valorJogador(jogadorSel); ui.vInfo.textContent = `Valor estimado: ${$(v)}. Indique o preço que pede. Quanto mais alto, menor a probabilidade de aparecer comprador.`; ui.vPreco.value = v; }
    if (i === 6 && jogadorSel) { ui.cTitulo.textContent = `Renovar contrato de ${jogadorSel.nome}`; const d = M.salarioDesejado(jogadorSel); ui.cInfo.textContent = `Salário atual: ${$(jogadorSel.salario)} por jornada, contrato por ${jogadorSel.contrato} época(s). O jogador pede ${$(d)}.`; ui.cSalario.value = d; }
  }

  function alternarTitular(id) {
    const e = equipaAtual(); const j = e.jogadores.find(x => x.id === id); if (!j) return;
    if (!j.titular) {
      if (!M.disponivel(j)) return mensagem(`${j.nome} não pode jogar: ${j.lesao ? 'lesionado' : 'suspenso'}.`, { tipo: 'aviso' });
      if (e.jogadores.filter(x => x.titular).length >= 11) return mensagem('Já tem 11 titulares. Retire primeiro um jogador (duplo clique).', { tipo: 'aviso' });
    }
    j.titular = !j.titular; atualizarTudo();
  }

  // ---------- atualização ----------
  function atualizarTudo() {
    if (!principal || !estado) return;
    const e = equipaAtual(), t = treinadorAtual(), div = divisaoDe(e);
    principal.querySelector('.titulo .texto').textContent = `Mister 26 — ${nomeJogo}`;
    ui.treinador.textContent = t.nome;
    ui.bandeira.textContent = Bandeiras.emoji(e.pais);
    ui.equipa.innerHTML = ''; ui.equipa.append(cores(e), ' ', e.nome);
    ui.divisao.textContent = `${div.nome} · ${posicaoNaTabela(e)}.º lugar`;
    ui.epoca.textContent = `Época ${rotuloEpoca()} · Jornada ${Math.min(estado.jornada, M.totalJornadas(estado))}`;
    const g = M.jogoDe(estado, e.id);
    const adv = g ? (g.casa === e ? g.fora : g.casa) : null;
    ui.adversario.innerHTML = '';
    if (adv) ui.adversario.append(el('b', {}, adv.nome), ` (${g.casa === e ? 'em casa' : 'fora'})`); else ui.adversario.textContent = M.epocaTerminada(estado) ? 'Época terminada' : 'Sem jogo nesta jornada';
    // lista de jogadores
    const ordem = [...e.jogadores].sort((a, b) => (b.titular - a.titular) || a.pos - b.pos || b.nivel - a.nivel);
    ui.listaJog.valor = jogadorSel?.id ?? null;
    ui.listaJog.preencher(ordem.map(j => ({
      valor: j.id, classe: (j.titular ? 'titular ' : '') + (j.lesao ? 'lesionado' : j.suspenso ? 'suspenso' : ''),
      html: `<span class="col" style="width:22px;text-align:right">${j.num ?? ''}</span><span class="col" style="width:30px">${M.POS[j.pos]}</span><span class="col" style="width:160px">${j.nome}</span><span class="col bandeira pequena" style="width:22px">${Bandeiras.emoji(j.nac)}</span><span class="col" style="width:26px;text-align:right">${j.nivel}</span><span class="col" style="width:22px">${j.titular ? '●' : ''}</span><span class="col" style="width:40px;font-weight:normal">${j.lesao ? 'L' + j.lesao : j.suspenso ? 'S' + j.suspenso : ''}</span>`,
    })));
    // página Jogo
    const linha = x => `${posicaoNaTabela(x)}.º ${x.nomeCurto} — ${x.pontos} pts (${x.v}V ${x.e}E ${x.d}D)`;
    ui.miniClass.preencher(g ? [{ texto: linha(g.casa) }, { texto: linha(g.fora) }] : [{ texto: linha(e) }]);
    ui.arbitro.textContent = g ? M.arbitroPara(estado, g.casa.id).nome : '—';
    ui.ultimo.textContent = e.ultimoResultado || '—';
    ui.dinheiro2.textContent = `Dinheiro em caixa: ${$(e.dinheiro)}` + (e.emprestimo ? ` · Empréstimo: ${$(e.emprestimo)}` : '');
    ui.moral.definir(e.moral, `Moral ${Math.round(e.moral)}%`);
    // Finanças
    const sal = e.jogadores.reduce((s, j) => s + j.salario, 0);
    ui.balanco.preencher([...e.balanco].reverse().map(b => ({ html: `<span class="col" style="width:150px">J${b.jornada} ${b.texto}</span><span class="col dir ${b.valor < 0 ? 'vermelho' : 'azul'}" style="width:85px">${$(b.valor)}</span>` })));
    ui.fSal.textContent = $(sal) + ' / jornada'; ui.fJuros.textContent = $(Math.round(e.emprestimo * 0.02)) + ' / jornada'; ui.fDin.textContent = $(e.dinheiro);
    ui.fDin.style.color = e.dinheiro < 0 ? '#ff6060' : '';
    if (document.activeElement !== ui.fPreco) ui.fPreco.value = e.precoBilhete;
    // Selecção
    const tit = e.jogadores.filter(j => j.titular), f = M.forcaEquipa(e), erro = M.validarSelecao(e);
    ui.selInfo.textContent = `Táctica: ${e.tactica}\nTitulares: ${tit.length} (GR ${tit.filter(j => j.pos === 0).length}, DEF ${tit.filter(j => j.pos === 1).length}, MED ${tit.filter(j => j.pos === 2).length}, AVA ${tit.filter(j => j.pos === 3).length})\nAtaque ${f.ataque.toFixed(1)} · Defesa ${f.defesa.toFixed(1)}\n${erro ? '⚠ ' + erro : '✔ Equipa pronta'}${t.pronto ? '\n(Jogar já confirmado)' : ''}`;
    // Adversário
    if (adv) {
      ui.aNome.textContent = adv.nome; ui.aMoral.definir(adv.moral, `Moral ${Math.round(adv.moral)}%`);
      ui.aTreinador.textContent = adv.treinador || '—';
      ui.aInfo.innerHTML = ''; ui.aInfo.append(bandeira(adv.pais, true), ` ${Bandeiras.nome(adv.pais)} · nível ${adv.nivel} · ${adv.estadio} (${adv.capacidade.toLocaleString('pt-PT')})`);
      ui.aClass.textContent = `${posicaoNaTabela(adv)}.º na ${divisaoDe(adv).nome}, ${adv.pontos} pontos\nÚltimos jogos: ${adv.ultimosJogos.join(' ') || '—'}\nÚltimo resultado: ${adv.ultimoResultado || '—'}`;
    } else { ui.aNome.textContent = '—'; ui.aInfo.textContent = ''; ui.aClass.textContent = ''; ui.aTreinador.textContent = ''; }
    if (paginaAtual === 1) atualizarJogador();
    atualizarRodape();
  }

  function atualizarJogador() {
    const j = jogadorSel;
    if (!j) { ui.jNome.textContent = 'Escolha um jogador na lista'; ui.jBandeira.textContent = ''; ui.jPais.textContent = ''; ui.jInfo.textContent = ''; return; }
    ui.jNome.textContent = `${j.nome} (${M.POS_LONGA[j.pos]})`;
    ui.jBandeira.textContent = Bandeiras.emoji(j.nac); ui.jPais.textContent = Bandeiras.nome(j.nac);
    ui.jInfo.textContent = `Nível ${j.nivel} · ${j.idade} anos · Salário ${$(j.salario)}/jornada · Valor ${$(M.valorJogador(j))} · Contrato: ${j.contrato} época(s)`;
    ui.jComp.textContent = M.COMPORTAMENTOS[j.comportamento]; ui.jGolosEpoca.textContent = j.golosEpoca;
    ui.jJogos.textContent = j.jogos; ui.jGolos.textContent = j.golos; ui.jVermelhos.textContent = j.vermelhos; ui.jLesoes.textContent = j.lesoes;
    ui.jSuspenso.textContent = j.suspenso ? `Suspenso por ${j.suspenso} jogo(s)` : ''; ui.jLesionado.textContent = j.lesao ? `Lesionado: falta ${j.lesao} jornada(s)` : '';
  }

  function atualizarRodape() {
    const r = document.getElementById('rodape');
    if (!r) return;
    r.querySelector('.estado').textContent = estado ? `${estado.treinadores.length} treinador(es) · ${Object.keys(estado.equipas).length} equipas` : 'Sem jogo';
  }

  // ---------- ações ----------
  async function vender() {
    const j = jogadorSel, e = equipaAtual();
    if (!j) return;
    const preco = parseInt(ui.vPreco.value, 10);
    if (!(preco > 0)) return mensagem('Indique um preço válido.', { tipo: 'aviso' });
    if (e.jogadores.length <= 14) return mensagem('Não pode vender: a equipa ficaria com menos de 14 jogadores.', { tipo: 'aviso' });
    if (await mensagem(`Vender ${j.nome} por ${$(preco)}?`, { tipo: 'pergunta', botoes: ['Sim', 'Não'] }) !== 'Sim') return;
    const r = M.tentarVender(estado, e, j, preco);
    if (r.ok) { mensagem(`${j.nome} foi vendido ao ${r.comprador.nomeCurto} por ${$(preco)}.`, { tipo: 'dinheiro', titulo: 'Venda' }); jogadorSel = null; mostrarPagina(2); }
    else mensagem(r.motivo + '\nPode tentar vender este jogador novamente na próxima jornada ou baixar o preço.', { tipo: 'aviso' });
    atualizarTudo();
  }

  function propor() {
    const j = jogadorSel; if (!j) return;
    const s = parseInt(ui.cSalario.value, 10);
    if (!(s > 0)) return mensagem('Indique um salário válido.', { tipo: 'aviso' });
    const r = M.renovarContrato(j, s);
    mensagem(r.ok ? `${j.nome} aceita o novo contrato: ${$(s)} por jornada, ${j.contrato} épocas.` : r.motivo.replace(/(\d+)\.$/, (m, n) => $(+n) + '.'), { tipo: r.ok ? 'info' : 'aviso' });
    if (r.ok) mostrarPagina(1);
    atualizarTudo();
  }

  let ultimosResultados = [];

  async function jogar() {
    const e = equipaAtual(), t = treinadorAtual();
    if (M.epocaTerminada(estado)) return fimDeEpoca();
    const erro = M.validarSelecao(e);
    if (erro) { if (await mensagem(erro + '\n\nQuer que a selecção seja feita automaticamente?', { tipo: 'pergunta', botoes: ['Sim', 'Não'] }) !== 'Sim') return; M.selecaoAutomatica(e, e.tactica); }
    t.pronto = true;
    const proximo = estado.treinadores.findIndex(x => !x.pronto);
    if (proximo >= 0) {
      estado.treinadorAtual = proximo; jogadorSel = null; mostrarPagina(0); atualizarTudo();
      return mensagem(`Agora é a vez de ${estado.treinadores[proximo].nome} (${equipaAtual().nomeCurto}) preparar a equipa.`, { titulo: 'Próximo treinador' });
    }
    // todos prontos: jogar a jornada
    const jornada = estado.jornada;
    const humanas = estado.treinadores.map(x => x.equipa);
    const resultados = M.jogarJornada(estado);
    ultimosResultados = resultados;
    const meus = resultados.filter(r => humanas.includes(r.casa) || humanas.includes(r.fora));
    for (const r of meus) await dlgRelogio(r, jornada);
    await dlgResultados(resultados, false, jornada);
    estado.treinadorAtual = 0; jogadorSel = null; mostrarPagina(0); atualizarTudo();
    const falidas = estado.treinadores.map(x => estado.equipas[x.equipa]).filter(x => x.dinheiro < -x.nivel * 100000);
    for (const f of falidas) mensagem(`Atenção, ${f.treinador}: o ${f.nomeCurto} está com ${$(f.dinheiro)} em caixa. Venda jogadores, peça um empréstimo ou... encontre outra solução.`, { tipo: 'aviso', titulo: 'Equipa endividada' });
    if (estado.opcoes.gravar === 'sempre' || (estado.opcoes.gravar === '3' && estado.jornada % 3 === 1)) gravar(true);
    if (M.epocaTerminada(estado)) fimDeEpoca();
  }

  async function fimDeEpoca() {
    const resumo = M.fimDeEpoca(estado);
    const j = janela({ titulo: `Fim da época ${resumo.epoca}`, largura: 520, altura: 420, verde: true, modal: true, fechar: false });
    const linhas = [];
    for (const c of resumo.campeoes) linhas.push({ html: `🏆 <b>${c.equipa}</b> — campeão da ${c.divisao}` });
    for (const m of resumo.marcadores) linhas.push({ texto: `⚽ ${m.jogador} (${m.equipa}) — melhor marcador da ${m.divisao} com ${m.golos} golos` });
    for (const s of resumo.subidas) linhas.push({ texto: `↑ ${s.equipa} sobe para a ${s.para}` });
    for (const d of resumo.descidas) linhas.push({ texto: `↓ ${d.equipa} desce para a ${d.para}` });
    for (const t of estado.treinadores) { const h = t.historico[t.historico.length - 1]; if (h) linhas.push({ html: `👔 <b>${t.nome}</b>: ${h.posicao}.º na ${h.divisao} com ${h.equipa} (${h.pontos} pontos)` }); }
    if (resumo.contratos.length) linhas.push({ texto: `✍ Contratos a renovar: ${resumo.contratos.map(c => `${c.jogador} (${c.equipa}) pede ${$(c.pede)}`).join('; ')}` });
    j.cliente.append(bevel(8, 8, 504, 360), lista(16, 16, 488, 344, linhas, { normal: true }), botao('OK', 228, 380, 64, 32, () => { j.fechar(); jogadorSel = null; gravar(true); atualizarTudo(); mensagem(`Começa a época ${rotuloEpoca()}. Boa sorte!`); }, { predef: true }));
    j.cliente.querySelector('.lista').style.color = '#000';
  }

  // ---------- relógio de jogo ----------
  function dlgRelogio(r, jornada) {
    return new Promise(res => {
      const casa = estado.equipas[r.casa], fora = estado.equipas[r.fora];
      const j = janela({ titulo: `Jornada ${jornada} — ${casa.nomeCurto} vs ${fora.nomeCurto}`, largura: 420, altura: 330, verde: true, modal: true, fechar: false });
      const nomes = rotulo('', 8, 8, 404, 20, { class: 'centrado', style: { fontSize: '13px' } });
      nomes.innerHTML = ''; nomes.append(cores(casa), ` ${casa.nome} `, el('span', { style: { fontWeight: 'normal' } }, ' — '), ` ${fora.nome} `, cores(fora));
      const placar = rotulo('0 - 0', 8, 32, 404, 40, { class: 'resultado-grande' });
      const relogio = medidor(8, 80, 404, 18, 0, { cor: '#000080', texto: "0'" });
      const eventos = lista(8, 106, 404, 160, [], { normal: true }); eventos.classList.add('eventos'); eventos.style.color = '#000';
      const info = rotulo(`Árbitro: ${r.arbitro} · ${casa.estadio} · ${(r.publico || 0).toLocaleString('pt-PT')} espectadores`, 8, 272, 404, 16, { style: { fontWeight: 'normal', fontSize: '11px' } });
      let min = 0, gc = 0, gf = 0, timer = null, vel = [160, 90, 45, 15][estado.opcoes.velocidade] || 45;
      const avancar = () => {
        min++;
        for (const ev of r.eventos.filter(x => x.min === min)) {
          if (ev.tipo === 'golo') { if (ev.equipa === casa.id) gc++; else gf++; placar.textContent = `${gc} - ${gf}`; }
          const d = el('div', {}, `${ev.min}' ${ev.tipo === 'golo' ? '⚽' : ev.tipo === 'amarelo' ? '🟨' : ev.tipo === 'vermelho' ? '🟥' : ev.tipo === 'lesao' ? '🚑' : 'ℹ'} ${ev.texto}`);
          eventos.append(d); eventos.scrollTop = 1e6;
        }
        relogio.definir(min / 90 * 100, `${min}'`);
        if (min === 45) { eventos.append(el('div', { style: { fontWeight: 'bold' } }, '— Intervalo —')); }
        if (min >= 90) { terminar(); }
      };
      const terminar = () => {
        clearInterval(timer); timer = null;
        while (min < 90) { min++; for (const ev of r.eventos.filter(x => x.min === min)) { if (ev.tipo === 'golo') { if (ev.equipa === casa.id) gc++; else gf++; } eventos.append(el('div', {}, `${ev.min}' ${ev.texto}`)); } }
        for (const ev of r.eventos.filter(x => x.min > 90)) eventos.append(el('div', {}, ev.texto));
        placar.textContent = `${r.gc} - ${r.gf}`; relogio.definir(100, "90'");
        eventos.append(el('div', { style: { fontWeight: 'bold' } }, `Final: ${casa.nomeCurto} ${r.gc} - ${r.gf} ${fora.nomeCurto}`)); eventos.scrollTop = 1e6;
        btn.textContent = 'Continuar'; btn.onclick = () => { j.fechar(); res(); }; btn.classList.add('predef');
      };
      const btn = botao('Saltar', 338, 294, 74, 24, terminar);
      const velBtn = botao('Velocidade', 8, 294, 80, 24, () => { estado.opcoes.velocidade = (estado.opcoes.velocidade + 1) % 4; vel = [160, 90, 45, 15][estado.opcoes.velocidade]; if (timer) { clearInterval(timer); timer = setInterval(avancar, vel); } velBtn.textContent = ['Lenta', 'Normal', 'Rápida', 'Turbo'][estado.opcoes.velocidade]; });
      velBtn.textContent = ['Lenta', 'Normal', 'Rápida', 'Turbo'][estado.opcoes.velocidade];
      j.cliente.append(nomes, placar, relogio, eventos, info, velBtn, btn);
      timer = setInterval(avancar, vel);
    });
  }

  function dlgResultados(resultados, livre, jornada) {
    return new Promise(res => {
      if (!resultados || !resultados.length) { mensagem('Ainda não há resultados nesta época.'); return res(); }
      const j = janela({ titulo: `Resultados da jornada ${jornada || resultados[0].jornada}`, largura: 520, altura: 400, verde: true, modal: !livre, fechar: livre, aoFechar: res });
      const linhas = [];
      for (const d of estado.divisoes) {
        const rs = resultados.filter(r => r.div === d.id); if (!rs.length) continue;
        linhas.push({ cab: true, texto: d.nome });
        for (const r of rs) { const c = estado.equipas[r.casa], f = estado.equipas[r.fora]; const h = c.humano !== null || f.humano !== null; linhas.push({ html: `<span class="col direita" style="width:200px;${h ? 'color:#000080' : ''}">${c.nomeCurto}</span><span class="col centrado" style="width:60px">${r.gc} - ${r.gf}</span><span class="col" style="width:200px;${h ? 'color:#000080' : ''}">${f.nomeCurto}</span>` }); }
      }
      const l = lista(8, 8, 504, 350, linhas, { normal: true }); l.style.color = '#000';
      j.cliente.append(l, botao('OK', 228, 366, 64, 26, () => { j.fechar(); }, { predef: true }));
    });
  }

  // ---------- diálogos ----------
  function dlgClassificacao() {
    const divs = estado.divisoes.slice(0, 4);
    const j = janela({ titulo: 'Classificação', largura: 592, altura: divs.length > 2 ? 470 : 250, verde: true });
    divs.forEach((d, i) => {
      const x = i % 2 ? 307 : 10, y = i < 2 ? 17 : 240;
      const tab = M.classificacao(estado, d);
      j.cliente.append(rotulo(d.nome, x + 1, y, 270, 20, { style: { fontWeight: 'bold' } }),
        lista(x, y + 24, 273, 190, [{ cab: true, html: `<span class="col" style="width:22px">#</span><span class="col" style="width:118px">Equipa</span><span class="col dir" style="width:20px">J</span><span class="col dir" style="width:18px">V</span><span class="col dir" style="width:18px">E</span><span class="col dir" style="width:18px">D</span><span class="col dir" style="width:30px">G</span><span class="col dir" style="width:22px">P</span>` },
          ...tab.map((e, k) => ({ html: `<span class="col" style="width:22px">${k + 1}</span><span class="col" style="width:118px;${e.humano !== null ? 'color:#000080' : ''}">${e.nomeCurto}</span><span class="col dir" style="width:20px">${e.j}</span><span class="col dir" style="width:18px">${e.v}</span><span class="col dir" style="width:18px">${e.e}</span><span class="col dir" style="width:18px">${e.d}</span><span class="col dir" style="width:30px">${e.gm}-${e.gs}</span><span class="col dir" style="width:22px"><b>${e.pontos}</b></span>`, valor: e.id }))], { normal: true, ondbl: v => dlgPlantel(estado.equipas[v]) }));
    });
    for (const l of j.cliente.querySelectorAll('.lista')) l.style.color = '#000';
  }

  function dlgMarcadores() {
    const j = janela({ titulo: 'Melhores marcadores', largura: 420, altura: 380, verde: true });
    const l = lista(8, 40, 404, 330, [], { normal: true }); l.style.color = '#000';
    const mostrar = id => { const d = estado.divisoes.find(x => x.id === id); l.preencher(M.melhoresMarcadores(estado, d, 30).map((m, i) => ({ html: `<span class="col" style="width:24px">${i + 1}</span><span class="col" style="width:190px">${m.j.nome}</span><span class="col" style="width:130px">${m.e.nomeCurto}</span><span class="col dir" style="width:36px"><b>${m.j.golosEpoca}</b></span>` }))); };
    j.cliente.append(combo(8, 8, 300, 22, estado.divisoes.map(d => ({ texto: d.nome, valor: d.id })), divisaoDe(equipaAtual()).id, mostrar), l);
    mostrar(divisaoDe(equipaAtual()).id);
  }

  function dlgCalendario(e) {
    const j = janela({ titulo: `Calendário — ${e.nomeCurto}`, largura: 420, altura: 400, verde: true });
    const l = lista(8, 40, 404, 350, [], { normal: true }); l.style.color = '#000';
    const mostrar = id => { const x = estado.equipas[id]; j.querySelector('.titulo .texto').textContent = `Calendário — ${x.nomeCurto}`; l.preencher(M.calendarioDe(estado, id).map(c => ({ html: c.adv ? `<span class="col" style="width:30px">${c.jornada}</span><span class="col" style="width:40px">${c.casa ? 'casa' : 'fora'}</span><span class="col" style="width:230px">${c.adv.nomeCurto}</span><span class="col dir" style="width:60px;${c.resultado ? (c.venceu ? 'color:#008000' : c.empate ? '' : 'color:#c00000') : ''}"><b>${c.resultado || ''}</b></span>` : `<span class="col" style="width:30px">${c.jornada}</span>Descanso`, classe: c.jornada === estado.jornada ? 'sel' : '' }))); };
    j.cliente.append(combo(8, 8, 300, 22, Object.values(estado.equipas).sort((a, b) => a.nomeCurto.localeCompare(b.nomeCurto)).map(x => ({ texto: x.nomeCurto, valor: x.id })), e.id, mostrar), l);
    mostrar(e.id);
  }

  function dlgPlantel(e) {
    const j = janela({ titulo: 'Plantel', largura: 636, altura: 457, verde: true });
    let eq = e, sel = null;
    const info = rotulo('', 404, 104, 185, 173, { style: { whiteSpace: 'pre-wrap', fontWeight: 'normal' } });
    const moral = medidor(396, 8, 201, 17, eq.moral, { bi: true });
    const divLbl = rotulo('', 256, 8, 129, 14);
    const l = lista(16, 40, 353, 386, [], { onsel: v => { sel = eq.jogadores.find(x => x.id === v); mostrarInfo(); } });
    const mostrarInfo = () => {
      if (!sel) { info.textContent = 'Escolha um jogador.'; return; }
      const dona = eq;
      info.textContent = `${sel.nome}\n${M.POS_LONGA[sel.pos]} · ${Bandeiras.nome(sel.nac)}\nNível ${sel.nivel} · ${sel.idade} anos\nComportamento: ${M.COMPORTAMENTOS[sel.comportamento]}\nJogos ${sel.jogos} · Golos ${sel.golosEpoca} (${sel.golos} total)\nVermelhos ${sel.vermelhos} · Lesões ${sel.lesoes}\nSalário: ${$(sel.salario)}/jornada\n${dona.id !== equipaAtual().id ? 'Preço pedido: ' + $(M.precoPedido(estado, sel, dona)) : 'Valor: ' + $(M.valorJogador(sel))}${sel.lesao ? '\nLesionado (' + sel.lesao + ')' : ''}${sel.suspenso ? '\nSuspenso (' + sel.suspenso + ')' : ''}`;
    };
    const mostrar = id => {
      eq = estado.equipas[id]; sel = null; mostrarInfo();
      divLbl.textContent = `${divisaoDe(eq).nome} · ${posicaoNaTabela(eq)}.º`;
      moral.definir(eq.moral, `Moral ${Math.round(eq.moral)}%`);
      l.preencher([...eq.jogadores].sort((a, b) => (b.titular - a.titular) || a.pos - b.pos || b.nivel - a.nivel).map(x => ({ valor: x.id, classe: (x.titular ? 'titular ' : '') + (x.lesao ? 'lesionado' : x.suspenso ? 'suspenso' : ''), html: `<span class="col" style="width:22px;text-align:right">${x.num ?? ''}</span><span class="col" style="width:30px">${M.POS[x.pos]}</span><span class="col" style="width:170px">${x.nome}</span><span class="col bandeira pequena" style="width:22px">${Bandeiras.emoji(x.nac)}</span><span class="col dir" style="width:26px">${x.nivel}</span><span class="col" style="width:50px;font-weight:normal">${x.idade} anos</span>` })));
    };
    j.cliente.append(bevel(8, 32, 369, 401), combo(8, 8, 241, 21, Object.values(estado.equipas).sort((a, b) => a.nomeCurto.localeCompare(b.nomeCurto)).map(x => ({ texto: x.nomeCurto, valor: x.id })), eq.id, mostrar), divLbl, moral, l, info,
      botao('Balanço', 412, 32, 64, 64, () => dlgBalanco(eq), { icone: '📒' }), botao('Calendário', 516, 32, 64, 64, () => dlgCalendario(eq), { icone: '📅' }),
      botao('Procurar', 404, 316, 64, 64, () => dlgProcurar(), { icone: '🔍' }),
      botao('Comprar', 468, 316, 64, 64, async () => {
        if (!sel) return mensagem('Escolha um jogador.', { tipo: 'aviso' });
        if (eq.id === equipaAtual().id) return mensagem('Esse jogador já é seu.', { tipo: 'aviso' });
        const preco = M.precoPedido(estado, sel, eq);
        if (await mensagem(`Comprar ${sel.nome} ao ${eq.nomeCurto} por ${$(preco)}?`, { tipo: 'pergunta', botoes: ['Sim', 'Não'] }) !== 'Sim') return;
        const r = M.comprar(estado, equipaAtual(), sel, eq);
        mensagem(r.ok ? `${sel.nome} é agora jogador do ${equipaAtual().nomeCurto}. Salário: ${$(sel.salario)}/jornada.` : r.motivo, { tipo: r.ok ? 'dinheiro' : 'aviso' });
        if (r.ok) { mostrar(eq.id); atualizarTudo(); }
      }, { icone: '💰' }),
      botao('Fechar', 532, 380, 64, 64, () => j.fechar(), { icone: '✖' }));
    mostrar(eq.id);
  }

  function dlgProcurar() {
    const j = janela({ titulo: 'Procurar jogador', largura: 560, altura: 420, verde: true });
    const fPos = combo(70, 8, 110, 22, [{ texto: 'Todas', valor: '' }, ...M.POS_LONGA.map((p, i) => ({ texto: p, valor: i }))], '', () => mostrar());
    const fNivel = campo(250, 8, 50, 22, 1, { tipo: 'number', min: 1, oninput: () => mostrar() });
    const fPreco = campo(400, 8, 110, 22, '', { tipo: 'number', min: 0, step: 10000, oninput: () => mostrar() });
    const l = lista(8, 40, 544, 320, [], { normal: true, ondbl: v => { const [eid] = v.split('|'); dlgPlantel(estado.equipas[eid]); } }); l.style.color = '#000';
    let res = [];
    const mostrar = () => {
      res = M.procurar(estado, { pos: fPos.value === '' ? null : +fPos.value, nivelMin: +fNivel.value || 1, precoMax: +fPreco.value || Infinity, excluir: equipaAtual().id }).slice(0, 200);
      l.preencher(res.map((r, i) => ({ valor: r.e.id + '|' + r.j.id, html: `<span class="col" style="width:30px">${M.POS[r.j.pos]}</span><span class="col" style="width:170px">${r.j.nome}</span><span class="col bandeira pequena" style="width:22px">${Bandeiras.emoji(r.j.nac)}</span><span class="col dir" style="width:24px">${r.j.nivel}</span><span class="col" style="width:50px">${r.j.idade} anos</span><span class="col" style="width:130px">${r.e.nomeCurto}</span><span class="col dir" style="width:95px"><b>${$(r.preco)}</b></span>` })));
    };
    j.cliente.append(rotulo('Posição', 8, 12), fPos, rotulo('Nível mín.', 190, 12), fNivel, rotulo('Preço máx.', 310, 12), fPreco, l,
      rotulo(`Dinheiro em caixa: ${$(equipaAtual().dinheiro)}`, 8, 376, 300, 16),
      botao('Comprar', 380, 368, 80, 26, async () => {
        const r = res.find(x => x.e.id + '|' + x.j.id === l.valor); if (!r) return mensagem('Escolha um jogador.', { tipo: 'aviso' });
        if (await mensagem(`Comprar ${r.j.nome} ao ${r.e.nomeCurto} por ${$(r.preco)}?`, { tipo: 'pergunta', botoes: ['Sim', 'Não'] }) !== 'Sim') return;
        const x = M.comprar(estado, equipaAtual(), r.j, r.e);
        mensagem(x.ok ? `${r.j.nome} é agora jogador do ${equipaAtual().nomeCurto}.` : x.motivo, { tipo: x.ok ? 'dinheiro' : 'aviso' });
        if (x.ok) { atualizarTudo(); j.fechar(); }
      }, { predef: true }), botao('Fechar', 470, 368, 80, 26, () => j.fechar()));
    mostrar();
  }

  function dlgBalanco(e) {
    const j = janela({ titulo: `Balanço — ${e.nomeCurto}`, largura: 420, altura: 360, verde: true });
    const l = lista(8, 8, 404, 300, [...e.balanco].reverse().map(b => ({ html: `<span class="col" style="width:40px">J${b.jornada}</span><span class="col" style="width:240px">${b.texto}</span><span class="col dir ${b.valor < 0 ? 'vermelho' : 'azul'}" style="width:100px">${$(b.valor)}</span>` })), { normal: true }); l.style.color = '#000';
    j.cliente.append(l, rotulo(`Receitas: ${$(e.receitas)} · Despesas: ${$(e.despesas)} · Caixa: ${$(e.dinheiro)}`, 8, 318, 404, 16), botao('OK', 178, 334, 64, 22, () => j.fechar(), { predef: true }));
  }

  function dlgEmprestimo() {
    const e = equipaAtual();
    const j = janela({ titulo: 'Empréstimo bancário', largura: 380, altura: 220, verde: true });
    const info = rotulo('', 16, 16, 348, 60, { style: { whiteSpace: 'pre-wrap', fontWeight: 'normal' } });
    const atualizar = () => { info.textContent = `Dinheiro em caixa: ${$(e.dinheiro)}\nEmpréstimo atual: ${$(e.emprestimo)} (juros 2% por jornada = ${$(e.emprestimo * 0.02)})\nLimite do banco: ${$(M.limiteEmprestimo(e))}`; atualizarTudo(); };
    const valor = campo(120, 90, 140, 24, 100000, { tipo: 'number', min: 0, step: 10000, negrito: true });
    j.cliente.append(bevel(8, 8, 364, 160), info, rotulo('Valor:', 16, 94), valor,
      botao('Pedir', 40, 126, 90, 28, () => { const r = M.pedirEmprestimo(estado, e, +valor.value); if (r) mensagem(r, { tipo: 'aviso' }); atualizar(); }),
      botao('Pagar', 145, 126, 90, 28, () => { const r = M.pagarEmprestimo(estado, e, +valor.value); if (r) mensagem(r, { tipo: 'aviso' }); atualizar(); }),
      botao('Fechar', 250, 126, 90, 28, () => j.fechar()));
    atualizar();
  }

  function dlgEstadio() {
    const e = equipaAtual();
    const j = janela({ titulo: 'Estádio', largura: 420, altura: 300, verde: true });
    const info = rotulo('', 16, 16, 388, 40, { style: { whiteSpace: 'pre-wrap' } });
    const desenho = pos(el('canvas', { width: 388, height: 120 }), 16, 60);
    const pintar = () => {
      info.textContent = `${e.estadio}\nCapacidade: ${e.capacidade.toLocaleString('pt-PT')} lugares · Preço do bilhete: ${$(e.precoBilhete)}`;
      const ctx = desenho.getContext('2d'); ctx.clearRect(0, 0, 388, 120);
      const esc = Math.min(1, Math.sqrt(e.capacidade / 80000));
      const w = 120 + 240 * esc, h = 40 + 70 * esc, x = (388 - w) / 2, y = (120 - h) / 2;
      ctx.fillStyle = '#c0c0c0'; ctx.beginPath(); ctx.ellipse(194, 60, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = e.cor1; ctx.beginPath(); ctx.ellipse(194, 60, w / 2 - 6, h / 2 - 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#20a020'; ctx.fillRect(194 - w * 0.25, 60 - h * 0.22, w * 0.5, h * 0.44);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(194 - w * 0.25, 60 - h * 0.22, w * 0.5, h * 0.44); ctx.beginPath(); ctx.moveTo(194, 60 - h * 0.22); ctx.lineTo(194, 60 + h * 0.22); ctx.stroke();
      void x; void y;
    };
    const ampliar = async n => { const custo = M.custoAmpliacao(e, n); if (await mensagem(`Ampliar o estádio em ${n.toLocaleString('pt-PT')} lugares por ${$(custo)}?`, { tipo: 'pergunta', botoes: ['Sim', 'Não'] }) !== 'Sim') return; const r = M.ampliarEstadio(estado, e, n); if (r) mensagem(r, { tipo: 'aviso' }); pintar(); atualizarTudo(); };
    j.cliente.append(info, desenho, rotulo(`Ampliar: 2.000 lugares custam ${$(M.custoAmpliacao(e, 2000))}; 5.000 custam ${$(M.custoAmpliacao(e, 5000))}.`, 16, 190, 388, 16, { style: { fontWeight: 'normal' } }),
      botao('+2.000', 60, 220, 90, 40, () => ampliar(2000)), botao('+5.000', 165, 220, 90, 40, () => ampliar(5000)), botao('Fechar', 270, 220, 90, 40, () => j.fechar()));
    pintar();
  }

  function dlgHistorialEquipa() {
    const e = equipaAtual();
    const titulos = estado.campeoes.filter(c => c.equipa === e.nomeCurto);
    mensagem(`${e.nome}\n${Bandeiras.nome(e.pais)} · ${divisaoDe(e).nome}\nEstádio: ${e.estadio} (${e.capacidade.toLocaleString('pt-PT')})\nNível da equipa: ${e.nivel}\nTítulos neste jogo: ${titulos.length}${titulos.length ? ' (' + titulos.map(t => `${t.divisao} ${t.epoca}`).join(', ') + ')' : ''}\nEsta época: ${e.j} jogos, ${e.v}V ${e.e}E ${e.d}D, ${e.gm}-${e.gs}`, { titulo: 'Historial' });
  }

  function dlgTransferencias() {
    const j = janela({ titulo: 'Últimas transferências', largura: 520, altura: 360, verde: true });
    const l = lista(8, 8, 504, 310, estado.transferencias.length ? estado.transferencias.map(t => ({ html: `<span class="col" style="width:70px">${t.epoca} J${t.jornada}</span><span class="col" style="width:150px">${t.jogador}</span><span class="col" style="width:110px">${t.de}</span><span class="col" style="width:20px">→</span><span class="col" style="width:110px">${t.para}</span><span class="col dir" style="width:80px">${$(t.preco)}</span>` })) : [{ texto: 'Ainda não houve transferências.' }], { normal: true }); l.style.color = '#000';
    j.cliente.append(l, botao('OK', 228, 326, 64, 24, () => j.fechar(), { predef: true }));
  }

  function dlgVencedores() {
    const j = janela({ titulo: 'Últimos vencedores', largura: 420, altura: 300, verde: true });
    const l = lista(8, 8, 404, 250, estado.campeoes.length ? estado.campeoes.map(c => ({ texto: `${c.epoca} — ${c.divisao}: ${c.equipa}` })) : [{ texto: 'Ainda não há campeões neste jogo.' }], { normal: true }); l.style.color = '#000';
    j.cliente.append(l, botao('OK', 178, 266, 64, 24, () => j.fechar(), { predef: true }));
  }

  function dlgHistoriaTreinador() {
    const t = treinadorAtual();
    const j = janela({ titulo: `História — ${t.nome}`, largura: 420, altura: 300, verde: true });
    const linhas = [{ texto: `Jogos ${t.j} · Vitórias ${t.v} · Empates ${t.e} · Derrotas ${t.d} · Títulos ${t.titulos}` }, ...t.historico.map(h => ({ texto: `${h.epoca} — ${h.equipa}: ${h.posicao}.º na ${h.divisao} (${h.pontos} pts)` }))];
    const l = lista(8, 8, 404, 250, linhas, { normal: true }); l.style.color = '#000';
    j.cliente.append(l, botao('OK', 178, 266, 64, 24, () => j.fechar(), { predef: true }));
  }

  function dlgRanking() {
    const j = janela({ titulo: 'Ranking de treinadores', largura: 420, altura: 300, verde: true });
    const ordem = [...estado.treinadores].sort((a, b) => (b.v * 3 + b.e + b.titulos * 20) - (a.v * 3 + a.e + a.titulos * 20));
    const l = lista(8, 8, 404, 250, ordem.map((t, i) => ({ html: `<span class="col" style="width:24px">${i + 1}</span><span class="col" style="width:140px">${t.nome}</span><span class="col" style="width:130px">${estado.equipas[t.equipa].nomeCurto}</span><span class="col dir" style="width:90px">${t.v * 3 + t.e + t.titulos * 20} pts</span>` })), { normal: true }); l.style.color = '#000';
    j.cliente.append(l, botao('OK', 178, 266, 64, 24, () => j.fechar(), { predef: true }));
  }

  function dlgTreinadores() {
    const j = janela({ titulo: 'Gestão de treinadores', largura: 420, altura: 320, verde: true });
    const l = lista(8, 8, 300, 250, [], { normal: true }); l.style.color = '#000';
    const mostrar = () => l.preencher(estado.treinadores.map((t, i) => ({ valor: i, texto: `${t.nome} — ${estado.equipas[t.equipa].nomeCurto}` })));
    j.cliente.append(l,
      botao('Adicionar', 316, 8, 96, 40, async () => {
        if (estado.treinadores.length >= 6) return mensagem('Máximo de 6 treinadores.', { tipo: 'aviso' });
        const nome = await pedirTexto('Novo treinador', 'Nome do treinador:'); if (!nome) return;
        const livres = M.baralhar(Object.values(estado.equipas).filter(e => e.humano === null));
        const e = livres[0]; e.humano = estado.treinadores.length; e.treinador = nome;
        estado.treinadores.push({ nome, equipa: e.id, pronto: false, j: 0, v: 0, e: 0, d: 0, titulos: 0, historico: [], opcoes: { salariosAuto: true, leilao: 0 } });
        mensagem(`${nome} vai treinar o ${e.nomeCurto}.`); mostrar(); atualizarTudo();
      }),
      botao('Retirar', 316, 56, 96, 40, async () => {
        if (l.valor === null || estado.treinadores.length <= 1) return mensagem('Tem de ficar pelo menos um treinador.', { tipo: 'aviso' });
        const t = estado.treinadores[l.valor];
        if (await mensagem(`Retirar ${t.nome} do jogo? O ${estado.equipas[t.equipa].nomeCurto} passa a ser controlado pelo computador.`, { tipo: 'pergunta', botoes: ['Sim', 'Não'] }) !== 'Sim') return;
        estado.equipas[t.equipa].humano = null; estado.treinadores.splice(l.valor, 1);
        estado.treinadores.forEach((x, i) => { estado.equipas[x.equipa].humano = i; });
        estado.treinadorAtual = 0; mostrar(); atualizarTudo();
      }),
      botao('Mudar para', 316, 104, 96, 40, () => { if (l.valor === null) return; estado.treinadorAtual = l.valor; jogadorSel = null; atualizarTudo(); j.fechar(); }),
      botao('Fechar', 316, 218, 96, 40, () => j.fechar()));
    mostrar();
  }

  function dlgPerfil() {
    const t = treinadorAtual();
    const j = janela({ titulo: 'Perfil', largura: 380, altura: 220, verde: true });
    const c1 = opcao('checkbox', 'sal', 'O computador renova os contratos automaticamente', 16, 40, t.opcoes.salariosAuto, v => { t.opcoes.salariosAuto = v; });
    j.cliente.append(bevel(8, 8, 364, 160), rotulo('Gestão de salários', 16, 16), c1,
      rotulo('Com esta opção desligada, no fim da época os jogadores em fim de contrato pedem um novo salário e tem de os renovar na página Contrato.', 16, 70, 348, 60, { style: { whiteSpace: 'normal', fontWeight: 'normal' } }),
      botao('OK', 158, 180, 64, 24, () => j.fechar(), { predef: true }));
  }

  function dlgOpcoes() {
    const o = estado.opcoes;
    const j = janela({ titulo: 'Opções', largura: 400, altura: 260, modal: true });
    j.cliente.append(rotulo('Moeda', 16, 20), combo(160, 16, 200, 22, [{ texto: 'Euro (€)', valor: '€' }, { texto: 'Real (R$)', valor: 'R$' }, { texto: 'Dólar ($)', valor: '$' }], o.moeda, v => { o.moeda = v; }),
      rotulo('Gravar o jogo', 16, 52), combo(160, 48, 200, 22, [{ texto: 'Todas as jornadas', valor: 'sempre' }, { texto: 'De 3 em 3 jornadas', valor: '3' }, { texto: 'Só manualmente', valor: 'nunca' }], o.gravar, v => { o.gravar = v; }),
      rotulo('Velocidade do relógio', 16, 84), combo(160, 80, 200, 22, [{ texto: 'Lenta', valor: 0 }, { texto: 'Normal', valor: 1 }, { texto: 'Rápida', valor: 2 }, { texto: 'Turbo', valor: 3 }], o.velocidade, v => { o.velocidade = +v; }),
      rotulo('Mostrar chicotadas psicológicas', 16, 116), combo(160, 112, 200, 22, [{ texto: 'Nunca', valor: 'nunca' }, { texto: 'Dos humanos', valor: 'humanos' }, { texto: 'Todas', valor: 'todas' }], o.chicotadas, v => { o.chicotadas = v; }),
      rotulo('Nível de inflacção: 0% (os preços são estáveis nesta versão)', 16, 150, 368, 16, { style: { fontWeight: 'normal' } }),
      botao('OK', 240, 220, 64, 24, () => { j.fechar(); atualizarTudo(); }, { predef: true }), botao('Cancelar', 312, 220, 72, 24, () => j.fechar()));
  }

  function dlgRegisto() {
    const j = janela({ titulo: 'Registo', largura: 460, altura: 400, modal: true });
    const senha = campo(120, 12, 150, 22, (M.hash(nomeJogo || 'x') % 100000000).toString().padStart(8, '0')); senha.readOnly = true;
    const contra = campo(120, 44, 150, 22, '');
    const memo = pos(el('div', { class: 'memo' }), 16, 80, 428, 270);
    memo.textContent = 'O Mister 26 é distribuído gratuitamente e sem restrições.\n\nNo Elifoot 98, de 1998, este diálogo pedia uma Contra-Senha enviada pelo correio, a troco de 1.500 escudos ou 10 reais, para desbloquear a compra directa de jogadores, a escolha jogador a jogador, as substituições durante o jogo, os empréstimos bancários, a informação sobre o árbitro e a consulta dos planteis adversários.\n\nAqui todas essas possibilidades já estão abertas. Pode escrever o que quiser na Contra-Senha: é só pela nostalgia.\n\nSe quiser mesmo fazer batota, há sempre o Cheat O\'Matic no menu Mister 26.';
    j.cliente.append(rotulo('Senha', 16, 16), senha, rotulo('Contra-Senha', 16, 48), contra, memo,
      botao('OK', 290, 362, 75, 24, () => { j.fechar(); mensagem(contra.value.trim() ? 'Obrigado! O registo foi aceite. Para que tenha efeito, não é preciso reiniciar nada.' : 'Sem contra-senha o jogo continua... exatamente igual.', { titulo: 'Registo' }); }, { predef: true }),
      botao('Cancelar', 370, 362, 75, 24, () => j.fechar()));
  }

  function dlgAcerca() {
    const j = janela({ titulo: 'Acerca', largura: 440, altura: 330, verde: true, modal: true });
    const memo = pos(el('div', { class: 'memo' }), 16, 100, 408, 180);
    memo.textContent = 'Jogo de gestão de futebol inspirado no Elifoot 98 (André Elias e Ricardo Correia, 1998), reconstruído de raiz em HTML, CSS e JavaScript.\n\nOs planteis, treinadores, estádios e cores das equipas vêm da Wikipédia inglesa (licença CC BY-SA 4.0) e são atualizados automaticamente pelo robô do projeto. Os níveis dos jogadores e as regras do jogo são criação própria.\n\nO Mister 26 não tem ligação aos autores do Elifoot. "Elifoot" é marca dos seus titulares.\n\nAutorizada apenas a distribuição livre e gratuita.';
    j.cliente.append(rotulo('Mister 26', 16, 12, 408, 30, { class: 'centrado', style: { fontSize: '22px' } }), rotulo('Gestor de futebol · época ' + (estado ? rotuloEpoca() : ''), 16, 46, 408, 20, { class: 'centrado', style: { fontWeight: 'normal' } }),
      rotulo('(c) 2026 · Todos os direitos reservados', 16, 68, 408, 20, { class: 'centrado', style: { fontWeight: 'normal', fontSize: '11px' } }), memo,
      botao('OK', 150, 292, 64, 26, () => j.fechar(), { predef: true }), botao('Registar', 226, 292, 64, 26, () => { j.fechar(); dlgRegisto(); }));
  }

  // ---------- rodapé e escala ----------
  function rodape() {
    const r = el('div', { id: 'rodape' }, el('span', { class: 'iniciar botao' }, '⚽ Mister 26'), el('span', { class: 'estado' }, 'Sem jogo'), el('span', { class: 'espaco' }), el('span', { class: 'estado', id: 'relogio-rodape' }, ''));
    document.body.append(r);
    const tick = () => { const h = document.getElementById('relogio-rodape'); if (h) h.textContent = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }); };
    tick(); setInterval(tick, 10000);
  }
  function ajustarEscala() {
    const e = document.getElementById('ecra');
    const w = window.innerWidth, h = window.innerHeight - 22;
    const esc = Math.min(1, w / 660, h / 500);
    e.style.transform = `scale(${esc})`; e.style.width = (w / esc) + 'px'; e.style.height = (h / esc) + 'px';
    e.classList.add('ampliavel');
  }

  function iniciar() {
    rodape(); ajustarEscala(); window.addEventListener('resize', ajustarEscala);
    document.addEventListener('keydown', ev => { if (ev.ctrlKey && ev.altKey && ev.key.toLowerCase() === 'c' && estado) CheatOMatic.abrir(estado, atualizarTudo); });
    if (!window.DADOS_EQUIPAS && !localStorage.getItem(CHAVE_DADOS)) { mensagem('Não encontrei o ficheiro dados/equipas.js. Corra "node robo/atualizar.mjs" para gerar os planteis.', { tipo: 'erro' }); return; }
    if (location.hash.startsWith('#demo')) { demo(location.hash.slice(6)); return; }
    ecraInicial();
    Atualizador.automatico();
  }

  // Modo de demonstração (#demo=equipa,ecra,jornadas): abre um jogo pronto para capturas de ecrã.
  function demo(args) {
    const [equipaId, ecra, jornadas] = (args || '').split(',');
    const dados = dadosBase();
    const paises = [...new Set(dados.divisoes.map(d => d.pais))];
    estado = M.novoJogo({ dados, paises, treinadores: [{ nome: 'Mister', equipa: equipaId || undefined }] });
    estado.treinadorAtual = 0; nomeJogo = 'DEMO';
    for (let i = 0; i < (+jornadas || 0); i++) M.jogarJornada(estado);
    estado.treinadores.forEach(t => { t.pronto = false; });
    abrirPrincipal();
    const e = equipaAtual();
    if (ecra === 'classificacao') dlgClassificacao();
    else if (ecra === 'plantel') dlgPlantel(e);
    else if (ecra === 'cheat') CheatOMatic.abrir(estado, atualizarTudo);
    else if (ecra === 'procurar') dlgProcurar();
    else if (ecra === 'jogador') { jogadorSel = e.jogadores.find(j => j.titular && j.pos === 3) || e.jogadores[0]; mostrarPagina(1); atualizarTudo(); }
    else if (ecra === 'relogio') { const g = M.jogoDe(estado, e.id); if (g) { const r = M.simularJogo(estado, g.casa, g.fora, M.arbitroPara(estado, g.casa.id)); r.publico = M.assistencia(estado, g.casa, g.fora); estado.opcoes.velocidade = 0; dlgRelogio(r, estado.jornada); } }
    else if (ecra === 'selecao') mostrarPagina(3);
  }

  window.Jogo = { iniciar, demo, atualizarTudo, get estado() { return estado; }, dadosBase, CHAVE_DADOS, gravar, jogar, mostrarPagina,
    dialogos: { dlgClassificacao, dlgMarcadores, dlgCalendario, dlgPlantel, dlgProcurar, dlgBalanco, dlgEmprestimo, dlgEstadio, dlgHistorialEquipa, dlgTransferencias, dlgVencedores, dlgHistoriaTreinador, dlgRanking, dlgTreinadores, dlgPerfil, dlgOpcoes, dlgRegisto, dlgAcerca, dlgResultados, fimDeEpoca } };
  window.addEventListener('DOMContentLoaded', iniciar);
})();

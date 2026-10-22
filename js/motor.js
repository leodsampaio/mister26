// Mister 26 — motor do jogo: época, calendário, simulação de jogos, finanças, mercado.
// Sem dependências de interface. Todo o estado vive num único objeto serializável.
(function () {
  const TACTICAS = ['3-3-4', '3-4-3', '4-2-4', '4-3-3', '4-4-2', '4-5-1', '5-2-3', '5-3-2', '5-4-1', '5-5-0', '6-3-1', '6-4-0'];
  const POS = ['GR', 'DEF', 'MED', 'AVA'];
  const POS_LONGA = ['Guarda-redes', 'Defesa', 'Médio', 'Avançado'];
  const COMPORTAMENTOS = ['Exemplar', 'Normal', 'Conflituoso'];
  const SUBIDAS = { POR: 3, BRA: 4 };
  const ARBITROS = ['Artur Soares Dias', 'Fábio Veríssimo', 'João Pinheiro', 'Luís Godinho', 'Tiago Martins', 'Nuno Almeida', 'Hugo Miguel', 'Manuel Mota',
    'Anderson Daronco', 'Raphael Claus', 'Wilton Sampaio', 'Bráulio Machado', 'Ramon Abatti', 'Flávio de Souza', 'Rafael Traci', 'Paulo Zanovelli',
    'Carlos Macedo', 'Rui Costa', 'Cláudio Pereira', 'Gustavo Correia', 'Leandro Bizzio', 'Sávio Sampaio', 'Edina Alves', 'Daiane Muniz']
    .map((nome, i) => ({ nome, casa: 0.35 + ((i * 37) % 31) / 100 }));   // tendência para favorecer a casa (0.35..0.65)

  // ---------- utilidades ----------
  const rnd = () => Math.random();
  const ent = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0); };
  const baralhar = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const poisson = l => { let k = 0, p = 1; const L = Math.exp(-l); do { k++; p *= rnd(); } while (p > L); return k - 1; };
  const arred = (n, m = 10) => Math.round(n / m) * m;

  function valorNivel(n) { return arred(15000 * Math.pow(1.32, n), 1000); }
  function valorJogador(j) {
    let v = valorNivel(j.nivel);
    if (j.idade <= 22) v *= 1.25; else if (j.idade >= 32) v *= 0.6; else if (j.idade >= 29) v *= 0.85;
    if (j.pos === 3) v *= 1.1;
    return arred(v, 1000);
  }
  function salarioBase(j) { return arred(valorNivel(j.nivel) / 80 * (j.idade >= 30 ? 1.1 : 1), 10); }

  function dinheiro(n, moeda) {
    const s = Math.round(n).toLocaleString('pt-PT').replace(/ /g, '.');
    const m = moeda || '€';
    return m === 'R$' ? `R$ ${s}` : m === '$' ? `$ ${s}` : `${s} €`;
  }

  // ---------- criação ----------
  function criarJogador(bruto, equipa, idx) {
    const h = hash(bruto.nome + '|' + equipa.id);
    const idade = 18 + (h % 18);
    let nivel = Math.round(equipa.nivel + ((h >> 8) % 1000 / 1000 - 0.5) * 5 + ((h >> 20) % 100 / 100 - 0.5) * 2);
    if (bruto.pos === 0) nivel += 1;
    nivel = clamp(nivel, 1, 20);
    const comp = (h >> 4) % 100;
    const j = {
      id: equipa.id + '-' + idx, nome: bruto.nome, nac: bruto.nac || '???', pos: bruto.pos, num: bruto.num,
      nivel, idade, comportamento: comp < 20 ? 0 : comp < 85 ? 1 : 2,
      contrato: 1 + (h % 3), titular: false,
      golos: 0, golosEpoca: 0, jogos: 0, amarelos: 0, amarelosEpoca: 0, vermelhos: 0, lesoes: 0, lesao: 0, suspenso: 0,
      salario: 0, salarioDesejado: null,
    };
    j.salario = salarioBase(j);
    return j;
  }

  function criarEquipa(bruta, divisao) {
    const e = {
      id: bruta.id, nome: bruta.nome, nomeCurto: bruta.nomeCurto, pais: bruta.pais, divisao: divisao.id,
      nivel: bruta.nivel, cor1: bruta.cor1, cor2: bruta.cor2, estadio: bruta.estadio || 'Estádio Municipal',
      capacidade: clamp(bruta.capacidade || 10000, 2000, 120000), treinador: bruta.treinador || null, humano: null,
      dinheiro: 0, emprestimo: 0, moral: 50, tactica: '4-4-2', precoBilhete: 0,
      pontos: 0, j: 0, v: 0, e: 0, d: 0, gm: 0, gs: 0, ultimoResultado: null, ultimosJogos: [],
      jogadores: [], historico: [], balanco: [], receitas: 0, despesas: 0,
    };
    const brutos = [...(bruta.jogadores || [])];
    const gr = brutos.filter(j => j.pos === 0), outros = brutos.filter(j => j.pos !== 0);
    const escolhidos = [...gr.slice(0, 3), ...outros].slice(0, 24);
    if (escolhidos.filter(j => j.pos === 0).length < 2) escolhidos.push({ nome: 'Guarda-redes Reserva', nac: e.pais, pos: 0, num: 99 });
    e.jogadores = escolhidos.map((b, i) => criarJogador(b, e, i));
    while (e.jogadores.length < 14) e.jogadores.push(criarJogador({ nome: 'Jogador Júnior ' + (e.jogadores.length + 1), nac: e.pais, pos: 1 + (e.jogadores.length % 3), num: 30 + e.jogadores.length }, e, e.jogadores.length));
    e.dinheiro = arred(e.nivel * e.nivel * 25000, 1000);
    e.precoBilhete = 5 + e.nivel;
    selecaoAutomatica(e, e.tactica);
    return e;
  }

  /** Calendário com duas voltas (método do círculo). Devolve lista de jornadas; cada jornada = [[casa, fora], ...]. */
  function calendario(ids) {
    const eq = [...ids]; if (eq.length % 2) eq.push(null);
    const n = eq.length, voltas = [];
    for (let r = 0; r < n - 1; r++) {
      const jornada = [];
      for (let i = 0; i < n / 2; i++) {
        const a = eq[i], b = eq[n - 1 - i];
        if (a && b) jornada.push(r % 2 ? [a, b] : [b, a]);
      }
      voltas.push(jornada);
      eq.splice(1, 0, eq.pop());
    }
    const segunda = voltas.map(j => j.map(([a, b]) => [b, a]));
    return [...baralhar(voltas), ...baralhar(segunda)];
  }

  function novoJogo({ dados, paises, treinadores, opcoes }) {
    const estado = {
      versao: 1, criado: new Date().toISOString(), epoca: new Date().getFullYear(), jornada: 1, paises,
      divisoes: [], equipas: {}, treinadores: [], opcoes: Object.assign({ moeda: '€', velocidade: 2, gravar: 'sempre', chicotadas: 'humanos', subsIntervalo: true, som: false }, opcoes || {}),
      transferencias: [], campeoes: [], mensagens: [], fonteDados: dados.gerado,
    };
    for (const d of dados.divisoes) {
      if (!paises.includes(d.pais)) continue;
      const div = { id: d.id, nome: d.nome, pais: d.pais, escalao: d.escalao, equipas: [...d.equipas], calendario: [], resultados: [] };
      for (const id of d.equipas) estado.equipas[id] = criarEquipa(dados.equipas[id], div);
      div.calendario = calendario(div.equipas);
      estado.divisoes.push(div);
    }
    // treinadores humanos: equipas sorteadas
    const candidatas = baralhar(Object.values(estado.equipas).map(e => e.id));
    treinadores.forEach((t, i) => {
      const eid = t.equipa && estado.equipas[t.equipa] ? t.equipa : candidatas.find(id => !estado.equipas[id].humano);
      estado.equipas[eid].humano = i;
      estado.equipas[eid].treinador = t.nome;
      estado.treinadores.push({ nome: t.nome, equipa: eid, pronto: false, j: 0, v: 0, e: 0, d: 0, titulos: 0, historico: [], opcoes: { salariosAuto: true, leilao: 0 } });
    });
    return estado;
  }

  // ---------- seleção ----------
  function formacao(t) { const p = t.split('-').map(Number); return { gr: 1, def: p[0], med: p[1], ava: p[2] }; }
  function disponivel(j) { return j.lesao === 0 && j.suspenso === 0; }

  function selecaoAutomatica(e, tactica, apenasMelhores) {
    e.tactica = tactica || e.tactica;
    const f = formacao(e.tactica);
    for (const j of e.jogadores) j.titular = false;
    const pool = e.jogadores.filter(disponivel).sort((a, b) => b.nivel - a.nivel);
    const escolher = (pos, n) => { let c = 0; for (const j of pool) { if (c >= n) break; if (j.pos === pos && !j.titular) { j.titular = true; c++; } } return n - c; };
    let falta = escolher(0, f.gr) + escolher(1, f.def) + escolher(2, f.med) + escolher(3, f.ava);
    for (const j of pool) { if (!falta) break; if (!j.titular && j.pos !== 0) { j.titular = true; falta--; } }
    if (apenasMelhores) return;
  }

  function validarSelecao(e) {
    const t = e.jogadores.filter(j => j.titular);
    if (t.length !== 11) return `A equipa tem ${t.length} titulares; são precisos 11.`;
    if (t.filter(j => j.pos === 0).length !== 1) return 'A equipa tem de ter exatamente um guarda-redes.';
    const ind = t.find(j => !disponivel(j));
    if (ind) return `${ind.nome} não pode jogar (${ind.lesao ? 'lesionado' : 'suspenso'}).`;
    return null;
  }

  function forcaEquipa(e) {
    const t = e.jogadores.filter(j => j.titular && disponivel(j));
    const media = arr => arr.length ? arr.reduce((s, j) => s + j.nivel, 0) / arr.length : 3;
    const gr = media(t.filter(j => j.pos === 0)), def = media(t.filter(j => j.pos === 1)), med = media(t.filter(j => j.pos === 2)), ava = media(t.filter(j => j.pos === 3));
    const nDef = t.filter(j => j.pos === 1).length, nAva = t.filter(j => j.pos === 3).length;
    const moral = 0.92 + e.moral / 625;       // 0.92 .. 1.08
    const esc = n => 8 + 0.6 * n;             // comprime a escala 1..20 para que os jogos não sejam desequilibrados
    const ataque = esc(ava * 0.55 + med * 0.45) * moral * (1 + (nAva - 3) * 0.04);
    const defesa = esc(def * 0.45 + gr * 0.3 + med * 0.25) * moral * (1 + (nDef - 4) * 0.04);
    return { ataque: Math.max(1, ataque), defesa: Math.max(1, defesa), penalizacao: 11 - t.length };
  }

  // ---------- simulação ----------
  function escolherMarcador(e) {
    const t = e.jogadores.filter(j => j.titular && disponivel(j) && !j.expulso);
    const pesos = t.map(j => [0.02, 0.5, 2, 5][j.pos] * j.nivel);
    let r = rnd() * pesos.reduce((a, b) => a + b, 0);
    for (let i = 0; i < t.length; i++) { r -= pesos[i]; if (r <= 0) return t[i]; }
    return t[t.length - 1];
  }
  function escolherJogador(e) { const t = e.jogadores.filter(j => j.titular && disponivel(j) && !j.expulso); return t[ent(0, t.length - 1)]; }

  function simularJogo(estado, casa, fora, arbitro) {
    for (const e of [casa, fora]) { if (validarSelecao(e)) selecaoAutomatica(e, e.tactica); for (const j of e.jogadores) j.expulso = false; }
    const fc = forcaEquipa(casa), ff = forcaEquipa(fora);
    const tend = (arbitro.casa - 0.5) * 0.3;
    const xgC = 1.45 * Math.pow((fc.ataque + 0.8 + tend * 3) / ff.defesa, 1.8) - fc.penalizacao * 0.2;
    const xgF = 1.15 * Math.pow(ff.ataque / (fc.defesa + 0.3 + tend * 2), 1.8) - ff.penalizacao * 0.2;
    let gc = poisson(clamp(xgC, 0.15, 5)), gf = poisson(clamp(xgF, 0.1, 4.5));
    const eventos = [];
    const minutos = n => baralhar(Array.from({ length: 90 }, (_, i) => i + 1)).slice(0, n).sort((a, b) => a - b);
    for (const m of minutos(gc)) { const j = escolherMarcador(casa); j.golos++; j.golosEpoca++; eventos.push({ min: m, tipo: 'golo', equipa: casa.id, jogador: j.nome, texto: `GOLO! ${j.nome} (${casa.nomeCurto})` }); }
    for (const m of minutos(gf)) { const j = escolherMarcador(fora); j.golos++; j.golosEpoca++; eventos.push({ min: m, tipo: 'golo', equipa: fora.id, jogador: j.nome, texto: `GOLO! ${j.nome} (${fora.nomeCurto})` }); }
    // cartões e lesões
    for (const e of [casa, fora]) {
      const fator = e === casa ? 1 - tend : 1 + tend;
      const nAmarelos = poisson(1.6 * fator), nVermelhos = rnd() < 0.09 * fator ? 1 : 0, nLesoes = rnd() < 0.12 ? 1 : 0;
      for (let i = 0; i < nAmarelos; i++) {
        let j = escolherJogador(e); if (!j) break;
        if (j.comportamento === 0 && rnd() < 0.5) j = escolherJogador(e);
        j.amarelos++; j.amarelosEpoca++;
        eventos.push({ min: ent(5, 90), tipo: 'amarelo', equipa: e.id, jogador: j.nome, texto: `Cartão amarelo para ${j.nome} (${e.nomeCurto})` });
        if (j.amarelosEpoca % 5 === 0) { j.suspenso = 1; eventos.push({ min: 91, tipo: 'info', equipa: e.id, texto: `${j.nome} acumula 5 amarelos e falha o próximo jogo` }); }
      }
      for (let i = 0; i < nVermelhos; i++) {
        let j = escolherJogador(e); if (!j) break;
        if (j.comportamento !== 2 && rnd() < 0.5) j = escolherJogador(e);
        j.vermelhos++; j.suspenso = ent(1, 3); j.expulso = true;
        eventos.push({ min: ent(15, 90), tipo: 'vermelho', equipa: e.id, jogador: j.nome, texto: `CARTÃO VERMELHO! ${j.nome} (${e.nomeCurto}) expulso` });
      }
      for (let i = 0; i < nLesoes; i++) {
        const j = escolherJogador(e); if (!j) break;
        j.lesoes++; j.lesao = ent(1, 6);
        eventos.push({ min: ent(1, 90), tipo: 'lesao', equipa: e.id, jogador: j.nome, texto: `${j.nome} (${e.nomeCurto}) sai lesionado` });
      }
    }
    eventos.sort((a, b) => a.min - b.min);
    for (const e of [casa, fora]) for (const j of e.jogadores) { if (j.titular && disponivel(j)) j.jogos++; j.expulso = false; }
    return { casa: casa.id, fora: fora.id, gc, gf, eventos, arbitro: arbitro.nome };
  }

  function aplicarResultado(estado, div, r) {
    const c = estado.equipas[r.casa], f = estado.equipas[r.fora];
    const atualizar = (e, gm, gs) => {
      e.j++; e.gm += gm; e.gs += gs;
      const res = gm > gs ? 'V' : gm < gs ? 'D' : 'E';
      if (res === 'V') { e.v++; e.pontos += 3; } else if (res === 'E') { e.e++; e.pontos += 1; } else e.d++;
      e.ultimoResultado = `${c.nomeCurto} ${r.gc}-${r.gf} ${f.nomeCurto}`;
      e.ultimosJogos.push(res); if (e.ultimosJogos.length > 5) e.ultimosJogos.shift();
      const esperado = e === c ? 1 : -1;
      e.moral = clamp(e.moral + (50 - e.moral) * 0.06 + (res === 'V' ? 7 - esperado * 2 : res === 'E' ? 1 : -7 - esperado * 2), 5, 100);
      const t = estado.treinadores[e.humano];
      if (t) { t.j++; if (res === 'V') t.v++; else if (res === 'E') t.e++; else t.d++; }
    };
    atualizar(c, r.gc, r.gf); atualizar(f, r.gf, r.gc);
    div.resultados.push(r);
  }

  // ---------- finanças ----------
  function assistencia(estado, casa, fora) {
    const ref = 5 + casa.nivel;
    const efeitoPreco = clamp((casa.precoBilhete / ref - 1) * 0.6, -0.4, 0.9);
    const base = 0.3 + 0.35 * casa.moral / 100 + 0.2 * fora.nivel / 20 + 0.15 * casa.nivel / 20 - efeitoPreco;
    return Math.round(casa.capacidade * clamp(base + gauss() * 0.05, 0.05, 1));
  }

  function financasJornada(estado, div, r) {
    const c = estado.equipas[r.casa], f = estado.equipas[r.fora];
    const publico = assistencia(estado, c, f);
    const receita = publico * c.precoBilhete;
    r.publico = publico; r.receita = receita;
    c.dinheiro += receita; c.receitas += receita;
    c.balanco.push({ jornada: estado.jornada, texto: `Bilheteira (${publico.toLocaleString('pt-PT')} espectadores)`, valor: receita });
    for (const e of [c, f]) {
      const sal = e.jogadores.reduce((s, j) => s + j.salario, 0);
      e.dinheiro -= sal; e.despesas += sal;
      e.balanco.push({ jornada: estado.jornada, texto: 'Salários', valor: -sal });
      if (e.emprestimo > 0) {
        const juros = arred(e.emprestimo * 0.02, 10);
        e.dinheiro -= juros; e.despesas += juros;
        e.balanco.push({ jornada: estado.jornada, texto: 'Juros do empréstimo', valor: -juros });
      }
      if (e.balanco.length > 40) e.balanco.splice(0, e.balanco.length - 40);
      if (e.humano === null && e.dinheiro < 0) venderParaSobreviver(estado, e);
    }
  }

  function venderParaSobreviver(estado, e) {
    const vendavel = e.jogadores.filter(j => !j.titular).sort((a, b) => valorJogador(b) - valorJogador(a))[0];
    if (!vendavel || e.jogadores.length <= 15) return;
    const comprador = baralhar(Object.values(estado.equipas).filter(x => x !== e && x.humano === null && x.dinheiro > valorJogador(vendavel) * 2))[0];
    if (!comprador) return;
    transferir(estado, vendavel, e, comprador, valorJogador(vendavel));
  }

  function transferir(estado, j, de, para, preco) {
    de.jogadores.splice(de.jogadores.indexOf(j), 1);
    j.titular = false; j.id = para.id + '-' + Date.now() + ent(0, 999);
    para.jogadores.push(j);
    de.dinheiro += preco; para.dinheiro -= preco;
    de.balanco.push({ jornada: estado.jornada, texto: `Venda de ${j.nome}`, valor: preco });
    para.balanco.push({ jornada: estado.jornada, texto: `Compra de ${j.nome}`, valor: -preco });
    estado.transferencias.unshift({ epoca: estado.epoca, jornada: estado.jornada, jogador: j.nome, de: de.nomeCurto, para: para.nomeCurto, preco });
    if (estado.transferencias.length > 60) estado.transferencias.pop();
    if (validarSelecao(de)) selecaoAutomatica(de, de.tactica);
  }

  /** Tenta vender um jogador de uma equipa humana por um preço pedido. */
  function tentarVender(estado, e, j, preco) {
    const valor = valorJogador(j);
    const razao = preco / valor;
    const prob = razao <= 0.8 ? 0.95 : razao <= 1 ? 0.8 : razao <= 1.2 ? 0.5 : razao <= 1.5 ? 0.2 : 0.03;
    if (rnd() > prob) return { ok: false, motivo: 'Nenhuma equipa aceitou a proposta por esse preço.' };
    const compradores = Object.values(estado.equipas).filter(x => x !== e && x.humano === null && x.jogadores.length < 24 && x.dinheiro > preco && Math.abs(x.nivel - j.nivel) <= 6);
    if (!compradores.length) return { ok: false, motivo: 'Nenhuma equipa tem dinheiro para este jogador neste momento.' };
    const comprador = baralhar(compradores)[0];
    transferir(estado, j, e, comprador, preco);
    return { ok: true, comprador };
  }

  function precoPedido(estado, j, dona) {
    let p = valorJogador(j) * 1.3;
    if (j.titular) p *= 1.25;
    if (dona.humano !== null) p *= 1.1;
    if (dona.jogadores.length <= 15) p *= 1.5;
    return arred(p, 1000);
  }

  function comprar(estado, comprador, j, dona) {
    const preco = precoPedido(estado, j, dona);
    if (comprador.jogadores.length >= 24) return { ok: false, motivo: 'O plantel já tem 24 jogadores.' };
    if (comprador.dinheiro < preco) return { ok: false, motivo: `Não tem dinheiro suficiente. Preço pedido: ${dinheiro(preco, estado.opcoes.moeda)}.` };
    if (dona.jogadores.length <= 14) return { ok: false, motivo: `${dona.nomeCurto} recusa: ficaria com menos de 14 jogadores.` };
    if (dona.humano !== null) return { ok: false, motivo: 'Negoceie diretamente com o outro treinador: só equipas do computador vendem à vista.' };
    transferir(estado, j, dona, comprador, preco);
    j.salario = arred(Math.max(j.salario, salarioBase(j)) * 1.15, 10);
    j.contrato = 2;
    return { ok: true, preco };
  }

  function procurar(estado, { pos = null, nivelMin = 1, precoMax = Infinity, excluir = null } = {}) {
    const lista = [];
    for (const e of Object.values(estado.equipas)) {
      if (e.id === excluir) continue;
      for (const j of e.jogadores) {
        if (pos !== null && j.pos !== pos) continue;
        if (j.nivel < nivelMin) continue;
        const preco = precoPedido(estado, j, e);
        if (preco > precoMax) continue;
        lista.push({ j, e, preco });
      }
    }
    return lista.sort((a, b) => b.j.nivel - a.j.nivel || a.preco - b.preco);
  }

  function limiteEmprestimo(e) { return arred(e.nivel * e.nivel * 40000, 1000); }
  function pedirEmprestimo(estado, e, valor) {
    if (valor <= 0) return 'Indique um valor positivo.';
    if (e.emprestimo + valor > limiteEmprestimo(e)) return `O banco só empresta até ${dinheiro(limiteEmprestimo(e), estado.opcoes.moeda)} a esta equipa.`;
    e.emprestimo += valor; e.dinheiro += valor;
    e.balanco.push({ jornada: estado.jornada, texto: 'Empréstimo bancário', valor });
    return null;
  }
  function pagarEmprestimo(estado, e, valor) {
    valor = Math.min(valor, e.emprestimo);
    if (valor <= 0) return 'Não há nada a pagar.';
    if (e.dinheiro < valor) return 'Não tem dinheiro em caixa para esse pagamento.';
    e.emprestimo -= valor; e.dinheiro -= valor;
    e.balanco.push({ jornada: estado.jornada, texto: 'Amortização do empréstimo', valor: -valor });
    return null;
  }
  function custoAmpliacao(e, lugares) { return arred(lugares * (250 + e.capacidade / 200), 1000); }
  function ampliarEstadio(estado, e, lugares) {
    const custo = custoAmpliacao(e, lugares);
    if (e.dinheiro < custo) return `A ampliação custa ${dinheiro(custo, estado.opcoes.moeda)}; não tem dinheiro suficiente.`;
    e.dinheiro -= custo; e.capacidade += lugares;
    e.balanco.push({ jornada: estado.jornada, texto: `Ampliação do estádio (+${lugares} lugares)`, valor: -custo });
    return null;
  }

  function salarioDesejado(j) {
    if (j.salarioDesejado) return j.salarioDesejado;
    j.salarioDesejado = arred(Math.max(j.salario, salarioBase(j)) * (1.1 + (hash(j.nome) % 40) / 100), 10);
    return j.salarioDesejado;
  }
  function renovarContrato(j, salario) {
    const d = salarioDesejado(j);
    if (salario >= d) { j.salario = salario; j.contrato = 3; j.salarioDesejado = null; return { ok: true }; }
    if (salario >= d * 0.9 && rnd() < 0.5) { j.salario = salario; j.contrato = 2; j.salarioDesejado = null; return { ok: true }; }
    return { ok: false, motivo: `${j.nome} recusa. Quer pelo menos ${d}.` };
  }

  // ---------- jornada ----------
  function jogosDaJornada(estado) {
    const lista = [];
    for (const div of estado.divisoes) {
      const jornada = div.calendario[estado.jornada - 1];
      if (!jornada) continue;
      for (const [c, f] of jornada) lista.push({ div, casa: estado.equipas[c], fora: estado.equipas[f] });
    }
    return lista;
  }
  function jogoDe(estado, equipaId) { return jogosDaJornada(estado).find(x => x.casa.id === equipaId || x.fora.id === equipaId) || null; }
  function arbitroPara(estado, equipaId) { return ARBITROS[(hash(equipaId + estado.epoca + estado.jornada)) % ARBITROS.length]; }
  function totalJornadas(estado) { return Math.max(...estado.divisoes.map(d => d.calendario.length)); }

  /** Joga todos os jogos da jornada atual. Devolve os resultados (com eventos) e avança a jornada. */
  function jogarJornada(estado) {
    const resultados = [];
    for (const g of jogosDaJornada(estado)) {
      const arbitro = arbitroPara(estado, g.casa.id);
      if (g.casa.humano === null) selecaoAutomatica(g.casa, melhorTactica(g.casa));
      if (g.fora.humano === null) selecaoAutomatica(g.fora, melhorTactica(g.fora));
      const r = simularJogo(estado, g.casa, g.fora, arbitro);
      r.jornada = estado.jornada; r.div = g.div.id;
      aplicarResultado(estado, g.div, r);
      financasJornada(estado, g.div, r);
      resultados.push(r);
    }
    // recuperação de lesões e suspensões
    for (const e of Object.values(estado.equipas)) for (const j of e.jogadores) { if (j.lesao > 0) j.lesao--; if (j.suspenso > 0) j.suspenso--; }
    for (const t of estado.treinadores) t.pronto = false;
    estado.jornada++;
    return resultados;
  }

  function melhorTactica(e) {
    const n = p => e.jogadores.filter(j => j.pos === p && disponivel(j)).length;
    if (n(3) >= 4 && e.nivel >= 14) return '4-2-4';
    if (n(1) >= 5 && e.nivel <= 8) return '5-4-1';
    return ['4-4-2', '4-3-3', '3-4-3', '5-3-2'][hash(e.id) % 4];
  }

  // ---------- classificação ----------
  function classificacao(estado, div) {
    return div.equipas.map(id => estado.equipas[id]).sort((a, b) => b.pontos - a.pontos || (b.gm - b.gs) - (a.gm - a.gs) || b.gm - a.gm || a.nomeCurto.localeCompare(b.nomeCurto));
  }
  function melhoresMarcadores(estado, div, n = 20) {
    const lista = [];
    for (const id of div.equipas) for (const j of estado.equipas[id].jogadores) if (j.golosEpoca > 0) lista.push({ j, e: estado.equipas[id] });
    return lista.sort((a, b) => b.j.golosEpoca - a.j.golosEpoca).slice(0, n);
  }
  function epocaTerminada(estado) { return estado.jornada > totalJornadas(estado); }

  // ---------- fim de época ----------
  function fimDeEpoca(estado) {
    const resumo = { epoca: estado.epoca, campeoes: [], subidas: [], descidas: [], marcadores: [], contratos: [] };
    const porPais = {};
    for (const div of estado.divisoes) (porPais[div.pais] ||= []).push(div);
    const movimentos = [];
    for (const [pais, divs] of Object.entries(porPais)) {
      divs.sort((a, b) => a.escalao - b.escalao);
      const n = SUBIDAS[pais] || 3;
      for (let i = 0; i < divs.length; i++) {
        const tab = classificacao(estado, divs[i]);
        const campeao = tab[0];
        resumo.campeoes.push({ divisao: divs[i].nome, equipa: campeao.nomeCurto, id: campeao.id });
        estado.campeoes.unshift({ epoca: estado.epoca, divisao: divs[i].nome, equipa: campeao.nomeCurto });
        const t = estado.treinadores[campeao.humano]; if (t) t.titulos++;
        const mm = melhoresMarcadores(estado, divs[i], 1)[0];
        if (mm) resumo.marcadores.push({ divisao: divs[i].nome, jogador: mm.j.nome, equipa: mm.e.nomeCurto, golos: mm.j.golosEpoca });
        if (i < divs.length - 1) {
          const descem = tab.slice(-n), sobem = classificacao(estado, divs[i + 1]).slice(0, n);
          for (const e of descem) { movimentos.push([e, divs[i + 1]]); resumo.descidas.push({ equipa: e.nomeCurto, de: divs[i].nome, para: divs[i + 1].nome }); }
          for (const e of sobem) { movimentos.push([e, divs[i]]); resumo.subidas.push({ equipa: e.nomeCurto, de: divs[i + 1].nome, para: divs[i].nome }); }
        }
      }
    }
    for (const t of estado.treinadores) {
      const e = estado.equipas[t.equipa]; const div = estado.divisoes.find(d => d.id === e.divisao);
      const pos = classificacao(estado, div).indexOf(e) + 1;
      t.historico.push({ epoca: estado.epoca, equipa: e.nomeCurto, divisao: div.nome, posicao: pos, pontos: e.pontos });
    }
    for (const [e, destino] of movimentos) {
      const origem = estado.divisoes.find(d => d.id === e.divisao);
      origem.equipas.splice(origem.equipas.indexOf(e.id), 1);
      destino.equipas.push(e.id); e.divisao = destino.id;
    }
    // envelhecimento, evolução, contratos
    for (const e of Object.values(estado.equipas)) {
      for (const j of e.jogadores) {
        j.idade++;
        if (j.idade <= 23 && rnd() < 0.6) j.nivel++; else if (j.idade >= 31 && rnd() < 0.5) j.nivel--; else if (rnd() < 0.15) j.nivel += rnd() < 0.5 ? 1 : -1;
        j.nivel = clamp(j.nivel, 1, 20);
        j.golosEpoca = 0; j.amarelosEpoca = 0; j.lesao = 0; j.suspenso = 0;
        j.contrato--;
        if (j.contrato <= 0) {
          if (e.humano === null || estado.treinadores[e.humano].opcoes.salariosAuto) { j.salario = arred(Math.max(j.salario, salarioBase(j)) * 1.1, 10); j.contrato = 1 + ent(0, 2); }
          else resumo.contratos.push({ equipa: e.nomeCurto, jogador: j.nome, pede: salarioDesejado(j) });
        }
      }
      // reformas e juniores
      const reformados = e.jogadores.filter(j => j.idade >= 36 && !j.titular);
      for (const r of reformados) e.jogadores.splice(e.jogadores.indexOf(r), 1);
      while (e.jogadores.length < 16) {
        const idx = e.jogadores.length + ent(100, 999);
        const jr = criarJogador({ nome: 'Júnior ' + idx, nac: e.pais, pos: ent(0, 3), num: 30 + e.jogadores.length }, e, idx);
        jr.idade = ent(17, 19); jr.nivel = clamp(e.nivel - ent(3, 6), 1, 20); jr.salario = salarioBase(jr);
        e.jogadores.push(jr);
      }
      e.nivel = clamp(Math.round(e.jogadores.filter(j => j.titular).reduce((s, j) => s + j.nivel, 0) / Math.max(1, e.jogadores.filter(j => j.titular).length)), 1, 20);
      e.pontos = e.j = e.v = e.e = e.d = e.gm = e.gs = 0; e.ultimosJogos = []; e.ultimoResultado = null;
      e.moral = clamp(e.moral * 0.5 + 25, 20, 80);
      // mercado do computador: uma transferência por equipa, para dar vida às "últimas transferências"
      if (e.humano === null && rnd() < 0.35) {
        const vende = e.jogadores.filter(j => !j.titular)[0];
        const comprador = baralhar(Object.values(estado.equipas).filter(x => x !== e && x.humano === null && x.jogadores.length < 23 && Math.abs(x.nivel - e.nivel) <= 5))[0];
        if (vende && comprador) transferir(estado, vende, e, comprador, valorJogador(vende));
      }
    }
    for (const div of estado.divisoes) { div.calendario = calendario(div.equipas); div.resultados = []; }
    estado.epoca++; estado.jornada = 1;
    for (const t of estado.treinadores) t.pronto = false;
    return resumo;
  }

  function calendarioDe(estado, equipaId) {
    const div = estado.divisoes.find(d => d.equipas.includes(equipaId));
    return div.calendario.map((jornada, i) => {
      const par = jornada.find(([c, f]) => c === equipaId || f === equipaId);
      if (!par) return { jornada: i + 1, texto: 'Descanso' };
      const casa = par[0] === equipaId;
      const adv = estado.equipas[casa ? par[1] : par[0]];
      const r = div.resultados.find(x => x.jornada === i + 1 && (x.casa === equipaId || x.fora === equipaId));
      return { jornada: i + 1, casa, adv, resultado: r ? (casa ? `${r.gc}-${r.gf}` : `${r.gf}-${r.gc}`) : null, venceu: r ? (casa ? r.gc > r.gf : r.gf > r.gc) : null, empate: r ? r.gc === r.gf : null };
    });
  }

  window.Motor = {
    TACTICAS, POS, POS_LONGA, COMPORTAMENTOS, ARBITROS,
    novoJogo, selecaoAutomatica, validarSelecao, formacao, disponivel, forcaEquipa,
    jogosDaJornada, jogoDe, arbitroPara, jogarJornada, simularJogo, totalJornadas, epocaTerminada, fimDeEpoca,
    classificacao, melhoresMarcadores, calendarioDe,
    valorJogador, salarioBase, salarioDesejado, renovarContrato, tentarVender, comprar, procurar, precoPedido, transferir,
    limiteEmprestimo, pedirEmprestimo, pagarEmprestimo, custoAmpliacao, ampliarEstadio, assistencia,
    dinheiro, clamp, ent, hash, baralhar,
  };
})();

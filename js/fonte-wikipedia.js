// Mister 26 — recolha de planteis a partir da Wikipédia (inglesa).
// Módulo ES partilhado: corre no Node (robô) e no browser (atualização ao vivo).
// Licença dos dados: CC BY-SA 4.0 (Wikipédia). Nomes de clubes e jogadores são factos públicos.

const API = 'https://en.wikipedia.org/w/api.php';
const AGENTE = 'Mister26/0.1 (jogo pessoal de gestao de futebol; sem fins comerciais)';

export const POSICOES = ['GR', 'DEF', 'MED', 'AVA'];      // 0..3, como no original
const MAPA_POS = { GK: 0, DF: 1, MF: 2, FW: 3, DEF: 1, MID: 2, FWD: 3, GR: 0, MED: 2, AVA: 3 };

export function epocaAtual(formato, data = new Date()) {
  const ano = data.getFullYear(), mes = data.getMonth() + 1;
  if (formato === 'europeu') {
    const inicio = mes >= 7 ? ano : ano - 1;
    return { rotulo: `${inicio}–${String(inicio + 1).slice(2)}`, inicio };
  }
  return { rotulo: String(ano), inicio: ano };
}

export function epocaAnterior(formato, epoca) {
  const inicio = epoca.inicio - 1;
  return formato === 'europeu'
    ? { rotulo: `${inicio}–${String(inicio + 1).slice(2)}`, inicio }
    : { rotulo: String(inicio), inicio };
}

async function wikitexto(pagina, fetchFn) {
  const url = new URL(API);
  url.search = new URLSearchParams({
    action: 'parse', page: pagina, prop: 'wikitext', format: 'json',
    formatversion: '2', redirects: '1', origin: '*',
  });
  const opcoes = { headers: { 'Api-User-Agent': AGENTE } };
  if (typeof window === 'undefined') opcoes.headers['User-Agent'] = AGENTE;
  const r = await fetchFn(url, opcoes);
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${pagina}`);
  const j = await r.json();
  if (j.error) return null;
  return j.parse.wikitext;
}

// ---------- utilitários de wikitexto ----------

/** Divide os parâmetros de um template respeitando [[...]] e {{...}} aninhados. */
function dividirParametros(corpo) {
  const partes = []; let atual = '', prof = 0;
  for (let i = 0; i < corpo.length; i++) {
    const dois = corpo.slice(i, i + 2);
    if (dois === '[[' || dois === '{{') { prof++; atual += dois; i++; continue; }
    if (dois === ']]' || dois === '}}') { prof--; atual += dois; i++; continue; }
    if (corpo[i] === '|' && prof === 0) { partes.push(atual); atual = ''; continue; }
    atual += corpo[i];
  }
  partes.push(atual);
  return partes;
}

export function limparTexto(s) {
  if (!s) return '';
  return s
    .replace(/<ref[^>]*\/>/g, ' ')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, ' ')
    .replace(/\{\{\s*(?:nowrap|nobreak|small|lang\|[a-z-]+)\s*\|([^{}]*)\}\}/gi, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function primeiraLigacao(texto) {
  const m = /\[\[([^\]|#]+)(?:\|([^\]]*))?\]\]/.exec(texto);
  if (!m) return null;
  return { artigo: m[1].trim(), rotulo: limparTexto(m[2] || m[1].replace(/\s*\(.*\)$/, '')) };
}

function campoInfobox(w, ...nomes) {
  for (const n of nomes) {
    const m = new RegExp(`^\\|\\s*${n}\\s*=\\s*(.*)$`, 'm').exec(w);
    if (m && m[1].trim()) return m[1].trim();
  }
  return '';
}

function corHex(v) {
  const m = /([0-9A-Fa-f]{6})/.exec(limparTexto(v) || '');
  return m ? '#' + m[1].toUpperCase() : null;
}

function numero(v) {
  const m = /([\d][\d.,]*)/.exec(limparTexto(v) || '');
  if (!m) return null;
  const n = parseInt(m[1].replace(/[.,]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

export function idDe(artigo) {
  return artigo.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

// ---------- artigo de época: lista de clubes ----------

export function extrairClubesDaEpoca(w) {
  const sec = /==\s*Teams\s*==([\s\S]*?)(?=\n==[^=])/.exec(w);
  const corpo = sec ? sec[1] : w;
  const tabelas = corpo.match(/\{\|[\s\S]*?\n\|\}/g) || [];
  for (const t of tabelas) {
    const linhas = t.split(/\n\|-/);
    const iCab = linhas.findIndex(l => /!\s*team/i.test(l));
    if (iCab < 0 || iCab > 1) continue;
    const cab = linhas[iCab].toLowerCase();
    if (!/(stadium|capacity|location)/.test(cab)) continue;
    const clubes = [];
    for (const linha of linhas.slice(iCab + 1)) {
      const celulas = linha.split(/\n\|\s*|\|\|/).map(c => c.trim()).filter(Boolean);
      if (!celulas.length || celulas[0].startsWith('!')) continue;
      const lig = primeiraLigacao(celulas[0]);
      if (!lig) continue;
      let estadio = null, capacidade = null, anterior = '';
      for (const c of celulas.slice(1)) {
        const limpo = limparTexto(c.replace(/^[^|]*\|\s*(?=\S)/, m => (/=/.test(m) ? '' : m)));
        if (capacidade === null && /^[\d][\d.,]*$/.test(limpo)) { capacidade = numero(limpo); continue; }
        if (!estadio && /est[aá]dio|stadium|arena|campo|parque/i.test(limpo) && limpo.length < 70) { estadio = limpo; continue; }
        anterior = limpo;
      }
      const posAnt = /(\d+)(?:st|nd|rd|th)/.exec(anterior);
      clubes.push({
        artigo: lig.artigo, nome: lig.rotulo, estadio, capacidade,
        posicaoAnterior: posAnt ? parseInt(posAnt[1], 10) : null,
        anteriorTexto: anterior,
        subiu: /↑/.test(celulas[0]), desceu: /↓/.test(celulas[0]),
      });
    }
    if (clubes.length >= 8) return clubes;
  }
  return [];
}

/** Ordem final da classificação num artigo de época (módulo Sports table). Devolve artigos dos clubes, do 1.º ao último. */
export function extrairClassificacao(w) {
  const m = /\{\{#invoke:Sports table\|main([\s\S]*?)\n\}\}/i.exec(w);
  if (!m) return [];
  const t = m[1];
  const nomes = {};
  for (const [, cod, val] of t.matchAll(/\|\s*name_([A-Za-z0-9_]+)\s*=\s*([^\n]*)/g)) {
    const lig = primeiraLigacao(val);
    nomes[cod] = lig ? lig.artigo : limparTexto(val);
  }
  let ordem = [];
  const to = /\|\s*team_order\s*=\s*([^\n|]+)/.exec(t);
  if (to) ordem = to[1].split(',').map(s => s.trim()).filter(Boolean);
  else {
    const pares = [...t.matchAll(/\|\s*team(\d+)\s*=\s*([A-Za-z0-9_]+)/g)].map(x => [+x[1], x[2]]);
    ordem = pares.sort((a, b) => a[0] - b[0]).map(x => x[1]);
  }
  return ordem.map(c => nomes[c]).filter(Boolean);
}

// ---------- nível 1..20 por divisão ----------

function mesmaEquipa(a, b) {
  if (!a || !b) return false;
  if (idDe(a) === idDe(b)) return true;
  const na = idDe(a).replace(/-/g, ''), nb = idDe(b).replace(/-/g, '');
  const curto = Math.min(na.length, nb.length);
  return curto >= 7 && (na.includes(nb) || nb.includes(na));
}

/**
 * clubes: lista da época atual; anterior: classificação final da mesma divisão na época passada;
 * superior: classificação final da divisão acima (para detetar despromovidos).
 */
export function atribuirNiveis(clubes, divisao, anterior = [], superior = []) {
  const [topo, fundo] = divisao.escalao === 1 ? [20, 11] : [11, 4];
  const rank = c => {
    const i = anterior.findIndex(a => mesmaEquipa(a, c.artigo) || mesmaEquipa(a, c.nome));
    return i >= 0 ? i + 1 : (c.posicaoAnterior && !c.subiu && !c.desceu && !/liga 3|s[ée]rie c|\bpl\b|primeira|s[ée]rie a|lp ?2|liga portugal 2|s[ée]rie b/i.test(c.anteriorTexto) ? c.posicaoAnterior : null);
  };
  for (const c of clubes) {
    c.posicaoAnterior = rank(c);
    c.despromovido = c.desceu || (!c.posicaoAnterior && superior.some(a => mesmaEquipa(a, c.artigo) || mesmaEquipa(a, c.nome)));
    c.promovido = !c.posicaoAnterior && !c.despromovido;
  }
  const comPos = clubes.filter(c => c.posicaoAnterior).sort((a, b) => a.posicaoAnterior - b.posicaoAnterior);
  const n = Math.max(comPos.length, 2);
  comPos.forEach((c, i) => { c.nivel = Math.round(topo - (i * (topo - fundo)) / (n - 1)); });
  for (const c of clubes) {
    if (c.nivel) continue;
    c.nivel = c.despromovido ? topo - 1 : fundo;
  }
  return clubes;
}

// ---------- artigo do clube: infobox + plantel ----------

export function extrairClube(w) {
  const nomeCompleto = limparTexto(campoInfobox(w, 'fullname')) || limparTexto(campoInfobox(w, 'clubname'));
  const nomeCurto = limparTexto(campoInfobox(w, 'clubname')) || nomeCompleto;
  const treinador = limparTexto(campoInfobox(w, 'manager', 'head_coach', 'mgr', 'coach')) || null;
  const capacidade = numero(campoInfobox(w, 'capacity'));
  const estadio = limparTexto(campoInfobox(w, 'ground', 'stadium')) || null;
  const cor1 = corHex(campoInfobox(w, 'body1')) || corHex(campoInfobox(w, 'leftarm1')) || '#FFFFFF';
  const cor2 = corHex(campoInfobox(w, 'shorts1')) || corHex(campoInfobox(w, 'socks1')) || '#000000';

  // Primeiro bloco {{Fs start}} ... {{Fs end}} = plantel principal
  const bloco = /\{\{\s*fs start[\s\S]*?\{\{\s*fs end\s*\}\}/i.exec(w);
  const fonte = bloco ? bloco[0] : w;
  const jogadores = [];
  const re = /\{\{\s*(?:fs player|football squad player)\b([\s\S]*?)\}\}(?=\s*(?:\{\{|\n|$))/gi;
  let m;
  while ((m = re.exec(fonte))) {
    const params = {};
    for (const p of dividirParametros(m[1]).slice(1)) {
      const i = p.indexOf('='); if (i < 0) continue;
      params[p.slice(0, i).trim().toLowerCase()] = p.slice(i + 1).trim();
    }
    const bruto = params.name || '';
    const lig = primeiraLigacao(bruto);
    const nome = lig ? lig.rotulo : limparTexto(bruto);
    if (!nome) continue;
    const pos = MAPA_POS[(params.pos || '').toUpperCase().replace(/[^A-Z]/g, '')];
    if (pos === undefined) continue;
    const num = parseInt(params.no, 10);
    jogadores.push({
      nome, nac: (params.nat || '???').toUpperCase().slice(0, 3), pos,
      num: Number.isFinite(num) ? num : null, ligado: !!lig,
    });
  }
  return { nomeCompleto, nomeCurto, treinador, capacidade, estadio, cor1, cor2, jogadores };
}

// ---------- orquestração ----------

export async function recolherTudo(ligas, { fetchFn = globalThis.fetch, pausaMs = 250, log = () => {}, ajustes = {} } = {}) {
  const dormir = ms => new Promise(r => setTimeout(r, ms));
  const saida = { gerado: new Date().toISOString(), fonte: 'en.wikipedia.org (CC BY-SA 4.0)', divisoes: [], equipas: {} };
  const classificacoes = {};   // `${pais}${escalao}` -> classificação final da época anterior
  const ordenadas = [...ligas].sort((a, b) => a.escalao - b.escalao);

  for (const liga of ordenadas) {
    let epoca = epocaAtual(liga.formato);
    let w = await wikitexto(liga.artigo.replace('{epoca}', epoca.rotulo), fetchFn);
    let clubes = w ? extrairClubesDaEpoca(w) : [];
    if (clubes.length < 8) {
      epoca = epocaAnterior(liga.formato, epoca);
      w = await wikitexto(liga.artigo.replace('{epoca}', epoca.rotulo), fetchFn);
      clubes = w ? extrairClubesDaEpoca(w) : [];
    }
    const ant = epocaAnterior(liga.formato, epoca);
    let anterior = [];
    try {
      const wa = await wikitexto(liga.artigo.replace('{epoca}', ant.rotulo), fetchFn);
      anterior = wa ? extrairClassificacao(wa) : [];
    } catch (e) { log(`  ! classificação ${ant.rotulo}: ${e.message}`); }
    classificacoes[`${liga.pais}${liga.escalao}`] = anterior;
    log(`${liga.nome} ${epoca.rotulo}: ${clubes.length} clubes (classificação anterior: ${anterior.length})`);
    atribuirNiveis(clubes, liga, anterior, classificacoes[`${liga.pais}${liga.escalao - 1}`] || []);
    const div = { id: liga.id, nome: liga.nome, pais: liga.pais, escalao: liga.escalao, epoca: epoca.rotulo, equipas: [] };

    for (const c of clubes) {
      await dormir(pausaMs);
      let info = null;
      try {
        const wc = await wikitexto(c.artigo, fetchFn);
        if (wc) info = extrairClube(wc);
      } catch (e) { log(`  ! ${c.nome}: ${e.message}`); }
      const id = idDe(c.artigo);
      const aj = ajustes[id] || {};
      const equipa = {
        id, artigo: c.artigo,
        nome: (aj.nome || info?.nomeCompleto || c.nome).toUpperCase(),
        nomeCurto: aj.nomeCurto || c.nome,
        pais: liga.pais, divisao: liga.id,
        nivel: Math.max(1, Math.min(20, aj.nivel ?? c.nivel)),
        cor1: aj.cor1 || info?.cor1 || '#FFFFFF', cor2: aj.cor2 || info?.cor2 || '#000000',
        estadio: info?.estadio || c.estadio || null,
        capacidade: Math.min(120000, Math.max(1000, info?.capacidade || c.capacidade || 15000)),
        treinador: info?.treinador || null,
        posicaoAnterior: c.posicaoAnterior, promovido: c.promovido, despromovido: c.despromovido,
        jogadores: (info?.jogadores || []).map(({ ligado, ...j }) => j),
      };
      if (equipa.jogadores.length < 14) log(`  ! ${c.nome}: só ${equipa.jogadores.length} jogadores`);
      saida.equipas[id] = equipa;
      div.equipas.push(id);
      log(`  ${c.nome}: ${equipa.jogadores.length} jog., nível ${equipa.nivel}${c.promovido ? ' ↑' : ''}${c.despromovido ? ' ↓' : ''}${c.posicaoAnterior ? ` (${c.posicaoAnterior}.º)` : ''}`);
    }
    saida.divisoes.push(div);
  }
  saida.divisoes.sort((a, b) => ligas.findIndex(l => l.id === a.id) - ligas.findIndex(l => l.id === b.id));
  return saida;
}

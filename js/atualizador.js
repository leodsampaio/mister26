// Mister 26 — atualização automática dos planteis a partir do browser.
// Usa o mesmo módulo do robô (js/fonte-wikipedia.js). Só funciona quando a página é servida por http(s);
// em file:// o browser bloqueia a importação do módulo e fica-se com os dados do ficheiro dados/equipas.js.
(function () {
  const CHAVE_ULTIMA = 'mister26.ultimaAtualizacao';
  const SETE_DIAS = 7 * 24 * 3600 * 1000;

  async function ligas() {
    const r = await fetch('dados/ligas.json');
    if (!r.ok) throw new Error('dados/ligas.json não encontrado');
    return r.json();
  }

  async function correr(log) {
    const mod = await import('./fonte-wikipedia.js');
    const ajustes = await fetch('dados/ajustes.json').then(r => r.ok ? r.json() : {}).catch(() => ({}));
    delete ajustes._comentario;
    const dados = await mod.recolherTudo(await ligas(), { ajustes, log, pausaMs: 150 });
    const n = Object.keys(dados.equipas).length;
    if (n < 8) throw new Error('Recolha incompleta (' + n + ' equipas); dados anteriores mantidos.');
    localStorage.setItem(Jogo.CHAVE_DADOS, JSON.stringify(dados));
    localStorage.setItem(CHAVE_ULTIMA, String(Date.now()));
    return dados;
  }

  function podeCorrer() { return location.protocol.startsWith('http') && navigator.onLine; }

  async function automatico() {
    if (!podeCorrer()) return;
    const ultima = +localStorage.getItem(CHAVE_ULTIMA) || 0;
    const base = Date.parse(Jogo.dadosBase()?.gerado || 0) || 0;
    if (Date.now() - Math.max(ultima, base) < SETE_DIAS) return;
    try { await correr(() => {}); console.info('Mister 26: planteis atualizados em segundo plano.'); }
    catch (e) { console.warn('Mister 26: atualização automática falhou:', e.message); }
  }

  async function manual() {
    const { el, pos, botao, janela, mensagem } = UI;
    if (!podeCorrer()) {
      return mensagem('A atualização ao vivo só funciona com a página servida por http (por exemplo, publicada no GitHub Pages ou aberta com um servidor local).\n\nEm alternativa, corra no terminal:\n  node robo/atualizar.mjs\n\ne volte a abrir o jogo.', { titulo: 'Atualizar planteis', tipo: 'aviso' });
    }
    const j = janela({ titulo: 'Atualizar planteis da Wikipédia', largura: 460, altura: 300, modal: true, fechar: false });
    const memo = pos(el('div', { class: 'memo', style: { fontSize: '11px' } }), 8, 8, 444, 250);
    const log = t => { memo.textContent += t + '\n'; memo.scrollTop = 1e6; };
    const btn = botao('Aguarde...', 190, 268, 80, 24, () => {});
    btn.disabled = true;
    j.cliente.append(memo, btn);
    try {
      const d = await correr(log);
      log(`\nConcluído: ${Object.keys(d.equipas).length} equipas. Os novos planteis entram nos jogos novos.`);
    } catch (e) { log('Erro: ' + e.message); }
    btn.disabled = false; btn.textContent = 'OK'; btn.onclick = () => j.fechar();
  }

  window.Atualizador = { automatico, manual, correr };
})();

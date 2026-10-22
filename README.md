# Mister 26

**Jogar agora:** https://leodsampaio.github.io/mister26/ · Repositório: https://github.com/leodsampaio/mister26

Jogo de gestão de futebol inspirado no **Elifoot 98**, reconstruído em HTML, CSS e JavaScript puro, com o mesmo layout de janelas (Windows 95 / Delphi 1, verde e amarelo) e planteis de 2026 que se **atualizam sozinhos** a partir da Wikipédia.

Sem instalação, sem servidor obrigatório, sem chaves de API. Tudo em português.

## Jogar

Abra `index.html` no browser. Para a atualização ao vivo dos planteis a partir do próprio jogo, sirva a pasta por http:

```bash
node robo/servir.mjs 8126
```

e abra http://127.0.0.1:8126/.

Os jogos são gravados no `localStorage` do browser (menu **Mister 26 → Gravar**; por omissão grava em todas as jornadas).

## Como funciona a atualização automática

```
Wikipédia (en)  ──►  js/fonte-wikipedia.js  ──►  dados/equipas.json + dados/equipas.js  ──►  jogo
                     (robô em Node ou no browser)
```

- `dados/ligas.json` diz quais as divisões a recolher (Liga Portugal, Liga Portugal 2, Brasileirão Série A e B). Para juntar outra liga basta acrescentar uma linha com o título do artigo de época na Wikipédia inglesa.
- `js/fonte-wikipedia.js` lê o artigo da época (lista de clubes, estádios, capacidades), a classificação final da época anterior (para calcular o nível 1–20 de cada equipa, como no Elifoot) e o artigo de cada clube (plantel com número, nacionalidade e posição, treinador, cores da camisola).
- `robo/atualizar.mjs` corre tudo em Node e grava os ficheiros em `dados/`, mais uma cópia datada em `dados/historico/`.
- `dados/ajustes.json` permite corrigir à mão nome curto, nível ou cores de uma equipa; sobrepõe-se ao automático.
- `.github/workflows/atualizar.yml` corre o robô todas as segundas-feiras no GitHub Actions e faz commit das alterações. Com o GitHub Pages ligado, o jogo publicado fica sempre com os planteis mais recentes.
- O próprio jogo (quando servido por http) verifica de 7 em 7 dias e refresca os planteis em segundo plano (menu **Dados**). Um jogo em curso mantém os planteis com que começou; os novos entram nos jogos novos.

Correr o robô à mão:

```bash
node robo/atualizar.mjs
```

Requisitos: Node.js 22 ou mais recente. Sem dependências npm.

## Publicação

O jogo está publicado no GitHub Pages a partir da branch `main` (pasta raiz). O workflow *Atualizar planteis* corre todas as segundas-feiras e também pode ser lançado à mão em *Actions → Atualizar planteis → Run workflow*; cada execução que mude os planteis faz um commit e o Pages republica o jogo em poucos minutos.

## O que está implementado

- Até 6 treinadores humanos (hot-seat), equipas sorteadas como no original.
- Época completa a duas voltas em quatro divisões, com subidas e descidas (3 em Portugal, 4 no Brasil), calendário, classificação, melhores marcadores e últimos vencedores.
- Simulação de jogo com relógio, golos, cartões, lesões e suspensões (5 amarelos = 1 jogo), árbitros com tendência caseira.
- 12 tácticas (3-3-4 a 6-4-0), selecção automática, "Melhores" e escolha jogador a jogador (duplo clique).
- Finanças: bilheteira (público depende do preço, moral, nível das equipas e capacidade), salários, empréstimo bancário com juros, ampliação do estádio, balanço.
- Mercado: vender a preço pedido, procurar e comprar a qualquer equipa do computador, renovação de contratos, últimas transferências.
- Moral, comportamento dos jogadores, envelhecimento, evolução dos jovens, reformas e juniores no fim da época.
- Gestão de treinadores (adicionar, retirar, trocar), história, ranking e perfil.
- **Cheat O'Matic 26**: menu *Mister 26 → Cheat O'Matic…* ou `Ctrl+Alt+C`. Altera dinheiro, dívida, moral e capacidade do estádio de qualquer equipa, com o visual do utilitário dos anos 90.
- Diálogo de **Registo** com senha e contra-senha, só pela nostalgia: todas as funções já estão abertas.

## Ainda não existe

Taça, substituições durante o jogo, leilão de jogadores entre treinadores humanos, chicotadas psicológicas e inflação. Ficam para uma próxima versão.

## Licenças e créditos

Código: MIT. Dados das equipas: Wikipédia inglesa, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). O Mister 26 não tem ligação aos autores do Elifoot; "Elifoot" é marca dos seus titulares. Nomes de clubes e jogadores são factos públicos usados sem logótipos nem escudos.

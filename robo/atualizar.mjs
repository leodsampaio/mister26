#!/usr/bin/env node
// Robô de atualização dos planteis. Uso: node robo/atualizar.mjs
// Lê dados/ligas.json e dados/ajustes.json; escreve dados/equipas.json, dados/equipas.js e um histórico datado.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { recolherTudo } from '../js/fonte-wikipedia.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = async f => JSON.parse(await readFile(path.join(raiz, f), 'utf8'));

const ligas = await ler('dados/ligas.json');
const ajustes = await ler('dados/ajustes.json').catch(() => ({}));
delete ajustes._comentario;

const dados = await recolherTudo(ligas, { ajustes, log: m => console.log(m) });

const total = Object.values(dados.equipas).reduce((s, e) => s + e.jogadores.length, 0);
const fracas = Object.values(dados.equipas).filter(e => e.jogadores.length < 14).map(e => e.nomeCurto);
console.log(`\n${Object.keys(dados.equipas).length} equipas, ${total} jogadores.`);
if (fracas.length) console.log('Equipas com plantel curto:', fracas.join(', '));

const json = JSON.stringify(dados, null, 1);
await writeFile(path.join(raiz, 'dados/equipas.json'), json);
await writeFile(path.join(raiz, 'dados/equipas.js'), 'window.DADOS_EQUIPAS = ' + json + ';\n');
await mkdir(path.join(raiz, 'dados/historico'), { recursive: true });
await writeFile(path.join(raiz, `dados/historico/equipas-${dados.gerado.slice(0, 10)}.json`), json);
console.log('Gravado em dados/equipas.json e dados/equipas.js');

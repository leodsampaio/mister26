# Gera os cartões (cenas estáticas) do vídeo em HTML com estética Windows 95 e renderiza-os em PNG 1080x1920 com o Chrome.
# Uso: python3 -I video/cartoes.py
import os, subprocess, html

RAIZ = os.path.dirname(os.path.abspath(__file__))
CENAS = os.path.join(RAIZ, 'cenas')
CAPT = os.path.join(RAIZ, 'capturas')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
os.makedirs(CENAS, exist_ok=True)

CSS = """
* { box-sizing: border-box; }
body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #008080; font-family: Arial, Helvetica, sans-serif; font-size: 30px; color: #000; position: relative; }
body.preto { background: #000; }
.janela { position: absolute; background: #c0c0c0; border: 3px solid; border-color: #dfdfdf #000 #000 #dfdfdf; box-shadow: inset 3px 3px #fff, inset -3px -3px #808080, 10px 10px 0 rgba(0,0,0,.35); padding: 8px; }
.titulo { height: 54px; display: flex; align-items: center; padding: 0 12px; background: linear-gradient(90deg, #000080, #1084d0); color: #fff; font-weight: bold; font-size: 32px; }
.titulo .x { margin-left: auto; width: 44px; height: 40px; background: #c0c0c0; color: #000; border: 3px solid; border-color: #fff #000 #000 #fff; display: flex; align-items: center; justify-content: center; font-size: 26px; }
.cliente { position: relative; padding: 24px; }
.verde .cliente { background: #008000; color: #ffff00; font-weight: bold; }
.botao { display: inline-block; background: #c0c0c0; color: #000; border: 3px solid; border-color: #fff #000 #000 #fff; box-shadow: inset -3px -3px #808080, inset 3px 3px #dfdfdf; padding: 10px 28px; font-size: 30px; }
.botao.predef { outline: 3px solid #000; }
.lista { background: #fff; color: #000; border: 3px solid; border-color: #808080 #fff #fff #808080; box-shadow: inset 3px 3px #000; padding: 8px; font-weight: bold; }
.lista div { padding: 6px 10px; display: flex; gap: 20px; }
.lista .sel { background: #000080; color: #fff; }
.tarefa { position: absolute; left: 0; right: 0; bottom: 0; height: 84px; background: #c0c0c0; border-top: 3px solid #fff; display: flex; align-items: center; gap: 18px; padding: 0 16px; font-size: 28px; }
.tarefa .iniciar { font-weight: bold; padding: 8px 22px; }
.tarefa .relogio { margin-left: auto; border: 3px solid; border-color: #808080 #fff #fff #808080; padding: 8px 20px; }
.icone { position: absolute; width: 200px; text-align: center; color: #fff; font-size: 26px; text-shadow: 2px 2px #000; }
.icone .img { font-size: 96px; line-height: 110px; }
.mono { font-family: "Courier New", monospace; }
.grande { font-size: 92px; font-weight: bold; line-height: 1.05; }
.medio { font-size: 48px; font-weight: bold; }
.amarelo { color: #ffff00; }
.branco { color: #fff; }
.centro { text-align: center; }
.sombra { text-shadow: 4px 4px #000; }
.captura { position: absolute; overflow: hidden; border: 3px solid #000; box-shadow: 12px 12px 0 rgba(0,0,0,.35); background: #008080; }
.captura img { position: absolute; }
.bevel { border: 3px solid; border-color: #808080 #fff #fff #808080; }
.verde .bevel { border-color: #004000 #40c040 #40c040 #004000; }
.seta { font-size: 110px; color: #ffff00; text-align: center; text-shadow: 4px 4px #000; line-height: 1; }
"""

def tarefa(hora):
    return f'<div class="tarefa"><span class="botao iniciar">⊞ Iniciar</span><span class="relogio">{hora}</span></div>'

def janela(x, y, w, titulo, corpo, verde=False, h=None):
    estilo = f'left:{x}px;top:{y}px;width:{w}px;' + (f'height:{h}px;' if h else '')
    return f'<div class="janela{" verde" if verde else ""}" style="{estilo}"><div class="titulo">{html.escape(titulo)}<span class="x">✕</span></div><div class="cliente">{corpo}</div></div>'

cartoes = {}

# --- arranque (BIOS) em 4 passos
linhas = ['MISTER BIOS v2.6  (C) 1998-2026', 'Memoria: 16384 KB  OK', 'Disco C: ELIFOOT.EXE encontrado', '', 'A iniciar o Mister 26...']
for i in range(1, 5):
    vis = linhas[:[2, 3, 4, 5][i - 1]]
    corpo = '<br>'.join(html.escape(l) or '&nbsp;' for l in vis)
    cursor = '<span style="background:#fff">&nbsp;</span>' if i < 4 else ''
    cartoes[f'boot{i}'] = f'<body class="preto"><div class="mono branco" style="position:absolute;left:80px;top:140px;font-size:44px;line-height:1.6">{corpo}{cursor}</div></body>'

# --- ambiente de trabalho 1998
icones = ''.join(f'<div class="icone" style="left:{x}px;top:{y}px"><div class="img">{e}</div>{t}</div>' for x, y, e, t in [(60, 150, '🖥️', 'O meu computador'), (60, 440, '📁', 'ELIFOOT'), (60, 730, '🗑️', 'Reciclagem'), (60, 1020, '📄', 'LEIAME.TXT')])
expl = janela(300, 420, 720, 'C:\\ELIFOOT', '<div class="lista" style="font-size:30px">' + ''.join(f'<div{" class=sel" if n == "ELIFOOT.EXE" else ""}><span>{e}</span><span>{n}</span><span style="margin-left:auto;font-weight:normal">{s}</span></div>' for e, n, s in [('⚽', 'ELIFOOT.EXE', '836 KB'), ('📝', 'EDITEQ.EXE', '472 KB'), ('📁', 'EQUIPAS', '195 ficheiros'), ('📁', 'FLAGS', '218 ficheiros'), ('🧩', 'GAUGE.VBX', '8 KB'), ('🧩', 'BIVBX11.DLL', '80 KB')]) + '</div><div style="margin-top:14px;font-size:24px">6 objetos&nbsp;&nbsp;1,37 MB</div>')
ano = '<div class="grande amarelo sombra centro" style="position:absolute;left:0;right:0;top:1080px;font-size:200px">1998</div><div class="medio branco sombra centro" style="position:absolute;left:0;right:0;top:1320px">um monitor de tubo, um disquete e horas de campeonato</div>'
cartoes['desktop98'] = f'<body>{icones}{expl}{ano}{tarefa("23:58")}</body>'
cartoes['desktop98b'] = f'<body>{icones}{expl}{tarefa("23:59")}</body>'

# --- título Mister 26
corpo = ('<div class="bevel" style="padding:40px 30px;text-align:center"><div style="font-size:150px;line-height:1">MISTER 26</div>'
         '<div style="font-size:44px;margin-top:20px;font-weight:normal">gerenciador de futebol · grátis</div></div>'
         '<div style="margin-top:40px;display:flex;gap:40px;justify-content:center"><span class="botao predef" style="font-size:38px;padding:18px 48px">✔ Jogar</span><span class="botao" style="font-size:38px;padding:18px 48px">✖ Cancelar</span></div>')
cartoes['titulo'] = f'<body><div class="medio branco sombra centro" style="position:absolute;left:0;right:0;top:300px;font-size:64px">28 anos depois...</div>{janela(60, 560, 960, "Mister 26", corpo, verde=True)}{tarefa("11:02")}</body>'

# --- atualização automática
def caixa(x, y, w, titulo, texto, verde=False):
    return janela(x, y, w, titulo, f'<div style="font-size:40px;line-height:1.3;text-align:center">{texto}</div>', verde)
cartoes['atualiza'] = ('<body>' + caixa(90, 180, 900, 'Wikipédia', '📚 elencos reais<br>Portugal e Brasil') +
    '<div class="seta" style="position:absolute;left:0;right:0;top:470px">⬇</div>' +
    caixa(90, 620, 900, 'Robô — toda segunda-feira', '🤖 lê, confere e grava<br>76 equipes · 2.384 jogadores', True) +
    '<div class="seta" style="position:absolute;left:0;right:0;top:920px">⬇</div>' +
    caixa(90, 1070, 900, 'Mister 26', '⚽ elencos de 2026<br>atualizados sozinhos') +
    '<div class="medio amarelo sombra centro" style="position:absolute;left:0;right:0;top:1360px;font-size:56px">sem chave, sem conta, sem servidor</div>' + tarefa('04:00') + '</body>')

# --- plataformas
nav = ('<div class="bevel" style="background:#fff;color:#000;padding:16px;font-weight:normal;font-size:34px;display:flex;gap:16px;align-items:center"><span>◀ ▶ ⟳</span>'
       '<span class="bevel" style="flex:1;padding:8px 16px;border-color:#808080 #fff #fff #808080">file:///mister26/index.html</span></div>'
       '<div style="background:#008000;color:#ffff00;font-weight:bold;padding:40px;text-align:center;font-size:60px;margin-top:16px">⚽ MISTER 26</div>')
cartoes['plataformas'] = ('<body>' + janela(60, 160, 960, 'macOS — Safari', nav) +
    janela(60, 740, 960, 'Windows — Edge', nav) +
    '<div class="grande amarelo sombra centro" style="position:absolute;left:0;right:0;top:1290px;font-size:84px">Mac e Windows</div>'
    '<div class="medio branco sombra centro" style="position:absolute;left:0;right:0;top:1400px;font-size:52px">local · sem instalar · é só abrir no navegador</div>' + tarefa('11:03') + '</body>')

# --- fim
corpo = ('<div class="bevel" style="padding:40px 30px;text-align:center"><div style="font-size:120px;line-height:1">MISTER 26</div>'
         '<div style="font-size:52px;margin-top:24px">grátis · Mac · Windows</div>'
         '<div style="font-size:40px;margin-top:30px;font-weight:normal;color:#fff">link na descrição</div></div>')
cartoes['fim'] = f'<body>{janela(60, 520, 960, "Mister 26", corpo, verde=True)}<div class="medio branco sombra centro" style="position:absolute;left:0;right:0;top:1200px;font-size:48px">leodsampaio.github.io/mister26</div>{tarefa("11:04")}</body>'

# --- "é seguro desligar"
cartoes['desligar'] = '<body class="preto"><div class="centro" style="position:absolute;left:60px;right:60px;top:860px;color:#ff8000;font-size:68px;font-weight:bold;line-height:1.3">Agora é seguro desligar<br>o seu computador.</div></body>'

# --- cenas com capturas do jogo (recorte + zoom em CSS)
def captura(nome, legenda, recorte, titulo_hora='11:05', zoom=1.0, dx=0, dy=0, altura=1100, topo=200):
    # recorte: (x, y, w, h) na captura 2048x1536; escalado para largura 1000
    x, y, w, h = recorte
    esc = 1000 / w * zoom
    img = f'<img src="../capturas/{nome}.png" style="width:{int(2048 * esc)}px;left:{int(-x * esc + dx)}px;top:{int(-y * esc + dy)}px">'
    return (f'<body><div class="captura" style="left:40px;top:{topo}px;width:1000px;height:{altura}px">{img}</div>'
            f'<div class="medio amarelo sombra centro" style="position:absolute;left:40px;right:40px;top:{topo + altura + 60}px;font-size:56px;line-height:1.2">{legenda}</div>{tarefa(titulo_hora)}</body>')
cartoes['c_principal'] = captura('principal', 'janelas cinzas, botões em relevo<br>e a tela verde', (20, 20, 1260, 960), altura=960)
cartoes['c_lista'] = captura('principal', 'o elenco, jogador por jogador', (30, 230, 720, 720), altura=1000)
cartoes['c_classificacao'] = captura('classificacao', 'quatro divisões, duas voltas,<br>subidas e descidas', (160, 180, 960, 820), altura=860)
cartoes['c_relogio'] = captura('relogio', 'relógio de jogo, cartões,<br>lesões e o apito final', (580, 270, 860, 720), altura=840)
cartoes['c_plantel'] = captura('plantel', 'elencos reais de 2026', (20, 20, 1300, 960), altura=960)
cartoes['c_procurar'] = captura('procurar', 'mercado: procure, compre, venda', (20, 20, 1260, 960), altura=960)
cartoes['c_cheat'] = captura('cheat', 'Cheat O\'Matic 26:<br>dinheiro infinito, como antigamente', (290, 190, 1270, 920), altura=900)

for nome, corpo in cartoes.items():
    doc = f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head>{corpo}</html>'
    caminho = os.path.join(CENAS, nome + '.html')
    open(caminho, 'w').write(doc)
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1080,1920', '--virtual-time-budget=1500',
                    f'--screenshot={os.path.join(CENAS, nome + ".png")}', 'file://' + caminho], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print('cena', nome, os.path.getsize(os.path.join(CENAS, nome + '.png')) // 1024, 'KB')

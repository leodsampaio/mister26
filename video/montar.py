# Monta o vídeo de 59 s (1080x1920, 30 fps) a partir das cenas em PNG, da narração e dos sons.
# Uso: python3 -I video/montar.py            -> video/saida/mister26-59s.mp4
import os, subprocess, re

RAIZ = os.path.dirname(os.path.abspath(__file__))
CENAS, AUDIO, SAIDA = (os.path.join(RAIZ, d) for d in ('cenas', 'audio', 'saida'))
os.makedirs(SAIDA, exist_ok=True)
FPS = 30
W, H = 1080, 1920

# (cena, duração em s, zoom inicial, zoom final, centro x, centro y)  — cortes secos, como em 1998
CENAS_LISTA = [
    ('boot1', 0.8, 1, 1, 540, 960), ('boot2', 0.8, 1, 1, 540, 960), ('boot3', 0.8, 1, 1, 540, 960), ('boot4', 0.9, 1, 1, 540, 960),
    ('desktop98', 5.7, 1.0, 1.06, 540, 960),
    ('desktop98', 7.3, 1.06, 1.7, 660, 640),
    ('titulo', 2.9, 1.0, 1.05, 540, 830),
    ('c_principal', 3.4, 1.0, 1.12, 540, 650),
    ('c_lista', 2.8, 1.0, 1.1, 540, 700),
    ('c_classificacao', 3.2, 1.0, 1.12, 540, 620),
    ('c_relogio', 3.6, 1.0, 1.15, 540, 560),
    ('atualiza', 6.2, 1.0, 1.06, 540, 760),
    ('plataformas', 6.6, 1.0, 1.06, 540, 800),
    ('c_procurar', 3.6, 1.0, 1.12, 540, 650),
    ('c_cheat', 5.7, 1.0, 1.18, 540, 650),
    ('fim', 3.1, 1.0, 1.04, 540, 860),
    ('desligar', 1.6, 1, 1, 540, 960),
]
TOTAL = sum(c[1] for c in CENAS_LISTA)
print(f'duração total das cenas: {TOTAL:.1f}s')

# --- 1. clips de vídeo (um por cena, com zoom lento)
clips = []
for i, (nome, dur, z0, z1, cx, cy) in enumerate(CENAS_LISTA):
    frames = round(dur * FPS)
    clip = os.path.join(SAIDA, f'clip{i:02d}.mp4')
    if z0 == z1 == 1:
        vf = f'scale={W}:{H},format=yuv420p'
    else:
        # zoompan: z cresce linearmente; x,y mantêm o centro escolhido
        vf = (f"scale={W * 2}:{H * 2},zoompan=z='{z0}+({z1}-{z0})*on/{frames}':"
              f"x='{cx * 2}-(iw/zoom/2)':y='{cy * 2}-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},format=yuv420p")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-framerate', str(FPS), '-t', str(dur), '-i', os.path.join(CENAS, nome + '.png'),
                    '-vf', vf, '-frames:v', str(frames), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-r', str(FPS), clip], check=True)
    clips.append(clip)
    print(f'  clip {i:02d} {nome:16s} {dur:4.1f}s')

# --- 2. legendas (ASS) a partir do guião, repartindo cada segmento pelas suas frases
inicios = {1: 3.5, 2: 16.5, 3: 32.3, 4: 38.5, 5: 45.1, 6: 54.4}
def duracao(f):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout.strip())
def ts(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f'{h}:{m:02d}:{s:05.2f}'
eventos = []
for linha in open(os.path.join(AUDIO, 'narracao.txt'), encoding='utf-8'):
    n, texto = linha.strip().split('|', 1)
    n = int(n); dur = duracao(os.path.join(AUDIO, f'nar{n}.wav'))
    frases = [f.strip() for f in re.split(r'(?<=[.:,])\s+', texto) if f.strip()]
    # junta frases curtas para não piscar demasiado
    blocos = []
    for f in frases:
        if blocos and len(blocos[-1]) + len(f) < 60: blocos[-1] += ' ' + f
        else: blocos.append(f)
    total = sum(len(b) for b in blocos); t = inicios[n]
    for b in blocos:
        d = dur * len(b) / total
        eventos.append((t, t + d, b.rstrip(',').rstrip('.')))
        t += d
# legendas como PNG transparentes (o ffmpeg do Homebrew não traz libass/drawtext); sobrepostas com overlay
from PIL import Image, ImageDraw, ImageFont
fonte = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 50)
def png_legenda(texto, caminho):
    img = Image.new('RGBA', (W, 260), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    palavras = texto.split(); linhas = []; atual = ''
    for p in palavras:
        teste = (atual + ' ' + p).strip()
        if d.textlength(teste, font=fonte) > W - 120 and atual: linhas.append(atual); atual = p
        else: atual = teste
    if atual: linhas.append(atual)
    y = 130 - 32 * len(linhas)
    for l in linhas:
        x = (W - d.textlength(l, font=fonte)) / 2
        d.text((x, y), l, font=fonte, fill=(255, 255, 0, 255), stroke_width=5, stroke_fill=(0, 0, 0, 255)); y += 64
    img.save(caminho)
for i, (a, b, texto) in enumerate(eventos): png_legenda(texto, os.path.join(SAIDA, f'leg{i:02d}.png'))
print(f'  {len(eventos)} legendas')

# --- 3. junção dos clips + legendas (overlay com janela temporal)
lista = os.path.join(SAIDA, 'clips.txt')
open(lista, 'w').write(''.join(f"file '{c}'\n" for c in clips))
video_mudo = os.path.join(SAIDA, 'video-mudo.mp4')
ent = ['-f', 'concat', '-safe', '0', '-i', lista]
for i in range(len(eventos)): ent += ['-i', os.path.join(SAIDA, f'leg{i:02d}.png')]
cadeia = ''; ant = '[0:v]'
for i, (a, b, _) in enumerate(eventos):
    saida_i = f'[v{i}]'
    cadeia += f"{ant}[{i + 1}:v]overlay=0:1565:enable='between(t,{a:.2f},{b:.2f})'{saida_i};"; ant = saida_i
cadeia += f'{ant}format=yuv420p[vout]'
subprocess.run(['ffmpeg', '-v', 'error', '-y', *ent, '-filter_complex', cadeia, '-map', '[vout]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-r', str(FPS), video_mudo], check=True)

# --- 4. mistura de áudio: música, narração e efeitos nos tempos certos
sons = [  # (ficheiro, início s, volume)
    ('musica.wav', 0.0, 0.32),
    ('beep.wav', 0.1, 0.6), ('clique.wav', 0.9, 0.8), ('clique.wav', 1.7, 0.8), ('clique.wav', 2.5, 0.8),
    ('inicio.wav', 3.3, 0.9),
    ('nar1.wav', 3.5, 1.0), ('nar2.wav', 16.5, 1.0), ('nar3.wav', 32.3, 1.0), ('nar4.wav', 38.5, 1.0), ('nar5.wav', 45.1, 1.0), ('nar6.wav', 54.4, 1.0),
    ('tada.wav', 16.3, 0.7), ('clique.wav', 19.2, 0.8), ('clique.wav', 22.6, 0.8), ('clique.wav', 25.4, 0.8),
    ('publico.wav', 28.5, 0.5), ('apito.wav', 28.7, 0.6), ('apito.wav', 31.4, 0.5),
    ('ding.wav', 32.3, 0.7), ('clique.wav', 38.5, 0.8), ('ding.wav', 45.1, 0.6),
    ('clique.wav', 48.6, 0.8), ('ding.wav', 50.0, 0.7), ('tada.wav', 51.6, 0.7),
    ('ding.wav', 54.3, 0.6), ('desligar.wav', 57.2, 0.9),
]
entradas = []; filtros = []
for i, (f, t, v) in enumerate(sons):
    entradas += ['-i', os.path.join(AUDIO, f)]
    extra = f',afade=t=out:st={TOTAL - 2.5}:d=2.5' if f == 'musica.wav' else ''
    filtros.append(f'[{i}:a]volume={v},adelay={int(t * 1000)}|{int(t * 1000)}{extra}[a{i}]')
mix = ''.join(f'[a{i}]' for i in range(len(sons))) + f'amix=inputs={len(sons)}:normalize=0:duration=longest,alimiter=limit=0.95,atrim=0:{TOTAL}[aout]'
audio = os.path.join(SAIDA, 'audio.m4a')
subprocess.run(['ffmpeg', '-v', 'error', '-y', *entradas, '-filter_complex', ';'.join(filtros) + ';' + mix, '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k', audio], check=True)

# --- 5. ficheiro final
final = os.path.join(SAIDA, 'mister26-59s.mp4')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video_mudo, '-i', audio, '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', final], check=True)
print('final:', final, f'{os.path.getsize(final) / 1e6:.1f} MB, {duracao(final):.2f}s')

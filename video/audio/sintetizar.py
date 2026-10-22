import math, wave, struct, random
SR = 44100
def escrever(nome, amostras, sr=SR):
    with wave.open(nome, 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, a)) * 32767)) for a in amostras))
def nota(freq, dur, forma='sine', ataque=0.01, decai=0.3, vol=0.5, sr=SR):
    n = int(dur * sr); out = []
    for i in range(n):
        t = i / sr
        env = min(1, t / ataque) * math.exp(-t / decai) if decai else min(1, t / ataque)
        ph = 2 * math.pi * freq * t
        if forma == 'sine': s = math.sin(ph) + 0.3 * math.sin(2 * ph) + 0.1 * math.sin(3 * ph)
        elif forma == 'square': s = 1 if math.sin(ph) > 0 else -1
        elif forma == 'tri': s = 2 / math.pi * math.asin(math.sin(ph))
        else: s = math.sin(ph)
        out.append(s * env * vol)
    return out
def misturar(partes, total=None, sr=SR):
    total = total or max(p[0] + len(p[1]) / sr for p in partes)
    buf = [0.0] * int(total * sr)
    for inicio, am in partes:
        o = int(inicio * sr)
        for i, a in enumerate(am):
            if o + i < len(buf): buf[o + i] += a
    return buf
# beep do PC speaker
escrever('beep.wav', nota(1000, 0.12, 'square', 0.002, 0, 0.25))
# chime de arranque (4 notas ascendentes com cauda longa, estilo pad)
C5, E5, G5, C6, G6 = 523.25, 659.25, 783.99, 1046.5, 1567.98
escrever('inicio.wav', misturar([(0, nota(C5, 2.5, 'sine', 0.05, 1.0, 0.35)), (0.35, nota(E5, 2.5, 'sine', 0.05, 1.0, 0.3)), (0.7, nota(G5, 2.5, 'sine', 0.05, 1.0, 0.3)), (1.05, nota(C6, 3.0, 'sine', 0.05, 1.4, 0.35)), (1.4, nota(G6, 3.0, 'sine', 0.08, 1.6, 0.15))], 4.5))
# ding
escrever('ding.wav', misturar([(0, nota(880, 0.9, 'sine', 0.003, 0.25, 0.4)), (0, nota(1760, 0.6, 'sine', 0.003, 0.12, 0.15))]))
# tada (fanfarra curta)
escrever('tada.wav', misturar([(0, nota(392, 0.25, 'square', 0.005, 0.2, 0.18)), (0.18, nota(523.25, 0.25, 'square', 0.005, 0.2, 0.18)), (0.36, nota(659.25, 1.2, 'square', 0.005, 0.6, 0.18)), (0.36, nota(783.99, 1.2, 'sine', 0.01, 0.7, 0.25)), (0.36, nota(1046.5, 1.2, 'sine', 0.01, 0.7, 0.2))]))
# clique de rato
escrever('clique.wav', [random.uniform(-1, 1) * 0.4 * math.exp(-i / 60) for i in range(600)])
# apito do árbitro (duplo)
def apito(dur=0.45):
    n = int(dur * SR); out = []
    for i in range(n):
        t = i / SR; env = min(1, t / 0.01) * (1 if t < dur - 0.05 else (dur - t) / 0.05)
        f = 2300 + 60 * math.sin(2 * math.pi * 28 * t)
        out.append((0.5 * math.sin(2 * math.pi * f * t) + 0.25 * math.sin(2 * math.pi * f * 1.5 * t) + random.uniform(-0.15, 0.15)) * env * 0.5)
    return out
escrever('apito.wav', misturar([(0, apito(0.3)), (0.38, apito(0.6))]))
# público (ruído filtrado com ondulação)
n = int(8 * SR); buf = []; y = 0.0; z = 0.0
for i in range(n):
    t = i / SR; x = random.uniform(-1, 1)
    y += 0.02 * (x - y); z += 0.004 * (y - z)
    sw = 0.6 + 0.4 * math.sin(2 * math.pi * 0.25 * t) + 0.15 * math.sin(2 * math.pi * 1.7 * t)
    buf.append((y - z) * 6 * sw * 0.35)
escrever('publico.wav', buf)
# desligar (3 notas descendentes)
escrever('desligar.wav', misturar([(0, nota(C6, 1.2, 'sine', 0.02, 0.5, 0.3)), (0.3, nota(G5, 1.2, 'sine', 0.02, 0.5, 0.3)), (0.6, nota(C5, 2.0, 'sine', 0.02, 0.9, 0.35))]))
# música chiptune (59 s, 22.05 kHz): baixo triangular + melodia quadrada, 120 bpm, C G Am F
sr = 22050; bpm = 118; b = 60 / bpm; dur = 59.5
acordes = [[261.63, 329.63, 392.0], [196.0, 246.94, 293.66], [220.0, 261.63, 329.63], [174.61, 220.0, 261.63]]
baixo = [130.81, 98.0, 110.0, 87.31]
melodia_pat = [0, 2, 4, 7, 4, 2, 0, -1, 2, 4, 5, 4, 2, 0, 2, -1, 4, 5, 7, 9, 7, 5, 4, -1, 2, 4, 2, 0, -1, -1, 0, -1]
escala = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25]
partes = []
t = 0.0; k = 0
while t < dur:
    comp = (k // 8) % 4
    if k % 8 == 0:
        for i in range(8):
            partes.append((t + i * b / 2, nota(baixo[comp] * (2 if i % 2 else 1), b / 2 * 0.9, 'tri', 0.005, 0.25, 0.28, sr)))
    grau = melodia_pat[k % len(melodia_pat)]
    if grau >= 0 and (k // 32) % 2 == 0 or (grau >= 0 and k % 2 == 0):
        partes.append((t, nota(escala[grau], b / 2 * 0.8, 'square', 0.005, 0.18, 0.09, sr)))
    if k % 4 == 0:
        for f in acordes[comp]: partes.append((t, nota(f, b * 1.8, 'tri', 0.02, 0.9, 0.05, sr)))
    t += b / 2; k += 1
escrever('musica.wav', misturar(partes, dur, sr), sr)
print('sons ok')

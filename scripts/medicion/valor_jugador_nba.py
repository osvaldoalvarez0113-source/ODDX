# Valor de cada jugador (NBA): ¿saber quién falta le sube aciertos al modelo de la app?
# Cada juego solo con lo de antes. Modelo base = V0 de la app (filas_nba.json). Ajuste: pm' = pm + c*(dif de talento), c elegido con temporadas anteriores.
import json, gzip, math, sys, collections
import numpy as np
box = json.load(gzip.open(sys.argv[1])); mod = {str(r['id']): r for r in json.load(open(sys.argv[2]))}
Phi = lambda x: 0.5*(1+math.erf(x/math.sqrt(2)))
G = box['g']
# ---- valores por jugador, recorriendo en orden; reinicia por temporada pero arrastra la anterior con peso
VAL = {}   # (sk, pid) -> [g, min, prod, pm]
PREV = {}  # pid -> valor de la temporada anterior (prod por juego)
TEAM = collections.defaultdict(list)
TEAMPL = collections.defaultdict(set); LAST = {}   # (sk, tid) -> lista de juegos: lista de pids que jugaron
def prod(p): return p[3] + 0.7*p[4] + 0.7*p[5]
def val(sk, pid, modo):
    v = VAL.get((sk, pid))
    pr = PREV.get(pid)
    if modo == 'prod':
        if v and v[0] >= 3: m = v[2]/v[0]; n = v[0]
        else: m, n = None, 0
        if pr is not None:
            w = min(n, 15)/15 if m is not None else 0
            return (w*m + (1-w)*pr) if m is not None else pr
        return m
    if modo == 'pm':   # +/- por 36 min, jalado a 0 con 400 minutos
        if not v: return None
        return v[3]/(v[1]+400)*36
rows = []
ultimo_sk = None
for g in G:
    sk = g['sk']
    if sk != ultimo_sk:
        if ultimo_sk is not None:
            for (s, pid), v in list(VAL.items()):
                if s == ultimo_sk and v[0] >= 10: PREV[pid] = v[2]/v[0]
        ultimo_sk = sk
    jug = collections.defaultdict(list)
    for p in g['p']: jug[p[0]].append(p)
    feats = {}
    for lado in ('h', 'a'):
        tid = g[lado]; hist = TEAM[(sk, tid)]
        hoy = set(p[1] for p in jug.get(tid, []))
        # regulares: jugaron >= 3 de los últimos 5 del equipo
        rec = hist[-5:]
        cnt = collections.Counter(pid for j in rec for pid in j)
        regs = [pid for pid, c in cnt.items() if c >= 3]
        vals = {pid: val(sk, pid, 'prod') for pid in set(regs) | hoy}
        MODO = __import__('os').environ.get('MODO','A')
        if MODO == 'B':
            vet = sorted([(pid, VAL[(sk,pid)]) for (s2,pid) in list(VAL.keys()) if s2==sk and pid in TEAMPL[(sk,tid)] and VAL[(sk,pid)][0]>=5 and VAL[(sk,pid)][1]/VAL[(sk,pid)][0]>=16 and len(hist)-LAST.get((sk,pid),-99)<=12], key=lambda x:-x[1][1]/x[1][0])[:8]
            falta = sum(v[2]/v[0] for pid,v in vet if pid not in hoy)
        elif MODO == 'C':
            falta = sum(vals[pid] or 0 for pid in regs if pid not in hoy and VAL.get((sk,pid),[1,0])[1]/max(VAL.get((sk,pid),[1,0])[0],1) >= 20)
        else:
            falta = sum(vals[pid] or 0 for pid in regs if pid not in hoy)
        vuelve = sum(vals[pid] or 0 for pid in hoy if pid not in cnt and (vals[pid] or 0) >= 12)   # vuelve alguien importante que no venía jugando
        feats[lado] = (falta, vuelve, len(hist))
    m = mod.get(g['id'])
    if m and m.get('V0') and m['V0'].get('pm') is not None and feats['h'][2] >= 8 and feats['a'][2] >= 8:
        v = m['V0']
        rows.append(dict(id=g['id'], sk=sk, pm=v['pm'], sM=v['sM'], mar=g['hs']-g['as'], fh=feats['h'][0], fa=feats['a'][0], vh=feats['h'][1], va=feats['a'][1]))
    # actualizar
    for lado in ('h', 'a'):
        tid = g[lado]
        TEAM[(sk, tid)].append([p[1] for p in jug.get(tid, [])])
        for p in jug.get(tid, []):
            TEAMPL[(sk,tid)].add(p[1]); LAST[(sk,p[1])] = len(TEAM[(sk,tid)])
            v = VAL.setdefault((sk, p[1]), [0, 0, 0, 0]); v[0] += 1; v[1] += p[2]; v[2] += prod(p); v[3] += p[6]
print('juegos medibles', len(rows), collections.Counter(r['sk'] for r in rows))
def ev(rs, c1, c2):
    ok = 0; ll = 0
    for r in rs:
        pm = r['pm'] + c1*(r['fa']-r['fh']) + c2*(r['vh']-r['va'])
        p = 1-Phi((0.5-pm)/r['sM']); a = Phi((-0.5-pm)/r['sM']); pH = p/(p+a)
        y = r['mar'] > 0
        ok += (pH >= 0.5) == y; ll += -math.log(max(pH if y else 1-pH, 1e-9))
    return ok, ll
def ajuste(rs):
    X = np.array([[r['fa']-r['fh'], r['vh']-r['va']] for r in rs]); y = np.array([r['mar']-r['pm'] for r in rs])
    b, *_ = np.linalg.lstsq(X, y, rcond=None); return b
S = sorted(set(r['sk'] for r in rows))
tot = collections.Counter()
for sk in S[1:]:
    tr = [r for r in rows if r['sk'] < sk]; te = [r for r in rows if r['sk'] == sk]
    b = ajuste(tr)
    o0, l0 = ev(te, 0, 0); o1, l1 = ev(te, b[0], 0); o2, l2 = ev(te, b[0], b[1])
    big = [r for r in te if abs(r['fa']-r['fh']) >= 15]; ob0, _ = ev(big, 0, 0); ob1, _ = ev(big, b[0], 0)
    print(f"{sk}: n {len(te)} c_falta {b[0]:.3f} c_vuelve {b[1]:.3f} | aciertos {o0}->{o1}->{o2} ({100*o0/len(te):.1f}%->{100*o1/len(te):.1f}%) | pérdida {l0/len(te):.4f}->{l1/len(te):.4f}->{l2/len(te):.4f} | con 15+ de dif: {len(big)} juegos {ob0}->{ob1}")
    tot['n'] += len(te); tot['o0'] += o0; tot['o1'] += o1; tot['o2'] += o2; tot['l0'] += l0; tot['l1'] += l1; tot['l2'] += l2; tot['bn'] += len(big); tot['b0'] += ob0; tot['b1'] += ob1
print('TOTAL', dict(tot), 'aciertos %.2f%% -> %.2f%% -> %.2f%%' % (100*tot['o0']/tot['n'], 100*tot['o1']/tot['n'], 100*tot['o2']/tot['n']), 'pérdida %.4f -> %.4f -> %.4f' % (tot['l0']/tot['n'], tot['l1']/tot['n'], tot['l2']/tot['n']))
print('ajuste con todo:', ajuste(rows))

# ---- ¿suma también encima de la mezcla con ESPN (lo que usa hoy la app: 0.7 ESPN + 0.3 modelo, en logit)?
E = {x['id']: x['h'] for x in json.load(open(sys.argv[3]))} if len(sys.argv) > 3 else {}
lg = lambda p: math.log(max(min(p,1-1e-4),1e-4)/(1-max(min(p,1-1e-4),1e-4))); sig = lambda z: 1/(1+math.exp(-z))
def pmod(r, c1):
    pm = r['pm'] + c1*(r['fa']-r['fh']); p = 1-Phi((0.5-pm)/r['sM']); a = Phi((-0.5-pm)/r['sM']); return p/(p+a)
tt = collections.Counter(); D = []
for sk in S[1:]:
    tr = [r for r in rows if r['sk'] < sk]; te = [r for r in rows if r['sk'] == sk and r['id'] in E and r['mar'] != 0]
    b = ajuste(tr)
    o0=o1=0; l0=l1=0
    for r in te:
        e = E[r['id']]; y = r['mar'] > 0
        p0 = sig(0.3*lg(pmod(r,0)) + 0.7*lg(e)); p1 = sig(0.3*lg(pmod(r,b[0])) + 0.7*lg(e))
        o0 += (p0>=0.5)==y; o1 += (p1>=0.5)==y
        a0 = -math.log(p0 if y else 1-p0); a1 = -math.log(p1 if y else 1-p1); l0 += a0; l1 += a1; D.append(a0-a1)
    print(f"mezcla ESPN {sk}: n {len(te)} aciertos {o0}->{o1} ({100*o0/len(te):.1f}%->{100*o1/len(te):.1f}%) pérdida {l0/len(te):.4f}->{l1/len(te):.4f}")
    tt['n']+=len(te); tt['o0']+=o0; tt['o1']+=o1
D = np.array(D); print('mezcla ESPN total: aciertos %.2f%% -> %.2f%%' % (100*tt['o0']/tt['n'], 100*tt['o1']/tt['n']), 'z pérdida %.2f' % (D.mean()/D.std()*math.sqrt(len(D))))

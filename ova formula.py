# ova_formula.py — fórmula de OVA portada a Python, versión corregida
# Replica index.html: eraUsado() (regresión en dos capas vía FIP-ancla),
# rgUsado() + splits de mano, y el cálculo de un solo delta (perspectiva local).

import requests
from datetime import datetime, timedelta

MLB_API = "https://statsapi.mlb.com/api/v1"

PESO_ABRIDOR = 0.65
PESO_OFENSIVA = 0.50
PESO_BULLPEN = 0.25
BONUS_LOCAL = 0.12
MULTIPLICADOR = 6
TECHO_CHANCE = 0.78   # corregido: la app real topa en 78/22, no 68/32
PISO_CHANCE = 0.22
F5_FRAC = 0.56
KELLY_FRACCION = 0.25
PRIOR_ERA = 40  # innings de liga que se le suman a un abridor antes de creerle su ERA

_LIGA_ERA_CACHE = {}


def ip_a_outs(ip_str):
    s = str(ip_str)
    partes = s.split(".")
    entero = int(partes[0]) if partes[0] else 0
    frac = int(partes[1]) if len(partes) > 1 else 0
    return entero * 3 + (1 if frac == 1 else 2 if frac == 2 else 0)


def outs_a_ip(outs):
    return outs / 3


def liga_era(season):
    """ERA promedio de toda la liga esta temporada — ancla del prior."""
    if season in _LIGA_ERA_CACHE:
        return _LIGA_ERA_CACHE[season]
    url = f"{MLB_API}/teams/stats?stats=season&group=pitching&season={season}&sportIds=1&gameType=R"
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    splits = r.json().get("stats", [{}])[0].get("splits", [])
    er = ip = 0.0
    for s in splits:
        st = s["stat"]
        er += float(st.get("earnedRuns", 0))
        ip += outs_a_ip(ip_a_outs(st.get("inningsPitched", "0.0")))
    val = (er * 9 / ip) if ip > 0 else 4.10
    _LIGA_ERA_CACHE[season] = val
    return val


def era_temporada_pitcher(pitcher_id, season):
    """ERA de temporada + los insumos de FIP (HR, BB, HBP, K)."""
    url = f"{MLB_API}/people/{pitcher_id}/stats?stats=season&group=pitching&season={season}"
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    data = r.json()
    try:
        stat = data["stats"][0]["splits"][0]["stat"]
    except (KeyError, IndexError):
        return {"era": None, "ip": 0, "fip": None}
    ip = outs_a_ip(ip_a_outs(stat.get("inningsPitched", "0.0")))
    era = float(stat["era"]) if stat.get("era") not in (None, "-.--") else None
    hr = float(stat.get("homeRuns", 0))
    bb = float(stat.get("baseOnBalls", 0))
    hbp = float(stat.get("hitByPitch", 0))
    so = float(stat.get("strikeOuts", 0))
    fip = (13 * hr + 3 * (bb + hbp) - 2 * so) / ip + 3.15 if ip >= 10 else None
    return {"era": era, "ip": ip, "fip": fip}


def ultimas_5_salidas(pitcher_id, season):
    url = f"{MLB_API}/people/{pitcher_id}/stats?stats=gameLog&group=pitching&season={season}"
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    data = r.json()
    try:
        splits = data["stats"][0]["splits"]
    except (KeyError, IndexError):
        return []
    splits_ordenados = sorted(splits, key=lambda s: s["date"], reverse=True)
    salidas = []
    for s in splits_ordenados[:5]:
        st = s["stat"]
        salidas.append({"ip": st.get("inningsPitched", "0.0"), "er": st.get("earnedRuns", 0)})
    return salidas


def era_ultimas5(salidas):
    if not salidas:
        return {"era": None, "ip": 0}
    outs = sum(ip_a_outs(s["ip"]) for s in salidas)
    er = sum(s["er"] for s in salidas)
    ip = outs_a_ip(outs)
    era = (er * 9 / ip) if ip > 0 else None
    return {"era": era, "ip": ip}


def reg(era, ip, prior, ancla):
    """Regresión clásica: (era*ip + ancla*prior) / (ip+prior)."""
    if era is None:
        return None
    L = ancla if ancla is not None else 4.10
    return (era * ip + L * prior) / (ip + prior)


def era_usado(temp, ultimas5, season):
    """Replica eraUsado() de OVA — regresión en DOS capas:
    1) el FIP se regresa hacia el ERA de liga (prior fijo de 30 innings) -> ancla
    2) el ERA de temporada y el de últimas 5 se regresan hacia ESA ancla
       (no directo al ERA de liga), con priors de 40 y 25 innings.
    3) mezcla final: 70% temporada + 30% últimas 5 (modo "mix", el default de la app)."""
    L = liga_era(season)
    anc = None
    if temp["fip"] is not None and temp["ip"] > 0:
        anc = (temp["fip"] * temp["ip"] + L * 30) / (temp["ip"] + 30)
    s = reg(temp["era"], temp["ip"], PRIOR_ERA, anc)
    l = reg(ultimas5["era"], ultimas5["ip"], PRIOR_ERA * 0.625, anc)
    if s is not None and l is not None:
        return s * 0.70 + l * 0.30
    return s if s is not None else l


def ofensiva_temporada(team_id, season):
    url = f"{MLB_API}/teams/{team_id}/stats?stats=season&group=hitting&season={season}&gameType=R"
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    try:
        st = r.json()["stats"][0]["splits"][0]["stat"]
    except (KeyError, IndexError):
        return {"rg": None, "ops": None}
    g = float(st.get("gamesPlayed", 0))
    runs = float(st.get("runs", 0))
    ops = float(st["ops"]) if st.get("ops") is not None else None
    return {"rg": (runs / g if g > 0 else None), "ops": ops}


def ofensiva_14dias(team_id, fecha_dt, season):
    ini = (fecha_dt - timedelta(days=14)).strftime("%Y-%m-%d")
    fin = (fecha_dt - timedelta(days=1)).strftime("%Y-%m-%d")
    url = (f"{MLB_API}/teams/{team_id}/stats?stats=byDateRange&startDate={ini}"
           f"&endDate={fin}&group=hitting&season={season}&gameType=R")
    r = requests.get(url, timeout=15)
    if not r.ok:
        return {"rg": None}
    try:
        st = r.json()["stats"][0]["splits"][0]["stat"]
    except (KeyError, IndexError):
        return {"rg": None}
    g = float(st.get("gamesPlayed", 0))
    runs = float(st.get("runs", 0))
    return {"rg": (runs / g if g >= 5 else None)}  # umbral mínimo de 5 juegos, igual que la app


def rg_usado(temp_off, off14):
    """70% temporada + 30% últimos 14 días (antes de aplicar el split de mano)."""
    if off14 is None or off14.get("rg") is None:
        return temp_off["rg"]
    if temp_off["rg"] is None:
        return off14["rg"]
    return temp_off["rg"] * 0.70 + off14["rg"] * 0.30


def mano_pitcher(pitcher_id):
    url = f"{MLB_API}/people/{pitcher_id}"
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    try:
        return r.json()["people"][0]["pitchHand"]["code"]
    except (KeyError, IndexError):
        return None


def split_ofensivo(team_id, mano_rival, season):
    """OPS del equipo bateando contra la mano del abridor rival."""
    if mano_rival not in ("L", "R"):
        return None
    sit = "vl" if mano_rival == "L" else "vr"
    url = (f"{MLB_API}/teams/{team_id}/stats?stats=statSplits&sitCodes={sit}"
           f"&group=hitting&season={season}&sportIds=1&gameType=R")
    r = requests.get(url, timeout=15)
    if not r.ok:
        return None
    try:
        return float(r.json()["stats"][0]["splits"][0]["stat"]["ops"])
    except (KeyError, IndexError, TypeError):
        return None


def f_split(ops_vs_mano, ops_total):
    """Factor acotado 0.90–1.10 que ajusta las carreras por juego según el split de mano."""
    if ops_vs_mano is None or not ops_total:
        return 1.0
    f = ops_vs_mano / ops_total
    return max(0.90, min(1.10, f))


def bullpen_era(team_id, season):
    """Intenta el split real de relevistas; si no está disponible, cae al ERA del staff completo (aprox=True)."""
    url = (f"{MLB_API}/teams/{team_id}/stats?stats=statSplits&sitCodes=rp"
           f"&group=pitching&season={season}&gameType=R")
    r = requests.get(url, timeout=15)
    if r.ok:
        try:
            v = r.json()["stats"][0]["splits"][0]["stat"].get("era")
            if v not in (None, "-.--"):
                return {"era": float(v), "aprox": False}
        except (KeyError, IndexError):
            pass
    url2 = f"{MLB_API}/teams/{team_id}/stats?stats=season&group=pitching&season={season}&gameType=R"
    r2 = requests.get(url2, timeout=15)
    r2.raise_for_status()
    try:
        v2 = r2.json()["stats"][0]["splits"][0]["stat"].get("era")
        return {"era": float(v2) if v2 not in (None, "-.--") else None, "aprox": True}
    except (KeyError, IndexError):
        return {"era": None, "aprox": True}


def cuota_justa_americana(chance):
    if chance <= 0 or chance >= 1:
        return None
    if chance >= 0.5:
        return -round((chance / (1 - chance)) * 100)
    return round(((1 - chance) / chance) * 100)


# ---------- calendario del día ----------

def juegos_de_hoy(fecha=None):
    fecha = fecha or datetime.now().strftime("%Y-%m-%d")
    url = f"{MLB_API}/schedule?sportId=1&date={fecha}&hydrate=probablePitcher,team,linescore"
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    data = r.json()
    juegos = []
    for fd in data.get("dates", []):
        for g in fd.get("games", []):
            juegos.append({
                "gamePk": g["gamePk"],
                "gameDate": g["gameDate"],
                "status": g["status"]["abstractGameState"],
                "home_id": g["teams"]["home"]["team"]["id"],
                "away_id": g["teams"]["away"]["team"]["id"],
                "home_name": g["teams"]["home"]["team"]["name"],
                "away_name": g["teams"]["away"]["team"]["name"],
                "home_pitcher": g["teams"]["home"].get("probablePitcher"),
                "away_pitcher": g["teams"]["away"].get("probablePitcher"),
            })
    return juegos


def lineup_confirmado(juego):
    return bool(juego.get("home_pitcher")) and bool(juego.get("away_pitcher"))


# ---------- orquestador: analiza un juego completo ----------

def analizar_juego(juego, season):
    if not lineup_confirmado(juego):
        return {"gamePk": juego["gamePk"], "estado": "pendiente_lineup"}

    home_pid = juego["home_pitcher"]["id"]
    away_pid = juego["away_pitcher"]["id"]
    fecha_dt = datetime.strptime(juego["gameDate"][:10], "%Y-%m-%d")

    temp_h = era_temporada_pitcher(home_pid, season)
    temp_a = era_temporada_pitcher(away_pid, season)
    u5_h = era_ultimas5(ultimas_5_salidas(home_pid, season))
    u5_a = era_ultimas5(ultimas_5_salidas(away_pid, season))

    era_h = era_usado(temp_h, u5_h, season)
    era_a = era_usado(temp_a, u5_a, season)

    off_h = ofensiva_temporada(juego["home_id"], season)
    off_a = ofensiva_temporada(juego["away_id"], season)
    off14_h = ofensiva_14dias(juego["home_id"], fecha_dt, season)
    off14_a = ofensiva_14dias(juego["away_id"], fecha_dt, season)
    rg_h = rg_usado(off_h, off14_h)
    rg_a = rg_usado(off_a, off14_a)

    mano_h = mano_pitcher(home_pid)
    mano_a = mano_pitcher(away_pid)
    split_h = split_ofensivo(juego["home_id"], mano_a, season)  # local vs mano del abridor visitante
    split_a = split_ofensivo(juego["away_id"], mano_h, season)  # visita vs mano del abridor local
    f_h = f_split(split_h, off_h["ops"])
    f_a = f_split(split_a, off_a["ops"])
    rg_h_final = rg_h * f_h if rg_h is not None else None
    rg_a_final = rg_a * f_a if rg_a is not None else None

    bp_h = bullpen_era(juego["home_id"], season)
    bp_a = bullpen_era(juego["away_id"], season)

    if None in (era_h, era_a, rg_h_final, rg_a_final, bp_h["era"], bp_a["era"]):
        return {"gamePk": juego["gamePk"], "estado": "datos_incompletos"}

    # UN SOLO delta, desde la perspectiva del LOCAL (con su bono de localía).
    # El del visitante es 100 - local, no un cálculo aparte.
    p1 = (era_a - era_h) * PESO_ABRIDOR
    p2 = (rg_h_final - rg_a_final) * PESO_OFENSIVA
    p3 = (bp_a["era"] - bp_h["era"]) * PESO_BULLPEN
    delta = p1 + p2 + p3 + BONUS_LOCAL

    chance_home = 0.5 + (delta * MULTIPLICADOR / 100)
    chance_home = max(PISO_CHANCE, min(TECHO_CHANCE, chance_home))
    chance_away = 1 - chance_home

    return {
        "gamePk": juego["gamePk"],
        "estado": "listo",
        "delta": round(delta, 3),
        "home": {
            "nombre": juego["home_name"],
            "chance": round(chance_home * 100, 1),
            "cuota_justa": cuota_justa_americana(chance_home),
            "era_usado": round(era_h, 2), "rg_usado": round(rg_h_final, 2),
            "bullpen_era": round(bp_h["era"], 2), "bullpen_aprox": bp_h["aprox"],
        },
        "away": {
            "nombre": juego["away_name"],
            "chance": round(chance_away * 100, 1),
            "cuota_justa": cuota_justa_americana(chance_away),
            "era_usado": round(era_a, 2), "rg_usado": round(rg_a_final, 2),
            "bullpen_era": round(bp_a["era"], 2), "bullpen_aprox": bp_a["aprox"],
        },
        "f5_frac": F5_FRAC,
    }
    # Pendiente de la próxima ronda: la penalización por bullpen quemado
    # (relevistas que lanzaron 2+ días seguidos, -0.15/-0.08 carreras al delta)
    # — no está en esta versión todavía.

#!/usr/bin/env python3
"""Junta os leads do exterior numa planilha para o dashboard (Prospecção → 🌍 Exterior).

Puxa do GitHub o estado dos robôs de e-mail (Portugal e EUA), lê o leads.sql de cada um e a lista de Lisboa sem site e grava
`~/Projetos/Prospecção/Leads do exterior - dashboard.csv`. No dashboard: Prospecção →
Importar planilha → esse arquivo. Reimportar não duplica e só avança a situação
(ex.: "A contatar" → "Aguardando resposta" quando o robô manda o e-mail).

Uso: python3 scripts/leads-exterior.py
"""
import csv, json, sqlite3, subprocess
from pathlib import Path

BASE = Path.home() / "Projetos" / "Prospecção"
SAIDA = BASE / "Leads do exterior - dashboard.csv"

# estado no robô → situação no dashboard
SITUACAO = {
    "auditado": "A contatar", "rever": "A contatar", "fila": "A contatar", "vetado": "A contatar",
    "enviado": "Aguardando resposta", "followup": "Follow-up enviado", "respondeu": "Em conversa",
    "bounce": "Não deu certo", "descartado": "Não deu certo",
}
NOTA = {
    "fila": "Na fila do robô de e-mail.", "vetado": "Vetado no robô de e-mail.",
    "rever": "Robô: e-mail para revisar.", "bounce": "E-mail voltou (bounce).",
}
COLS = ["Nome", "Nicho", "Telefone", "E-mail", "País", "Cidade", "Bairro", "Endereço",
        "Site", "Demo", "Google Maps", "Situação", "Data", "Obs"]


def do_robo(pasta, pais, maps_por_email):
    # o estado mais novo é o leads.sql que o robô da nuvem commita: puxa do GitHub e lê ele
    repo = BASE / pasta
    r = subprocess.run(["git", "-C", str(repo), "pull", "-q", "--ff-only"], capture_output=True, text=True)
    if r.returncode: print(f"(não consegui atualizar {pasta} do GitHub, uso a cópia local)")
    sql, db = repo / "leads.sql", repo / "leads.sqlite"
    if sql.exists():
        con = sqlite3.connect(":memory:"); con.executescript(sql.read_text(encoding="utf-8"))
    elif db.exists():
        con = sqlite3.connect(db)
    else:
        print(f"(sem {sql})"); return []
    con.row_factory = sqlite3.Row
    out = []
    for r in con.execute("select * from leads order by ordem, id"):
        estado = r["estado"]
        dados = json.loads(r["dados"] or "{}")
        data = (r["respondeu_em"] or r["followup_em"] or r["enviado_em"] or "")[:10]
        obs = [NOTA.get(estado, "")]
        if r["problemas_txt"]: obs.append(f"Site: {r['problemas_txt']}.")
        if r["obs"] == "fala_pt": obs.append("Atende em português.")
        elif r["obs"]: obs.append(r["obs"])
        out.append({
            "Nome": r["nome"], "Nicho": (r["nicho"] or "").capitalize(), "Telefone": r["tel"] or "",
            "E-mail": r["email"], "País": pais, "Cidade": r["cidade"] or "",
            "Bairro": dados.get("zona", ""), "Endereço": r["morada"] or "", "Site": r["site"] or "",
            "Demo": r["demo_url"] or "", "Google Maps": maps_por_email.get((r["email"] or "").lower(), ""),
            "Situação": SITUACAO.get(estado, "A contatar"), "Data": data,
            "Obs": " ".join(o for o in obs if o),
        })
    con.close()
    return out


def lisboa_sem_site():
    f = BASE / "leads-dentistas-lisboa-sem-site.csv"
    if not f.exists(): return []
    out = []
    with open(f, encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            out.append({
                "Nome": r["Nome"], "Nicho": "Dentista", "Telefone": r["Telefone"], "E-mail": "",
                "País": "Portugal", "Cidade": "Lisboa", "Bairro": r["Zona"], "Endereço": r["Endereço"],
                "Site": "", "Demo": "", "Google Maps": r["Google Maps"], "Situação": "A contatar",
                "Data": "", "Obs": "Sem site.",
            })
    return out


def maps_eua():
    f = BASE / "eua" / "leads-dentistas-eua.csv"
    if not f.exists(): return {}
    with open(f, encoding="utf-8-sig") as fh:
        return {r["email"].lower(): r["maps"] for r in csv.DictReader(fh) if r.get("email")}


linhas = do_robo("automacao-pt", "Portugal", {}) + lisboa_sem_site() + do_robo("automacao-eua", "EUA", maps_eua())
with open(SAIDA, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=COLS); w.writeheader(); w.writerows(linhas)

por = {}
for l in linhas: por.setdefault((l["País"], l["Situação"]), 0); por[(l["País"], l["Situação"])] += 1
print(f"{len(linhas)} leads → {SAIDA}")
for (p, s), n in sorted(por.items()): print(f"  {p:9} {s:22} {n}")

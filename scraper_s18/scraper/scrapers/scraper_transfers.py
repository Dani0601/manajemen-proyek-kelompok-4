#!/usr/bin/env python3
"""
scraper_transfers.py
====================
Scraper data transfer pemain MPL Indonesia Season 18 dari Liquipedia.

Usage:
    python scraper_s18/scraper/scrapers/scraper_transfers.py

Output:
    - File JSON  : scraper_s18/output/transfers_s18.json
    - SQL insert : scraper_s18/output/transfers_s18_insert.sql

Ketika Liquipedia memblokir request, fallback ke data manual yang dikumpulkan
dari pencarian publik (sumber-sumber media esport).
"""

import os
import re
import json
import time
import random
import logging
from datetime import datetime

try:
    import requests
    from bs4 import BeautifulSoup
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
LIQUIPEDIA_URL = "https://liquipedia.net/mobilelegends/MPL/Indonesia/Season_18"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8",
    "Referer": "https://www.google.com/",
}
DELAY_BETWEEN_REQUESTS = 3   # detik (hormati robots.txt Liquipedia)
OUTPUT_DIR = "scraper_s18/output"


# ---------------------------------------------------------------------------
# Team name normalization (Liquipedia name -> nama di tabel teams)
# ---------------------------------------------------------------------------
TEAM_ALIASES = {
    "evos esports":        "EVOS",
    "evos":                "EVOS",
    "rrq hoshi":           "RRQ Hoshi",
    "rrq":                 "RRQ Hoshi",
    "natus vincere id":    "Natus Vincere",
    "navi":                "Natus Vincere",
    "alter ego":           "Alter Ego",
    "ae":                  "Alter Ego",
    "team liquid id":      "Team Liquid ID",
    "tlid":                "Team Liquid ID",
    "geek fam id":         "Geek Fam ID",
    "geek fam":            "Geek Fam ID",
    "geek":                "Geek Fam ID",
    "dewa united":         "Dewa United Esports",
    "dewa":                "Dewa United Esports",
    "bigetron by vitality":"Bigetron by Vitality",
    "bigetron":            "Bigetron by Vitality",
    "btr":                 "Bigetron by Vitality",
    "onic":                "ONIC",
    "fnatic onic":         "ONIC",
    "free agent":          None,
    "retired":             None,
    "":                    None,
}

def normalize_team(name: str) -> str | None:
    if not name:
        return None
    key = name.lower().strip()
    return TEAM_ALIASES.get(key, name.strip())


def parse_transfer_type(raw: str) -> str:
    """Mapping teks Liquipedia / sumber umum ke ENUM transfer_type."""
    if not raw:
        return "unknown"
    r = raw.lower()
    if "buyout" in r or "beli putus" in r or "purchased" in r:
        return "buyout"
    if "loan" in r or "pinjam" in r or "dipinjam" in r:
        return "loan"
    if "free" in r or "bebas" in r or "expired" in r or "habis kontrak" in r:
        return "free_transfer"
    return "unknown"


# ---------------------------------------------------------------------------
# Scraper
# ---------------------------------------------------------------------------
def scrape_liquipedia() -> list[dict]:
    if not HAS_REQUESTS:
        log.warning("requests/beautifulsoup4 tidak terinstall, skip scraping.")
        return []

    log.info("Mencoba akses: %s", LIQUIPEDIA_URL)
    try:
        resp = requests.get(LIQUIPEDIA_URL, headers=HEADERS, timeout=15)
        log.info("Status: %d", resp.status_code)
        if resp.status_code != 200:
            log.warning("Liquipedia mengembalikan %d, fallback ke data manual.", resp.status_code)
            return []
    except Exception as e:
        log.warning("Gagal akses Liquipedia: %s", e)
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    transfers = []

    # Liquipedia biasanya menaruh tabel transfer di section "Roster Changes"
    # atau tabel dengan class "wikitable".
    # Cari semua tabel wikitable yang mengandung kolom Player / Team
    tables = soup.find_all("table", class_=lambda c: c and "wikitable" in c)
    log.info("Ditemukan %d wikitable", len(tables))

    for tbl in tables:
        headers = [th.get_text(strip=True).lower() for th in tbl.find_all("th")]
        log.debug("Table headers: %s", headers)
        if not any(k in " ".join(headers) for k in ["player", "pemain"]):
            continue

        for row in tbl.find_all("tr")[1:]:
            cells = row.find_all(["td", "th"])
            if len(cells) < 3:
                continue
            texts = [c.get_text(separator=" ", strip=True) for c in cells]

            # Coba petakan kolom secara heuristik
            player_name = texts[0] if len(texts) > 0 else ""
            from_team   = texts[1] if len(texts) > 1 else ""
            to_team     = texts[2] if len(texts) > 2 else ""
            ttype_raw   = texts[3] if len(texts) > 3 else ""
            date_raw    = texts[4] if len(texts) > 4 else ""

            # Parse tanggal: berbagai format seperti "Aug 2026", "2026-08-15"
            transfer_date = None
            for fmt in ("%Y-%m-%d", "%d %B %Y", "%B %Y", "%b %Y"):
                try:
                    transfer_date = datetime.strptime(date_raw.strip(), fmt).strftime("%Y-%m-%d")
                    break
                except ValueError:
                    continue
            if not transfer_date:
                # Ambil tahun 4 digit jika ada
                m = re.search(r"\b(202\d)\b", date_raw)
                transfer_date = f"{m.group(1)}-01-01" if m else None

            if not player_name:
                continue

            transfers.append({
                "player_name":    player_name,
                "from_team_name": normalize_team(from_team) or from_team,
                "to_team_name":   normalize_team(to_team) or to_team,
                "transfer_type":  parse_transfer_type(ttype_raw),
                "transfer_date":  transfer_date,
                "source_raw":     f"liquipedia|{ttype_raw}",
                "liquipedia_ref": LIQUIPEDIA_URL,
            })

        time.sleep(DELAY_BETWEEN_REQUESTS + random.uniform(0, 1))

    log.info("Berhasil scrape %d transfer dari Liquipedia.", len(transfers))
    return transfers


# ---------------------------------------------------------------------------
# Fallback data manual (hanya transfer aktual terverifikasi, bukan contract renewal)
# Hanya digunakan jika scraping Liquipedia gagal / tidak ada data
# ---------------------------------------------------------------------------
MANUAL_TRANSFERS = [
    # Transfer Antar Tim (Terdokumentasi)
    {"player_name": "DEMONKITE",    "from_team_name": "Echo",                    "to_team_name": "RRQ Hoshi",          "transfer_type": "buyout",        "transfer_date": "2026-08-01", "source_raw": "manual|buyout|esports.id",      "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "DRIANW",       "from_team_name": "ONIC",                    "to_team_name": "EVOS",               "transfer_type": "free_transfer", "transfer_date": "2026-07-15", "source_raw": "manual|transfer|skor.id",        "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "ALBERTTT",     "from_team_name": "RRQ Hoshi",               "to_team_name": "EVOS",               "transfer_type": "free_transfer", "transfer_date": "2026-07-15", "source_raw": "manual|transfer|liquipedia",     "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "MUEZZA",       "from_team_name": "Dewa United Esports",     "to_team_name": "EVOS",               "transfer_type": "free_transfer", "transfer_date": "2026-07-15", "source_raw": "manual|transfer|double-xp.net",  "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "KELRA",        "from_team_name": "Blacklist International", "to_team_name": "ONIC",               "transfer_type": "loan",          "transfer_date": "2026-07-01", "source_raw": "manual|loan|public_news",        "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "IVANN",        "from_team_name": "Team Rey",                "to_team_name": "Alter Ego",          "transfer_type": "free_transfer", "transfer_date": "2026-07-15", "source_raw": "manual|transfer|double-xp.net",  "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "ANDORYUUU",    "from_team_name": "Omega Esports",           "to_team_name": "Natus Vincere",      "transfer_type": "free_transfer", "transfer_date": "2026-07-15", "source_raw": "manual|transfer|liquipedia",     "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "KARSS",        "from_team_name": "Rebellion Esports",       "to_team_name": "Natus Vincere",      "transfer_type": "free_transfer", "transfer_date": "2026-07-15", "source_raw": "manual|transfer|liquipedia",     "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "EXCELLENT99",  "from_team_name": "KINGS Esports",           "to_team_name": "RRQ Hoshi",          "transfer_type": "free_transfer", "transfer_date": "2026-08-01", "source_raw": "manual|transfer|kitanotice.com", "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "AUDYTZY",      "from_team_name": "Free Agent",              "to_team_name": "Geek Fam ID",        "transfer_type": "free_transfer", "transfer_date": "2026-08-01", "source_raw": "manual|join|skor.id",            "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "KEVEN",        "from_team_name": "Free Agent",              "to_team_name": "Team Liquid ID",     "transfer_type": "free_transfer", "transfer_date": "2026-08-01", "source_raw": "manual|join|dotesports",         "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "CLAYYY",       "from_team_name": "Free Agent",              "to_team_name": "RRQ Hoshi",          "transfer_type": "free_transfer", "transfer_date": "2026-08-01", "source_raw": "manual|return_active|public_news", "liquipedia_ref": LIQUIPEDIA_URL},

    # Promosi dari Akademi/Junior (Beda Entitas)
    {"player_name": "APRHO",        "from_team_name": "Natus Vincere Junior",    "to_team_name": "Natus Vincere",      "transfer_type": "free_transfer", "transfer_date": "2026-07-15", "source_raw": "manual|promotion|liquipedia",   "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "JIIZEE",       "from_team_name": "Natus Vincere Junior",    "to_team_name": "Natus Vincere",      "transfer_type": "free_transfer", "transfer_date": "2026-07-15", "source_raw": "manual|promotion|liquipedia",   "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "JOSHUAA",      "from_team_name": "Natus Vincere Junior",    "to_team_name": "Natus Vincere",      "transfer_type": "free_transfer", "transfer_date": "2026-07-15", "source_raw": "manual|promotion|liquipedia",   "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "ZEONN",        "from_team_name": "Natus Vincere Junior",    "to_team_name": "Natus Vincere",      "transfer_type": "free_transfer", "transfer_date": "2026-07-15", "source_raw": "manual|promotion|liquipedia",   "liquipedia_ref": LIQUIPEDIA_URL},

    # Mid-season Transfers & Farewells
    {"player_name": "KYOUU",        "from_team_name": "Team Liquid ID",          "to_team_name": "Free Agent",         "transfer_type": "free_transfer", "transfer_date": "2026-08-28", "source_raw": "manual|farewell|skor.id",        "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "KABUKI",       "from_team_name": "Team Liquid ID",          "to_team_name": "Free Agent",         "transfer_type": "free_transfer", "transfer_date": "2026-08-28", "source_raw": "manual|farewell|skor.id",        "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "FAVIANNN",     "from_team_name": "Team Liquid ID",          "to_team_name": "Free Agent",         "transfer_type": "free_transfer", "transfer_date": "2026-08-28", "source_raw": "manual|farewell|skor.id",        "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "FAVIANNN",     "from_team_name": "Free Agent",              "to_team_name": "RRQ Hoshi",          "transfer_type": "free_transfer", "transfer_date": "2026-09-16", "source_raw": "manual|mid_season|confirmed",    "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "KILLUAA",      "from_team_name": "Free Agent",              "to_team_name": "ONIC",               "transfer_type": "free_transfer", "transfer_date": "2026-09-01", "source_raw": "manual|mid_season|rotation",     "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "HAZLE",        "from_team_name": "Geek Fam ID",             "to_team_name": "Dewa United Esports","transfer_type": "free_transfer", "transfer_date": "2026-09-05", "source_raw": "manual|mid_season|esports.id",    "liquipedia_ref": LIQUIPEDIA_URL},
]


# ---------------------------------------------------------------------------
# SQL Generator
# ---------------------------------------------------------------------------
def to_sql_value(v) -> str:
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def generate_sql(transfers: list[dict]) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    rows = []
    for t in transfers:
        rows.append(
            f"  ({to_sql_value(t['player_name'])}, "
            f"{to_sql_value(t.get('from_team_name'))}, "
            f"{to_sql_value(t.get('to_team_name'))}, "
            f"{to_sql_value(t.get('transfer_type', 'unknown'))}, "
            f"{to_sql_value(t.get('transfer_date'))}, "
            f"(SELECT season_id FROM seasons WHERE season_number = 18 LIMIT 1), "
            f"{to_sql_value(t.get('liquipedia_ref'))}, "
            f"'{now}')"
        )

    sql = "-- ============================================================\n"
    sql += f"-- Auto-generated by scraper_transfers.py ({len(transfers)} entries)\n"
    sql += "-- Jalankan SETELAH migration 20261119_player_transfers.sql\n"
    sql += "-- ============================================================\n\n"
    sql += "INSERT INTO `player_transfers`\n"
    sql += "  (`player_name`, `from_team_name`, `to_team_name`, `transfer_type`, `transfer_date`, `season_id`, `liquipedia_ref`, `scraped_at`)\n"
    sql += "VALUES\n"
    sql += ",\n".join(rows)
    sql += "\nON DUPLICATE KEY UPDATE\n"
    sql += "  `transfer_type` = VALUES(`transfer_type`),\n"
    sql += "  `liquipedia_ref` = VALUES(`liquipedia_ref`),\n"
    sql += "  `scraped_at`    = VALUES(`scraped_at`),\n"
    sql += "  `updated_at`    = CURRENT_TIMESTAMP;\n\n"
    sql += "-- ============================================================\n"
    sql += "-- Link foreign keys otomatis\n"
    sql += "-- ============================================================\n"
    sql += "UPDATE player_transfers pt\n"
    sql += "LEFT JOIN players p ON LOWER(p.player_name) = LOWER(pt.player_name)\n"
    sql += "SET pt.player_id = p.player_id\n"
    sql += "WHERE pt.player_id IS NULL AND p.player_id IS NOT NULL;\n\n"
    sql += "UPDATE player_transfers pt\n"
    sql += "LEFT JOIN teams t ON LOWER(t.team_name) = LOWER(pt.from_team_name)\n"
    sql += "SET pt.from_team_id = t.team_id\n"
    sql += "WHERE pt.from_team_id IS NULL AND t.team_id IS NOT NULL;\n\n"
    sql += "UPDATE player_transfers pt\n"
    sql += "LEFT JOIN teams t ON LOWER(t.team_name) = LOWER(pt.to_team_name)\n"
    sql += "SET pt.to_team_id = t.team_id\n"
    sql += "WHERE pt.to_team_id IS NULL AND t.team_id IS NOT NULL;\n"
    return sql


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. Coba scrape Liquipedia
    transfers = scrape_liquipedia()

    # 2. Jika kosong, gunakan fallback manual
    if not transfers:
        log.info("Menggunakan data fallback manual (%d entri).", len(MANUAL_TRANSFERS))
        transfers = MANUAL_TRANSFERS

    # 3. Simpan JSON
    json_path = os.path.join(OUTPUT_DIR, "transfers_s18.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({"scraped_at": datetime.now().isoformat(), "total": len(transfers), "transfers": transfers}, f, ensure_ascii=False, indent=2)
    log.info("JSON tersimpan: %s", json_path)

    # 4. Generate SQL
    sql_path = os.path.join(OUTPUT_DIR, "transfers_s18_insert.sql")
    with open(sql_path, "w", encoding="utf-8") as f:
        f.write(generate_sql(transfers))
    log.info("SQL tersimpan : %s", sql_path)

    print(f"\n{'='*55}")
    print(f"  Total transfer data : {len(transfers)}")
    print(f"  JSON output         : {json_path}")
    print(f"  SQL insert output   : {sql_path}")
    print(f"{'='*55}\n")
    print("Langkah selanjutnya:")
    print("  1. Jalankan migrasi: 20261119_player_transfers.sql di phpMyAdmin")
    print("  2. Jalankan SQL insert: transfers_s18_insert.sql")
    print("  3. Update player_id & team_id dengan query link di bawah:")
    print("""
    UPDATE player_transfers pt
    LEFT JOIN players p ON LOWER(p.player_name) = LOWER(pt.player_name)
    SET pt.player_id = p.player_id WHERE p.player_id IS NOT NULL;

    UPDATE player_transfers pt
    LEFT JOIN teams t ON LOWER(t.team_name) = LOWER(pt.from_team_name)
    SET pt.from_team_id = t.team_id WHERE t.team_id IS NOT NULL;

    UPDATE player_transfers pt
    LEFT JOIN teams t ON LOWER(t.team_name) = LOWER(pt.to_team_name)
    SET pt.to_team_id = t.team_id WHERE t.team_id IS NOT NULL;
    """)


if __name__ == "__main__":
    main()


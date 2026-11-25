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
LIQUIPEDIA_API_URL = "https://liquipedia.net/mobilelegends/api.php"
LIQUIPEDIA_PAGE = "MPL/Indonesia/Season_18"
HEADERS = {
    "User-Agent": "MPLAnalyticProject/1.0 (academic-project)",
    "Accept": "application/json",
}
DELAY_BETWEEN_REQUESTS = 3   # detik (hormati rate limit Liquipedia API)
OUTPUT_DIR = "scraper_s18/output"


# ---------------------------------------------------------------------------
# Team name normalization (Liquipedia name -> nama di tabel teams)
# ---------------------------------------------------------------------------
TEAM_ALIASES = {
    "evos esports":           "EVOS",
    "evos":                   "EVOS",
    "rrq hoshi":              "RRQ Hoshi",
    "rrq":                    "RRQ Hoshi",
    "natus vincere id":       "Natus Vincere",
    "natus vincere":          "Natus Vincere",
    "navi":                   "Natus Vincere",
    "alter ego":              "Alter Ego",
    "ae":                     "Alter Ego",
    "team liquid id":         "Team Liquid ID",
    "tlid":                   "Team Liquid ID",
    "geek fam id":            "Geek Fam ID",
    "geek fam":               "Geek Fam ID",
    "geek":                   "Geek Fam ID",
    "dewa united esports":    "Dewa United Esports",
    "dewa united":            "Dewa United Esports",
    "dewa":                   "Dewa United Esports",
    "bigetron by vitality":   "Bigetron by Vitality",
    "bigetron":               "Bigetron by Vitality",
    "btr":                    "Bigetron by Vitality",
    "onic":                   "ONIC",
    "fnatic onic":            "ONIC",
    "team liquid academy id": "Team Liquid ID Academy",
    "tlaid":                  "Team Liquid ID Academy",
    "navi junior":            "Natus Vincere Junior",
    "nvjr":                   "Natus Vincere Junior",
    "geek fam id jr":         "Geek Fam Jr",
    "gfjr":                   "Geek Fam Jr",
    "none":                   "Free Agent",
    "free agent":             "Free Agent",
    "retired":                "Retired",
    "":                       "Free Agent",
}

def normalize_team(name: str) -> str:
    if not name:
        return "Free Agent"
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
def _extract_team_cell(cell) -> tuple[str, str]:
    """Ekstrak nama tim bersih dan teks mentah dari cell OldTeam / NewTeam."""
    if not cell:
        return "Free Agent", ""
    raw_text = cell.get_text(" ", strip=True)
    if not raw_text or raw_text.lower() == "none":
        return "Free Agent", raw_text

    # Ambil nama tim lengkap dari atribut title pada link <a> atau alt pada <img>
    team_names = []
    for a in cell.find_all("a"):
        t = (a.get("title") or a.get_text(strip=True) or "").strip()
        if t and t not in team_names:
            team_names.append(t)
    if not team_names:
        for img in cell.find_all("img"):
            alt = (img.get("alt") or "").strip()
            if alt and alt not in team_names:
                team_names.append(alt)

    base_name = normalize_team(team_names[0]) if team_names else normalize_team(re.sub(r"\s*\(.*?\)", "", raw_text).strip())

    # Pertahankan penanda (Inactive) jika hanya pindah ke status inactive tanpa loan
    if "(inactive)" in raw_text.lower() and "loan" not in raw_text.lower() and base_name != "Free Agent":
        return f"{base_name} (Inactive)", raw_text

    return base_name, raw_text


def _parse_liquipedia_date(date_raw: str) -> str | None:
    """Parse tanggal Liquipedia seperti '2026-08-12' atau '2026-06-??'."""
    if not date_raw:
        return None
    cleaned = date_raw.strip().replace("??", "01")
    for fmt in ("%Y-%m-%d", "%d %B %Y", "%B %Y", "%b %Y"):
        try:
            return datetime.strptime(cleaned, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    m = re.search(r"\b(202\d)\b", cleaned)
    return f"{m.group(1)}-01-01" if m else None


def scrape_liquipedia() -> list[dict]:
    if not HAS_REQUESTS:
        log.warning("requests/beautifulsoup4 tidak terinstall, skip scraping.")
        return []

    params = {
        "action": "parse",
        "page": LIQUIPEDIA_PAGE,
        "prop": "text",
        "format": "json",
    }
    log.info("Mencoba akses Liquipedia MediaWiki API: %s (page=%s)", LIQUIPEDIA_API_URL, LIQUIPEDIA_PAGE)
    try:
        resp = requests.get(LIQUIPEDIA_API_URL, params=params, headers=HEADERS, timeout=20)
        log.info("Status: %d", resp.status_code)
        if resp.status_code != 200:
            log.warning("Liquipedia API mengembalikan %d, fallback ke data manual.", resp.status_code)
            return []
        payload = resp.json()
        if "error" in payload or "parse" not in payload:
            log.warning("Liquipedia API error: %s, fallback ke data manual.", payload.get("error"))
            return []
        html_content = payload["parse"]["text"]["*"]
    except Exception as e:
        log.warning("Gagal akses Liquipedia API: %s", e)
        return []

    soup = BeautifulSoup(html_content, "html.parser")
    transfers = []
    seen_keys = set()

    # Liquipedia menyimpan "Roster moves during the off-season" & "during the season"
    # di dalam <div class="OffSeasonOverview"> dengan struktur divTable / divRow
    overview_divs = soup.find_all("div", class_="OffSeasonOverview")
    log.info("Ditemukan %d section OffSeasonOverview", len(overview_divs))

    for div in overview_divs:
        for row in div.find_all("div", class_="divRow"):
            date_el = row.find("div", class_="Date")
            name_el = row.find("div", class_="Name")
            old_el = row.find("div", class_="OldTeam")
            new_el = row.find("div", class_="NewTeam")

            if not name_el:
                continue

            transfer_date = _parse_liquipedia_date(date_el.get_text(strip=True) if date_el else "")
            from_team, old_raw = _extract_team_cell(old_el)
            to_team, new_raw = _extract_team_cell(new_el)

            # Lewati perubahan internal di tim aktif yang sama (misal ganti role/lane)
            if from_team == to_team:
                continue

            combined_raw = f"{old_raw} -> {new_raw}"
            if "loan" in combined_raw.lower():
                ttype = "loan"
            elif from_team == "Free Agent" or to_team == "Free Agent" or "(inactive)" in combined_raw.lower():
                ttype = "free_transfer"
            else:
                ttype = "free_transfer"

            # Satu baris di Liquipedia bisa berisi lebih dari satu pemain
            player_links = [a.get_text(strip=True) for a in name_el.find_all("a") if a.get_text(strip=True)]
            if not player_links:
                fallback_name = name_el.get_text(" ", strip=True)
                if fallback_name:
                    player_links = [fallback_name]

            for player_name in player_links:
                uniq_key = (player_name.lower(), from_team.lower(), to_team.lower(), transfer_date or "")
                if uniq_key in seen_keys:
                    continue
                seen_keys.add(uniq_key)

                transfers.append({
                    "player_name":    player_name,
                    "from_team_name": from_team,
                    "to_team_name":   to_team,
                    "transfer_type":  ttype,
                    "transfer_date":  transfer_date,
                    "source_raw":     f"liquipedia_api|{combined_raw}",
                    "liquipedia_ref": LIQUIPEDIA_URL,
                })

    log.info("Berhasil scrape %d transfer dari Liquipedia API.", len(transfers))
    return transfers


# ---------------------------------------------------------------------------
# Fallback data manual (hanya transfer aktual terverifikasi, bukan contract renewal)
# Hanya digunakan jika scraping Liquipedia gagal / tidak ada data
# ---------------------------------------------------------------------------
MANUAL_TRANSFERS = [
    # Pre-season & Roster Lock Transfers MPL ID Season 18
    {"player_name": "DEMONKITE",    "from_team_name": "Aurora Gaming PH",        "to_team_name": "RRQ Hoshi",           "transfer_type": "loan",          "transfer_date": "2026-07-15", "source_raw": "manual|loan|liquipedia",         "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "MUEZZA",       "from_team_name": "Dewa United Esports",     "to_team_name": "EVOS",                "transfer_type": "free_transfer", "transfer_date": "2026-07-15", "source_raw": "manual|transfer|double-xp.net",  "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "RYZAA",        "from_team_name": "Bigetron by Vitality",    "to_team_name": "EVOS",                "transfer_type": "free_transfer", "transfer_date": "2026-08-12", "source_raw": "manual|transfer|liquipedia",     "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "IVANN",        "from_team_name": "Team Rey",                "to_team_name": "Alter Ego",           "transfer_type": "free_transfer", "transfer_date": "2026-07-15", "source_raw": "manual|loan_return|liquipedia",  "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "KARSS",        "from_team_name": "Rebellion Esports",       "to_team_name": "Natus Vincere",       "transfer_type": "free_transfer", "transfer_date": "2026-07-15", "source_raw": "manual|transfer|liquipedia",     "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "CLAYYY",       "from_team_name": "Free Agent",              "to_team_name": "RRQ Hoshi",           "transfer_type": "free_transfer", "transfer_date": "2026-08-01", "source_raw": "manual|return_active|detik.com", "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "KAYN",         "from_team_name": "Dewa United Esports",     "to_team_name": "Twisted Minds PH",    "transfer_type": "loan",          "transfer_date": "2026-08-01", "source_raw": "manual|loan|skor.id",            "liquipedia_ref": LIQUIPEDIA_URL},

    # Promosi dari Akademi/Junior (MDL)
    {"player_name": "KEVEN",        "from_team_name": "Team Liquid ID Academy",  "to_team_name": "Team Liquid ID",      "transfer_type": "free_transfer", "transfer_date": "2026-08-01", "source_raw": "manual|promotion|double-xp.net", "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "APRHO",        "from_team_name": "Natus Vincere Junior",    "to_team_name": "Natus Vincere",       "transfer_type": "free_transfer", "transfer_date": "2026-07-15", "source_raw": "manual|promotion|liquipedia",    "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "JIIZEE",       "from_team_name": "Natus Vincere Junior",    "to_team_name": "Natus Vincere",       "transfer_type": "free_transfer", "transfer_date": "2026-07-15", "source_raw": "manual|promotion|liquipedia",    "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "JOSHUAA",      "from_team_name": "Natus Vincere Junior",    "to_team_name": "Natus Vincere",       "transfer_type": "free_transfer", "transfer_date": "2026-07-15", "source_raw": "manual|promotion|liquipedia",    "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "ZEONN",        "from_team_name": "Natus Vincere Junior",    "to_team_name": "Natus Vincere",       "transfer_type": "free_transfer", "transfer_date": "2026-07-15", "source_raw": "manual|promotion|liquipedia",    "liquipedia_ref": LIQUIPEDIA_URL},

    # Mid-season Transfers, Promotions & Inactive Shifts
    {"player_name": "DRIANW",       "from_team_name": "EVOS",                    "to_team_name": "EVOS Icon",           "transfer_type": "free_transfer", "transfer_date": "2026-08-26", "source_raw": "manual|mdl_move|liquipedia",     "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "AUDYTZY",      "from_team_name": "Geek Fam ID",             "to_team_name": "Free Agent",          "transfer_type": "free_transfer", "transfer_date": "2026-08-26", "source_raw": "manual|inactive|skor.id",        "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "FRENZYY",      "from_team_name": "Geek Fam Jr",             "to_team_name": "Geek Fam ID",         "transfer_type": "free_transfer", "transfer_date": "2026-08-26", "source_raw": "manual|promotion|skor.id",       "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "HAZLE",        "from_team_name": "Geek Fam ID",             "to_team_name": "Dewa United Esports", "transfer_type": "free_transfer", "transfer_date": "2026-08-27", "source_raw": "manual|mid_season|liquipedia",   "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "KYOUU",        "from_team_name": "Team Liquid ID",          "to_team_name": "Free Agent",          "transfer_type": "free_transfer", "transfer_date": "2026-08-28", "source_raw": "manual|inactive|double-xp.net",  "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "FAVIANNN",     "from_team_name": "Team Liquid ID",          "to_team_name": "Free Agent",          "transfer_type": "free_transfer", "transfer_date": "2026-08-28", "source_raw": "manual|farewell|skor.id",        "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "EXCELLENT99",  "from_team_name": "KINGS Esports",           "to_team_name": "RRQ Hoshi",           "transfer_type": "free_transfer", "transfer_date": "2026-09-10", "source_raw": "manual|mid_season|duniagames",   "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "FAVIANNN",     "from_team_name": "Free Agent",              "to_team_name": "RRQ Hoshi",           "transfer_type": "free_transfer", "transfer_date": "2026-09-16", "source_raw": "manual|mid_season|liquipedia",   "liquipedia_ref": LIQUIPEDIA_URL},
    {"player_name": "KILLUAA",      "from_team_name": "ONIC Prodigy",            "to_team_name": "ONIC",                "transfer_type": "free_transfer", "transfer_date": "2026-09-16", "source_raw": "manual|promotion|liquipedia",    "liquipedia_ref": LIQUIPEDIA_URL},
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


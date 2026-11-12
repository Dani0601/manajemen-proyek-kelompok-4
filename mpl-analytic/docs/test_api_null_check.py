import urllib.request
import urllib.error
import json
import csv
import sys
import os
import time

BASE_URL = "http://localhost/manajemen-proyek-kelompok-4/mpl-analytic/public/api"
DOCS_DIR = os.path.dirname(os.path.abspath(__file__))

# ANSI Colors
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

os.system("")

def print_header(title):
    print(f"\n{BOLD}{CYAN}{'='*70}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'='*70}{RESET}")

def fetch_json(endpoint):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "MPL-Tester/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode("utf-8"))
        except:
            body = None
        return e.code, body
    except Exception as e:
        return 0, str(e)

def read_csv_ids(filename, col_name):
    path = os.path.join(DOCS_DIR, filename)
    ids = []
    if not os.path.exists(path):
        print(f"{RED}File tidak ditemukan: {path}{RESET}")
        return ids
    with open(path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            val = row.get(col_name)
            if val:
                ids.append(val.strip())
    return ids

def find_all_nulls(data, current_path=""):
    null_fields = []
    # Whitelist field opsional statistik/turnamen yang secara desain boleh null
    WHITELIST_OPTIONAL_NULLS = {
        "start_date", "end_date", "format", "item_source_id", "power_spike", "avg_kda", "duration"
    }

    if isinstance(data, dict):
        for k, v in data.items():
            field_path = f"{current_path}.{k}" if current_path else k
            if v is None:
                if k not in WHITELIST_OPTIONAL_NULLS:
                    null_fields.append(field_path)
            elif isinstance(v, (dict, list)):
                null_fields.extend(find_all_nulls(v, field_path))
    elif isinstance(data, list):
        for idx, item in enumerate(data):
            elem_path = f"{current_path}[{idx}]"
            if item is None:
                null_fields.append(elem_path)
            elif isinstance(item, (dict, list)):
                null_fields.extend(find_all_nulls(item, elem_path))
                
    return null_fields

total_endpoints_tested = 0
passed_endpoints = 0
failed_endpoints = 0
failures = []

def record_check(endpoint_name, null_list, http_status=200):
    global total_endpoints_tested, passed_endpoints, failed_endpoints, failures
    total_endpoints_tested += 1
    
    if http_status != 200:
        failed_endpoints += 1
        msg = f"HTTP Status {http_status}"
        failures.append((endpoint_name, msg))
        print(f"\n  {RED}[FAIL]{RESET} {endpoint_name} -> {msg}")
    elif null_list:
        failed_endpoints += 1
        msg = f"Ditemukan {len(null_list)} field NULL: {', '.join(null_list[:5])}"
        if len(null_list) > 5:
            msg += f" (dan {len(null_list)-5} field lainnya)"
        failures.append((endpoint_name, msg))
        print(f"\n  {RED}[FAIL]{RESET} {endpoint_name} -> {msg}")
    else:
        passed_endpoints += 1

# ----------------------------------------------------------------------
# 1. PENGUJIAN DASHBOARD & TOURNAMENTS
# ----------------------------------------------------------------------
def test_dashboard_and_tournaments():
    print_header("1. DEEP NULL CHECK: DASHBOARD & TOURNAMENTS (SEASON 18)")
    
    status, res = fetch_json("/dashboard?season=1")
    nulls = find_all_nulls(res.get("data")) if res else ["res is null"]
    record_check("GET /api/dashboard?season=1", nulls, status)
    if not nulls and status == 200:
        print(f"  {GREEN}[OK]{RESET} GET /api/dashboard?season=1 (100% Bebas NULL)")

    status, res = fetch_json("/tournaments/1/standings")
    nulls = find_all_nulls(res.get("data")) if res else ["res is null"]
    record_check("GET /api/tournaments/1/standings", nulls, status)
    if not nulls and status == 200:
        print(f"  {GREEN}[OK]{RESET} GET /api/tournaments/1/standings (100% Bebas NULL)")

    status, res = fetch_json("/tournaments/1/schedule")
    nulls = find_all_nulls(res.get("data")) if res else ["res is null"]
    record_check("GET /api/tournaments/1/schedule", nulls, status)
    if not nulls and status == 200:
        print(f"  {GREEN}[OK]{RESET} GET /api/tournaments/1/schedule (100% Bebas NULL)")

# ----------------------------------------------------------------------
# 2. PENGUJIAN SEMUA HERO (133 HERO)
# ----------------------------------------------------------------------
def test_all_heroes():
    ids = read_csv_ids("data_hero_ids.csv", "heroId")
    print_header(f"2. DEEP NULL CHECK: SEMUA HERO ({len(ids)} ID)")
    
    for idx, hid in enumerate(ids, 1):
        sys.stdout.write(f"\r  Memeriksa Hero {idx}/{len(ids)} (ID: {hid})...")
        sys.stdout.flush()
        
        st, res = fetch_json(f"/heroes/{hid}")
        nulls = find_all_nulls(res.get("data")) if res else ["no data"]
        record_check(f"Hero {hid} Detail", nulls, st)

        st, res = fetch_json(f"/heroes/{hid}/skills")
        nulls = find_all_nulls(res.get("data")) if res else ["no data"]
        record_check(f"Hero {hid} Skills", nulls, st)

        st, res = fetch_json(f"/heroes/{hid}/builds")
        nulls = find_all_nulls(res.get("data")) if res else ["no data"]
        record_check(f"Hero {hid} Builds", nulls, st)

        st, res = fetch_json(f"/heroes/{hid}/counters")
        nulls = find_all_nulls(res.get("data")) if res else ["no data"]
        record_check(f"Hero {hid} Counters", nulls, st)

    print(f"\r  {GREEN}[OK]{RESET} Selesai deep null check seluruh {len(ids)} hero!                  ")

# ----------------------------------------------------------------------
# 3. PENGUJIAN SEMUA PLAYER (60 PLAYER)
# ----------------------------------------------------------------------
def test_all_players():
    ids = read_csv_ids("data_player_ids.csv", "playerId")
    print_header(f"3. DEEP NULL CHECK: SEMUA PLAYER ({len(ids)} Player)")
    
    for idx, pid in enumerate(ids, 1):
        sys.stdout.write(f"\r  Memeriksa Player {idx}/{len(ids)} (ID: {pid})...")
        sys.stdout.flush()
        
        st, res = fetch_json(f"/players/{pid}")
        nulls = find_all_nulls(res.get("data")) if res else ["no data"]
        record_check(f"Player {pid} Detail", nulls, st)

        st, res = fetch_json(f"/players/{pid}/stats")
        nulls = find_all_nulls(res.get("data")) if res else ["no data"]
        record_check(f"Player {pid} Stats", nulls, st)

    print(f"\r  {GREEN}[OK]{RESET} Selesai deep null check seluruh {len(ids)} player!                ")

# ----------------------------------------------------------------------
# 4. PENGUJIAN SEMUA TEAM (9 TIM)
# ----------------------------------------------------------------------
def test_all_teams():
    ids = read_csv_ids("data_team_ids.csv", "teamId")
    print_header(f"4. DEEP NULL CHECK: SEMUA TIM ({len(ids)} Tim)")
    
    for tid in ids:
        st, res = fetch_json(f"/teams/{tid}")
        nulls = find_all_nulls(res.get("data")) if res else ["no data"]
        record_check(f"Team {tid} Detail", nulls, st)

        st, res = fetch_json(f"/teams/{tid}/stats")
        nulls = find_all_nulls(res.get("data")) if res else ["no data"]
        record_check(f"Team {tid} Stats", nulls, st)

    print(f"  {GREEN}[OK]{RESET} Selesai deep null check seluruh 9 tim!")

# ----------------------------------------------------------------------
# 5. PENGUJIAN SEMUA MATCH (72 MATCH)
# ----------------------------------------------------------------------
def test_all_matches():
    ids = read_csv_ids("data_match_ids.csv", "matchId")
    print_header(f"5. DEEP NULL CHECK: SEMUA MATCH SEASON 18 ({len(ids)} Match)")
    
    for idx, mid in enumerate(ids, 1):
        sys.stdout.write(f"\r  Memeriksa Match {idx}/{len(ids)} ({mid})...")
        sys.stdout.flush()
        
        st, res = fetch_json(f"/matches/{mid}")
        nulls = find_all_nulls(res.get("data")) if res else ["no data"]
        record_check(f"Match {mid}", nulls, st)

    print(f"\r  {GREEN}[OK]{RESET} Selesai deep null check seluruh {len(ids)} match Season 18!       ")

# ----------------------------------------------------------------------
# 6. PENGUJIAN SEMUA GAME (132 GAME)
# ----------------------------------------------------------------------
def test_all_games():
    ids = read_csv_ids("data_game_ids.csv", "gameId")
    print_header(f"6. DEEP NULL CHECK: SEMUA GAME SEASON 18 ({len(ids)} Game)")
    
    for idx, gid in enumerate(ids, 1):
        sys.stdout.write(f"\r  Memeriksa Game {idx}/{len(ids)} ({gid})...")
        sys.stdout.flush()
        
        st, res = fetch_json(f"/games/{gid}")
        nulls = find_all_nulls(res.get("data")) if res else ["no data"]
        record_check(f"Game {gid} Detail", nulls, st)

        st, res = fetch_json(f"/games/{gid}/picks")
        nulls = find_all_nulls(res.get("data")) if res else ["no data"]
        record_check(f"Game {gid} Picks", nulls, st)

        st, res = fetch_json(f"/games/{gid}/players")
        nulls = find_all_nulls(res.get("data")) if res else ["no data"]
        record_check(f"Game {gid} Players", nulls, st)

        st, res = fetch_json(f"/games/{gid}/emblems")
        nulls = find_all_nulls(res.get("data")) if res else ["no data"]
        record_check(f"Game {gid} Emblems", nulls, st)

        st, res = fetch_json(f"/games/{gid}/items")
        nulls = find_all_nulls(res.get("data")) if res else ["no data"]
        record_check(f"Game {gid} Items", nulls, st)

    print(f"\r  {GREEN}[OK]{RESET} Selesai deep null check seluruh {len(ids)} game Season 18!        ")

# ----------------------------------------------------------------------
# MAIN ENTRY POINT
# ----------------------------------------------------------------------
def main():
    print(f"\n{BOLD}======================================================================{RESET}")
    print(f"{BOLD}  MPL ANALYTIC API - DEEP RECURSIVE NULL CHECK RUNNER (SEASON 18){RESET}")
    print(f"{BOLD}======================================================================{RESET}")
    start_time = time.time()
    
    test_dashboard_and_tournaments()
    test_all_heroes()
    test_all_players()
    test_all_teams()
    test_all_matches()
    test_all_games()
    
    duration = round(time.time() - start_time, 2)
    
    print("\n" + "="*70)
    print(f"{BOLD}HASIL REKAPITULASI DEEP NULL CHECK (SEMUA FIELD & ID):{RESET}")
    print(f"  Total Endpoint/Request Dites : {BOLD}{total_endpoints_tested}{RESET}")
    print(f"  Lolos (100% Bebas NULL)      : {GREEN}{passed_endpoints}{RESET}")
    print(f"  Gagal (Ada NULL / HTTP Err)  : {RED if failed_endpoints > 0 else GREEN}{failed_endpoints}{RESET}")
    print(f"  Waktu Eksekusi               : {duration} detik")
    print("="*70)
    
    if failed_endpoints > 0:
        print(f"\n{RED}{BOLD}Daftar Endpoint dengan Field NULL ({failed_endpoints}):{RESET}")
        for ep, reason in failures[:30]:
            print(f"  - {ep}: {reason}")
        if len(failures) > 30:
            print(f"  ... dan {len(failures)-30} endpoint lainnya.")
        sys.exit(1)
    else:
        print(f"\n{GREEN}{BOLD}VERIFIKASI SEMPURNA: SEMUA FIELD PADA SELURUH ID 100% BEBAS NULL!{RESET}\n")
        sys.exit(0)

if __name__ == "__main__":
    main()

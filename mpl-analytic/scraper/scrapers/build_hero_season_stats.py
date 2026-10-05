import json
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timezone


# =========================================================
# CONFIG
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

GAMES_FILE = BASE_DIR / "games.json"
PICKS_FILE = BASE_DIR / "game_picks.json"
OUTPUT_FILE = BASE_DIR / "hero_season_stats.json"

SEASON = 17
LEAGUE = "MPL Indonesia"


# =========================================================
# LOAD JSON
# =========================================================

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_records(data, possible_keys):
    """
    Mendukung dua format:

    1. [
        {...},
        {...}
    ]

    2. {
        "games": [...]
    }
    """

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        for key in possible_keys:
            if key in data and isinstance(data[key], list):
                return data[key]

    raise ValueError(
        f"Format JSON tidak dikenali. "
        f"Expected list atau object dengan key: {possible_keys}"
    )


games_data = load_json(GAMES_FILE)
picks_data = load_json(PICKS_FILE)

games = extract_records(
    games_data,
    ["games", "data"]
)

picks = extract_records(
    picks_data,
    ["game_picks", "picks", "data"]
)


# =========================================================
# INFO INPUT
# =========================================================

print("========================================")
print("BUILD HERO SEASON STATS")
print("========================================")

print(f"Games loaded : {len(games)}")
print(f"Picks loaded : {len(picks)}")


# =========================================================
# BUILD GAME MAP
# =========================================================

game_map = {}

for game in games:

    game_id = game.get("game_id")

    if not game_id:
        continue

    game_map[game_id] = {
        "winner": game.get("winner"),
        "team1": game.get("team1"),
        "team2": game.get("team2"),
        "match_id": game.get("match_id"),
        "game_number": game.get("game_number"),
    }


print(f"Valid games : {len(game_map)}")


# =========================================================
# GROUP PICKS BY GAME
# =========================================================

picks_by_game = defaultdict(list)

for pick in picks:

    game_id = pick.get("game_id")

    if game_id:
        picks_by_game[game_id].append(pick)


# =========================================================
# VALIDATE 10 PICKS / GAME
# =========================================================

invalid_games = []

for game_id in game_map:

    game_picks = picks_by_game.get(game_id, [])

    if len(game_picks) != 10:

        invalid_games.append({
            "game_id": game_id,
            "pick_count": len(game_picks)
        })


unknown_games = []

for game_id in picks_by_game:

    if game_id not in game_map:
        unknown_games.append(game_id)


print(f"Invalid games: {len(invalid_games)}")
print(f"Unknown games: {len(unknown_games)}")


if invalid_games:

    print("\nGame dengan jumlah pick tidak 10:")

    for item in invalid_games[:20]:

        print(
            f"  {item['game_id']} "
            f"-> {item['pick_count']} picks"
        )

    raise ValueError(
        "Validasi gagal: terdapat game yang tidak memiliki 10 pick."
    )


if unknown_games:

    print("\nGame ID dari picks yang tidak ditemukan:")

    for game_id in unknown_games[:20]:
        print(f"  {game_id}")

    raise ValueError(
        "Validasi gagal: terdapat game_id yang tidak dikenal."
    )


# =========================================================
# CALCULATE HERO STATS
# =========================================================

hero_stats = defaultdict(
    lambda: {
        "pick": 0,
        "win": 0
    }
)


for pick in picks:

    game_id = pick.get("game_id")
    hero = pick.get("hero")
    team = pick.get("team")

    if not game_id:
        continue

    if not hero:
        continue

    game = game_map.get(game_id)

    if not game:
        continue

    # ---------------------------------------------
    # PICK
    # ---------------------------------------------

    hero_stats[hero]["pick"] += 1

    # ---------------------------------------------
    # WIN
    # ---------------------------------------------

    winner = game.get("winner")

    if winner and team == winner:
        hero_stats[hero]["win"] += 1


# =========================================================
# TOTAL
# =========================================================

total_games = len(game_map)

total_picks = sum(
    stats["pick"]
    for stats in hero_stats.values()
)


# =========================================================
# BUILD RESULT
# =========================================================

results = []

for hero, stats in hero_stats.items():

    pick_count = stats["pick"]
    win_count = stats["win"]

    # Pick Rate
    if total_picks > 0:
        pick_rate = (
            pick_count / total_picks
        ) * 100
    else:
        pick_rate = 0

    # Win Rate
    if pick_count > 0:
        win_rate = (
            win_count / pick_count
        ) * 100
    else:
        win_rate = 0

    results.append({
        "hero": hero,
        "pick": pick_count,
        "pick_rate": round(pick_rate, 2),
        "win": win_count,
        "win_rate": round(win_rate, 2)
    })


# =========================================================
# SORT
# =========================================================

results.sort(
    key=lambda x: (
        -x["pick"],
        -x["win_rate"],
        x["hero"]
    )
)


# =========================================================
# OUTPUT
# =========================================================

output = {
    "metadata": {
        "league": LEAGUE,
        "season": SEASON,
        "data_type": "hero_season_stats",
        "source": [
            "games.json",
            "game_picks.json"
        ],
        "total_games": total_games,
        "total_picks": total_picks,
        "total_heroes": len(results),
        "ban_rate_included": False,
        "generated_at": datetime.now(
            timezone.utc
        ).isoformat()
    },
    "heroes": results
}


with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        output,
        f,
        ensure_ascii=False,
        indent=2
    )


# =========================================================
# SUMMARY
# =========================================================

print("\n========================================")
print("RESULT")
print("========================================")

print(f"Total games  : {total_games}")
print(f"Total picks  : {total_picks}")
print(f"Total heroes : {len(results)}")

print(f"\nOutput:")
print(OUTPUT_FILE)

print("\nTop 10 berdasarkan Pick:")
print("----------------------------------------")

for index, hero in enumerate(results[:10], start=1):

    print(
        f"{index:2}. "
        f"{hero['hero']:<20} "
        f"Pick: {hero['pick']:>3} | "
        f"PR: {hero['pick_rate']:>6.2f}% | "
        f"Win: {hero['win']:>3} | "
        f"WR: {hero['win_rate']:>6.2f}%"
    )


print("\n[OK] hero_season_stats.json berhasil dibuat.")
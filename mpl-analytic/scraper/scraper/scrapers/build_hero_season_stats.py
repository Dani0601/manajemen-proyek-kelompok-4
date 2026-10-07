import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from progress import finish, ok, start

BASE_DIR = Path(__file__).resolve().parent
GAMES_FILE = BASE_DIR / "games.json"
PICKS_FILE = BASE_DIR / "game_picks.json"
OUTPUT_FILE = BASE_DIR / "hero_season_stats.json"

SEASON = 17
LEAGUE = "MPL Indonesia"


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def records(data, keys):
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in keys:
            value = data.get(key)
            if isinstance(value, list):
                return value
    raise ValueError(f"Format JSON tidak dikenali: {keys}")


start("MPL INDONESIA S17 - HERO SEASON STATS")

games = records(load_json(GAMES_FILE), ["games", "data"])
picks = records(load_json(PICKS_FILE), ["game_picks", "picks", "data"])

# Game lookup
# ---------------------------------------------------------
game_map = {}
for game in games:
    game_id = game.get("game_id")
    if game_id:
        game_map[game_id] = {
            "winner": game.get("winner"),
            "team1": game.get("team1"),
            "team2": game.get("team2"),
        }

# Pick lookup per game
# ---------------------------------------------------------
picks_by_game = defaultdict(list)
for pick in picks:
    game_id = pick.get("game_id")
    if game_id:
        picks_by_game[game_id].append(pick)

invalid_games = {
    game_id: len(picks_by_game.get(game_id, []))
    for game_id in game_map
    if len(picks_by_game.get(game_id, [])) != 10
}

unknown_games = [
    game_id for game_id in picks_by_game
    if game_id not in game_map
]

if invalid_games:
    raise ValueError(
        f"Validasi gagal: {len(invalid_games)} game tidak memiliki tepat 10 pick."
    )

if unknown_games:
    raise ValueError(
        f"Validasi gagal: {len(unknown_games)} game_id pick tidak ditemukan di games.json."
    )

# Calculate hero stats
# ---------------------------------------------------------
hero_stats = defaultdict(lambda: {"pick": 0, "win": 0})

for pick in picks:
    game_id = pick.get("game_id")
    hero = pick.get("hero")
    team = pick.get("team")

    if not game_id or not hero:
        continue

    game = game_map.get(game_id)
    if not game:
        continue

    hero_stats[hero]["pick"] += 1

    if game.get("winner") and team == game["winner"]:
        hero_stats[hero]["win"] += 1

total_games = len(game_map)
total_picks = sum(item["pick"] for item in hero_stats.values())

results = []
for hero, stats in hero_stats.items():
    pick_count = stats["pick"]
    win_count = stats["win"]

    results.append({
        "hero": hero,
        "pick": pick_count,
        "pick_rate": round(
            pick_count / total_picks * 100, 2
        ) if total_picks else 0,
        "win": win_count,
        "win_rate": round(
            win_count / pick_count * 100, 2
        ) if pick_count else 0,
    })

results.sort(
    key=lambda x: (-x["pick"], -x["win_rate"], x["hero"])
)

output = {
    "metadata": {
        "league": LEAGUE,
        "season": SEASON,
        "data_type": "hero_season_stats",
        "source": ["games.json", "game_picks.json"],
        "total_games": total_games,
        "total_picks": total_picks,
        "total_heroes": len(results),
        "ban_rate_included": False,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    },
    "heroes": results,
}

OUTPUT_FILE.write_text(
    json.dumps(output, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

ok(f"{len(results)} hero | {total_games} game | {total_picks} pick")
finish(f"hero_season_stats.json dibuat - {len(results)} hero")

import asyncio
import json
import re
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from playwright.async_api import async_playwright


BASE_DIR = Path(__file__).resolve().parent
MATCHES_FILE = BASE_DIR / "matches.json"
GAMES_FILE = BASE_DIR / "games.json"
OUTPUT_FILE = BASE_DIR / "game_picks.json"
DEBUG_DIR = BASE_DIR / "debug_match_picks"

SCHEDULE_URL = "https://id-mpl.com/en/schedule"

PLAYER_ROW_SELECTOR = (
    "div.d-flex.flex-column.flex-lg-row."
    "justify-content-between.align-items-center."
    "align-items-lg-start.my-3"
)


def clean_url(url):
    if not url:
        return None
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


def load_json(path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def extract_source_match_id(match):
    value = (
        match.get("source_match_id")
        or match.get("_source_match_id")
        or match.get("match_source_id")
    )
    if value is not None:
        return str(value)

    # Fallback only if an ID is embedded somewhere in the record.
    text = json.dumps(match, ensure_ascii=False)
    m = re.search(r'"(?:source_match_id|_source_match_id|match_source_id)"\s*:\s*"?(\\d+)', text)
    return m.group(1) if m else None


async def select_populated_match_detail(page, timeout_ms=15000):
    """
    The page contains many duplicated #match-detail-content elements.
    Select the populated container only after GAME 1 and >=10 player rows
    are actually present.
    """
    containers = page.locator("#match-detail-content")
    start = asyncio.get_running_loop().time()

    while (asyncio.get_running_loop().time() - start) < timeout_ms / 1000:
        count = await containers.count()

        for i in range(count):
            container = containers.nth(i)

            try:
                text = await container.inner_text(timeout=1000)

                if "GAME 1" not in text:
                    continue

                rows = container.locator(PLAYER_ROW_SELECTOR)
                row_count = await rows.count()

                if row_count >= 10:
                    return container

            except Exception:
                continue

        await page.wait_for_timeout(250)

    return None


async def open_match_detail_with_retry(page, source_match_id, retries=3):
    for attempt in range(1, retries + 1):
        try:
            # Reset modal/tab state before every attempt.
            try:
                await page.keyboard.press("Escape")
            except Exception:
                pass

            await page.wait_for_timeout(500)

            await page.evaluate(
                f"openMatchDetail({int(source_match_id)});"
            )

            detail = await select_populated_match_detail(
                page,
                timeout_ms=15000
            )

            if detail is not None:
                return detail

            print(
                f"    [RETRY {attempt}/{retries}] "
                f"detail belum siap untuk source_match_id={source_match_id}"
            )

        except Exception as e:
            print(
                f"    [RETRY {attempt}/{retries}] "
                f"gagal membuka detail {source_match_id}: {e}"
            )

        await page.wait_for_timeout(1000)

    return None


async def parse_player_pick(row):
    # Player name
    player_el = row.locator('div[style*="font-weight: 700"]').first
    player = (await player_el.inner_text()).strip() if await player_el.count() else None

    # Hero image
    hero_img = row.locator('img[style*="max-width: 50px"]').first

    hero = None
    hero_url = None

    if await hero_img.count():
        hero = await hero_img.get_attribute("alt")
        hero_url = await hero_img.get_attribute("src")

        if hero:
            hero = hero.strip()

        if hero_url:
            hero_url = clean_url(hero_url)

    return {
        "player": player,
        "hero": hero,
        "hero_url": hero_url,
    }


async def main():
    matches = load_json(MATCHES_FILE)
    games = load_json(GAMES_FILE)

    # Handle both possible metadata wrappers and plain arrays.
    if isinstance(matches, dict):
        match_records = matches.get("matches", [])
    else:
        match_records = matches

    if isinstance(games, dict):
        game_records = games.get("games", [])
    else:
        game_records = games

    games_by_source = {}
    for game in game_records:
        source_id = extract_source_match_id(game)
        if source_id:
            games_by_source.setdefault(source_id, []).append(game)

    output = []

    DEBUG_DIR.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        context = await browser.new_context(
            viewport={"width": 1440, "height": 1000},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
        )

        page = await context.new_page()
        page.set_default_timeout(10000)

        print(f"[OPEN] {SCHEDULE_URL}")
        await page.goto(
            SCHEDULE_URL,
            wait_until="domcontentloaded",
            timeout=60000,
        )

        for idx, match in enumerate(match_records, start=1):
            match_id = match.get("match_id")
            source_match_id = extract_source_match_id(match)

            if not source_match_id:
                print(
                    f"[WARN] {match_id}: source_match_id tidak ditemukan"
                )
                continue

            target_games = games_by_source.get(source_match_id, [])

            if not target_games:
                print(
                    f"[WARN] {match_id}: tidak ada game di games.json "
                    f"untuk source_match_id={source_match_id}"
                )
                continue

            print(
                f"[{idx}/{len(match_records)}] "
                f"{match_id}: membuka source_match_id={source_match_id}"
            )

            detail = await open_match_detail_with_retry(
                page,
                source_match_id,
                retries=3,
            )

            if detail is None:
                print(
                    f"[WARN] {match_id}: populated "
                    f"#match-detail-content tidak ditemukan"
                )
                continue

            # Save source HTML for debugging.
            try:
                html = await detail.evaluate("(el) => el.outerHTML")
                (DEBUG_DIR / f"{match_id}_{source_match_id}.html").write_text(
                    html,
                    encoding="utf-8",
                )
            except Exception:
                pass

            panels = detail.locator("div.tab-content.match-detail")
            panel_count = await panels.count()

            expected_game_count = len(target_games)

            if panel_count < expected_game_count:
                print(
                    f"    [WARN] {match_id}: "
                    f"panel game={panel_count}, expected={expected_game_count}"
                )

            games_by_number = {
                int(g["game_number"]): g
                for g in target_games
                if g.get("game_number") is not None
            }

            for panel_idx in range(panel_count):
                game_number = panel_idx + 1

                if game_number not in games_by_number:
                    continue

                game = games_by_number[game_number]
                game_id = game["game_id"]

                panel = panels.nth(panel_idx)

                # Team blocks are the two direct col-6 blocks.
                team_blocks = panel.locator(
                    ":scope > div.row > div.col-6"
                )

                team_block_count = await team_blocks.count()

                if team_block_count != 2:
                    # Fallback selector.
                    team_blocks = panel.locator("div.col-6")
                    team_block_count = await team_blocks.count()

                if team_block_count != 2:
                    print(
                        f"    [WARN] {match_id} GAME {game_number}: "
                        f"team block={team_block_count}, expected=2; skip"
                    )
                    continue

                game_rows = []
                game_valid = True

                for team_idx in range(2):
                    block = team_blocks.nth(team_idx)
                    side = "team1" if team_idx == 0 else "team2"
                    team = match.get(
                        "team1" if team_idx == 0 else "team2"
                    )

                    rows = block.locator(PLAYER_ROW_SELECTOR)
                    row_count = await rows.count()

                    if row_count != 5:
                        print(
                            f"    [WARN] {match_id} GAME {game_number} "
                            f"{side}: {row_count} player, expected=5; skip game"
                        )
                        game_valid = False
                        break

                    for player_idx in range(row_count):
                        row = rows.nth(player_idx)

                        parsed = await parse_player_pick(row)

                        if not parsed["player"]:
                            print(
                                f"    [WARN] {match_id} GAME {game_number} "
                                f"{side} player#{player_idx + 1}: "
                                f"nama player kosong"
                            )
                            game_valid = False
                            break

                        if not parsed["hero"]:
                            print(
                                f"    [WARN] {match_id} GAME {game_number} "
                                f"{side} player={parsed['player']}: "
                                f"hero kosong"
                            )
                            game_valid = False
                            break

                        pick = {
                            "game_pick_id": (
                                f"{game_id}_p{team_idx * 5 + player_idx + 1:02d}"
                            ),
                            "game_id": game_id,
                            "match_id": match_id,
                            "source_match_id": source_match_id,
                            "game_number": game_number,
                            "team": team,
                            "side": side,
                            "player": parsed["player"],
                            "hero": parsed["hero"],
                            "hero_url": parsed["hero_url"],
                        }

                        game_rows.append(pick)

                    if not game_valid:
                        break

                # Final per-game validation:
                # exactly 5 team1 + 5 team2 = 10 records.
                if not game_valid:
                    continue

                if len(game_rows) != 10:
                    print(
                        f"    [WARN] {match_id} GAME {game_number}: "
                        f"total pick={len(game_rows)}, expected=10; skip"
                    )
                    continue

                team1_count = sum(
                    1 for x in game_rows if x["side"] == "team1"
                )
                team2_count = sum(
                    1 for x in game_rows if x["side"] == "team2"
                )

                if team1_count != 5 or team2_count != 5:
                    print(
                        f"    [WARN] {match_id} GAME {game_number}: "
                        f"team1={team1_count}, team2={team2_count}; skip"
                    )
                    continue

                output.extend(game_rows)

            print(
                f"    [OK] {match_id}: "
                f"total pick records sekarang {len(output)}"
            )

        await browser.close()

    # ============================================================
    # FINAL VALIDATION
    # ============================================================

    expected_records = len(game_records) * 10

    from collections import Counter

    game_counts = Counter(
        item["game_id"]
        for item in output
    )

    invalid_games = {
        game_id: count
        for game_id, count in game_counts.items()
        if count != 10
    }

    # Check that every game has exactly 5 players per side.
    side_counts = {}
    for item in output:
        key = (item["game_id"], item["side"])
        side_counts[key] = side_counts.get(key, 0) + 1

    invalid_side_counts = {
        f"{game_id}:{side}": count
        for (game_id, side), count in side_counts.items()
        if count != 5
    }

    all_game_ids = {g["game_id"] for g in game_records}

    missing_games = sorted(
        all_game_ids - set(game_counts.keys())
    )

    valid_games = sum(
        1
        for game_id in all_game_ids
        if game_counts.get(game_id, 0) == 10
        and side_counts.get((game_id, "team1"), 0) == 5
        and side_counts.get((game_id, "team2"), 0) == 5
    )

    save_json(OUTPUT_FILE, output)

    print()
    print("=== SELESAI ===")
    print(f"Output : {OUTPUT_FILE}")
    print(f"Games  : {len(game_records)}")
    print(f"Expected records : {expected_records}")
    print(f"Actual records   : {len(output)}")
    print(f"Valid games       : {valid_games}")
    print(f"Invalid game rows : {len(invalid_games)}")
    print(f"Missing games     : {len(missing_games)}")
    print(f"Invalid side rows : {len(invalid_side_counts)}")
    print(f"Debug dir : {DEBUG_DIR}")

    if len(output) == expected_records and not invalid_games and not invalid_side_counts:
        print("[OK] Semua game memiliki tepat 10 pick: 5 player team1 + 5 player team2.")
    else:
        print("[WARN] Dataset belum lengkap/valid.")
        if missing_games:
            print("[WARN] Missing game IDs:")
            for game_id in missing_games[:20]:
                print(f"       - {game_id}")

        if invalid_games:
            print("[WARN] Invalid game counts:")
            for game_id, count in list(invalid_games.items())[:20]:
                print(f"       - {game_id}: {count}")

        if invalid_side_counts:
            print("[WARN] Invalid side counts:")
            for key, count in list(invalid_side_counts.items())[:20]:
                print(f"       - {key}: {count}")


if __name__ == "__main__":
    asyncio.run(main())

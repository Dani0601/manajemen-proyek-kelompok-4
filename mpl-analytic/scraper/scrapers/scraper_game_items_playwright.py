import asyncio
import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from playwright.async_api import async_playwright


BASE_DIR = Path(__file__).resolve().parent
MATCHES_FILE = BASE_DIR / "matches.json"
GAMES_FILE = BASE_DIR / "games.json"
OUTPUT_FILE = BASE_DIR / "game_items.json"
DEBUG_DIR = BASE_DIR / "debug_match_items"

SCHEDULE_URL = "https://id-mpl.com/en/schedule"

PLAYER_ROW_SELECTOR = (
    "div.d-flex.flex-column.flex-lg-row."
    "justify-content-between.align-items-center."
    "align-items-lg-start.my-3"
)


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
    return str(value) if value is not None else None


def clean_url(url):
    if not url:
        return None
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


def numeric_item_id(src=None, alt=None):
    """
    Item IDs are normally present in alt or the image path.
    Prefer numeric alt, then search the URL path.
    """
    if alt:
        m = re.search(r"\d+", str(alt))
        if m:
            return m.group(0)

    if src:
        path = urlsplit(src).path
        numbers = re.findall(r"\d+", path)
        if numbers:
            return numbers[-1]

    return None


async def select_populated_match_detail(page, timeout_ms=15000):
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

                if await rows.count() >= 10:
                    return container

            except Exception:
                continue

        await page.wait_for_timeout(250)

    return None


async def open_match_detail_with_retry(page, source_match_id, retries=3):
    for attempt in range(1, retries + 1):
        try:
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
                timeout_ms=15000,
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


async def extract_item_slots(row):
    """
    Preserve exact item slot positions 1..6.

    The HTML can represent an empty slot as a plain div instead of an img.
    Therefore we inspect the item container children rather than merely
    collecting all item images and padding afterward.
    """

    # Most observed rows have six 32px item slots.
    # Locate the parent that contains max-width:32px item images/placeholders.
    images = row.locator('img[style*="max-width: 32px"]')

    image_count = await images.count()

    # First attempt: derive slots from the closest horizontal container
    # containing the item images.
    container = None

    if image_count:
        try:
            container = images.first.locator("xpath=..")
            child_count = await container.locator(":scope > *").count()

            if child_count < 6:
                # Some pages wrap the images one level deeper.
                parent = container.locator("xpath=..")
                parent_child_count = await parent.locator(":scope > *").count()

                if parent_child_count >= 6:
                    container = parent
        except Exception:
            container = None

    slots = []

    if container is not None:
        try:
            children = container.locator(":scope > *")
            child_count = await children.count()

            # Only use this route when the container plausibly represents
            # the six item slots.
            if 6 <= child_count <= 8:
                for idx in range(child_count):
                    child = children.nth(idx)

                    img = child.locator(
                        'img[style*="max-width: 32px"]'
                    ).first

                    if await img.count():
                        src = await img.get_attribute("src")
                        alt = await img.get_attribute("alt")

                        slots.append({
                            "item_id": numeric_item_id(src, alt),
                            "item_url": clean_url(src),
                        })
                    else:
                        # Preserve an empty slot.
                        slots.append({
                            "item_id": None,
                            "item_url": None,
                        })

                # The actual build is six slots. If wrappers created
                # additional children, keep the first six slot-like entries.
                if len(slots) >= 6:
                    return slots[:6]
        except Exception:
            pass

    # Fallback: collect images in DOM order, then pad to six.
    # This preserves all observed item IDs, although an interior empty
    # slot cannot be reconstructed from image-only DOM.
    slots = []

    for idx in range(image_count):
        img = images.nth(idx)

        src = await img.get_attribute("src")
        alt = await img.get_attribute("alt")

        slots.append({
            "item_id": numeric_item_id(src, alt),
            "item_url": clean_url(src),
        })

    while len(slots) < 6:
        slots.append({
            "item_id": None,
            "item_url": None,
        })

    return slots[:6]


async def main():
    matches_data = load_json(MATCHES_FILE)
    games_data = load_json(GAMES_FILE)

    matches = (
        matches_data.get("matches", [])
        if isinstance(matches_data, dict)
        else matches_data
    )

    games = (
        games_data.get("games", [])
        if isinstance(games_data, dict)
        else games_data
    )

    games_by_source = {}

    for game in games:
        source_id = extract_source_match_id(game)

        if source_id:
            games_by_source.setdefault(source_id, []).append(game)

    DEBUG_DIR.mkdir(parents=True, exist_ok=True)

    output = []

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

        for match_idx, match in enumerate(matches, start=1):
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
                    f"[WARN] {match_id}: tidak ada game untuk "
                    f"source_match_id={source_match_id}"
                )
                continue

            print(
                f"[{match_idx}/{len(matches)}] "
                f"{match_id}: source_match_id={source_match_id}"
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

            try:
                html = await detail.evaluate("(el) => el.outerHTML")
                (
                    DEBUG_DIR / f"{match_id}_{source_match_id}.html"
                ).write_text(html, encoding="utf-8")
            except Exception:
                pass

            panels = detail.locator("div.tab-content.match-detail")
            panel_count = await panels.count()

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

                team_blocks = panel.locator(
                    ":scope > div.row > div.col-6"
                )

                team_block_count = await team_blocks.count()

                if team_block_count != 2:
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
                            f"{side}: {row_count} player, expected=5; "
                            f"skip game"
                        )
                        game_valid = False
                        break

                    for player_idx in range(row_count):
                        row = rows.nth(player_idx)

                        player_el = row.locator(
                            'div[style*="font-weight: 700"]'
                        ).first

                        player = (
                            (await player_el.inner_text()).strip()
                            if await player_el.count()
                            else None
                        )

                        hero_img = row.locator(
                            'img[style*="max-width: 50px"]'
                        ).first

                        hero = (
                            await hero_img.get_attribute("alt")
                            if await hero_img.count()
                            else None
                        )

                        if hero:
                            hero = hero.strip()

                        if not player:
                            print(
                                f"    [WARN] {match_id} GAME {game_number} "
                                f"{side} player#{player_idx + 1}: "
                                f"nama player kosong"
                            )
                            game_valid = False
                            break

                        slots = await extract_item_slots(row)

                        if len(slots) != 6:
                            print(
                                f"    [WARN] {match_id} GAME {game_number} "
                                f"{side} player={player}: "
                                f"item slots={len(slots)}, expected=6"
                            )
                            game_valid = False
                            break

                        for slot_idx, item in enumerate(slots, start=1):
                            record = {
                                "game_item_id": (
                                    f"{game_id}_p"
                                    f"{team_idx * 5 + player_idx + 1:02d}"
                                    f"_i{slot_idx}"
                                ),
                                "game_id": game_id,
                                "match_id": match_id,
                                "source_match_id": source_match_id,
                                "game_number": game_number,
                                "team": team,
                                "side": side,
                                "player": player,
                                "hero": hero,
                                "item_slot": slot_idx,
                                "item_id": item["item_id"],
                                "item_url": item["item_url"],
                            }

                            game_rows.append(record)

                    if not game_valid:
                        break

                # 5 players × 6 slots × 2 teams = 60 records per game.
                expected_game_rows = 10 * 6

                if not game_valid:
                    continue

                if len(game_rows) != expected_game_rows:
                    print(
                        f"    [WARN] {match_id} GAME {game_number}: "
                        f"item records={len(game_rows)}, "
                        f"expected={expected_game_rows}; skip"
                    )
                    continue

                player_counts = Counter(
                    (
                        x["game_id"],
                        x["side"],
                        x["player"],
                    )
                    for x in game_rows
                )

                invalid_players = {
                    key: count
                    for key, count in player_counts.items()
                    if count != 6
                }

                if invalid_players:
                    print(
                        f"    [WARN] {match_id} GAME {game_number}: "
                        f"ada player yang bukan tepat 6 slot; skip"
                    )
                    continue

                # Every side must have 5 players.
                side_player_counts = Counter(
                    (x["game_id"], x["side"])
                    for x in game_rows
                )

                if (
                    side_player_counts[(game_id, "team1")] != 30
                    or side_player_counts[(game_id, "team2")] != 30
                ):
                    print(
                        f"    [WARN] {match_id} GAME {game_number}: "
                        f"side item counts tidak 30+30; skip"
                    )
                    continue

                output.extend(game_rows)

            print(
                f"    [OK] {match_id}: "
                f"total item records sekarang {len(output)}"
            )

        await browser.close()

    # ============================================================
    # FINAL VALIDATION
    # ============================================================

    expected_records = len(games) * 10 * 6

    game_counts = Counter(
        item["game_id"]
        for item in output
    )

    player_counts = Counter(
        (
            item["game_id"],
            item["side"],
            item["player"],
        )
        for item in output
    )

    side_counts = Counter(
        (
            item["game_id"],
            item["side"],
        )
        for item in output
    )

    slot_counts = Counter(
        (
            item["game_id"],
            item["side"],
            item["player"],
            item["item_slot"],
        )
        for item in output
    )

    all_game_ids = {g["game_id"] for g in games}

    invalid_games = {
        game_id: count
        for game_id, count in game_counts.items()
        if count != 60
    }

    invalid_players = {
        f"{game_id}:{side}:{player}": count
        for (game_id, side, player), count in player_counts.items()
        if count != 6
    }

    invalid_sides = {
        f"{game_id}:{side}": count
        for (game_id, side), count in side_counts.items()
        if count != 30
    }

    invalid_slots = {
        f"{game_id}:{side}:{player}:slot{slot}": count
        for (game_id, side, player, slot), count in slot_counts.items()
        if count != 1
    }

    missing_games = sorted(
        all_game_ids - set(game_counts.keys())
    )

    valid_games = sum(
        1
        for game_id in all_game_ids
        if game_counts.get(game_id, 0) == 60
        and all(
            count == 6
            for (gid, side, player), count in player_counts.items()
            if gid == game_id
        )
        and side_counts.get((game_id, "team1"), 0) == 30
        and side_counts.get((game_id, "team2"), 0) == 30
    )

    save_json(OUTPUT_FILE, output)

    print()
    print("=== SELESAI ===")
    print(f"Output : {OUTPUT_FILE}")
    print(f"Games  : {len(games)}")
    print(f"Expected records : {expected_records}")
    print(f"Actual records   : {len(output)}")
    print(f"Valid games       : {valid_games}")
    print(f"Invalid game rows : {len(invalid_games)}")
    print(f"Missing games     : {len(missing_games)}")
    print(f"Invalid player rows: {len(invalid_players)}")
    print(f"Invalid side rows : {len(invalid_sides)}")
    print(f"Invalid slot rows : {len(invalid_slots)}")
    print(f"Debug dir : {DEBUG_DIR}")

    if (
        len(output) == expected_records
        and not invalid_games
        and not missing_games
        and not invalid_players
        and not invalid_sides
        and not invalid_slots
    ):
        print(
            "[OK] Semua game memiliki 60 item slots: "
            "10 player × 6 slot, termasuk slot kosong."
        )
    else:
        print("[WARN] Dataset item belum lengkap/valid.")

        if missing_games:
            print("[WARN] Missing games:")
            for game_id in missing_games[:20]:
                print(f"       - {game_id}")

        if invalid_games:
            print("[WARN] Invalid game counts:")
            for game_id, count in list(invalid_games.items())[:20]:
                print(f"       - {game_id}: {count}")

        if invalid_players:
            print("[WARN] Invalid player slot counts:")
            for key, count in list(invalid_players.items())[:20]:
                print(f"       - {key}: {count}")

        if invalid_sides:
            print("[WARN] Invalid side counts:")
            for key, count in list(invalid_sides.items())[:20]:
                print(f"       - {key}: {count}")

        if invalid_slots:
            print("[WARN] Invalid slot counts:")
            for key, count in list(invalid_slots.items())[:20]:
                print(f"       - {key}: {count}")


if __name__ == "__main__":
    asyncio.run(main())

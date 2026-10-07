import asyncio
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from playwright.async_api import async_playwright

from progress import start, step, ok, warn, finish


BASE_DIR = Path(__file__).resolve().parent

MATCHES_FILE = BASE_DIR / "matches.json"
GAMES_FILE = BASE_DIR / "games.json"
OUTPUT_FILE = BASE_DIR / "game_items.json"

SCHEDULE_URL = "https://id-mpl.com/en/schedule"

PLAYER_ROW_SELECTOR = (
    "div.d-flex.flex-column.flex-lg-row."
    "justify-content-between.align-items-center."
    "align-items-lg-start.my-3"
)

# Equipment pada halaman official MPL.
# Terbukti dari debug:
# /match-detail/equipment/<item_id>.png
ITEM_IMG_SELECTOR = 'img[style*="max-width: 32px"]'


def clean_url(url: str | None) -> str | None:
    """
    Buang query AWS signed URL.

    Contoh:
    https://cdn.id-mpl.com/.../3521.png?X-Amz-...
    ->
    https://cdn.id-mpl.com/.../3521.png
    """

    if not url:
        return None

    p = urlsplit(url)

    return urlunsplit(
        (
            p.scheme,
            p.netloc,
            p.path,
            "",
            "",
        )
    )


def numeric_alt(value: str | None) -> int | None:
    """
    Ambil numeric ID dari alt.

    Contoh:
    '3521' -> 3521
    '3205' -> 3205
    'Tigreal' -> None
    '' -> None
    """

    if value is None:
        return None

    value = value.strip()

    if not re.fullmatch(r"\d+", value):
        return None

    return int(value)


def normalize_text(value: str | None) -> str | None:
    if value is None:
        return None

    value = re.sub(r"\s+", " ", value).strip()

    return value or None


def extract_source_match_id(match: dict) -> str | None:
    value = (
        match.get("source_match_id")
        or match.get("_source_match_id")
    )

    if value is None:
        return None

    return str(value)


async def select_populated_match_detail(
    page,
    timeout_ms=15000,
):
    """
    Halaman official MPL mempunyai beberapa
    #match-detail-content hidden/template.

    Kita hanya mengambil container yang:
    - mempunyai GAME 1
    - mempunyai minimal 10 player row
    """

    containers = page.locator("#match-detail-content")

    start_time = asyncio.get_running_loop().time()

    while (
        asyncio.get_running_loop().time() - start_time
        < timeout_ms / 1000
    ):
        count = await containers.count()

        for i in range(count):
            container = containers.nth(i)

            try:
                if await container.locator(
                    "text=GAME 1"
                ).count() == 0:
                    continue

                rows = container.locator(
                    PLAYER_ROW_SELECTOR
                )

                if await rows.count() >= 10:
                    return container

            except Exception:
                continue

        await page.wait_for_timeout(250)

    return None


async def get_team_blocks(panel):
    """
    Ambil dua blok team dari game panel.
    """

    blocks = panel.locator(
        ":scope > div.row > div.col-6"
    )

    if await blocks.count() == 2:
        return blocks

    return panel.locator(
        "div.row > div.col-6"
    )


async def extract_item_slots(row):
    """
    Ambil maksimal 6 equipment dari satu player row.

    Struktur yang sudah terverifikasi:

        IMG 1-5 = equipment
        IMG 6-9 = statistic icons
        IMG 10-12 = rune
        IMG 13 = emblem
        IMG 14 = hero

    Selector equipment:

        img[style*="max-width: 32px"]

    Item ID:
        alt="3521" -> 3521

    URL:
        /match-detail/equipment/3521.png
    """

    images = row.locator(
        ITEM_IMG_SELECTOR
    )

    image_count = await images.count()

    items = []

    for i in range(image_count):
        img = images.nth(i)

        alt = await img.get_attribute("alt")
        src = await img.get_attribute("src")

        item_id = numeric_alt(alt)

        item_url = clean_url(src)

        # Hanya masukkan equipment yang benar-benar
        # memiliki numeric ID.
        if item_id is None:
            continue

        items.append(
            {
                "item_id": item_id,
                "item_url": item_url,
            }
        )

    # Maksimal 6 slot.
    items = items[:6]

    # Padding sampai tepat 6 slot.
    while len(items) < 6:
        items.append(
            {
                "item_id": None,
                "item_url": None,
            }
        )

    return items


async def parse_player_items(
    row,
    team,
    side,
    match_id,
    source_match_id,
    game_id,
    game_number,
    player_index,
):
    """
    Parse satu player menjadi 6 game_item records.
    """

    name_el = row.locator(
        "div[style*='font-weight: 700']"
    ).first

    player = (
        normalize_text(
            await name_el.inner_text()
        )
        if await name_el.count()
        else None
    )

    items = await extract_item_slots(row)

    records = []

    player_key = (
        normalize_text(player)
        or f"player{player_index}"
    )

    safe_player = re.sub(
        r"[^A-Za-z0-9_-]+",
        "_",
        player_key,
    )

    for slot_index, item in enumerate(
        items,
        start=1,
    ):
        game_item_id = (
            f"{game_id}_{side}_"
            f"{safe_player}_i{slot_index}"
        )

        records.append(
            {
                "game_item_id": game_item_id,
                "game_id": game_id,
                "match_id": match_id,
                "source_match_id": source_match_id,
                "game_number": game_number,
                "team": team,
                "side": side,
                "player": player,
                "item_slot": slot_index,
                "item_id": item["item_id"],
                "item_url": item["item_url"],
            }
        )

    return records


async def scrape():
    start(
        "MPL INDONESIA S17 - GAME ITEMS"
    )

    if not MATCHES_FILE.exists():
        raise FileNotFoundError(
            f"Tidak ditemukan: {MATCHES_FILE}"
        )

    if not GAMES_FILE.exists():
        raise FileNotFoundError(
            f"Tidak ditemukan: {GAMES_FILE}"
        )

    matches_data = json.loads(
        MATCHES_FILE.read_text(
            encoding="utf-8"
        )
    )

    games_data = json.loads(
        GAMES_FILE.read_text(
            encoding="utf-8"
        )
    )

    matches = (
        matches_data["matches"]
        if isinstance(matches_data, dict)
        and "matches" in matches_data
        else matches_data
    )

    games = (
        games_data["games"]
        if isinstance(games_data, dict)
        and "games" in games_data
        else games_data
    )

    # --------------------------------------------------
    # Index games berdasarkan source_match_id
    # dan game_number
    # --------------------------------------------------

    games_by_source = {}

    for game in games:

        source_id = game.get(
            "source_match_id"
        )

        if source_id is None:
            continue

        try:
            game_number = int(
                game["game_number"]
            )
        except Exception:
            continue

        games_by_source.setdefault(
            str(source_id),
            {},
        )[game_number] = game

    results = []

    total_matches = len(matches)

    async with async_playwright() as p:

        browser = await p.chromium.launch(
            headless=True
        )

        page = await browser.new_page(
            viewport={
                "width": 1440,
                "height": 1000,
            }
        )

        page.set_default_timeout(15000)

        # --------------------------------------------------
        # Buka schedule sekali
        # --------------------------------------------------

        await page.goto(
            SCHEDULE_URL,
            wait_until="domcontentloaded",
            timeout=120000,
        )

        await page.wait_for_timeout(1500)

        # --------------------------------------------------
        # LOOP MATCH
        # --------------------------------------------------

        for idx, match in enumerate(
            matches,
            start=1,
        ):

            match_id = match.get(
                "match_id"
            )

            team1 = match.get("team1")
            team2 = match.get("team2")

            step(
                idx,
                total_matches,
                f"{match_id} | "
                f"{team1} vs {team2}",
            )

            source_match_id = (
                extract_source_match_id(
                    match
                )
            )

            if not source_match_id:
                warn(
                    f"{match_id}: "
                    f"source_match_id tidak ada"
                )
                continue

            # --------------------------------------------------
            # Open match detail
            # --------------------------------------------------

            detail = None

            for attempt in range(1, 4):

                try:
                    await page.keyboard.press(
                        "Escape"
                    )
                except Exception:
                    pass

                await page.wait_for_timeout(
                    500
                )

                try:
                    await page.evaluate(
                        f"openMatchDetail("
                        f"{int(source_match_id)}"
                        f")"
                    )

                except Exception:
                    await page.wait_for_timeout(
                        1000
                    )
                    continue

                detail = (
                    await select_populated_match_detail(
                        page,
                        timeout_ms=15000,
                    )
                )

                if detail is not None:
                    break

                try:
                    await page.keyboard.press(
                        "Escape"
                    )
                except Exception:
                    pass

                await page.wait_for_timeout(
                    1000
                )

            if detail is None:
                warn(
                    f"{match_id}: "
                    f"match detail gagal"
                )
                continue

            # --------------------------------------------------
            # Game panels
            # --------------------------------------------------

            panels = detail.locator(
                "div.tab-content.match-detail"
            )

            panel_count = await panels.count()

            source_games = games_by_source.get(
                str(source_match_id),
                {},
            )

            # --------------------------------------------------
            # LOOP GAME
            # --------------------------------------------------

            for panel_index in range(
                panel_count
            ):

                panel = panels.nth(
                    panel_index
                )

                text = await panel.inner_text()

                game_match = re.search(
                    r"GAME\s+(\d+)",
                    text,
                    re.I,
                )

                if game_match:
                    game_number = int(
                        game_match.group(1)
                    )
                else:
                    game_number = (
                        panel_index + 1
                    )

                game = source_games.get(
                    game_number
                )

                if not game:
                    continue

                game_id = game.get(
                    "game_id"
                )

                if not game_id:
                    continue

                # --------------------------------------------------
                # Team blocks
                # --------------------------------------------------

                team_blocks = (
                    await get_team_blocks(
                        panel
                    )
                )

                block_count = (
                    await team_blocks.count()
                )

                if block_count != 2:
                    warn(
                        f"{game_id}: "
                        f"team block = "
                        f"{block_count}, expected 2"
                    )
                    continue

                # --------------------------------------------------
                # Pastikan 5 player + 5 player
                # --------------------------------------------------

                team_row_counts = []

                for bi in range(2):

                    block = team_blocks.nth(
                        bi
                    )

                    rows = block.locator(
                        PLAYER_ROW_SELECTOR
                    )

                    team_row_counts.append(
                        await rows.count()
                    )

                if team_row_counts != [
                    5,
                    5,
                ]:
                    warn(
                        f"{game_id}: "
                        f"player rows = "
                        f"{team_row_counts}, "
                        f"expected [5, 5]"
                    )
                    continue

                # --------------------------------------------------
                # LOOP TEAM
                # --------------------------------------------------

                for bi in range(2):

                    block = team_blocks.nth(
                        bi
                    )

                    side = (
                        "team1"
                        if bi == 0
                        else "team2"
                    )

                    team = match.get(
                        side
                    )

                    rows = block.locator(
                        PLAYER_ROW_SELECTOR
                    )

                    row_count = (
                        await rows.count()
                    )

                    # --------------------------------------------------
                    # LOOP PLAYER
                    # --------------------------------------------------

                    for ri in range(
                        row_count
                    ):

                        player_records = (
                            await parse_player_items(
                                rows.nth(ri),
                                team,
                                side,
                                match_id,
                                source_match_id,
                                game_id,
                                game_number,
                                ri + 1,
                            )
                        )

                        results.extend(
                            player_records
                        )

            # Tutup modal/detail supaya
            # match berikutnya bersih.
            try:
                await page.keyboard.press(
                    "Escape"
                )
            except Exception:
                pass

        await browser.close()

    # --------------------------------------------------
    # DEDUPLICATION
    # --------------------------------------------------

    unique = {}

    for row in results:
        unique[
            row["game_item_id"]
        ] = row

    results = list(
        unique.values()
    )

    # --------------------------------------------------
    # SORT
    # --------------------------------------------------

    results.sort(
        key=lambda x: (
            x["match_id"],
            x["game_number"],
            x["side"],
            x["player"] or "",
            x["item_slot"],
        )
    )

    # --------------------------------------------------
    # VALIDATION
    # --------------------------------------------------

    expected_games = len(games)

    expected_records = (
        expected_games * 10 * 6
    )

    actual_records = len(results)

    game_counts = Counter(
        row["game_id"]
        for row in results
    )

    invalid_games = {
        game_id: count
        for game_id, count
        in game_counts.items()
        if count != 60
    }

    null_item_ids = sum(
        1
        for row in results
        if row["item_id"] is None
    )

    non_null_item_ids = (
        actual_records
        - null_item_ids
    )

    # --------------------------------------------------
    # METADATA
    # --------------------------------------------------

    metadata = {
        "league": "MPL Indonesia",
        "season": 17,
        "stage": "Regular Season",
        "source": SCHEDULE_URL,
        "source_type": (
            "official_mpl_match_detail"
        ),
        "scraped_at": datetime.now(
            timezone.utc
        ).isoformat(),
        "total_completed_matches": len(
            matches
        ),
        "total_games": expected_games,
        "total_expected_records": (
            expected_records
        ),
        "total_records": actual_records,
        "total_non_null_item_ids": (
            non_null_item_ids
        ),
        "total_null_item_ids": (
            null_item_ids
        ),
    }

    output = {
        "metadata": metadata,
        "game_items": results,
    }

    OUTPUT_FILE.write_text(
        json.dumps(
            output,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    # --------------------------------------------------
    # FINAL REPORT
    # --------------------------------------------------

    print()
    print("=" * 80)
    print("VALIDASI GAME ITEMS")
    print("=" * 80)

    print(
        f"Games expected       : {expected_games}"
    )

    print(
        f"Records expected     : {expected_records}"
    )

    print(
        f"Records actual       : {actual_records}"
    )

    print(
        f"Item ID NOT NULL     : {non_null_item_ids}"
    )

    print(
        f"Item ID NULL         : {null_item_ids}"
    )

    print(
        f"Game valid (60 rows) : "
        f"{sum(1 for c in game_counts.values() if c == 60)}"
    )

    print(
        f"Game invalid         : "
        f"{len(invalid_games)}"
    )

    if invalid_games:

        print()
        print(
            "Game dengan jumlah record != 60:"
        )

        for game_id, count in sorted(
            invalid_games.items()
        ):
            print(
                f"  {game_id}: {count}"
            )

    if actual_records != expected_records:

        warn(
            "JUMLAH RECORD TIDAK SESUAI TARGET"
        )

    else:

        ok(
            f"{actual_records} records "
            f"sesuai target"
        )

    print()
    print(
        f"Output: {OUTPUT_FILE}"
    )

    finish(
        "game_items.json selesai"
    )


if __name__ == "__main__":
    asyncio.run(scrape())
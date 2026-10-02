import asyncio
import json
import re
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from playwright.async_api import async_playwright

BASE_DIR = Path(__file__).resolve().parent
MATCHES_FILE = BASE_DIR / "matches.json"
GAMES_FILE = BASE_DIR / "games.json"
OUTPUT_FILE = BASE_DIR / "game_emblems.json"
DEBUG_DIR = BASE_DIR / "debug_match_emblems"
SCHEDULE_URL = "https://id-mpl.com/en/schedule"

PLAYER_ROW_SELECTOR = (
    "div.d-flex.flex-column.flex-lg-row."
    "justify-content-between.align-items-center.align-items-lg-start.my-3"
)


def clean_url(url: str | None) -> str | None:
    if not url:
        return None
    p = urlsplit(url)
    return urlunsplit((p.scheme, p.netloc, p.path, "", ""))


def numeric_alt(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value if re.fullmatch(r"\d+", value) else None


def normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    value = re.sub(r"\s+", " ", value).strip()
    return value or None


def extract_source_match_id(match: dict) -> str | None:
    value = match.get("source_match_id") or match.get("_source_match_id")
    return str(value) if value is not None else None


async def select_populated_match_detail(page, timeout_ms=15000):
    """
    Tunggu sampai #match-detail-content benar-benar populated.

    Halaman resmi memiliki banyak #match-detail-content hidden/template.
    Container valid harus mengandung GAME 1 dan minimal 10 player row.
    """
    containers = page.locator("#match-detail-content")
    start = asyncio.get_running_loop().time()

    while (asyncio.get_running_loop().time() - start) < (timeout_ms / 1000):
        count = await containers.count()

        for i in range(count):
            c = containers.nth(i)
            try:
                if await c.locator("text=GAME 1").count() == 0:
                    continue

                rows = c.locator(PLAYER_ROW_SELECTOR)
                if await rows.count() >= 10:
                    return c
            except Exception:
                continue

        await page.wait_for_timeout(250)

    return None


async def get_team_blocks(panel):
    blocks = panel.locator(":scope > div.row > div.col-6")
    if await blocks.count() == 2:
        return blocks

    blocks = panel.locator("div.row > div.col-6")
    return blocks


async def parse_player_emblem(row, team, side, match_id, source_match_id, game_id, game_number, player_index):
    # Actual HTML:
    # player name -> div[style*='font-weight: 700']
    # hero -> img[style*='max-width: 50px']
    # emblem -> img[src*='/emblem/']
    # runes -> img[src*='/rune/']
    name_el = row.locator("div[style*='font-weight: 700']").first
    player = normalize_text(await name_el.inner_text()) if await name_el.count() else None

    hero_el = row.locator("img[style*='max-width: 50px']").first
    hero = normalize_text(await hero_el.get_attribute("alt")) if await hero_el.count() else None

    emblem_imgs = row.locator("img[src*='/emblem/']")
    rune_imgs = row.locator("img[src*='/rune/']")

    emblem_id = None
    emblem_url = None
    if await emblem_imgs.count():
        img = emblem_imgs.first
        emblem_id = numeric_alt(await img.get_attribute("alt"))
        emblem_url = clean_url(await img.get_attribute("src"))

    runes = []
    for j in range(await rune_imgs.count()):
        img = rune_imgs.nth(j)
        runes.append({
            "rune_id": numeric_alt(await img.get_attribute("alt")),
            "rune_url": clean_url(await img.get_attribute("src")),
        })

    # The current HTML shows 3 rune images per player.
    # Preserve slot positions explicitly; missing slots remain null.
    runes = (runes + [
        {"rune_id": None, "rune_url": None},
        {"rune_id": None, "rune_url": None},
        {"rune_id": None, "rune_url": None},
    ])[:3]

    player_key = normalize_text(player) or f"player{player_index}"
    safe_player = re.sub(r"[^A-Za-z0-9_-]+", "_", player_key)

    return {
        "game_emblem_id": f"{game_id}_{side}_{safe_player}_emblem",
        "game_id": game_id,
        "match_id": match_id,
        "source_match_id": source_match_id,
        "game_number": game_number,
        "team": team,
        "side": side,
        "player": player,
        "hero": hero,
        "emblem_id": emblem_id,
        "emblem_url": emblem_url,
        "rune1_id": runes[0]["rune_id"],
        "rune1_url": runes[0]["rune_url"],
        "rune2_id": runes[1]["rune_id"],
        "rune2_url": runes[1]["rune_url"],
        "rune3_id": runes[2]["rune_id"],
        "rune3_url": runes[2]["rune_url"],
    }


async def scrape():
    if not MATCHES_FILE.exists():
        raise FileNotFoundError(f"Tidak ditemukan: {MATCHES_FILE}")
    if not GAMES_FILE.exists():
        raise FileNotFoundError(f"Tidak ditemukan: {GAMES_FILE}")

    matches_data = json.loads(MATCHES_FILE.read_text(encoding="utf-8"))
    games_data = json.loads(GAMES_FILE.read_text(encoding="utf-8"))

    matches = matches_data["matches"] if isinstance(matches_data, dict) and "matches" in matches_data else matches_data
    games = games_data["games"] if isinstance(games_data, dict) and "games" in games_data else games_data

    games_by_source = {}
    games_by_match_number = {}
    for g in games:
        source_id = str(g.get("source_match_id")) if g.get("source_match_id") is not None else None
        if source_id:
            games_by_source.setdefault(source_id, {})[int(g["game_number"])] = g

    results = []
    DEBUG_DIR.mkdir(exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        await page.goto(SCHEDULE_URL, wait_until="domcontentloaded", timeout=120000)
        await page.wait_for_timeout(1500)

        for idx, match in enumerate(matches, 1):
            source_match_id = extract_source_match_id(match)
            match_id = match.get("match_id")
            if not source_match_id:
                print(f"[WARN] {match_id}: source_match_id tidak ada, skip")
                continue

            try:
                detail = None

                # Detail dimuat asynchronous. Retry 3x agar request/modal yang
                # lambat tidak membuat match valid terlewat.
                for attempt in range(1, 4):
                    try:
                        await page.keyboard.press("Escape")
                    except Exception:
                        pass

                    await page.wait_for_timeout(500)

                    try:
                        await page.evaluate(f"openMatchDetail({int(source_match_id)})")
                    except Exception as e:
                        print(f"[RETRY] {match_id}: openMatchDetail gagal (attempt {attempt}/3): {e}")
                        await page.wait_for_timeout(1000)
                        continue

                    detail = await select_populated_match_detail(page, timeout_ms=15000)
                    if detail is not None:
                        break

                    print(f"[RETRY] {match_id}: detail belum populated (attempt {attempt}/3)")
                    try:
                        await page.keyboard.press("Escape")
                    except Exception:
                        pass
                    await page.wait_for_timeout(1000)

                if detail is None:
                    print(f"[WARN] {match_id}: populated #match-detail-content tidak ditemukan setelah 3 attempt")
                    continue

                html = await detail.inner_html()
                (DEBUG_DIR / f"{match_id}_{source_match_id}.html").write_text(html, encoding="utf-8")

                panels = detail.locator("div.tab-content.match-detail")
                panel_count = await panels.count()
                source_games = games_by_source.get(str(source_match_id), {})

                for pi in range(panel_count):
                    panel = panels.nth(pi)
                    text = await panel.inner_text()
                    game_match = re.search(r"GAME\s+(\d+)", text, re.I)
                    if game_match:
                        game_number = int(game_match.group(1))
                    else:
                        # Fallback to DOM order only if GAME N is absent.
                        game_number = pi + 1

                    game = source_games.get(game_number)
                    if not game:
                        print(f"[WARN] {match_id}: GAME {game_number} tidak ada di games.json")
                        continue

                    game_id = game["game_id"]
                    team_blocks = await get_team_blocks(panel)
                    block_count = await team_blocks.count()
                    if block_count != 2:
                        print(f"[WARN] {match_id} GAME {game_number}: ditemukan {block_count} team block, expected 2")
                        continue

                    # Validasi game: 2 team block, masing-masing 5 player.
                    # Jika salah satu sisi tidak lengkap, jangan menghasilkan
                    # data emblem parsial untuk game tersebut.
                    team_row_counts = []
                    for bi_check in range(2):
                        check_rows = team_blocks.nth(bi_check).locator(PLAYER_ROW_SELECTOR)
                        team_row_counts.append(await check_rows.count())

                    if team_row_counts != [5, 5]:
                        print(
                            f"[WARN] {match_id} GAME {game_number}: "
                            f"player rows {team_row_counts}, expected [5, 5]. Game dilewati."
                        )
                        continue

                    for bi in range(2):
                        block = team_blocks.nth(bi)
                        side = "team1" if bi == 0 else "team2"
                        team = match.get(side)

                        rows = block.locator(PLAYER_ROW_SELECTOR)
                        row_count = await rows.count()

                        for ri in range(row_count):
                            record = await parse_player_emblem(
                                rows.nth(ri),
                                team,
                                side,
                                match_id,
                                source_match_id,
                                game_id,
                                game_number,
                                ri + 1,
                            )
                            results.append(record)

                print(f"[{idx}/{len(matches)}] {match_id}: total emblem records sekarang {len(results)}")

            except Exception as e:
                print(f"[ERROR] {match_id}: {type(e).__name__}: {e}")

        await browser.close()

    # Stable ordering and dedupe.
    unique = {}
    for row in results:
        unique[row["game_emblem_id"]] = row
    results = list(unique.values())
    results.sort(key=lambda x: (x["match_id"], x["game_number"], x["side"], x["player"] or ""))

    metadata = {
        "league": "MPL Indonesia",
        "season": 17,
        "stage": "Regular Season",
        "source": SCHEDULE_URL,
        "source_type": "official_mpl_match_detail",
        "scraped_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "total_completed_matches": len(matches),
        "total_games": len(games),
        "total_expected_player_emblem_records": len(games) * 10,
        "total_player_emblem_records": len(results),
    }

    output = {"metadata": metadata, "game_emblems": results}
    OUTPUT_FILE.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n=== SELESAI ===")
    print(f"Output : {OUTPUT_FILE}")
    print(f"Games  : {len(games)}")
    print(f"Expected records : {len(games) * 10}")
    print(f"Actual records   : {len(results)}")
    print(f"Debug dir : {DEBUG_DIR}")

    # Validasi akhir: setiap game yang berhasil menghasilkan data harus
    # memiliki tepat 10 player emblem records.
    from collections import Counter
    game_counts = Counter(row["game_id"] for row in results)
    invalid_games = {game_id: count for game_id, count in game_counts.items() if count != 10}

    print(f"Valid games       : {len(game_counts)}")
    print(f"Invalid game rows : {len(invalid_games)}")
    if invalid_games:
        for game_id, count in sorted(invalid_games.items()):
            print(f"[WARN] {game_id}: {count} records, expected 10")
    else:
        print("[OK] Semua game yang terscrape memiliki tepat 10 record emblem.")


if __name__ == "__main__":
    asyncio.run(scrape())

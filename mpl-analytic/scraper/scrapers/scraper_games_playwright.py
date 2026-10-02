
import asyncio
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError


BASE_DIR = Path(__file__).resolve().parent
MATCHES_FILE = BASE_DIR / "matches.json"
OUTPUT_FILE = BASE_DIR / "games.json"
DEBUG_DIR = BASE_DIR / "debug_match_details"

SCHEDULE_URL = "https://id-mpl.com/en/schedule"

TEAM_MAP = {
    "TLID": "Team Liquid ID",
    "NAVI": "Natus Vincere",
    "BTR": "Bigetron by Vitality",
    "DEWA": "Dewa United Esports",
    "EVOS": "EVOS",
    "RRQ": "RRQ Hoshi",
    "AE": "Alter Ego",
    "ONIC": "ONIC",
    "GEEK": "Geek Fam ID",
}


def clean_text(value):
    return re.sub(r"\s+", " ", value or "").strip()


def normalize_team(value):
    value = clean_text(value)
    return TEAM_MAP.get(value, value)


def parse_score(text):
    m = re.search(r"\b(\d+)\s*-\s*(\d+)\b", clean_text(text))
    if not m:
        return None, None
    return int(m.group(1)), int(m.group(2))


def parse_games_from_detail(html, match):
    """
    Parse the actual HTML returned by openMatchDetail().

    Observed MPL structure:
      <li ... aria-controls="info-1850">
        <a ...>GAME 1</a>
      </li>
      <div class="tab-content match-detail ..." id="info-1850">
        ...
        <div class="text-center position-relative mb-2 victory">...</div>
        <div class="text-center"> ... clock ... </div>
        ...
      </div>

    We deliberately parse only explicit GAME N tabs.
    We do NOT infer games from the series score.
    """
    soup = BeautifulSoup(html, "html.parser")
    games = []

    # The game tabs are the authoritative game list in the detail HTML.
    for anchor in soup.select("a.ui-tabs-anchor"):
        label = clean_text(anchor.get_text(" ", strip=True))
        m = re.fullmatch(r"GAME\s+(\d+)", label, re.I)
        if not m:
            continue

        game_number = int(m.group(1))
        panel_id = anchor.get("href", "").lstrip("#")

        panel = soup.find(id=panel_id) if panel_id else None
        if panel is None:
            # Fallback through aria-controls on the parent <li>.
            parent_li = anchor.find_parent("li")
            panel_id = parent_li.get("aria-controls") if parent_li else None
            panel = soup.find(id=panel_id) if panel_id else None

        if panel is None:
            continue

        # Each game panel has a clock in the central "vs" block.
        duration = None
        for node in panel.select("div.text-center"):
            txt = clean_text(node.get_text(" ", strip=True))
            # Avoid team/player numbers; a duration is HH:MM.
            m_time = re.search(r"\b(\d{1,2}:\d{2})\b", txt)
            if m_time:
                duration = m_time.group(1)
                break

        # Team blocks are the two elements marked position-relative mb-2.
        team_blocks = panel.select("div.text-center.position-relative.mb-2")
        teams = []

        for block in team_blocks:
            img = block.select_one(".team-logo img[alt]")
            team = clean_text(img.get("alt")) if img else None

            if not team:
                # Fallback: team name is usually the last simple div after
                # the logo/score block.
                candidates = [
                    clean_text(x.get_text(" ", strip=True))
                    for x in block.select("div.mt-0")
                ]
                candidates = [x for x in candidates if x]
                if candidates:
                    team = candidates[-1]

            if not team:
                continue

            victory = "victory" in (block.get("class") or [])

            # The sword count is not the series score; it is the game's kill
            # count. Keep it only if we can identify it safely.
            kill_count = None
            block_text = clean_text(block.get_text(" ", strip=True))
            # Usually the victory/team block contains a number next to swords.
            # We intentionally do not use arbitrary numbers as kills.
            sword_img = block.select_one('img[src*="swords-64"]')
            if sword_img:
                parent_text = clean_text(
                    sword_img.parent.get_text(" ", strip=True)
                    if sword_img.parent else ""
                )
                nums = re.findall(r"\b\d+\b", parent_text)
                if nums:
                    kill_count = int(nums[-1])

            teams.append({
                "team": normalize_team(team),
                "raw_team": team,
                "victory": victory,
                "kills": kill_count,
            })

        winner = None
        if len(teams) >= 2:
            winners = [t["team"] for t in teams if t["victory"]]
            if len(winners) == 1:
                winner = winners[0]

        # Use the series teams as fallback context if the panel's team labels
        # cannot be recovered.
        if len(teams) >= 2:
            team1 = teams[0]["team"]
            team2 = teams[1]["team"]
        else:
            team1 = match.get("team1")
            team2 = match.get("team2")

        game = {
            "game_id": f"{match['match_id']}_g{game_number:02d}",
            "match_id": match["match_id"],
            "source_match_id": str(match["source_match_id"]),
            "game_number": game_number,
            "team1": team1,
            "team2": team2,
            "winner": winner,
            "duration": duration,
        }

        if len(teams) >= 2:
            game["team1_kills"] = teams[0]["kills"]
            game["team2_kills"] = teams[1]["kills"]

        games.append(game)

    # De-duplicate game numbers in case the DOM contains duplicated tabs.
    unique = {}
    for game in games:
        unique[game["game_number"]] = game

    return [unique[n] for n in sorted(unique)]


async def get_filled_match_detail(page):
    """
    The schedule contains many hidden duplicate #match-detail-content
    elements. Find the one whose inner HTML is actually populated.
    """
    locator = page.locator("#match-detail-content")
    count = await locator.count()

    for i in range(count):
        item = locator.nth(i)
        try:
            html = await item.inner_html()
        except Exception:
            continue

        if html and "GAME 1" in html.upper():
            return item, html

    # If content is not yet populated, wait briefly and retry.
    for _ in range(20):
        await page.wait_for_timeout(500)
        count = await locator.count()

        for i in range(count):
            item = locator.nth(i)
            try:
                html = await item.inner_html()
            except Exception:
                continue
            if html and "GAME 1" in html.upper():
                return item, html

    return None, ""


async def main():
    if not MATCHES_FILE.exists():
        raise FileNotFoundError(f"matches.json tidak ditemukan: {MATCHES_FILE}")

    matches_data = json.loads(MATCHES_FILE.read_text(encoding="utf-8"))
    matches = matches_data.get("matches", [])

    DEBUG_DIR.mkdir(exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("[1/4] Membuka schedule resmi...")
        await page.goto(SCHEDULE_URL, wait_until="domcontentloaded", timeout=120000)

        # Collect the official source match IDs from openMatchDetail().
        source_ids = {}
        for a in await page.locator('a[onclick*="openMatchDetail"]').all():
            onclick = await a.get_attribute("onclick")
            if not onclick:
                continue
            m = re.search(r"openMatchDetail\(\s*(\d+)\s*\)", onclick)
            if not m:
                continue

            # Walk upward to the containing .match element and identify teams.
            container = a.locator("xpath=ancestor::div[contains(@class,'match')][1]")
            try:
                t1 = clean_text(await container.locator(".team.team1 .name").inner_text())
                t2 = clean_text(await container.locator(".team.team2 .name").inner_text())
            except Exception:
                continue

            key = (
                normalize_team(t1),
                normalize_team(t2),
            )
            source_ids.setdefault(key, []).append(m.group(1))

        # Prefer existing source_match_id if already present.
        for match in matches:
            if match.get("source_match_id") is not None:
                continue

            key = (
                normalize_team(match.get("team1")),
                normalize_team(match.get("team2")),
            )
            candidates = source_ids.get(key, [])
            if candidates:
                match["source_match_id"] = candidates.pop(0)

        completed = [
            m for m in matches
            if m.get("source_match_id") is not None
            and m.get("score", {}).get("team1") is not None
            and m.get("score", {}).get("team2") is not None
        ]

        print(f"      completed matches: {len(completed)}")

        all_games = []

        print("[2/4] Membuka openMatchDetail() satu per satu...")

        for idx, match in enumerate(completed, 1):
            source_id = str(match["source_match_id"])
            print(
                f"      [{idx}/{len(completed)}] "
                f"{match['match_id']} -> openMatchDetail({source_id})"
            )

            # Call the actual site function. It populates the active detail
            # content in the page.
            await page.evaluate(
                """(id) => {
                    if (typeof openMatchDetail !== 'function') {
                        throw new Error('openMatchDetail() tidak ditemukan');
                    }
                    openMatchDetail(Number(id));
                }""",
                source_id,
            )

            detail_locator, html = await get_filled_match_detail(page)

            if not html:
                print("           WARNING: detail HTML kosong")
                continue

            debug_file = DEBUG_DIR / f"{match['match_id']}_{source_id}.html"
            debug_file.write_text(html, encoding="utf-8")

            games = parse_games_from_detail(html, match)

            if not games:
                print("           WARNING: tab GAME tidak ditemukan")
            else:
                print(f"           games ditemukan: {len(games)}")

            all_games.extend(games)

        await browser.close()

    # De-duplicate globally.
    unique = {}
    for game in all_games:
        unique[game["game_id"]] = game

    games = list(unique.values())
    games.sort(key=lambda x: (x["match_id"], x["game_number"]))

    result = {
        "metadata": {
            "league": "MPL Indonesia",
            "season": 17,
            "stage": "Regular Season",
            "source": SCHEDULE_URL,
            "source_type": "official_mpl_match_detail",
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "total_completed_matches": len(completed),
            "total_games": len(games),
        },
        "games": games,
    }

    OUTPUT_FILE.write_text(
        json.dumps(result, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # Persist source_match_id into matches.json for the next datasets.
    matches_data["matches"] = matches
    matches_data.setdefault("metadata", {})
    matches_data["metadata"]["total_completed_matches"] = len(completed)

    MATCHES_FILE.write_text(
        json.dumps(matches_data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("[3/4] Menyimpan JSON...")
    print(f"      games.json : {OUTPUT_FILE}")
    print(f"      total game : {len(games)}")
    print(f"      debug HTML : {DEBUG_DIR}")
    print("[4/4] Selesai.")


if __name__ == "__main__":
    asyncio.run(main())

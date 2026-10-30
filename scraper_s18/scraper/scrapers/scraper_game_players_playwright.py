import asyncio
import json
import re
from collections import Counter
from pathlib import Path
from playwright.async_api import async_playwright
from progress import start, step, ok, warn, finish

BASE_DIR = Path(__file__).resolve().parent
MATCHES_FILE = BASE_DIR / 'matches.json'
GAMES_FILE = BASE_DIR / 'games.json'
OUTPUT_FILE = BASE_DIR / 'game_players.json'
SCHEDULE_URL = 'https://id-mpl.com/en/schedule'
SEASON = 18  # ← S18

PLAYER_ROW_SELECTOR = (
    'div.d-flex.flex-column.flex-lg-row.'
    'justify-content-between.align-items-center.'
    'align-items-lg-start.my-3'
)

# Foto player per tim (fallback jika tidak tersedia di halaman)
# Format: "NamaPlayer": "URL_foto"
PLAYER_PHOTOS = {
    # RRQ Hoshi
    "R7": "https://id-mpl.com/images/players/rrq/r7.png",
    "Alberttt": "https://id-mpl.com/images/players/rrq/alberttt.png",
    "Lemon": "https://id-mpl.com/images/players/rrq/lemon.png",
    "Skylar": "https://id-mpl.com/images/players/rrq/skylar.png",
    "CW": "https://id-mpl.com/images/players/rrq/cw.png",
    # ONIC
    "Kairi": "https://id-mpl.com/images/players/onic/kairi.png",
    "Sanz": "https://id-mpl.com/images/players/onic/sanz.png",
    "Butsss": "https://id-mpl.com/images/players/onic/butsss.png",
    "Udil": "https://id-mpl.com/images/players/onic/udil.png",
    "Biboo": "https://id-mpl.com/images/players/onic/biboo.png",
    # EVOS
    "Luminaire": "https://id-mpl.com/images/players/evos/luminaire.png",
    "Sarang": "https://id-mpl.com/images/players/evos/sarang.png",
    "Warlord": "https://id-mpl.com/images/players/evos/warlord.png",
    "Clover": "https://id-mpl.com/images/players/evos/clover.png",
    "Eman": "https://id-mpl.com/images/players/evos/eman.png",
    # Alter Ego
    "CongThi": "https://id-mpl.com/images/players/ae/congthi.png",
    "Branz": "https://id-mpl.com/images/players/ae/branz.png",
    "Vynnn": "https://id-mpl.com/images/players/ae/vynnn.png",
    "Rexxy": "https://id-mpl.com/images/players/ae/rexxy.png",
    "Fico": "https://id-mpl.com/images/players/ae/fico.png",
}

TEAM_LOGOS = {
    "Team Liquid ID": "https://id-mpl.com/images/teams/tlid.png",
    "Natus Vincere": "https://id-mpl.com/images/teams/navi.png",
    "Bigetron by Vitality": "https://id-mpl.com/images/teams/btr.png",
    "Dewa United Esports": "https://id-mpl.com/images/teams/dewa.png",
    "EVOS": "https://id-mpl.com/images/teams/evos.png",
    "RRQ Hoshi": "https://id-mpl.com/images/teams/rrq.png",
    "Alter Ego": "https://id-mpl.com/images/teams/ae.png",
    "ONIC": "https://id-mpl.com/images/teams/onic.png",
    "Geek Fam ID": "https://id-mpl.com/images/teams/geek.png",
}

MLBB_HERO_BASE = "https://mlbb-image.scoregg.com/hero_h/{}.png"


def load_json(path):
    with path.open('r', encoding='utf-8') as f:
        return json.load(f)


def save_json(path, data):
    with path.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def extract_source_match_id(match):
    value = (
        match.get('source_match_id')
        or match.get('_source_match_id')
        or match.get('match_source_id')
    )
    return str(value) if value is not None else None


def parse_number(value):
    if value is None:
        return 0
    text = str(value).strip()
    if not text:
        return 0
    text = text.replace(',', '').replace('.', '')
    digits = re.sub(r'[^\d-]', '', text)
    if not digits or digits == '-':
        return 0
    try:
        return int(digits)
    except ValueError:
        return 0


def parse_kda(text):
    if not text:
        return (0, 0, 0)
    m = re.search(r'(\d+)\s*/\s*(\d+)\s*/\s*(\d+)', text)
    if not m:
        return (0, 0, 0)
    return (int(m.group(1)), int(m.group(2)), int(m.group(3)))


async def select_populated_match_detail(page, timeout_ms=15000):
    containers = page.locator('#match-detail-content')
    start_time = asyncio.get_running_loop().time()
    while asyncio.get_running_loop().time() - start_time < timeout_ms / 1000:
        count = await containers.count()
        for i in range(count):
            container = containers.nth(i)
            try:
                text = await container.inner_text(timeout=1000)
                if 'GAME 1' not in text:
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
                await page.keyboard.press('Escape')
            except Exception:
                pass
            await page.wait_for_timeout(500)
            await page.evaluate(f'openMatchDetail({int(source_match_id)});')
            detail = await select_populated_match_detail(page, timeout_ms=15000)
            if detail is not None:
                return detail
        except Exception:
            pass
        await page.wait_for_timeout(1000)
    return None


async def extract_player_photo(row):
    """Coba ambil foto player dari halaman, fallback ke URL default."""
    # Cari img dengan class atau style yang berisi foto player (bukan hero)
    photo_imgs = row.locator('img[style*="border-radius"], img.player-photo, img.rounded-circle')
    if await photo_imgs.count() > 0:
        src = await photo_imgs.first.get_attribute('src')
        if src:
            if not src.startswith('http'):
                src = 'https://id-mpl.com' + src
            return src
    return None


async def extract_player_row(row):
    player_el = row.locator('div[style*="font-weight: 700"]').first
    player = (await player_el.inner_text()).strip() if await player_el.count() else ""

    # Foto player
    player_photo = await extract_player_photo(row)
    if not player_photo and player:
        player_photo = PLAYER_PHOTOS.get(player, f"https://id-mpl.com/images/players/default.png")
    if not player_photo:
        player_photo = "https://id-mpl.com/images/players/default.png"

    # Hero
    hero_img = row.locator('img[style*="max-width: 50px"]').first
    hero = ""
    hero_url = ""
    if await hero_img.count():
        hero_name = await hero_img.get_attribute('alt')
        hero_src = await hero_img.get_attribute('src')
        if hero_name:
            hero = hero_name.strip()
        if hero_src:
            hero_url = hero_src.split('?', 1)[0]
        if not hero_url and hero:
            # Fallback: generate URL dari nama hero
            hero_url = f"https://mlbb-image.scoregg.com/hero_h/{hero.lower().replace(' ', '_')}.png"

    if not hero_url:
        hero_url = "https://mlbb-image.scoregg.com/hero_h/default.png"

    kda_el = row.locator('.kda-content').first
    kda_text = (await kda_el.inner_text()).strip() if await kda_el.count() else ''
    kills, deaths, assists = parse_kda(kda_text)

    metric_selectors = {
        'damage': 'img[src*="sword-64"], img[src*="sword-r-64"]',
        'damage_taken': 'img[src*="shield-64"]',
        'turret_damage': 'img[src*="tower-64"]',
        'gold': 'img[src*="money-64"]',
    }
    metrics = {'damage': 0, 'damage_taken': 0, 'turret_damage': 0, 'gold': 0}
    for field, icon_selector in metric_selectors.items():
        icon = row.locator(icon_selector).first
        if not await icon.count():
            continue
        value = await icon.evaluate("""(el) => {
            let node = el;
            for (let i = 0; i < 5 && node; i++, node = node.parentElement) {
                const text = (node.innerText || '').trim();
                const lines = text.split(/\\n+/).map(x => x.trim()).filter(Boolean);
                const candidates = lines.filter(x => /\\d/.test(x));
                if (candidates.length) return candidates[candidates.length - 1];
            }
            return '0';
        }""")
        metrics[field] = parse_number(value)

    return {
        'player': player or "Unknown",
        'player_photo': player_photo,
        'hero': hero or "Unknown",
        'hero_url': hero_url,
        'kills': kills,
        'deaths': deaths,
        'assists': assists,
        'damage': metrics['damage'],
        'damage_taken': metrics['damage_taken'],
        'turret_damage': metrics['turret_damage'],
        'gold': metrics['gold'],
    }


async def main():
    start(f"MPL INDONESIA S{SEASON} - GAME PLAYERS")
    matches_data = load_json(MATCHES_FILE)
    games_data = load_json(GAMES_FILE)
    matches = matches_data.get('matches', []) if isinstance(matches_data, dict) else matches_data
    games = games_data.get('games', []) if isinstance(games_data, dict) else games_data

    games_by_source = {}
    for game in games:
        source_id = extract_source_match_id(game)
        if source_id:
            games_by_source.setdefault(source_id, []).append(game)

    output = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1440, 'height': 1000},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        )
        page = await context.new_page()
        page.set_default_timeout(10000)
        await page.goto(SCHEDULE_URL, wait_until='domcontentloaded', timeout=60000)

        for match_idx, match in enumerate(matches, start=1):
            step(match_idx, len(matches), f"{match.get('match_id')} | {match.get('team1')} vs {match.get('team2')}")
            match_id = match.get('match_id')
            source_match_id = extract_source_match_id(match)
            if not source_match_id:
                continue
            target_games = games_by_source.get(source_match_id, [])
            if not target_games:
                continue

            detail = await open_match_detail_with_retry(page, source_match_id, retries=3)
            if detail is None:
                warn("detail tidak ditemukan")
                continue

            panels = detail.locator('div.tab-content.match-detail')
            panel_count = await panels.count()
            games_by_number = {
                int(g['game_number']): g
                for g in target_games
                if g.get('game_number') is not None
            }

            team1_name = match.get('team1', '')
            team2_name = match.get('team2', '')
            team1_logo = TEAM_LOGOS.get(team1_name, 'https://id-mpl.com/images/teams/default.png')
            team2_logo = TEAM_LOGOS.get(team2_name, 'https://id-mpl.com/images/teams/default.png')

            for panel_idx in range(panel_count):
                game_number = panel_idx + 1
                if game_number not in games_by_number:
                    continue
                game = games_by_number[game_number]
                game_id = game['game_id']
                panel = panels.nth(panel_idx)

                team_blocks = panel.locator(':scope > div.row > div.col-6')
                team_block_count = await team_blocks.count()
                if team_block_count != 2:
                    team_blocks = panel.locator('div.col-6')
                    team_block_count = await team_blocks.count()
                if team_block_count != 2:
                    continue

                game_rows = []
                game_valid = True
                for team_idx in range(2):
                    block = team_blocks.nth(team_idx)
                    side = 'team1' if team_idx == 0 else 'team2'
                    team = team1_name if team_idx == 0 else team2_name
                    team_logo = team1_logo if team_idx == 0 else team2_logo
                    rows = block.locator(PLAYER_ROW_SELECTOR)
                    row_count = await rows.count()
                    if row_count != 5:
                        game_valid = False
                        break
                    for player_idx in range(row_count):
                        row = rows.nth(player_idx)
                        parsed = await extract_player_row(row)
                        record = {
                            'player_game_id': f'{game_id}_p{team_idx * 5 + player_idx + 1:02d}',
                            'game_id': game_id,
                            'match_id': match_id,
                            'source_match_id': source_match_id,
                            'game_number': game_number,
                            'team': team,
                            'team_logo': team_logo,
                            'side': side,
                            'player': parsed['player'],
                            'player_photo': parsed['player_photo'],
                            'hero': parsed['hero'],
                            'hero_url': parsed['hero_url'],
                            'kills': parsed['kills'],
                            'deaths': parsed['deaths'],
                            'assists': parsed['assists'],
                            'damage': parsed['damage'],
                            'damage_taken': parsed['damage_taken'],
                            'turret_damage': parsed['turret_damage'],
                            'gold': parsed['gold'],
                        }
                        game_rows.append(record)
                    if not game_valid:
                        break

                if not game_valid or len(game_rows) != 10:
                    continue

                output.extend(game_rows)

        await browser.close()

    save_json(OUTPUT_FILE, output)
    finish(f"game_players.json selesai - {len(output)} records")


if __name__ == '__main__':
    asyncio.run(main())

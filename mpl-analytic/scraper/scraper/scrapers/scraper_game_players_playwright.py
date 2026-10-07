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
PLAYER_ROW_SELECTOR = 'div.d-flex.flex-column.flex-lg-row.justify-content-between.align-items-center.align-items-lg-start.my-3'

def load_json(path):
    with path.open('r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with path.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def extract_source_match_id(match):
    value = match.get('source_match_id') or match.get('_source_match_id') or match.get('match_source_id')
    return str(value) if value is not None else None

def parse_number(value):
    """
    Convert values such as:
      47.950 -> 47950
      110.412 -> 110412
      9.459 -> 9459
      0 -> 0
    The official page uses dots as thousands separators.
    """
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    text = text.replace(',', '').replace('.', '')
    digits = re.sub('[^\\d-]', '', text)
    if not digits or digits == '-':
        return None
    try:
        return int(digits)
    except ValueError:
        return None

def parse_kda(text):
    if not text:
        return (None, None, None)
    m = re.search('(\\d+)\\s*/\\s*(\\d+)\\s*/\\s*(\\d+)', text)
    if not m:
        return (None, None, None)
    return (int(m.group(1)), int(m.group(2)), int(m.group(3)))

async def select_populated_match_detail(page, timeout_ms=15000):
    """
    There are many duplicated #match-detail-content elements.
    Wait until one is actually populated with GAME 1 and >=10 player rows.
    """
    containers = page.locator('#match-detail-content')
    start = asyncio.get_running_loop().time()
    while asyncio.get_running_loop().time() - start < timeout_ms / 1000:
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
            pass
        except Exception as e:
            pass
        await page.wait_for_timeout(1000)
    return None

async def extract_player_row(row):
    player_el = row.locator('div[style*="font-weight: 700"]').first
    player = (await player_el.inner_text()).strip() if await player_el.count() else None
    hero_img = row.locator('img[style*="max-width: 50px"]').first
    hero = None
    hero_url = None
    if await hero_img.count():
        hero = await hero_img.get_attribute('alt')
        hero_url = await hero_img.get_attribute('src')
        if hero:
            hero = hero.strip()
        if hero_url:
            hero_url = hero_url.split('?', 1)[0]
    kda_el = row.locator('.kda-content').first
    kda_text = (await kda_el.inner_text()).strip() if await kda_el.count() else ''
    kills, deaths, assists = parse_kda(kda_text)
    metric_selectors = {'damage': 'img[src*="sword-64"], img[src*="sword-r-64"]', 'damage_taken': 'img[src*="shield-64"]', 'turret_damage': 'img[src*="tower-64"]', 'gold': 'img[src*="money-64"]'}
    metrics = {'damage': None, 'damage_taken': None, 'turret_damage': None, 'gold': None}
    for field, icon_selector in metric_selectors.items():
        icon = row.locator(icon_selector).first
        if not await icon.count():
            continue
        value = await icon.evaluate("(el) => {\n                let node = el;\n                for (let i = 0; i < 5 && node; i++, node = node.parentElement) {\n                    const text = (node.innerText || '').trim();\n                    const lines = text.split(/\\n+/)\n                        .map(x => x.trim())\n                        .filter(Boolean);\n\n                    const candidates = lines.filter(x => /\\d/.test(x));\n                    if (candidates.length) {\n                        return candidates[candidates.length - 1];\n                    }\n                }\n                return '';\n            }")
        metrics[field] = parse_number(value)
    return {'player': player, 'hero': hero, 'hero_url': hero_url, 'kills': kills, 'deaths': deaths, 'assists': assists, 'damage': metrics['damage'], 'damage_taken': metrics['damage_taken'], 'turret_damage': metrics['turret_damage'], 'gold': metrics['gold']}

async def main():
    start("MPL INDONESIA S17 - GAME PLAYERS")
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
        context = await browser.new_context(viewport={'width': 1440, 'height': 1000}, user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
        page = await context.new_page()
        page.set_default_timeout(10000)
        pass
        await page.goto(SCHEDULE_URL, wait_until='domcontentloaded', timeout=60000)
        for match_idx, match in enumerate(matches, start=1):
            step(match_idx, len(matches), f"{match.get('match_id')} | {match.get('team1')} vs {match.get('team2')}")
            match_id = match.get('match_id')
            source_match_id = extract_source_match_id(match)
            if not source_match_id:
                pass
                continue
            target_games = games_by_source.get(source_match_id, [])
            if not target_games:
                pass
                continue
            pass
            detail = await open_match_detail_with_retry(page, source_match_id, retries=3)
            if detail is None:
                pass
                continue
            try:
                html = await detail.evaluate('(el) => el.outerHTML')
                pass
            except Exception:
                pass
            panels = detail.locator('div.tab-content.match-detail')
            panel_count = await panels.count()
            games_by_number = {int(g['game_number']): g for g in target_games if g.get('game_number') is not None}
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
                    pass
                    continue
                game_rows = []
                game_valid = True
                for team_idx in range(2):
                    block = team_blocks.nth(team_idx)
                    side = 'team1' if team_idx == 0 else 'team2'
                    team = match.get('team1' if team_idx == 0 else 'team2')
                    rows = block.locator(PLAYER_ROW_SELECTOR)
                    row_count = await rows.count()
                    if row_count != 5:
                        pass
                        game_valid = False
                        break
                    for player_idx in range(row_count):
                        row = rows.nth(player_idx)
                        parsed = await extract_player_row(row)
                        required = [parsed['player'], parsed['hero'], parsed['kills'], parsed['deaths'], parsed['assists']]
                        if any((value is None for value in required)):
                            pass
                            game_valid = False
                            break
                        record = {'player_game_id': f'{game_id}_p{team_idx * 5 + player_idx + 1:02d}', 'game_id': game_id, 'match_id': match_id, 'source_match_id': source_match_id, 'game_number': game_number, 'team': team, 'side': side, 'player': parsed['player'], 'hero': parsed['hero'], 'hero_url': parsed['hero_url'], 'kills': parsed['kills'], 'deaths': parsed['deaths'], 'assists': parsed['assists'], 'damage': parsed['damage'], 'damage_taken': parsed['damage_taken'], 'turret_damage': parsed['turret_damage'], 'gold': parsed['gold']}
                        game_rows.append(record)
                    if not game_valid:
                        break
                if not game_valid:
                    continue
                if len(game_rows) != 10:
                    pass
                    continue
                team1_count = sum((1 for x in game_rows if x['side'] == 'team1'))
                team2_count = sum((1 for x in game_rows if x['side'] == 'team2'))
                if team1_count != 5 or team2_count != 5:
                    pass
                    continue
                output.extend(game_rows)
            pass
        await browser.close()
    expected_records = len(games) * 10
    game_counts = Counter((item['game_id'] for item in output))
    side_counts = Counter(((item['game_id'], item['side']) for item in output))
    all_game_ids = {g['game_id'] for g in games}
    invalid_games = {game_id: count for game_id, count in game_counts.items() if count != 10}
    invalid_side_counts = {f'{game_id}:{side}': count for (game_id, side), count in side_counts.items() if count != 5}
    missing_games = sorted(all_game_ids - set(game_counts.keys()))
    valid_games = sum((1 for game_id in all_game_ids if game_counts.get(game_id, 0) == 10 and side_counts.get((game_id, 'team1'), 0) == 5 and (side_counts.get((game_id, 'team2'), 0) == 5)))
    save_json(OUTPUT_FILE, output)
    pass
    pass
    pass
    pass
    pass
    pass
    pass
    pass
    pass
    pass
    pass
    if len(output) == expected_records and (not invalid_games) and (not missing_games) and (not invalid_side_counts):
        pass
    else:
        pass
        if missing_games:
            pass
            for game_id in missing_games[:20]:
                pass
        if invalid_games:
            pass
            for game_id, count in list(invalid_games.items())[:20]:
                pass
        if invalid_side_counts:
            pass
            for key, count in list(invalid_side_counts.items())[:20]:
                pass
    finish(f"game_players.json selesai")
if __name__ == '__main__':
    asyncio.run(main())

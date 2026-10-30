import json
import re
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# 1. Fetch official hero avatar mappings from Moonton API
print("Fetching official avatar mappings from mapi.mobilelegends.com...")
try:
    req = urllib.request.Request(
        'https://mapi.mobilelegends.com/hero/list',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        official_data = json.loads(resp.read().decode('utf-8'))
    official_heroes = official_data.get('data', [])
except Exception as e:
    print(f"Warning: Failed to fetch online mapping ({e}), using fallback.")
    official_heroes = []

avatar_map = {}
for h in official_heroes:
    norm = re.sub(r'[^a-zA-Z0-9]+', '', h.get('name', '').lower())
    url = h.get('key', '')
    if url.startswith('//'):
        url = 'https:' + url
    elif url and not url.startswith('http'):
        url = 'https://' + url
    if norm and url:
        avatar_map[norm] = url

# ScoreGG high-res fallbacks for newer / special heroes
scoregg_fallbacks = {
    'hirara': 'https://mlbb-image.scoregg.com/m/33/p/266/1810181178495.png',
    'kalea': 'https://mlbb-image.scoregg.com/m/33/p/253/3015102929805.png',
    'lukas': 'https://mlbb-image.scoregg.com/m/33/p/258/0614125979896.png',
    'marcel': 'https://mlbb-image.scoregg.com/m/33/p/263/0916382764021.png',
    'obsidia': 'https://mlbb-image.scoregg.com/m/33/p/2511/1010583049059.png',
    'sora': 'https://mlbb-image.scoregg.com/m/33/p/2512/1717443916579.png',
    'suyou': 'https://mlbb-image.scoregg.com/m/33/p/254/1010590217262.png',
    'wuzetian': 'https://mlbb-image.scoregg.com/m/27/p/251/2418575518975.png',
    'zhuxin': 'https://mlbb-image.scoregg.com/m/33/p/258/0614081359683.png',
}
avatar_map.update(scoregg_fallbacks)

def get_hero_avatar(name: str, slug: str = "") -> str:
    norm_name = re.sub(r'[^a-zA-Z0-9]+', '', (name or '').lower())
    norm_slug = re.sub(r'[^a-zA-Z0-9]+', '', (slug or '').lower())
    if norm_name in avatar_map:
        return avatar_map[norm_name]
    if norm_slug in avatar_map:
        return avatar_map[norm_slug]
    return f"https://mlbb-image.scoregg.com/hero_h/{slug}.png"

# Update files
target_files = ["hero_base_stats.json", "hero_details.json", "hero_full_mlbbio.json"]
for fname in target_files:
    fpath = BASE_DIR / fname
    if fpath.exists():
        data = json.load(open(fpath, encoding="utf-8"))
        items = data["heroes"] if isinstance(data, dict) and "heroes" in data else data
        for h in items:
            name = h.get("hero_name") or ""
            slug = h.get("hero_slug") or re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
            h["hero_slug"] = slug
            h["hero_image_url"] = get_hero_avatar(name, slug)
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"[OK] {fname}: {len(items)} heroes updated with valid avatar URLs")

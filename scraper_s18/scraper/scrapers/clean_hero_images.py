import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# 1. Update hero_base_stats.json
path_base = BASE_DIR / "hero_base_stats.json"
if path_base.exists():
    data = json.load(open(path_base, encoding="utf-8"))
    items = data["heroes"] if isinstance(data, dict) and "heroes" in data else data
    for h in items:
        name = h.get("hero_name") or ""
        slug = h.get("hero_slug") or re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        h["hero_slug"] = slug
        h["hero_image_url"] = f"https://akmweb.youngjoygame.com/web/svnres/img/mlbb/hero_h/{slug}.png"
    with open(path_base, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"[OK] hero_base_stats.json: {len(items)} heroes updated with direct PNG image URLs")

# 2. Update hero_details.json
path_details = BASE_DIR / "hero_details.json"
if path_details.exists():
    data = json.load(open(path_details, encoding="utf-8"))
    items = data["heroes"] if isinstance(data, dict) and "heroes" in data else data
    for h in items:
        name = h.get("hero_name") or ""
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        h["hero_image_url"] = f"https://akmweb.youngjoygame.com/web/svnres/img/mlbb/hero_h/{slug}.png"
    with open(path_details, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"[OK] hero_details.json: {len(items)} heroes updated with direct PNG image URLs")

# 3. Update hero_full_mlbbio.json
path_full = BASE_DIR / "hero_full_mlbbio.json"
if path_full.exists():
    data = json.load(open(path_full, encoding="utf-8"))
    items = data["heroes"] if isinstance(data, dict) and "heroes" in data else data
    for h in items:
        name = h.get("hero_name") or ""
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        h["hero_image_url"] = f"https://akmweb.youngjoygame.com/web/svnres/img/mlbb/hero_h/{slug}.png"
    with open(path_full, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"[OK] hero_full_mlbbio.json: {len(items)} heroes updated with direct PNG image URLs")

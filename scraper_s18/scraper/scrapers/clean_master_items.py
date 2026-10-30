import json
from pathlib import Path

path = Path(__file__).resolve().parent / "master_items.json"
data = json.load(open(path, encoding="utf-8"))

items = data["items"] if isinstance(data, dict) and "items" in data else data

fixed = 0
for it in items:
    eid = it.get("equipid") or it.get("master_item_id")
    icon = it.get("item_icon") or it.get("equipicon") or ""
    if not icon or not icon.endswith((".png", ".jpg", ".webp", ".jpeg")):
        icon = f"https://akmweb.youngjoygame.com/web/svnres/img/mlbb/item_h/{eid}.png"
        it["item_icon"] = icon
        it["equipicon"] = icon
        fixed += 1
    it["item_url"] = icon

if isinstance(data, dict):
    data["items"] = items
    data["total"] = len(items)
else:
    data = items

with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"[OK] master_items.json cleaned: {len(items)} items, {fixed} items had missing icons replaced with direct CDN PNGs.")

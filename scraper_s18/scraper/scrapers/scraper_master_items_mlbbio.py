from pathlib import Path
import json
import requests
import time

BASE_DIR = Path(__file__).resolve().parent
OUTPUT = BASE_DIR / "master_items.json"

API_BASE = "https://arena.rone.dev/api/academy/equipment"
PAGE_SIZE = 200
TIMEOUT = 30

SCOREGG_ICON_BASE = "https://mlbb-image.scoregg.com/equipment/{}.png"
MOONTON_ICON_BASE = "https://mlbb.io/images/items/{}.png"


def fetch_equipment_catalog():
    all_items = []
    index = 1

    while True:
        print(f"[API] equipment page={index}")
        params = {"size": PAGE_SIZE, "index": index, "lang": "en"}

        try:
            response = requests.get(API_BASE, params=params, timeout=TIMEOUT)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"[ERROR] API request gagal: {e}")
            break

        try:
            payload = response.json()
        except ValueError:
            print("[ERROR] Response API bukan JSON")
            break

        data = payload.get("data") or {}
        records = data.get("records") or []

        if not records:
            break

        for record in records:
            api_data = record.get("data") or {}
            equip_id = api_data.get("equipid")
            if equip_id is None:
                continue

            item = dict(api_data)
            item["master_item_id"] = equip_id
            item["item_name"] = api_data.get("equipname") or f"Item_{equip_id}"

            # Pastikan item_icon tidak null — gunakan beberapa fallback
            icon_raw = api_data.get("equipicon") or ""
            if icon_raw:
                if not icon_raw.startswith("http"):
                    icon_raw = "https://mlbb.io" + icon_raw
                item["item_icon"] = icon_raw
            else:
                # Fallback ke scoregg CDN menggunakan equip_id
                item["item_icon"] = SCOREGG_ICON_BASE.format(equip_id)

            # item_url — halaman detail item di mlbb.io
            slug = (api_data.get("equipname") or "").lower().replace(" ", "-").replace("'", "")
            item["item_url"] = f"https://mlbb.io/en/equipment/{slug}" if slug else f"https://mlbb.io/en/equipment/{equip_id}"

            all_items.append(item)

        total = data.get("total")
        print(f"[INFO] page={index} records={len(records)} total={total}")

        if total is not None and len(all_items) >= int(total):
            break
        if len(records) < PAGE_SIZE:
            break

        index += 1
        time.sleep(0.2)

    return all_items


def save_master_items(items):
    items.sort(key=lambda x: int(x["master_item_id"]))

    output = {
        "source": "Rone Arena API",
        "api": API_BASE,
        "total": len(items),
        "items": items,
    }

    with OUTPUT.open("w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print()
    print("=" * 60)
    print("[DONE] master item berhasil dibuat")
    print(f"[INFO] total item : {len(items)}")
    print(f"[INFO] output     : {OUTPUT}")
    print("=" * 60)


def main():
    print("[INFO] Mengambil master item dari Rone Arena API...")
    items = fetch_equipment_catalog()

    if not items:
        print("[ERROR] Tidak ada master item dari API.")
        return

    # Validasi — pastikan tidak ada null di field penting
    for item in items:
        if not item.get("item_name"):
            item["item_name"] = f"Item_{item['master_item_id']}"
        if not item.get("item_icon"):
            item["item_icon"] = SCOREGG_ICON_BASE.format(item["master_item_id"])
        if not item.get("item_url"):
            item["item_url"] = f"https://mlbb.io/en/equipment/{item['master_item_id']}"

    save_master_items(items)


if __name__ == "__main__":
    main()
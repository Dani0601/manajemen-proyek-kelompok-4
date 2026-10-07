from pathlib import Path
import json
import requests
import time

# ============================================================
# CONFIG
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

OUTPUT = BASE_DIR / "master_items.json"

API_BASE = "https://arena.rone.dev/api/academy/equipment"

PAGE_SIZE = 200
TIMEOUT = 30

# ============================================================
# FETCH API
# ============================================================

def fetch_equipment_catalog():
    """
    Ambil seluruh master item/equipment langsung dari
    Rone Arena API.
    """

    all_items = []
    index = 1

    while True:
        print(f"[API] equipment page={index}")

        params = {
            "size": PAGE_SIZE,
            "index": index,
            "lang": "en",
        }

        try:
            response = requests.get(
                API_BASE,
                params=params,
                timeout=TIMEOUT,
            )
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

            # Simpan seluruh data API
            item = dict(api_data)

            # Field master yang kita tetapkan
            item["master_item_id"] = equip_id
            item["item_name"] = api_data.get("equipname")
            item["item_icon"] = api_data.get("equipicon")

            all_items.append(item)

        total = data.get("total")

        print(
            f"[INFO] page={index} "
            f"records={len(records)} "
            f"total={total}"
        )

        # Kalau jumlah data sudah mencapai total API
        if total is not None and len(all_items) >= int(total):
            break

        # Kalau page terakhir
        if len(records) < PAGE_SIZE:
            break

        index += 1
        time.sleep(0.2)

    return all_items


# ============================================================
# SAVE MASTER ITEMS
# ============================================================

def save_master_items(items):
    """
    Simpan master item ke JSON.
    """

    # Urutkan berdasarkan equipid
    items.sort(
        key=lambda x: int(x["master_item_id"])
    )

    output = {
        "source": "Rone Arena API",
        "api": API_BASE,
        "total": len(items),
        "items": items,
    }

    with OUTPUT.open(
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            output,
            f,
            ensure_ascii=False,
            indent=2,
        )

    print()
    print("=" * 60)
    print("[DONE] master item berhasil dibuat")
    print(f"[INFO] total item : {len(items)}")
    print(f"[INFO] output     : {OUTPUT}")
    print("=" * 60)


# ============================================================
# MAIN
# ============================================================

def main():
    print("[INFO] Mengambil master item dari Rone Arena API...")

    items = fetch_equipment_catalog()

    if not items:
        print("[ERROR] Tidak ada master item dari API.")
        return

    save_master_items(items)


if __name__ == "__main__":
    main()
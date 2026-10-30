#!/usr/bin/env python3
"""
Generate item_id_mapping.json for MPL ID S17.

Flow:
1. Read game_items.json -> collect source item_id values.
2. Fetch Rone Arena equipment catalog.
3. Build API master index by data.records[].data.equipid.
4. Resolve source item_id -> API equipid by DIRECT numeric ID equality.
5. Write item_id_mapping.json.

IMPORTANT:
- master_items.json is NOT used.
- No item-name matching is performed.
- No numeric-ID guessing/fuzzy matching is performed.
- The only mapping rule is:
      game_items.item_id == Rone Arena data.records[].data.equipid
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import requests

BASE_DIR = Path(__file__).resolve().parent
GAME_ITEMS = BASE_DIR / "game_items.json"
OUTPUT = BASE_DIR / "item_id_mapping.json"

API_BASE = "https://arena.rone.dev/api/academy/equipment"
PAGE_SIZE = 200
TIMEOUT = 30


def load_rows(path: Path, keys: tuple[str, ...]) -> list[dict]:
    with path.open("r", encoding="utf-8") as f:
        obj = json.load(f)

    if isinstance(obj, list):
        return obj

    if isinstance(obj, dict):
        for key in keys:
            value = obj.get(key)
            if isinstance(value, list):
                return value

    raise ValueError(f"Format JSON tidak dikenali: {path}")


def get_source_ids(rows: list[dict]) -> list[int]:
    """Collect unique, valid game_items.item_id values."""
    ids: set[int] = set()

    for row in rows:
        value = row.get("item_id")
        if value is None:
            continue

        try:
            ids.add(int(value))
        except (TypeError, ValueError):
            continue

    return sorted(ids)


def fetch_equipment_catalog() -> list[dict]:
    """Fetch all Rone Arena equipment records."""
    all_records: list[dict] = []
    index = 1

    while True:
        params = {
            "size": PAGE_SIZE,
            "index": index,
            "lang": "en",
        }

        print(f"[API] equipment page={index}")

        response = requests.get(
            API_BASE,
            params=params,
            timeout=TIMEOUT,
            headers={"User-Agent": "MPL-Analytic-Item-Mapping/1.0"},
        )
        response.raise_for_status()

        payload = response.json()
        data = payload.get("data", {}) if isinstance(payload, dict) else {}
        records = data.get("records", []) if isinstance(data, dict) else []

        if not records:
            break

        all_records.extend(records)

        total = data.get("total")
        if total is not None and len(all_records) >= int(total):
            break

        if len(records) < PAGE_SIZE:
            break

        index += 1
        time.sleep(0.2)

    return all_records


def build_api_index(records: list[dict]) -> dict[int, dict]:
    """Index Rone Arena equipment directly by equipid."""
    result: dict[int, dict] = {}

    for record in records:
        data = record.get("data") or {}
        equip_id = data.get("equipid")

        if equip_id is None:
            continue

        try:
            equip_id = int(equip_id)
        except (TypeError, ValueError):
            continue

        result[equip_id] = {
            "equipid": equip_id,
            "equipname": data.get("equipname"),
            "equipicon": data.get("equipicon"),
        }

    return result


def resolve(source_ids: list[int], api_index: dict[int, dict]) -> list[dict]:
    """Resolve game item IDs using exact ID -> equipid equality."""
    output: list[dict] = []

    for source_id in source_ids:
        api_item = api_index.get(source_id)

        if api_item is None:
            output.append(
                {
                    "source_item_id": source_id,
                    "master_item_id": None,
                    "equipid": None,
                    "item_name": None,
                    "item_icon": None,
                    "status": "api_unresolved",
                    "mapping_method": None,
                }
            )
            continue

        output.append(
            {
                "source_item_id": source_id,
                "master_item_id": api_item["equipid"],
                "equipid": api_item["equipid"],
                "item_name": api_item["equipname"],
                "item_icon": api_item["equipicon"],
                "status": "matched",
                "mapping_method": "game_item_id_equals_api_equipid",
            }
        )

    return output


def main() -> None:
    game_rows = load_rows(
        GAME_ITEMS,
        ("game_items", "items", "data", "records"),
    )

    source_ids = get_source_ids(game_rows)

    print(f"[INFO] source rows     : {len(game_rows)}")
    print(f"[INFO] unique item IDs  : {len(source_ids)}")

    api_records = fetch_equipment_catalog()
    api_index = build_api_index(api_records)

    print(f"[INFO] API equipment    : {len(api_index)}")

    records = resolve(source_ids, api_index)

    matched = sum(r["status"] == "matched" for r in records)
    unresolved = sum(r["status"] == "api_unresolved" for r in records)

    result = {
        "metadata": {
            "name": "MLBB game item source -> Rone Arena master item mapping",
            "source_dataset": GAME_ITEMS.name,
            "master_dataset": "Rone Arena API",
            "resolver_api": API_BASE,
            "resolver_api_field": "data.records[].data.equipid",
            "resolver_name_field": "data.records[].data.equipname",
            "resolver_icon_field": "data.records[].data.equipicon",
            "matching_policy": "exact numeric ID equality: game_items.item_id == API equipid",
            "master_items_file_used": False,
            "source_row_count": len(game_rows),
            "source_item_id_count": len(source_ids),
            "api_item_count": len(api_index),
            "matched_count": matched,
            "unresolved_count": unresolved,
        },
        "records": records,
    }

    OUTPUT.write_text(
        json.dumps(result, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"[DONE] output      : {OUTPUT}")
    print(f"[DONE] matched     : {matched}")
    print(f"[DONE] unresolved  : {unresolved}")


if __name__ == "__main__":
    main()

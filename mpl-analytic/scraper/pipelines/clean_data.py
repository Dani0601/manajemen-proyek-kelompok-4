"""
pipelines/clean_data.py
------------------------
Fungsi-fungsi pembersihan data mentah hasil scraping sebelum divalidasi
dan disimpan ke database. Semua fungsi bersifat pure (tidak mengubah
input, mengembalikan nilai baru) agar mudah diuji.
"""

import re
from datetime import datetime, date


def clean_text(value: str | None) -> str:
    """Hilangkan whitespace berlebih & rapikan spasi ganda."""
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip()


def parse_gold(value: str | int | None) -> int:
    """
    Konversi teks gold seperti '12.3K', '1.2M', '8,450' menjadi integer.
    Mengembalikan 0 jika tidak bisa di-parse.
    """
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        return int(value)

    text = clean_text(str(value)).upper().replace(",", "")
    multiplier = 1
    if text.endswith("K"):
        multiplier = 1_000
        text = text[:-1]
    elif text.endswith("M"):
        multiplier = 1_000_000
        text = text[:-1]

    try:
        return int(float(text) * multiplier)
    except ValueError:
        return 0


def parse_date(value: str | None, formats: list[str] | None = None) -> date | None:
    """
    Coba beberapa format tanggal umum yang dipakai id-mpl.com /
    Liquipedia. Mengembalikan None jika semua format gagal.
    """
    if not value:
        return None

    text = clean_text(value)
    formats = formats or [
        "%Y-%m-%d",
        "%d %B %Y",
        "%d-%m-%Y",
        "%B %d, %Y",
        "%d/%m/%Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue

    return None


def normalize_role(value: str | None) -> str:
    """Samakan variasi penulisan role pemain, mis. 'jungler' -> 'Jungler'."""
    if not value:
        return ""
    return clean_text(value).title()


def normalize_hero_name(value: str | None) -> str:
    return clean_text(value)


def dedupe_by_key(records: list[dict], key_fields: list[str]) -> list[dict]:
    """
    Buang duplikat berdasarkan kombinasi field tertentu, pertahankan
    kemunculan pertama.
    """
    seen = set()
    result = []
    for record in records:
        key = tuple(record.get(field) for field in key_fields)
        if key in seen:
            continue
        seen.add(key)
        result.append(record)
    return result


def clean_team_record(raw: dict) -> dict:
    return {
        "team_name": clean_text(raw.get("team_name")),
        "short_code": clean_text(raw.get("short_code")).upper(),
        "logo_url": clean_text(raw.get("logo_url")),
    }


def clean_player_record(raw: dict) -> dict:
    return {
        "nickname": clean_text(raw.get("nickname")),
        "real_name": clean_text(raw.get("real_name")),
    }


def clean_hero_record(raw: dict) -> dict:
    return {
        "hero_name": normalize_hero_name(raw.get("hero_name")),
        "primary_role": normalize_role(raw.get("primary_role")),
    }


def clean_hero_attribute_record(raw: dict) -> dict:
    return {
        "hero_name": normalize_hero_name(raw.get("hero_name")),
        "attribute_type": clean_text(raw.get("attribute_type")),
        "description": clean_text(raw.get("description")),
    }


def clean_match_record(raw: dict) -> dict:
    return {
        "team_a": clean_text(raw.get("team_a")),
        "team_b": clean_text(raw.get("team_b")),
        "winner": clean_text(raw.get("winner")) or None,
        "match_date": parse_date(raw.get("match_date")),
        "match_url": raw.get("match_url"),
    }


def clean_player_stat_record(raw: dict) -> dict:
    return {
        "game_number": int(raw.get("game_number") or 0),
        "nickname": clean_text(raw.get("nickname")),
        "hero_name": normalize_hero_name(raw.get("hero_name")),
        "kills": int(raw.get("kills") or 0),
        "deaths": int(raw.get("deaths") or 0),
        "assists": int(raw.get("assists") or 0),
        "gold_earned": parse_gold(raw.get("gold_earned")),
        "damage_to_heroes": parse_gold(raw.get("damage_to_heroes")),
    }

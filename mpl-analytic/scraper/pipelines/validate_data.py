"""
pipelines/validate_data.py
----------------------------
Validasi data yang sudah dibersihkan (clean_data.py) sebelum masuk ke
save_database.py. Fokus pada: field wajib tidak kosong, tipe data
sesuai, dan nilai berada dalam rentang wajar. Validasi referensial
(mis. apakah team_a benar-benar ada di tabel TEAMS) dilakukan di
save_database.py saat proses lookup id, karena butuh akses database.
"""

import logging

logger = logging.getLogger("validate_data")


class ValidationError(Exception):
    """Dilempar ketika satu record gagal memenuhi aturan validasi."""


def require_fields(record: dict, fields: list[str]):
    missing = [f for f in fields if not record.get(f)]
    if missing:
        raise ValidationError(f"Field wajib kosong: {missing} pada record {record}")


def validate_team(record: dict) -> dict:
    require_fields(record, ["team_name"])
    if len(record["team_name"]) > 100:
        raise ValidationError(f"team_name terlalu panjang: {record['team_name']}")
    return record


def validate_player(record: dict) -> dict:
    require_fields(record, ["nickname"])
    return record


def validate_hero(record: dict) -> dict:
    require_fields(record, ["hero_name", "primary_role"])
    return record


def validate_hero_attribute(record: dict) -> dict:
    require_fields(record, ["hero_name", "attribute_type"])
    return record


def validate_match(record: dict) -> dict:
    require_fields(record, ["team_a", "team_b", "match_date"])
    if record["team_a"] == record["team_b"]:
        raise ValidationError(f"team_a dan team_b tidak boleh sama: {record}")
    return record


def validate_game(record: dict) -> dict:
    require_fields(record, ["game_number", "red_team", "blue_team"])
    if record.get("duration_seconds", 0) < 0:
        raise ValidationError(f"duration_seconds tidak valid: {record}")
    return record


def validate_player_stat(record: dict) -> dict:
    require_fields(record, ["nickname", "hero_name"])
    for field in ("kills", "deaths", "assists", "gold_earned", "damage_to_heroes"):
        if record.get(field, 0) < 0:
            raise ValidationError(f"{field} tidak boleh negatif: {record}")
    return record


def validate_transfer(record: dict) -> dict:
    require_fields(record, ["nickname", "to_team", "transfer_date"])
    return record


def validate_batch(records: list[dict], validator) -> tuple[list[dict], list[dict]]:
    """
    Jalankan validator ke tiap record. Kembalikan tuple
    (valid_records, invalid_records_with_reason).
    Record yang gagal TIDAK menghentikan proses -- hanya dicatat & dilewati,
    supaya satu baris data rusak tidak menggagalkan seluruh batch scraping.
    """
    valid, invalid = [], []
    for record in records:
        try:
            valid.append(validator(record))
        except ValidationError as exc:
            logger.warning("Record tidak valid: %s", exc)
            invalid.append({"record": record, "reason": str(exc)})
    return valid, invalid

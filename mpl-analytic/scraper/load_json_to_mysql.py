#!/usr/bin/env python3
"""
MPL ANALYTIC - JSON -> MySQL loader
===================================

Loads the validated MPL Indonesia S17 JSON datasets into MySQL.

Expected files in the same directory as this script:
    matches.json
    games.json
    game_players.json
    game_picks.json
    game_emblems.json
    game_items.json
    hero_base_stats.json
    hero_season_stats.json

Optional:
    schedule.json

Environment variables:
    MYSQL_HOST=127.0.0.1
    MYSQL_PORT=3306
    MYSQL_USER=root
    MYSQL_PASSWORD=
    MYSQL_DATABASE=mpl_analytic

Install:
    pip install mysql-connector-python

Run:
    python load_json_to_mysql.py

The loader accepts both:
    1) a plain JSON list
    2) a metadata wrapper containing a list under a known key.

It uses INSERT ... ON DUPLICATE KEY UPDATE so the script is safe to
re-run for the same dataset.

Every dataset import gets its own row in scraping_logs. A UUID run_id
groups all dataset log rows from the same execution. Failed datasets
are logged with status='failed' and the exception message.
"""

from __future__ import annotations

import json
import os
import re
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

try:
    import mysql.connector
    from mysql.connector import Error
except ImportError:
    print("[ERROR] mysql-connector-python belum terinstall.")
    print("        Jalankan: pip install mysql-connector-python")
    sys.exit(1)


BASE_DIR = Path(__file__).resolve().parent

DB_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
    "port": int(os.getenv("MYSQL_PORT", "3306")),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", ""),
    "database": os.getenv("MYSQL_DATABASE", "mpl_analytic"),
}

FILES = {
    "schedule": "schedule.json",
    "matches": "matches.json",
    "games": "games.json",
    "game_players": "game_players.json",
    "game_picks": "game_picks.json",
    "game_emblems": "game_emblems.json",
    "game_items": "game_items.json",
    "hero_base_stats": "hero_base_stats.json",
    "hero_season_stats": "hero_season_stats.json",
}

REQUIRED_DATASETS = [
    "matches",
    "games",
    "game_players",
    "game_picks",
    "game_emblems",
    "game_items",
    "hero_base_stats",
    "hero_season_stats",
]


# ============================================================
# Generic JSON helpers
# ============================================================

def load_json_file(filename: str, keys: Iterable[str]) -> list[dict[str, Any]]:
    path = BASE_DIR / filename

    if not path.exists():
        raise FileNotFoundError(f"File tidak ditemukan: {path}")

    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        for key in keys:
            value = data.get(key)
            if isinstance(value, list):
                return value

    raise ValueError(
        f"Format JSON tidak didukung untuk {filename}. "
        f"Harus list atau object dengan salah satu key: {list(keys)}"
    )


def load_optional_json_file(
    filename: str, keys: Iterable[str]
) -> list[dict[str, Any]]:
    path = BASE_DIR / filename
    if not path.exists():
        return []
    return load_json_file(filename, keys)


def get_value(row: dict[str, Any], *keys: str, default=None):
    for key in keys:
        if key in row and row[key] is not None:
            return row[key]
    return default


def as_int(value):
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)

    text = str(value).strip()
    if not text:
        return None

    # Plain integer.
    if re.fullmatch(r"-?\d+", text):
        return int(text)

    # Values such as "9,459" or "9.459" can be displayed as
    # thousands separators by the source.
    if re.fullmatch(r"-?\d{1,3}(?:[.,]\d{3})+", text):
        return int(re.sub(r"[.,]", "", text))

    try:
        return int(float(text))
    except ValueError:
        return None


def as_decimal(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return value

    text = str(value).strip()
    if not text:
        return None

    # Thousands-separated integer, e.g. 47.950 -> 47950.
    if re.fullmatch(r"-?\d{1,3}(?:[.,]\d{3})+", text):
        return float(re.sub(r"[.,]", "", text))

    # Normal decimal.
    try:
        return float(text.replace(",", ""))
    except ValueError:
        return None


def parse_duration_seconds(value):
    if value is None or value == "":
        return None

    if isinstance(value, (int, float)):
        return int(value)

    text = str(value).strip()

    match = re.fullmatch(r"(\d+):(\d{1,2})(?::(\d{1,2}))?", text)
    if not match:
        return None

    parts = [int(x) for x in match.groups() if x is not None]

    if len(parts) == 2:
        minutes, seconds = parts
        return minutes * 60 + seconds

    hours, minutes, seconds = parts
    return hours * 3600 + minutes * 60 + seconds


def parse_date(value):
    if value is None or value == "":
        return None
    text = str(value).strip()

    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            pass

    return None


def parse_time(value):
    if value is None or value == "":
        return None
    text = str(value).strip()

    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(text, fmt).time()
        except ValueError:
            pass

    return None


def nested_stat(record: dict[str, Any], name: str, key: str):
    obj = record.get(name)
    if not isinstance(obj, dict):
        return None
    return as_decimal(obj.get(key))


def normalize_name(value):
    if value is None:
        return None
    return str(value).strip()


# ============================================================
# Database helpers
# ============================================================

class Loader:
    def __init__(self, conn):
        self.conn = conn
        self.team_cache: dict[str, int] = {}
        self.player_cache: dict[str, int] = {}
        self.hero_cache: dict[str, int] = {}
        self.season_cache: dict[tuple, int] = {}

    def execute(self, sql, params=()):
        cur = self.conn.cursor()
        try:
            cur.execute(sql, params)
            return cur.lastrowid
        finally:
            cur.close()

    def executemany(self, sql, rows):
        cur = self.conn.cursor()
        try:
            cur.executemany(sql, rows)
        finally:
            cur.close()

    def get_team_id(self, team_name, team_code=None):
        name = normalize_name(team_name)
        if not name:
            raise ValueError("team_name kosong")

        cache_key = name.lower()
        if cache_key in self.team_cache:
            return self.team_cache[cache_key]

        self.execute(
            """
            INSERT INTO teams (team_name, team_code)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE
                team_code = COALESCE(VALUES(team_code), team_code)
            """,
            (name, team_code),
        )

        cur = self.conn.cursor()
        try:
            cur.execute(
                "SELECT team_id FROM teams WHERE team_name = %s",
                (name,),
            )
            row = cur.fetchone()
        finally:
            cur.close()

        if not row:
            raise RuntimeError(f"Gagal mendapatkan team_id: {name}")

        team_id = row[0]
        self.team_cache[cache_key] = team_id
        return team_id

    def get_player_id(self, player_name):
        name = normalize_name(player_name)
        if not name:
            raise ValueError("player_name kosong")

        cache_key = name.lower()
        if cache_key in self.player_cache:
            return self.player_cache[cache_key]

        self.execute(
            """
            INSERT INTO players (player_name)
            VALUES (%s)
            ON DUPLICATE KEY UPDATE
                player_name = VALUES(player_name)
            """,
            (name,),
        )

        cur = self.conn.cursor()
        try:
            cur.execute(
                "SELECT player_id FROM players WHERE player_name = %s",
                (name,),
            )
            row = cur.fetchone()
        finally:
            cur.close()

        if not row:
            raise RuntimeError(f"Gagal mendapatkan player_id: {name}")

        player_id = row[0]
        self.player_cache[cache_key] = player_id
        return player_id

    def get_hero_id(self, hero_name, hero_url=None):
        name = normalize_name(hero_name)
        if not name:
            return None

        cache_key = name.lower()
        if cache_key in self.hero_cache:
            return self.hero_cache[cache_key]

        slug = None
        if hero_url:
            match = re.search(r"/hero/([^/?#]+)", str(hero_url))
            if match:
                slug = match.group(1)

        self.execute(
            """
            INSERT INTO heroes (hero_name, hero_slug, hero_url)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE
                hero_slug = COALESCE(VALUES(hero_slug), hero_slug),
                hero_url = COALESCE(VALUES(hero_url), hero_url)
            """,
            (name, slug, hero_url),
        )

        cur = self.conn.cursor()
        try:
            cur.execute(
                "SELECT hero_id FROM heroes WHERE hero_name = %s",
                (name,),
            )
            row = cur.fetchone()
        finally:
            cur.close()

        if not row:
            raise RuntimeError(f"Gagal mendapatkan hero_id: {name}")

        hero_id = row[0]
        self.hero_cache[cache_key] = hero_id
        return hero_id

    def get_season_id(
        self,
        league,
        season_number,
        phase="Regular Season",
        start_date=None,
        end_date=None,
        fmt=None,
        source=None,
    ):
        key = (
            str(league).lower(),
            int(season_number),
            str(phase or "").lower(),
        )

        if key in self.season_cache:
            return self.season_cache[key]

        self.execute(
            """
            INSERT INTO seasons
                (league, season_number, phase, start_date, end_date, format, source)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                start_date = COALESCE(VALUES(start_date), start_date),
                end_date = COALESCE(VALUES(end_date), end_date),
                format = COALESCE(VALUES(format), format),
                source = COALESCE(VALUES(source), source)
            """,
            (
                league,
                season_number,
                phase,
                start_date,
                end_date,
                fmt,
                source,
            ),
        )

        cur = self.conn.cursor()
        try:
            cur.execute(
                """
                SELECT season_id
                FROM seasons
                WHERE league = %s
                  AND season_number = %s
                  AND phase = %s
                """,
                (league, season_number, phase),
            )
            row = cur.fetchone()
        finally:
            cur.close()

        if not row:
            raise RuntimeError("Gagal mendapatkan season_id")

        season_id = row[0]
        self.season_cache[key] = season_id
        return season_id

    def log(self, run_id, dataset, status, records, message=None):
        self.execute(
            """
            INSERT INTO scraping_logs
                (run_id, dataset, status, records_processed, message)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (run_id, dataset, status, records, message),
        )


# ============================================================
# Dataset imports
# ============================================================

def infer_season_from_match(row):
    return (
        get_value(row, "season", "season_number", default=17),
        get_value(row, "league", default="MPL Indonesia"),
        get_value(row, "phase", default="Regular Season"),
        get_value(row, "source", default="official_mpl"),
    )


def import_schedule(loader: Loader, rows):
    if not rows:
        print("[SKIP] schedule.json tidak ditemukan.")
        return

    count = 0

    for row in rows:
        season_number, league, phase, source = infer_season_from_match(row)

        season_id = loader.get_season_id(
            league,
            season_number,
            phase=phase,
            start_date=parse_date(
                get_value(row, "season_start_date", "start_date")
            ),
            end_date=parse_date(
                get_value(row, "season_end_date", "end_date")
            ),
            fmt=get_value(row, "format"),
            source=source,
        )

        schedule_id = get_value(
            row, "schedule_id", "match_id", default=None
        )
        if not schedule_id:
            schedule_id = (
                f"s{int(season_number):02d}_"
                f"w{int(get_value(row, 'week', default=0)):02d}_"
                f"m{count + 1:02d}"
            )

        team1_name = get_value(row, "team1", "team_1")
        team2_name = get_value(row, "team2", "team_2")

        team1_id = loader.get_team_id(team1_name) if team1_name else None
        team2_id = loader.get_team_id(team2_name) if team2_name else None

        loader.execute(
            """
            INSERT INTO schedules
                (schedule_id, season_id, week, match_date, match_time,
                 team1_id, team2_id, status, source, source_match_id)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                season_id = VALUES(season_id),
                week = VALUES(week),
                match_date = VALUES(match_date),
                match_time = VALUES(match_time),
                team1_id = VALUES(team1_id),
                team2_id = VALUES(team2_id),
                status = VALUES(status),
                source_match_id = VALUES(source_match_id)
            """,
            (
                schedule_id,
                season_id,
                int(get_value(row, "week", default=0)),
                parse_date(get_value(row, "date", "match_date")),
                parse_time(get_value(row, "time", "match_time")),
                team1_id,
                team2_id,
                get_value(row, "status", default="scheduled"),
                source,
                get_value(row, "source_match_id"),
            ),
        )

        count += 1

    print(f"[OK] schedule: {count} records")
    return count


def import_matches(loader: Loader, rows):
    count = 0

    for row in rows:
        season_number, league, phase, source = infer_season_from_match(row)

        season_id = loader.get_season_id(
            league,
            season_number,
            phase=phase,
            start_date=parse_date(
                get_value(row, "season_start_date", "start_date")
            ),
            end_date=parse_date(
                get_value(row, "season_end_date", "end_date")
            ),
            fmt=get_value(row, "format"),
            source=source,
        )

        match_id = get_value(row, "match_id")
        if not match_id:
            raise ValueError("matches.json memiliki record tanpa match_id")

        team1_name = get_value(row, "team1")
        team2_name = get_value(row, "team2")
        team1_id = loader.get_team_id(team1_name)
        team2_id = loader.get_team_id(team2_name)

        winner_name = get_value(row, "winner")
        winner_id = (
            loader.get_team_id(winner_name)
            if winner_name
            else None
        )

        score = get_value(row, "score", default={}) or {}
        team1_score = as_int(get_value(score, "team1", default=None))
        team2_score = as_int(get_value(score, "team2", default=None))

        loader.execute(
            """
            INSERT INTO matches
                (match_id, season_id, week, match_date, match_time,
                 team1_id, team2_id, team1_score, team2_score,
                 winner_team_id, status, source, source_match_id)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                season_id = VALUES(season_id),
                week = VALUES(week),
                match_date = VALUES(match_date),
                match_time = VALUES(match_time),
                team1_id = VALUES(team1_id),
                team2_id = VALUES(team2_id),
                team1_score = VALUES(team1_score),
                team2_score = VALUES(team2_score),
                winner_team_id = VALUES(winner_team_id),
                status = VALUES(status),
                source = VALUES(source),
                source_match_id = VALUES(source_match_id)
            """,
            (
                match_id,
                season_id,
                int(get_value(row, "week", default=0)),
                parse_date(get_value(row, "date", "match_date")),
                parse_time(get_value(row, "time", "match_time")),
                team1_id,
                team2_id,
                team1_score,
                team2_score,
                winner_id,
                get_value(row, "status", default="completed"),
                source,
                get_value(row, "source_match_id"),
            ),
        )

        count += 1

    print(f"[OK] matches: {count} records")
    return count


def import_games(loader: Loader, rows):
    count = 0

    for row in rows:
        match_id = get_value(row, "match_id")
        game_id = get_value(row, "game_id")

        if not match_id or not game_id:
            raise ValueError("games.json memiliki record tanpa match_id/game_id")

        team1_name = get_value(row, "team1")
        team2_name = get_value(row, "team2")

        team1_id = loader.get_team_id(team1_name)
        team2_id = loader.get_team_id(team2_name)

        winner_name = get_value(row, "winner")
        winner_id = (
            loader.get_team_id(winner_name)
            if winner_name
            else None
        )

        loader.execute(
            """
            INSERT INTO games
                (game_id, match_id, source_match_id, game_number,
                 team1_id, team2_id, winner_team_id, duration_seconds,
                 team1_kills, team2_kills)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                source_match_id = VALUES(source_match_id),
                game_number = VALUES(game_number),
                team1_id = VALUES(team1_id),
                team2_id = VALUES(team2_id),
                winner_team_id = VALUES(winner_team_id),
                duration_seconds = VALUES(duration_seconds),
                team1_kills = VALUES(team1_kills),
                team2_kills = VALUES(team2_kills)
            """,
            (
                game_id,
                match_id,
                get_value(row, "source_match_id"),
                int(get_value(row, "game_number", default=0)),
                team1_id,
                team2_id,
                winner_id,
                parse_duration_seconds(get_value(row, "duration")),
                as_int(get_value(row, "team1_kills")),
                as_int(get_value(row, "team2_kills")),
            ),
        )

        count += 1

    print(f"[OK] games: {count} records")
    return count


def import_game_players(loader: Loader, rows):
    count = 0

    for row in rows:
        game_id = get_value(row, "game_id")
        player_game_id = get_value(row, "player_game_id")

        if not game_id or not player_game_id:
            raise ValueError(
                "game_players.json memiliki record tanpa game_id/player_game_id"
            )

        team_name = get_value(row, "team")
        player_name = get_value(row, "player")
        hero_name = get_value(row, "hero")

        team_id = loader.get_team_id(team_name)
        player_id = loader.get_player_id(player_name)
        hero_id = loader.get_hero_id(
            hero_name,
            get_value(row, "hero_url")
        ) if hero_name else None

        loader.execute(
            """
            INSERT INTO game_players
                (player_game_id, game_id, team_id, side, player_id, hero_id,
                 kills, deaths, assists, damage, damage_taken,
                 turret_damage, gold)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                team_id = VALUES(team_id),
                side = VALUES(side),
                player_id = VALUES(player_id),
                hero_id = VALUES(hero_id),
                kills = VALUES(kills),
                deaths = VALUES(deaths),
                assists = VALUES(assists),
                damage = VALUES(damage),
                damage_taken = VALUES(damage_taken),
                turret_damage = VALUES(turret_damage),
                gold = VALUES(gold)
            """,
            (
                player_game_id,
                game_id,
                team_id,
                get_value(row, "side"),
                player_id,
                hero_id,
                as_int(get_value(row, "kills")),
                as_int(get_value(row, "deaths")),
                as_int(get_value(row, "assists")),
                as_decimal(get_value(row, "damage")),
                as_decimal(get_value(row, "damage_taken")),
                as_decimal(get_value(row, "turret_damage")),
                as_decimal(get_value(row, "gold")),
            ),
        )

        count += 1

    print(f"[OK] game_players: {count} records")
    return count


def import_game_picks(loader: Loader, rows):
    count = 0

    for row in rows:
        game_pick_id = get_value(row, "game_pick_id")
        game_id = get_value(row, "game_id")

        if not game_pick_id or not game_id:
            raise ValueError(
                "game_picks.json memiliki record tanpa game_pick_id/game_id"
            )

        team_id = loader.get_team_id(get_value(row, "team"))
        player_id = loader.get_player_id(get_value(row, "player"))
        hero_id = loader.get_hero_id(
            get_value(row, "hero"),
            get_value(row, "hero_url"),
        )

        loader.execute(
            """
            INSERT INTO game_picks
                (game_pick_id, game_id, team_id, side, player_id, hero_id)
            VALUES
                (%s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                team_id = VALUES(team_id),
                side = VALUES(side),
                player_id = VALUES(player_id),
                hero_id = VALUES(hero_id)
            """,
            (
                game_pick_id,
                game_id,
                team_id,
                get_value(row, "side"),
                player_id,
                hero_id,
            ),
        )

        count += 1

    print(f"[OK] game_picks: {count} records")
    return count


def import_game_emblems(loader: Loader, rows):
    count = 0

    for row in rows:
        game_emblem_id = get_value(row, "game_emblem_id")
        game_id = get_value(row, "game_id")

        if not game_emblem_id or not game_id:
            raise ValueError(
                "game_emblems.json memiliki record tanpa game_emblem_id/game_id"
            )

        team_id = loader.get_team_id(get_value(row, "team"))
        player_id = loader.get_player_id(get_value(row, "player"))

        hero_name = get_value(row, "hero")
        hero_id = (
            loader.get_hero_id(
                hero_name,
                get_value(row, "hero_url")
            )
            if hero_name else None
        )

        loader.execute(
            """
            INSERT INTO game_emblems
                (game_emblem_id, game_id, team_id, side, player_id, hero_id,
                 emblem_id, emblem_url, rune1_id, rune1_url,
                 rune2_id, rune2_url, rune3_id, rune3_url)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                team_id = VALUES(team_id),
                side = VALUES(side),
                player_id = VALUES(player_id),
                hero_id = VALUES(hero_id),
                emblem_id = VALUES(emblem_id),
                emblem_url = VALUES(emblem_url),
                rune1_id = VALUES(rune1_id),
                rune1_url = VALUES(rune1_url),
                rune2_id = VALUES(rune2_id),
                rune2_url = VALUES(rune2_url),
                rune3_id = VALUES(rune3_id),
                rune3_url = VALUES(rune3_url)
            """,
            (
                game_emblem_id,
                game_id,
                team_id,
                get_value(row, "side"),
                player_id,
                hero_id,
                as_int(get_value(row, "emblem_id")),
                get_value(row, "emblem_url"),
                as_int(get_value(row, "rune1_id")),
                get_value(row, "rune1_url"),
                as_int(get_value(row, "rune2_id")),
                get_value(row, "rune2_url"),
                as_int(get_value(row, "rune3_id")),
                get_value(row, "rune3_url"),
            ),
        )

        count += 1

    print(f"[OK] game_emblems: {count} records")
    return count


def import_game_items(loader: Loader, rows):
    count = 0

    for row in rows:
        game_item_id = get_value(row, "game_item_id")
        game_id = get_value(row, "game_id")

        if not game_item_id or not game_id:
            raise ValueError(
                "game_items.json memiliki record tanpa game_item_id/game_id"
            )

        team_id = loader.get_team_id(get_value(row, "team"))
        player_id = loader.get_player_id(get_value(row, "player"))

        hero_name = get_value(row, "hero")
        hero_id = (
            loader.get_hero_id(
                hero_name,
                get_value(row, "hero_url")
            )
            if hero_name else None
        )

        item_id = as_int(get_value(row, "item_id"))

        # Empty item slots are intentionally stored with item_id = NULL.
        if item_id is not None:
            loader.execute(
                """
                INSERT INTO master_items (item_id, item_url)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE
                    item_url = COALESCE(VALUES(item_url), item_url)
                """,
                (item_id, get_value(row, "item_url")),
            )

        loader.execute(
            """
            INSERT INTO game_items
                (game_item_id, game_id, team_id, side, player_id, hero_id,
                 item_slot, item_id, item_url)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                team_id = VALUES(team_id),
                side = VALUES(side),
                player_id = VALUES(player_id),
                hero_id = VALUES(hero_id),
                item_slot = VALUES(item_slot),
                item_id = VALUES(item_id),
                item_url = VALUES(item_url)
            """,
            (
                game_item_id,
                game_id,
                team_id,
                get_value(row, "side"),
                player_id,
                hero_id,
                as_int(get_value(row, "item_slot")),
                item_id,
                get_value(row, "item_url"),
            ),
        )

        count += 1

    print(f"[OK] game_items: {count} records")
    return count


def import_hero_base_stats(loader: Loader, rows):
    count = 0

    stat_names = [
        "hp",
        "hp_regen",
        "physical_attack",
        "physical_defense",
        "magic_defense",
        "attack_speed",
        "movement_speed",
        "mana",
        "mana_regen",
        "energy",
        "energy_regen",
    ]

    columns = []
    values = []

    for stat in stat_names:
        columns.extend([
            f"{stat}_lv1",
            f"{stat}_lv15",
            f"{stat}_per_level",
        ])

    for row in rows:
        hero_name = get_value(row, "hero", "hero_name")
        if not hero_name:
            raise ValueError("hero_base_stats memiliki record tanpa hero")

        hero_id = loader.get_hero_id(
            hero_name,
            get_value(row, "hero_url", "url"),
        )

        row_values = [hero_id]
        for stat in stat_names:
            row_values.extend([
                nested_stat(row, stat, "lv1"),
                nested_stat(row, stat, "lv15"),
                nested_stat(row, stat, "per_level"),
            ])

        placeholders = ", ".join(["%s"] * (1 + len(columns)))

        loader.execute(
            f"""
            INSERT INTO hero_base_stats
                (hero_id, {", ".join(columns)})
            VALUES
                ({placeholders})
            ON DUPLICATE KEY UPDATE
                {", ".join(f"{c}=VALUES({c})" for c in columns)}
            """,
            tuple(row_values),
        )

        count += 1

    print(f"[OK] hero_base_stats: {count} records")
    return count


def import_hero_season_stats(loader: Loader, rows):
    count = 0

    for row in rows:
        hero_name = get_value(row, "hero", "hero_name")
        if not hero_name:
            raise ValueError("hero_season_stats memiliki record tanpa hero")

        season_number = as_int(
            get_value(row, "season", "season_number", default=17)
        )
        league = get_value(row, "league", default="MPL Indonesia")
        phase = get_value(row, "phase", default="Regular Season")
        source = get_value(row, "source", default="derived")

        season_id = loader.get_season_id(
            league,
            season_number,
            phase=phase,
            source=source,
        )
        hero_id = loader.get_hero_id(hero_name)

        loader.execute(
            """
            INSERT INTO hero_season_stats
                (season_id, hero_id, pick_count, pick_rate,
                 win_count, win_rate)
            VALUES
                (%s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                pick_count = VALUES(pick_count),
                pick_rate = VALUES(pick_rate),
                win_count = VALUES(win_count),
                win_rate = VALUES(win_rate)
            """,
            (
                season_id,
                hero_id,
                as_int(get_value(row, "pick", "pick_count", default=0)),
                as_decimal(get_value(row, "pick_rate", default=0)),
                as_int(get_value(row, "win", "win_count", default=0)),
                as_decimal(get_value(row, "win_rate", default=0)),
            ),
        )

        count += 1

    print(f"[OK] hero_season_stats: {count} records")
    return count


# ============================================================
# Validation
# ============================================================

def validate_dependencies(rows_by_dataset):
    matches = rows_by_dataset["matches"]
    games = rows_by_dataset["games"]
    game_players = rows_by_dataset["game_players"]
    game_picks = rows_by_dataset["game_picks"]
    game_emblems = rows_by_dataset["game_emblems"]
    game_items = rows_by_dataset["game_items"]

    match_ids = {
        get_value(x, "match_id")
        for x in matches
        if get_value(x, "match_id")
    }

    missing_game_matches = sorted({
        get_value(x, "match_id")
        for x in games
        if get_value(x, "match_id") not in match_ids
    })

    if missing_game_matches:
        raise ValueError(
            "games.json memiliki match_id yang tidak ada di matches.json: "
            + ", ".join(missing_game_matches[:10])
        )

    game_ids = {
        get_value(x, "game_id")
        for x in games
        if get_value(x, "game_id")
    }

    for dataset_name in (
        "game_players",
        "game_picks",
        "game_emblems",
        "game_items",
    ):
        missing = sorted({
            get_value(x, "game_id")
            for x in rows_by_dataset[dataset_name]
            if get_value(x, "game_id") not in game_ids
        })

        if missing:
            raise ValueError(
                f"{dataset_name}.json memiliki game_id yang tidak ada di games.json: "
                + ", ".join(missing[:10])
            )

    # Basic cardinality checks for the current validated datasets.
    def counts_by_game(rows):
        result = {}
        for row in rows:
            gid = get_value(row, "game_id")
            result[gid] = result.get(gid, 0) + 1
        return result

    for dataset_name, rows, expected in (
        ("game_players", game_players, 10),
        ("game_picks", game_picks, 10),
        ("game_emblems", game_emblems, 10),
        ("game_items", game_items, 60),
    ):
        counts = counts_by_game(rows)
        bad = [gid for gid, n in counts.items() if n != expected]
        if bad:
            raise ValueError(
                f"{dataset_name}: game dengan jumlah record != {expected}: "
                + ", ".join(bad[:10])
            )

    print("[OK] validasi dependency/cardinality")


# ============================================================
# Main
# ============================================================

def main():
    print("=" * 64)
    print("MPL ANALYTIC - JSON -> MYSQL")
    print("=" * 64)
    print(f"Project : {BASE_DIR}")
    print(
        f"Database: {DB_CONFIG['user']}@"
        f"{DB_CONFIG['host']}:{DB_CONFIG['port']}/"
        f"{DB_CONFIG['database']}"
    )
    print()

    rows_by_dataset = {}

    # Load JSON first so a malformed dataset does not partially modify DB.
    for dataset, filename in FILES.items():
        if dataset == "schedule":
            rows = load_optional_json_file(
                filename,
                ("schedule", "schedules", "data", "matches"),
            )
        else:
            rows = load_json_file(
                filename,
                (
                    dataset,
                    f"{dataset}s",
                    "data",
                    "records",
                ),
            )

        rows_by_dataset[dataset] = rows
        print(f"[LOAD] {filename:<28} {len(rows):>6} records")

    print()
    validate_dependencies(rows_by_dataset)
    print()

    conn = None

    try:
        conn = mysql.connector.connect(**DB_CONFIG)

        if not conn.is_connected():
            raise RuntimeError("Koneksi MySQL gagal.")

        loader = Loader(conn)

        # One UUID groups all dataset logs belonging to this import run.
        run_id = str(uuid.uuid4())
        print(f"[RUN] {run_id}")
        print()

        # Each dataset gets its own success/failed log entry.
        import_jobs = [
            ("schedule", import_schedule),
            ("matches", import_matches),
            ("games", import_games),
            ("game_players", import_game_players),
            ("game_picks", import_game_picks),
            ("game_emblems", import_game_emblems),
            ("game_items", import_game_items),
            ("hero_base_stats", import_hero_base_stats),
            ("hero_season_stats", import_hero_season_stats),
        ]

        total = 0

        for dataset, importer in import_jobs:
            rows = rows_by_dataset.get(dataset, [])

            if dataset == "schedule" and not rows:
                loader.log(
                    run_id,
                    dataset,
                    "partial",
                    0,
                    "schedule.json tidak ditemukan atau kosong; dataset dilewati.",
                )
                print("[SKIP] schedule: 0 records")
                continue

            try:
                processed = importer(loader, rows)
                loader.log(
                    run_id,
                    dataset,
                    "success",
                    processed,
                    "Dataset berhasil diimport ke MySQL.",
                )
                total += processed
                conn.commit()

            except Exception as exc:
                conn.rollback()
                message = f"{type(exc).__name__}: {exc}"

                # Record the failure independently, then commit the log.
                try:
                    loader.log(
                        run_id,
                        dataset,
                        "failed",
                        0,
                        message,
                    )
                    conn.commit()
                except Exception:
                    conn.rollback()

                print(f"[FAILED] {dataset}: {message}")
                raise

        print()
        print("=" * 64)
        print("[DONE] Semua dataset berhasil diproses.")
        print(f"[DONE] Run ID: {run_id}")
        print(f"[DONE] Total records utama: {total}")
        print("[DONE] Detail status tersimpan di scraping_logs.")
        print("=" * 64)

    except Error as exc:
        if conn:
            conn.rollback()
        print()
        print(f"[ERROR] MySQL: {exc}")
        sys.exit(1)

    except Exception as exc:
        if conn:
            conn.rollback()
        print()
        print(f"[ERROR] {exc}")
        sys.exit(1)

    finally:
        if conn and conn.is_connected():
            conn.close()


if __name__ == "__main__":
    main()

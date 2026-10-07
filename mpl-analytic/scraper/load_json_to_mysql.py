#!/usr/bin/env python3
"""
MPL ANALYTIC - JSON -> MySQL Loader
===================================

Project:
    D:\\Downloads\\scraper_final

Database:
    mpl_analytic

Dataset:
    schedule.json
    matches.json
    games.json
    game_players.json
    game_picks.json
    game_emblems.json
    game_items.json
    hero_base_stats.json
    hero_season_stats.json
    master_items.json

PENTING:
- master_items.json menjadi master/reference item.
- master_items memiliki:
      item_id
      item_name
      item_url
- game_items menggunakan master_items.item_id.
- Tidak mencocokkan item berdasarkan item_name.
- Jika game_items belum memiliki item_id, ID dicoba diambil dari item_url.
- master_items diproses sebelum game_items.
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


# ============================================================
# MYSQL
# ============================================================

try:
    import mysql.connector
    from mysql.connector import Error
except ImportError:
    print("[ERROR] mysql-connector-python belum terinstall.")
    print()
    print("Jalankan:")
    print("    pip install mysql-connector-python")
    sys.exit(1)


# ============================================================
# PATH & DATABASE CONFIG
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

DATA_DIR = BASE_DIR / "scraper" / "scrapers"

DB_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
    "port": int(os.getenv("MYSQL_PORT", "3306")),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", ""),
    "database": os.getenv("MYSQL_DATABASE", "mpl_analytic"),
}


# ============================================================
# FILES
# ============================================================

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
    "master_items": "master_items.json",
}


# ============================================================
# HELPERS
# ============================================================

def load_json_file(
    filename: str,
    keys: Iterable[str],
) -> list[dict[str, Any]]:

    path = DATA_DIR / filename

    if not path.exists():
        raise FileNotFoundError(
            f"File tidak ditemukan: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8",
    ) as f:
        data = json.load(f)

    # JSON langsung berupa list
    if isinstance(data, list):
        return data

    # JSON berupa object
    if isinstance(data, dict):

        for key in keys:

            value = data.get(key)

            if isinstance(value, list):
                return value

    raise ValueError(
        f"Format JSON tidak didukung untuk {filename}. "
        f"Harus list atau object dengan salah satu key: "
        f"{list(keys)}"
    )


def load_optional_json_file(
    filename: str,
    keys: Iterable[str],
) -> list[dict[str, Any]]:

    path = DATA_DIR / filename

    if not path.exists():
        return []

    return load_json_file(
        filename,
        keys,
    )


def get_value(
    row: dict[str, Any],
    *keys: str,
    default=None,
):

    for key in keys:

        if key in row and row[key] is not None:
            return row[key]

    return default


def normalize_name(value):

    if value is None:
        return None

    return str(value).strip()


def as_int(value):

    if value is None:
        return None

    if value == "":
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

    if re.fullmatch(
        r"-?\d+",
        text,
    ):
        return int(text)

    if re.fullmatch(
        r"-?\d{1,3}(?:[.,]\d{3})+",
        text,
    ):
        return int(
            re.sub(
                r"[.,]",
                "",
                text,
            )
        )

    try:
        return int(float(text))

    except ValueError:
        return None


def as_decimal(value):

    if value is None:
        return None

    if value == "":
        return None

    if isinstance(value, (int, float)):
        return value

    text = str(value).strip()

    if not text:
        return None

    try:
        return float(
            text.replace(
                ",",
                "",
            )
        )

    except ValueError:
        return None


def nested_stat(
    record: dict[str, Any],
    name: str,
    key: str,
):

    obj = record.get(name)

    if not isinstance(obj, dict):
        return None

    return as_decimal(
        obj.get(key)
    )


def parse_date(value):

    if value is None:
        return None

    if value == "":
        return None

    text = str(value).strip()

    formats = (
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%Y/%m/%d",
    )

    for fmt in formats:

        try:
            return datetime.strptime(
                text,
                fmt,
            ).date()

        except ValueError:
            pass

    return None


def parse_time(value):

    if value is None:
        return None

    if value == "":
        return None

    text = str(value).strip()

    formats = (
        "%H:%M:%S",
        "%H:%M",
    )

    for fmt in formats:

        try:
            return datetime.strptime(
                text,
                fmt,
            ).time()

        except ValueError:
            pass

    return None


def parse_duration_seconds(value):

    if value is None:
        return None

    if value == "":
        return None

    if isinstance(value, (int, float)):
        return int(value)

    text = str(value).strip()

    match = re.fullmatch(
        r"(\d+):(\d{1,2})(?::(\d{1,2}))?",
        text,
    )

    if not match:
        return None

    parts = [
        int(x)
        for x in match.groups()
        if x is not None
    ]

    if len(parts) == 2:

        minutes, seconds = parts

        return (
            minutes * 60
            + seconds
        )

    hours, minutes, seconds = parts

    return (
        hours * 3600
        + minutes * 60
        + seconds
    )


def extract_item_id_from_url(value):

    if not value:
        return None

    text = str(value).strip()

    # Contoh:
    # https://mlbb.io/en/items?item=65

    match = re.search(
        r"[?&]item=(\d+)",
        text,
        re.IGNORECASE,
    )

    if match:
        return int(
            match.group(1)
        )

    # Contoh:
    # item-card-65

    match = re.search(
        r"item-card-(\d+)",
        text,
        re.IGNORECASE,
    )

    if match:
        return int(
            match.group(1)
        )

    return None


# ============================================================
# LOADER CLASS
# ============================================================

class Loader:

    def __init__(
        self,
        conn,
    ):

        self.conn = conn

        self.team_cache = {}

        self.player_cache = {}

        self.hero_cache = {}

        self.season_cache = {}

        self.item_cache = {}

        self.item_url_cache = {}


    # --------------------------------------------------------
    # SQL
    # --------------------------------------------------------

    def execute(
        self,
        sql,
        params=(),
    ):

        cursor = self.conn.cursor()

        try:

            cursor.execute(
                sql,
                params,
            )

            return cursor.lastrowid

        finally:

            cursor.close()


    # --------------------------------------------------------
    # TEAM
    # --------------------------------------------------------

    def get_team_id(
        self,
        team_name,
        team_code=None,
    ):

        name = normalize_name(
            team_name
        )

        if not name:
            raise ValueError(
                "team_name kosong"
            )

        cache_key = name.lower()

        if cache_key in self.team_cache:
            return self.team_cache[cache_key]

        self.execute(
            """
            INSERT INTO teams
                (
                    team_name,
                    team_code
                )
            VALUES
                (
                    %s,
                    %s
                )
            ON DUPLICATE KEY UPDATE
                team_code =
                    COALESCE(
                        VALUES(team_code),
                        team_code
                    )
            """,
            (
                name,
                team_code,
            ),
        )

        cursor = self.conn.cursor()

        try:

            cursor.execute(
                """
                SELECT team_id
                FROM teams
                WHERE team_name = %s
                """,
                (name,),
            )

            row = cursor.fetchone()

        finally:

            cursor.close()

        if not row:
            raise RuntimeError(
                f"Gagal mendapatkan team_id: {name}"
            )

        team_id = row[0]

        self.team_cache[
            cache_key
        ] = team_id

        return team_id


    # --------------------------------------------------------
    # PLAYER
    # --------------------------------------------------------

    def get_player_id(
        self,
        player_name,
    ):

        name = normalize_name(
            player_name
        )

        if not name:
            raise ValueError(
                "player_name kosong"
            )

        cache_key = name.lower()

        if cache_key in self.player_cache:
            return self.player_cache[cache_key]

        self.execute(
            """
            INSERT INTO players
                (
                    player_name
                )
            VALUES
                (
                    %s
                )
            ON DUPLICATE KEY UPDATE
                player_name =
                    VALUES(player_name)
            """,
            (name,),
        )

        cursor = self.conn.cursor()

        try:

            cursor.execute(
                """
                SELECT player_id
                FROM players
                WHERE player_name = %s
                """,
                (name,),
            )

            row = cursor.fetchone()

        finally:

            cursor.close()

        if not row:
            raise RuntimeError(
                f"Gagal mendapatkan player_id: {name}"
            )

        player_id = row[0]

        self.player_cache[
            cache_key
        ] = player_id

        return player_id


    # --------------------------------------------------------
    # HERO
    # --------------------------------------------------------

    def get_hero_id(
        self,
        hero_name,
        hero_url=None,
    ):

        name = normalize_name(
            hero_name
        )

        if not name:
            return None

        cache_key = name.lower()

        if cache_key in self.hero_cache:
            return self.hero_cache[cache_key]

        hero_slug = None

        if hero_url:

            match = re.search(
                r"/hero/([^/?#]+)",
                str(hero_url),
            )

            if match:
                hero_slug = match.group(1)

        self.execute(
            """
            INSERT INTO heroes
                (
                    hero_name,
                    hero_slug,
                    hero_url
                )
            VALUES
                (
                    %s,
                    %s,
                    %s
                )
            ON DUPLICATE KEY UPDATE
                hero_slug =
                    COALESCE(
                        VALUES(hero_slug),
                        hero_slug
                    ),
                hero_url =
                    COALESCE(
                        VALUES(hero_url),
                        hero_url
                    )
            """,
            (
                name,
                hero_slug,
                hero_url,
            ),
        )

        cursor = self.conn.cursor()

        try:

            cursor.execute(
                """
                SELECT hero_id
                FROM heroes
                WHERE hero_name = %s
                """,
                (name,),
            )

            row = cursor.fetchone()

        finally:

            cursor.close()

        if not row:
            raise RuntimeError(
                f"Gagal mendapatkan hero_id: {name}"
            )

        hero_id = row[0]

        self.hero_cache[
            cache_key
        ] = hero_id

        return hero_id


    # --------------------------------------------------------
    # SEASON
    # --------------------------------------------------------

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
                (
                    league,
                    season_number,
                    phase,
                    start_date,
                    end_date,
                    format,
                    source
                )
            VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
            ON DUPLICATE KEY UPDATE
                start_date =
                    COALESCE(
                        VALUES(start_date),
                        start_date
                    ),
                end_date =
                    COALESCE(
                        VALUES(end_date),
                        end_date
                    ),
                format =
                    COALESCE(
                        VALUES(format),
                        format
                    ),
                source =
                    COALESCE(
                        VALUES(source),
                        source
                    )
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

        cursor = self.conn.cursor()

        try:

            cursor.execute(
                """
                SELECT season_id
                FROM seasons
                WHERE league = %s
                  AND season_number = %s
                  AND phase = %s
                """,
                (
                    league,
                    season_number,
                    phase,
                ),
            )

            row = cursor.fetchone()

        finally:

            cursor.close()

        if not row:
            raise RuntimeError(
                "Gagal mendapatkan season_id"
            )

        season_id = row[0]

        self.season_cache[
            key
        ] = season_id

        return season_id


    # ========================================================
    # MASTER ITEMS
    # ========================================================

    def load_master_items(
        self,
        rows,
    ):

        """
        master_items adalah sumber kebenaran item.

        Data yang disimpan:
            item_id
            item_name
            item_url

        Tidak menggunakan nama item sebagai primary matching key.
        """

        seen = {}

        for row in rows:

            item_id = as_int(
                get_value(
                    row,
                    "equipid",
                    "item_id",
                    "master_item_id",
                )
            )

            item_name = normalize_name(
                get_value(
                    row,
                    "equipname",
                    "item_name",
                    "name",
                )
            )

            item_url = get_value(
                row,
                "equipicon",
                "item_icon",
                "item_url",
                "url",
            )

            if item_id is None:

                raise ValueError(
                    "master_items memiliki record "
                    "tanpa item_id"
                )

            if not item_name:

                raise ValueError(
                    f"master_items item_id={item_id} "
                    f"tidak memiliki item_name"
                )

            if item_id in seen:

                old = seen[item_id]

                if (
                    old["item_name"] != item_name
                    or old["item_url"] != item_url
                ):

                    raise ValueError(
                        f"Duplicate item_id={item_id} "
                        f"dengan data berbeda."
                    )

                continue

            seen[item_id] = {
                "item_id": item_id,
                "item_name": item_name,
                "item_url": item_url,
            }

        if not seen:

            raise ValueError(
                "master_items.json kosong"
            )

        # Insert / update master items.
        #
        # Saat ini tabel master_items memiliki:
        # item_id
        # item_name
        # item_url
        #
        # Kolom tambahan seperti image_url/category/price
        # tidak dimasukkan karena belum ada di schema.

        for item in seen.values():

            self.execute(
                """
                INSERT INTO master_items
                    (
                        item_id,
                        item_name,
                        item_url
                    )
                VALUES
                    (
                        %s,
                        %s,
                        %s
                    )
                ON DUPLICATE KEY UPDATE
                    item_name =
                        VALUES(item_name),
                    item_url =
                        VALUES(item_url)
                """,
                (
                    item["item_id"],
                    item["item_name"],
                    item["item_url"],
                ),
            )

            self.item_cache[
                item["item_id"]
            ] = item

            if item["item_url"]:

                normalized_url = (
                    str(
                        item["item_url"]
                    )
                    .strip()
                    .lower()
                )

                self.item_url_cache[
                    normalized_url
                ] = item["item_id"]

        print(
            f"[OK] master_items: "
            f"{len(seen)} records"
        )

        return len(seen)


    # --------------------------------------------------------
    # FIND MASTER ITEM ID
    # --------------------------------------------------------

    def get_master_item_id(
        self,
        item_id=None,
        item_url=None,
    ):

        """
        Urutan matching:

        1. item_id langsung
        2. exact item_url
        3. item ID dari URL

        Tidak menggunakan item_name.
        """

        item_id = as_int(
            item_id
        )

        # ----------------------------------------------
        # 1. Explicit item_id
        # ----------------------------------------------

        if item_id is not None:

            if item_id not in self.item_cache:

                raise ValueError(
                    f"item_id={item_id} "
                    f"tidak ditemukan di master_items"
                )

            return item_id

        # ----------------------------------------------
        # 2. Exact item URL
        # ----------------------------------------------

        if item_url:

            normalized_url = (
                str(item_url)
                .strip()
                .lower()
            )

            if normalized_url in self.item_url_cache:

                return self.item_url_cache[
                    normalized_url
                ]

            # ------------------------------------------
            # 3. Extract item ID dari URL
            # ------------------------------------------

            extracted_id = (
                extract_item_id_from_url(
                    item_url
                )
            )

            if extracted_id is not None:

                if extracted_id not in self.item_cache:

                    raise ValueError(
                        f"item_id={extracted_id} "
                        f"dari URL tidak ditemukan "
                        f"di master_items"
                    )

                return extracted_id

        return None


    # ========================================================
    # LOG
    # ========================================================

    def log(
        self,
        run_id,
        dataset,
        status,
        records,
        message=None,
    ):

        self.execute(
            """
            INSERT INTO scraping_logs
                (
                    run_id,
                    dataset,
                    status,
                    records_processed,
                    message
                )
            VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
            """,
            (
                run_id,
                dataset,
                status,
                records,
                message,
            ),
        )


# ============================================================
# IMPORT SCHEDULE
# ============================================================

def import_schedule(
    loader,
    rows,
):

    if not rows:

        print(
            "[SKIP] schedule.json kosong."
        )

        return 0

    count = 0

    for row in rows:

        season_number = as_int(
            get_value(
                row,
                "season",
                "season_number",
                default=17,
            )
        )

        league = get_value(
            row,
            "league",
            default="MPL Indonesia",
        )

        phase = get_value(
            row,
            "phase",
            default="Regular Season",
        )

        source = get_value(
            row,
            "source",
            default="official_mpl",
        )

        season_id = loader.get_season_id(
            league,
            season_number,
            phase=phase,
            start_date=parse_date(
                get_value(
                    row,
                    "season_start_date",
                    "start_date",
                )
            ),
            end_date=parse_date(
                get_value(
                    row,
                    "season_end_date",
                    "end_date",
                )
            ),
            fmt=get_value(
                row,
                "format",
            ),
            source=source,
        )

        schedule_id = get_value(
            row,
            "schedule_id",
            "match_id",
        )

        if not schedule_id:

            schedule_id = (
                f"s{season_number:02d}_"
                f"w{as_int(get_value(row, 'week', default=0)):02d}_"
                f"m{count + 1:02d}"
            )

        team1_name = get_value(
            row,
            "team1",
            "team_1",
        )

        team2_name = get_value(
            row,
            "team2",
            "team_2",
        )

        team1_id = (
            loader.get_team_id(
                team1_name
            )
            if team1_name
            else None
        )

        team2_id = (
            loader.get_team_id(
                team2_name
            )
            if team2_name
            else None
        )

        loader.execute(
            """
            INSERT INTO schedules
                (
                    schedule_id,
                    season_id,
                    week,
                    match_date,
                    match_time,
                    team1_id,
                    team2_id,
                    status,
                    source,
                    source_match_id
                )
            VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
            ON DUPLICATE KEY UPDATE
                season_id =
                    VALUES(season_id),
                week =
                    VALUES(week),
                match_date =
                    VALUES(match_date),
                match_time =
                    VALUES(match_time),
                team1_id =
                    VALUES(team1_id),
                team2_id =
                    VALUES(team2_id),
                status =
                    VALUES(status),
                source_match_id =
                    VALUES(source_match_id)
            """,
            (
                schedule_id,
                season_id,
                as_int(
                    get_value(
                        row,
                        "week",
                        default=0,
                    )
                ),
                parse_date(
                    get_value(
                        row,
                        "date",
                        "match_date",
                    )
                ),
                parse_time(
                    get_value(
                        row,
                        "time",
                        "match_time",
                    )
                ),
                team1_id,
                team2_id,
                get_value(
                    row,
                    "status",
                    default="scheduled",
                ),
                source,
                get_value(
                    row,
                    "source_match_id",
                ),
            ),
        )

        count += 1

    print(
        f"[OK] schedule: "
        f"{count} records"
    )

    return count


# ============================================================
# IMPORT MATCHES
# ============================================================

def import_matches(
    loader,
    rows,
):

    count = 0

    for row in rows:

        season_number = as_int(
            get_value(
                row,
                "season",
                "season_number",
                default=17,
            )
        )

        league = get_value(
            row,
            "league",
            default="MPL Indonesia",
        )

        phase = get_value(
            row,
            "phase",
            default="Regular Season",
        )

        source = get_value(
            row,
            "source",
            default="official_mpl",
        )

        season_id = loader.get_season_id(
            league,
            season_number,
            phase=phase,
            start_date=parse_date(
                get_value(
                    row,
                    "season_start_date",
                    "start_date",
                )
            ),
            end_date=parse_date(
                get_value(
                    row,
                    "season_end_date",
                    "end_date",
                )
            ),
            fmt=get_value(
                row,
                "format",
            ),
            source=source,
        )

        match_id = get_value(
            row,
            "match_id",
        )

        if not match_id:

            raise ValueError(
                "matches.json memiliki "
                "record tanpa match_id"
            )

        team1_id = loader.get_team_id(
            get_value(
                row,
                "team1",
            )
        )

        team2_id = loader.get_team_id(
            get_value(
                row,
                "team2",
            )
        )

        winner_name = get_value(
            row,
            "winner",
        )

        winner_id = (
            loader.get_team_id(
                winner_name
            )
            if winner_name
            else None
        )

        score = get_value(
            row,
            "score",
            default={},
        )

        if not isinstance(score, dict):
            score = {}

        team1_score = as_int(
            get_value(
                score,
                "team1",
            )
        )

        team2_score = as_int(
            get_value(
                score,
                "team2",
            )
        )

        loader.execute(
            """
            INSERT INTO matches
                (
                    match_id,
                    season_id,
                    week,
                    match_date,
                    match_time,
                    team1_id,
                    team2_id,
                    team1_score,
                    team2_score,
                    winner_team_id,
                    status,
                    source,
                    source_match_id
                )
            VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
            ON DUPLICATE KEY UPDATE
                season_id =
                    VALUES(season_id),
                week =
                    VALUES(week),
                match_date =
                    VALUES(match_date),
                match_time =
                    VALUES(match_time),
                team1_id =
                    VALUES(team1_id),
                team2_id =
                    VALUES(team2_id),
                team1_score =
                    VALUES(team1_score),
                team2_score =
                    VALUES(team2_score),
                winner_team_id =
                    VALUES(winner_team_id),
                status =
                    VALUES(status),
                source =
                    VALUES(source),
                source_match_id =
                    VALUES(source_match_id)
            """,
            (
                match_id,
                season_id,
                as_int(
                    get_value(
                        row,
                        "week",
                        default=0,
                    )
                ),
                parse_date(
                    get_value(
                        row,
                        "date",
                        "match_date",
                    )
                ),
                parse_time(
                    get_value(
                        row,
                        "time",
                        "match_time",
                    )
                ),
                team1_id,
                team2_id,
                team1_score,
                team2_score,
                winner_id,
                get_value(
                    row,
                    "status",
                    default="completed",
                ),
                source,
                get_value(
                    row,
                    "source_match_id",
                ),
            ),
        )

        count += 1

    print(
        f"[OK] matches: "
        f"{count} records"
    )

    return count


# ============================================================
# IMPORT GAMES
# ============================================================

def import_games(
    loader,
    rows,
):

    count = 0

    for row in rows:

        match_id = get_value(
            row,
            "match_id",
        )

        game_id = get_value(
            row,
            "game_id",
        )

        if not match_id or not game_id:

            raise ValueError(
                "games.json memiliki "
                "record tanpa match_id/game_id"
            )

        team1_id = loader.get_team_id(
            get_value(
                row,
                "team1",
            )
        )

        team2_id = loader.get_team_id(
            get_value(
                row,
                "team2",
            )
        )

        winner_name = get_value(
            row,
            "winner",
        )

        winner_id = (
            loader.get_team_id(
                winner_name
            )
            if winner_name
            else None
        )

        loader.execute(
            """
            INSERT INTO games
                (
                    game_id,
                    match_id,
                    source_match_id,
                    game_number,
                    team1_id,
                    team2_id,
                    winner_team_id,
                    duration_seconds,
                    team1_kills,
                    team2_kills
                )
            VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
            ON DUPLICATE KEY UPDATE
                source_match_id =
                    VALUES(source_match_id),
                game_number =
                    VALUES(game_number),
                team1_id =
                    VALUES(team1_id),
                team2_id =
                    VALUES(team2_id),
                winner_team_id =
                    VALUES(winner_team_id),
                duration_seconds =
                    VALUES(duration_seconds),
                team1_kills =
                    VALUES(team1_kills),
                team2_kills =
                    VALUES(team2_kills)
            """,
            (
                game_id,
                match_id,
                get_value(
                    row,
                    "source_match_id",
                ),
                as_int(
                    get_value(
                        row,
                        "game_number",
                        default=0,
                    )
                ),
                team1_id,
                team2_id,
                winner_id,
                parse_duration_seconds(
                    get_value(
                        row,
                        "duration",
                    )
                ),
                as_int(
                    get_value(
                        row,
                        "team1_kills",
                    )
                ),
                as_int(
                    get_value(
                        row,
                        "team2_kills",
                    )
                ),
            ),
        )

        count += 1

    print(
        f"[OK] games: "
        f"{count} records"
    )

    return count


# ============================================================
# IMPORT GAME PLAYERS
# ============================================================

def import_game_players(
    loader,
    rows,
):

    count = 0

    for row in rows:

        player_game_id = get_value(
            row,
            "player_game_id",
        )

        game_id = get_value(
            row,
            "game_id",
        )

        if not player_game_id or not game_id:

            raise ValueError(
                "game_players.json memiliki "
                "record tanpa game_id/player_game_id"
            )

        team_id = loader.get_team_id(
            get_value(
                row,
                "team",
            )
        )

        player_id = loader.get_player_id(
            get_value(
                row,
                "player",
            )
        )

        hero_name = get_value(
            row,
            "hero",
        )

        hero_id = (
            loader.get_hero_id(
                hero_name,
                get_value(
                    row,
                    "hero_url",
                ),
            )
            if hero_name
            else None
        )

        loader.execute(
            """
            INSERT INTO game_players
                (
                    player_game_id,
                    game_id,
                    team_id,
                    side,
                    player_id,
                    hero_id,
                    kills,
                    deaths,
                    assists,
                    damage,
                    damage_taken,
                    turret_damage,
                    gold
                )
            VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
            ON DUPLICATE KEY UPDATE
                team_id =
                    VALUES(team_id),
                side =
                    VALUES(side),
                player_id =
                    VALUES(player_id),
                hero_id =
                    VALUES(hero_id),
                kills =
                    VALUES(kills),
                deaths =
                    VALUES(deaths),
                assists =
                    VALUES(assists),
                damage =
                    VALUES(damage),
                damage_taken =
                    VALUES(damage_taken),
                turret_damage =
                    VALUES(turret_damage),
                gold =
                    VALUES(gold)
            """,
            (
                player_game_id,
                game_id,
                team_id,
                get_value(
                    row,
                    "side",
                ),
                player_id,
                hero_id,
                as_int(
                    get_value(
                        row,
                        "kills",
                    )
                ),
                as_int(
                    get_value(
                        row,
                        "deaths",
                    )
                ),
                as_int(
                    get_value(
                        row,
                        "assists",
                    )
                ),
                as_decimal(
                    get_value(
                        row,
                        "damage",
                    )
                ),
                as_decimal(
                    get_value(
                        row,
                        "damage_taken",
                    )
                ),
                as_decimal(
                    get_value(
                        row,
                        "turret_damage",
                    )
                ),
                as_decimal(
                    get_value(
                        row,
                        "gold",
                    )
                ),
            ),
        )

        count += 1

    print(
        f"[OK] game_players: "
        f"{count} records"
    )

    return count


# ============================================================
# IMPORT GAME PICKS
# ============================================================

def import_game_picks(
    loader,
    rows,
):

    count = 0

    for row in rows:

        game_pick_id = get_value(
            row,
            "game_pick_id",
        )

        game_id = get_value(
            row,
            "game_id",
        )

        if not game_pick_id or not game_id:

            raise ValueError(
                "game_picks.json memiliki "
                "record tanpa game_pick_id/game_id"
            )

        team_id = loader.get_team_id(
            get_value(
                row,
                "team",
            )
        )

        player_id = loader.get_player_id(
            get_value(
                row,
                "player",
            )
        )

        hero_id = loader.get_hero_id(
            get_value(
                row,
                "hero",
            ),
            get_value(
                row,
                "hero_url",
            ),
        )

        loader.execute(
            """
            INSERT INTO game_picks
                (
                    game_pick_id,
                    game_id,
                    team_id,
                    side,
                    player_id,
                    hero_id
                )
            VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
            ON DUPLICATE KEY UPDATE
                team_id =
                    VALUES(team_id),
                side =
                    VALUES(side),
                player_id =
                    VALUES(player_id),
                hero_id =
                    VALUES(hero_id)
            """,
            (
                game_pick_id,
                game_id,
                team_id,
                get_value(
                    row,
                    "side",
                ),
                player_id,
                hero_id,
            ),
        )

        count += 1

    print(
        f"[OK] game_picks: "
        f"{count} records"
    )

    return count


# ============================================================
# IMPORT GAME EMBLEMS
# ============================================================

def import_game_emblems(
    loader,
    rows,
):

    count = 0

    for row in rows:

        game_emblem_id = get_value(
            row,
            "game_emblem_id",
        )

        game_id = get_value(
            row,
            "game_id",
        )

        if not game_emblem_id or not game_id:

            raise ValueError(
                "game_emblems.json memiliki "
                "record tanpa game_emblem_id/game_id"
            )

        team_id = loader.get_team_id(
            get_value(
                row,
                "team",
            )
        )

        player_id = loader.get_player_id(
            get_value(
                row,
                "player",
            )
        )

        hero_name = get_value(
            row,
            "hero",
        )

        hero_id = (
            loader.get_hero_id(
                hero_name,
                get_value(
                    row,
                    "hero_url",
                ),
            )
            if hero_name
            else None
        )

        loader.execute(
            """
            INSERT INTO game_emblems
                (
                    game_emblem_id,
                    game_id,
                    team_id,
                    side,
                    player_id,
                    hero_id,
                    emblem_id,
                    emblem_url,
                    rune1_id,
                    rune1_url,
                    rune2_id,
                    rune2_url,
                    rune3_id,
                    rune3_url
                )
            VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
            ON DUPLICATE KEY UPDATE
                team_id =
                    VALUES(team_id),
                side =
                    VALUES(side),
                player_id =
                    VALUES(player_id),
                hero_id =
                    VALUES(hero_id),
                emblem_id =
                    VALUES(emblem_id),
                emblem_url =
                    VALUES(emblem_url),
                rune1_id =
                    VALUES(rune1_id),
                rune1_url =
                    VALUES(rune1_url),
                rune2_id =
                    VALUES(rune2_id),
                rune2_url =
                    VALUES(rune2_url),
                rune3_id =
                    VALUES(rune3_id),
                rune3_url =
                    VALUES(rune3_url)
            """,
            (
                game_emblem_id,
                game_id,
                team_id,
                get_value(
                    row,
                    "side",
                ),
                player_id,
                hero_id,
                as_int(
                    get_value(
                        row,
                        "emblem_id",
                    )
                ),
                get_value(
                    row,
                    "emblem_url",
                ),
                as_int(
                    get_value(
                        row,
                        "rune1_id",
                    )
                ),
                get_value(
                    row,
                    "rune1_url",
                ),
                as_int(
                    get_value(
                        row,
                        "rune2_id",
                    )
                ),
                get_value(
                    row,
                    "rune2_url",
                ),
                as_int(
                    get_value(
                        row,
                        "rune3_id",
                    )
                ),
                get_value(
                    row,
                    "rune3_url",
                ),
            ),
        )

        count += 1

    print(
        f"[OK] game_emblems: "
        f"{count} records"
    )

    return count


# ============================================================
# IMPORT GAME ITEMS
# ============================================================

def import_game_items(
    loader,
    rows,
):

    count = 0

    unmatched = 0

    for row in rows:

        game_item_id = get_value(
            row,
            "game_item_id",
        )

        game_id = get_value(
            row,
            "game_id",
        )

        if not game_item_id or not game_id:

            raise ValueError(
                "game_items.json memiliki "
                "record tanpa game_item_id/game_id"
            )

        team_id = loader.get_team_id(
            get_value(
                row,
                "team",
            )
        )

        player_id = loader.get_player_id(
            get_value(
                row,
                "player",
            )
        )

        hero_name = get_value(
            row,
            "hero",
        )

        hero_id = (
            loader.get_hero_id(
                hero_name,
                get_value(
                    row,
                    "hero_url",
                ),
            )
            if hero_name
            else None
        )

        # ----------------------------------------------------
        # ITEM MATCHING
        # ----------------------------------------------------

        raw_item_id = get_value(
            row,
            "item_id",
        )

        item_url = get_value(
            row,
            "item_url",
        )

        item_id = loader.get_master_item_id(
            item_id=raw_item_id,
            item_url=item_url,
        )

        # NULL boleh terjadi pada empty item slot.
        if item_id is None:
            unmatched += 1

        loader.execute(
            """
            INSERT INTO game_items
                (
                    game_item_id,
                    game_id,
                    team_id,
                    side,
                    player_id,
                    hero_id,
                    item_slot,
                    item_id,
                    item_url
                )
            VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
            ON DUPLICATE KEY UPDATE
                team_id =
                    VALUES(team_id),
                side =
                    VALUES(side),
                player_id =
                    VALUES(player_id),
                hero_id =
                    VALUES(hero_id),
                item_slot =
                    VALUES(item_slot),
                item_id =
                    VALUES(item_id),
                item_url =
                    VALUES(item_url)
            """,
            (
                game_item_id,
                game_id,
                team_id,
                get_value(
                    row,
                    "side",
                ),
                player_id,
                hero_id,
                as_int(
                    get_value(
                        row,
                        "item_slot",
                    )
                ),
                item_id,
                item_url,
            ),
        )

        count += 1

    if unmatched:

        print(
            f"[INFO] game_items: "
            f"{unmatched} record tanpa item_id "
            f"(kemungkinan empty item slot)."
        )

    print(
        f"[OK] game_items: "
        f"{count} records"
    )

    return count


# ============================================================
# IMPORT HERO BASE STATS
# ============================================================

def import_hero_base_stats(
    loader,
    rows,
):

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

    for stat in stat_names:

        columns.extend(
            [
                f"{stat}_lv1",
                f"{stat}_lv15",
                f"{stat}_per_level",
            ]
        )

    for row in rows:

        hero_name = get_value(
            row,
            "hero",
            "hero_name",
        )

        if not hero_name:

            raise ValueError(
                "hero_base_stats memiliki "
                "record tanpa hero"
            )

        hero_id = loader.get_hero_id(
            hero_name,
            get_value(
                row,
                "hero_url",
                "url",
            ),
        )

        values = [hero_id]

        for stat in stat_names:

            values.extend(
                [
                    nested_stat(
                        row,
                        stat,
                        "lv1",
                    ),
                    nested_stat(
                        row,
                        stat,
                        "lv15",
                    ),
                    nested_stat(
                        row,
                        stat,
                        "per_level",
                    ),
                ]
            )

        placeholders = ", ".join(
            ["%s"] * len(values)
        )

        update_sql = ", ".join(
            f"{column}=VALUES({column})"
            for column in columns
        )

        sql = f"""
            INSERT INTO hero_base_stats
                (
                    hero_id,
                    {", ".join(columns)}
                )
            VALUES
                (
                    {placeholders}
                )
            ON DUPLICATE KEY UPDATE
                {update_sql}
        """

        loader.execute(
            sql,
            tuple(values),
        )

        count += 1

    print(
        f"[OK] hero_base_stats: "
        f"{count} records"
    )

    return count


# ============================================================
# IMPORT HERO SEASON STATS
# ============================================================

def import_hero_season_stats(
    loader,
    rows,
):

    count = 0

    for row in rows:

        hero_name = get_value(
            row,
            "hero",
            "hero_name",
        )

        if not hero_name:

            raise ValueError(
                "hero_season_stats memiliki "
                "record tanpa hero"
            )

        season_number = as_int(
            get_value(
                row,
                "season",
                "season_number",
                default=17,
            )
        )

        league = get_value(
            row,
            "league",
            default="MPL Indonesia",
        )

        phase = get_value(
            row,
            "phase",
            default="Regular Season",
        )

        source = get_value(
            row,
            "source",
            default="derived",
        )

        season_id = loader.get_season_id(
            league,
            season_number,
            phase=phase,
            source=source,
        )

        hero_id = loader.get_hero_id(
            hero_name
        )

        loader.execute(
            """
            INSERT INTO hero_season_stats
                (
                    season_id,
                    hero_id,
                    pick_count,
                    pick_rate,
                    win_count,
                    win_rate
                )
            VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
            ON DUPLICATE KEY UPDATE
                pick_count =
                    VALUES(pick_count),
                pick_rate =
                    VALUES(pick_rate),
                win_count =
                    VALUES(win_count),
                win_rate =
                    VALUES(win_rate)
            """,
            (
                season_id,
                hero_id,
                as_int(
                    get_value(
                        row,
                        "pick",
                        "pick_count",
                        default=0,
                    )
                ),
                as_decimal(
                    get_value(
                        row,
                        "pick_rate",
                        default=0,
                    )
                ),
                as_int(
                    get_value(
                        row,
                        "win",
                        "win_count",
                        default=0,
                    )
                ),
                as_decimal(
                    get_value(
                        row,
                        "win_rate",
                        default=0,
                    )
                ),
            ),
        )

        count += 1

    print(
        f"[OK] hero_season_stats: "
        f"{count} records"
    )

    return count


# ============================================================
# VALIDATION MASTER ITEMS
# ============================================================

def validate_master_items(
    rows,
):

    if not rows:

        raise ValueError(
            "master_items.json kosong."
        )

    ids = []

    names = []

    for row in rows:

        item_id = as_int(
            get_value(
                row,
                "equipid",
                "item_id",
                "master_item_id",
            )
        )

        item_name = normalize_name(
            get_value(
                row,
                "equipname",
                "item_name",
                "name",
            )
        )

        if item_id is None:

            raise ValueError(
                "master_items memiliki "
                "item tanpa item_id"
            )

        if not item_name:

            raise ValueError(
                f"master_items item_id={item_id} "
                f"tanpa item_name"
            )

        ids.append(item_id)

        names.append(
            item_name.lower()
        )

    if len(ids) != len(set(ids)):

        raise ValueError(
            "master_items memiliki "
            "duplicate item_id."
        )

    if len(names) != len(set(names)):

        raise ValueError(
            "master_items memiliki "
            "duplicate item_name."
        )

    print(
        f"[OK] validasi master_items: "
        f"{len(rows)} records, "
        f"{len(set(ids))} unique item_id"
    )


# ============================================================
# VALIDATION DEPENDENCIES
# ============================================================

def validate_dependencies(
    rows_by_dataset,
):

    matches = rows_by_dataset[
        "matches"
    ]

    games = rows_by_dataset[
        "games"
    ]

    # --------------------------------------------------------
    # Match -> Game
    # --------------------------------------------------------

    match_ids = {
        get_value(
            row,
            "match_id",
        )
        for row in matches
        if get_value(
            row,
            "match_id",
        )
    }

    missing_game_matches = sorted(
        {
            get_value(
                row,
                "match_id",
            )
            for row in games
            if get_value(
                row,
                "match_id",
            ) not in match_ids
        }
    )

    if missing_game_matches:

        raise ValueError(
            "games.json memiliki "
            "match_id yang tidak ada "
            "di matches.json: "
            + ", ".join(
                missing_game_matches[:10]
            )
        )

    # --------------------------------------------------------
    # Game children
    # --------------------------------------------------------

    game_ids = {
        get_value(
            row,
            "game_id",
        )
        for row in games
        if get_value(
            row,
            "game_id",
        )
    }

    child_datasets = (
        "game_players",
        "game_picks",
        "game_emblems",
        "game_items",
    )

    for dataset_name in child_datasets:

        missing = sorted(
            {
                get_value(
                    row,
                    "game_id",
                )
                for row in rows_by_dataset[
                    dataset_name
                ]
                if get_value(
                    row,
                    "game_id",
                ) not in game_ids
            }
        )

        if missing:

            raise ValueError(
                f"{dataset_name}.json memiliki "
                f"game_id yang tidak ada "
                f"di games.json: "
                + ", ".join(
                    missing[:10]
                )
            )

    # --------------------------------------------------------
    # Cardinality
    # --------------------------------------------------------

    def counts_by_game(rows):

        result = {}

        for row in rows:

            game_id = get_value(
                row,
                "game_id",
            )

            result[game_id] = (
                result.get(
                    game_id,
                    0,
                )
                + 1
            )

        return result

    expected_counts = (
        (
            "game_players",
            10,
        ),
        (
            "game_picks",
            10,
        ),
        (
            "game_emblems",
            10,
        ),
        (
            "game_items",
            60,
        ),
    )

    for dataset_name, expected in expected_counts:

        counts = counts_by_game(
            rows_by_dataset[
                dataset_name
            ]
        )

        bad = [
            game_id
            for game_id, count in counts.items()
            if count != expected
        ]

        if bad:

            raise ValueError(
                f"{dataset_name}: "
                f"game dengan jumlah record "
                f"!= {expected}: "
                + ", ".join(
                    bad[:10]
                )
            )

    print(
        "[OK] validasi dependency/cardinality"
    )


# ============================================================
# VALIDATE MYSQL MASTER ITEMS SCHEMA
# ============================================================

def validate_mysql_schema(
    conn,
):

    cursor = conn.cursor()

    try:

        cursor.execute(
            "SHOW COLUMNS FROM master_items"
        )

        columns = {
            row[0]
            for row in cursor.fetchall()
        }

    finally:

        cursor.close()

    required_columns = {
        "item_id",
        "item_name",
        "item_url",
    }

    missing = (
        required_columns
        - columns
    )

    if missing:

        raise RuntimeError(
            "Schema master_items belum sesuai. "
            "Kolom yang hilang: "
            + ", ".join(
                sorted(missing)
            )
            + ". "
            "Jalankan:"
            "\n\n"
            "ALTER TABLE master_items "
            "ADD COLUMN item_name "
            "VARCHAR(150) NOT NULL "
            "AFTER item_id;"
        )

    print(
        "[OK] Schema master_items sesuai."
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print(
        "=" * 70
    )

    print(
        "MPL ANALYTIC - JSON -> MYSQL"
    )

    print(
        "=" * 70
    )

    print(
        f"Project : {BASE_DIR}"
    )

    print(
        f"Database: "
        f"{DB_CONFIG['user']}@"
        f"{DB_CONFIG['host']}:"
        f"{DB_CONFIG['port']}/"
        f"{DB_CONFIG['database']}"
    )

    print()

    # ========================================================
    # LOAD JSON
    # ========================================================

    rows_by_dataset = {}

    for dataset, filename in FILES.items():

        # ----------------------------------------------------
        # schedule
        # ----------------------------------------------------

        if dataset == "schedule":

            rows = load_optional_json_file(
                filename,
                (
                    "schedule",
                    "schedules",
                    "data",
                    "matches",
                ),
            )

        # ----------------------------------------------------
        # master_items
        # ----------------------------------------------------

        elif dataset == "master_items":

            rows = load_json_file(
                filename,
                (
                    "items",
                    "master_items",
                    "data",
                    "records",
                ),
            )

        # ----------------------------------------------------
        # hero_season_stats
        #
        # PENTING:
        # JSON kamu menggunakan:
        #
        # {
        #     "metadata": {...},
        #     "heroes": [...]
        # }
        # ----------------------------------------------------

        elif dataset == "hero_season_stats":

            rows = load_json_file(
                filename,
                (
                    "heroes",
                    "hero_season_stats",
                    "data",
                    "records",
                ),
            )

        # ----------------------------------------------------
        # dataset lainnya
        # ----------------------------------------------------

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

        rows_by_dataset[
            dataset
        ] = rows

        print(
            f"[LOAD] "
            f"{filename:<32}"
            f"{len(rows):>6} records"
        )

    print()

    # ========================================================
    # VALIDATION
    # ========================================================

    validate_master_items(
        rows_by_dataset[
            "master_items"
        ]
    )

    validate_dependencies(
        rows_by_dataset
    )

    # ========================================================
    # MYSQL CONNECT
    # ========================================================

    conn = None

    try:

        conn = mysql.connector.connect(
            **DB_CONFIG
        )

        if not conn.is_connected():

            raise RuntimeError(
                "Koneksi MySQL gagal."
            )

        print(
            "[OK] Koneksi MySQL berhasil."
        )

        validate_mysql_schema(
            conn
        )

        loader = Loader(
            conn
        )

        # ====================================================
        # RUN ID
        # ====================================================

        run_id = str(
            uuid.uuid4()
        )

        print(
            f"[RUN] {run_id}"
        )

        print()

        total_records = 0

        # ====================================================
        # IMPORT ORDER
        #
        # MASTER ITEMS HARUS SEBELUM GAME ITEMS
        # ====================================================

        jobs = [
            (
                "master_items",
                loader.load_master_items,
            ),
            (
                "schedule",
                import_schedule,
            ),
            (
                "matches",
                import_matches,
            ),
            (
                "games",
                import_games,
            ),
            (
                "game_players",
                import_game_players,
            ),
            (
                "game_picks",
                import_game_picks,
            ),
            (
                "game_emblems",
                import_game_emblems,
            ),
            (
                "game_items",
                import_game_items,
            ),
            (
                "hero_base_stats",
                import_hero_base_stats,
            ),
            (
                "hero_season_stats",
                import_hero_season_stats,
            ),
        ]

        # ====================================================
        # RUN JOBS
        # ====================================================

        for index, (
            dataset,
            importer,
        ) in enumerate(
            jobs,
            start=1,
        ):

            rows = rows_by_dataset.get(
                dataset,
                [],
            )

            # ----------------------------------------------
            # schedule optional
            # ----------------------------------------------

            if (
                dataset == "schedule"
                and not rows
            ):

                print(
                    f"[{index}/{len(jobs)}] "
                    f"schedule -> SKIP"
                )

                loader.log(
                    run_id,
                    dataset,
                    "partial",
                    0,
                    "schedule.json tidak ditemukan "
                    "atau kosong.",
                )

                conn.commit()

                continue

            try:

                print(
                    f"[{index}/{len(jobs)}] "
                    f"{dataset} -> "
                    f"{len(rows)}"
                )

                # load_master_items adalah bound method
                # (loader.load_master_items), sehingga self sudah
                # otomatis diberikan oleh Python. Importer lainnya
                # adalah function biasa yang membutuhkan loader.
                if dataset == "master_items":
                    processed = importer(rows)
                else:
                    processed = importer(
                        loader,
                        rows,
                    )

                loader.log(
                    run_id,
                    dataset,
                    "success",
                    processed,
                    "Dataset berhasil "
                    "diproses.",
                )

                conn.commit()

                total_records += processed

            except Exception as exc:

                conn.rollback()

                message = (
                    f"{type(exc).__name__}: "
                    f"{exc}"
                )

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

                print(
                    f"[FAILED] {dataset}: "
                    f"{message}"
                )

                raise

        # ====================================================
        # FINAL
        # ====================================================

        print()

        print(
            "=" * 70
        )

        print(
            "[DONE] Semua dataset "
            "berhasil diproses."
        )

        print(
            f"[DONE] Run ID: {run_id}"
        )

        print(
            f"[DONE] Total records utama: "
            f"{total_records}"
        )

        print(
            "[DONE] Detail status "
            "tersimpan di scraping_logs."
        )

        print(
            "=" * 70
        )

    except Error as exc:

        if conn:
            conn.rollback()

        print()

        print(
            f"[ERROR] MySQL: {exc}"
        )

        sys.exit(1)

    except Exception as exc:

        if conn:
            conn.rollback()

        print()

        print(
            f"[ERROR] {exc}"
        )

        sys.exit(1)

    finally:

        if (
            conn
            and conn.is_connected()
        ):

            conn.close()


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()
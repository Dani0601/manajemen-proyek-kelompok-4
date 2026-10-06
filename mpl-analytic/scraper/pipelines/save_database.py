"""
pipelines/save_database.py
----------------------------
Lapisan penyimpanan ke database, mengikuti PERSIS skema di
database/mpl_analytic.sql (nama tabel & kolom lowercase snake_case):

    games, game_drafts, game_item_builds, game_player_stats,
    game_timelines, heroes, hero_attributes, item_suitability_rules,
    master_items, matches, players, player_transfers,
    recommended_builds, recommended_build_items, scraping_logs,
    seasons, teams, team_rosters

Strategi upsert: tabel master (teams, players, heroes, master_items)
TIDAK punya UNIQUE constraint di kolom nama alaminya (lihat dump SQL --
hanya PRIMARY KEY di kolom id). Karena itu dipakai pola "get_or_create"
manual (SELECT dulu, INSERT kalau belum ada) di level aplikasi supaya
scraper tetap idempotent (aman dijalankan berulang) walau skema belum
memasang UNIQUE index.
"""

import logging
from datetime import datetime

from config.database import get_connection

logger = logging.getLogger("save_database")

_ID_COLUMN = {
    "teams": "team_id",
    "seasons": "season_id",
    "players": "player_id",
    "heroes": "hero_id",
    "hero_attributes": "attribute_id",
    "master_items": "item_id",
    "team_rosters": "roster_id",
    "player_transfers": "transfer_id",
    "matches": "match_id",
    "games": "game_id",
    "game_drafts": "draft_id",
    "game_timelines": "timeline_id",
    "game_player_stats": "stat_id",
    "game_item_builds": "build_id",
    "item_suitability_rules": "rule_id",
    "recommended_builds": "build_rec_id",
    "recommended_build_items": "rec_item_id",
    "scraping_logs": "log_id",
}


class SaveDatabase:
    def __init__(self, connection=None):
        self.conn = connection or get_connection()
        self._owns_connection = connection is None
        self.records_added = 0

    def close(self):
        if self._owns_connection:
            self.conn.close()

    # -- helper umum -----------------------------------------------------
    def _get_or_create(self, table: str, lookup: dict, extra_fields: dict | None = None) -> int:
        """
        Cari baris berdasarkan `lookup` (dict kolom->nilai). Jika ada,
        kembalikan id-nya. Jika tidak, INSERT baru dengan gabungan
        `lookup` + `extra_fields`, lalu kembalikan id yang baru dibuat.
        """
        extra_fields = extra_fields or {}
        id_column = _ID_COLUMN[table]
        where_clause = " AND ".join(f"`{col}` = %s" for col in lookup)

        with self.conn.cursor() as cur:
            cur.execute(
                f"SELECT `{id_column}` AS id FROM `{table}` WHERE {where_clause} LIMIT 1",
                tuple(lookup.values()),
            )
            row = cur.fetchone()
            if row:
                return row["id"]

            all_fields = {**lookup, **extra_fields}
            columns = ", ".join(f"`{c}`" for c in all_fields.keys())
            placeholders = ", ".join(["%s"] * len(all_fields))
            cur.execute(
                f"INSERT INTO `{table}` ({columns}) VALUES ({placeholders})",
                tuple(all_fields.values()),
            )
            self.records_added += 1
            return cur.lastrowid

    # -- master data: teams, seasons, players, heroes, master_items --------
    def upsert_team(self, team_name: str, short_code: str = "", logo_url: str | None = None) -> int:
        return self._get_or_create(
            "teams",
            lookup={"team_name": team_name},
            extra_fields={"short_code": short_code, "logo_url": logo_url},
        )

    def upsert_season(self, season_number: int, year: int) -> int:
        return self._get_or_create(
            "seasons",
            lookup={"season_number": season_number},
            extra_fields={"year": year},
        )

    def upsert_player(self, nickname: str, real_name: str = "") -> int:
        return self._get_or_create(
            "players",
            lookup={"nickname": nickname},
            extra_fields={"real_name": real_name},
        )

    def upsert_hero(self, hero_name: str, primary_role: str = "") -> int:
        return self._get_or_create(
            "heroes",
            lookup={"hero_name": hero_name},
            extra_fields={"primary_role": primary_role},
        )

    def save_hero_attribute(self, hero_id: int, attribute_type: str, description: str | None):
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT attribute_id FROM hero_attributes "
                "WHERE hero_id = %s AND attribute_type = %s LIMIT 1",
                (hero_id, attribute_type),
            )
            if cur.fetchone():
                return
            cur.execute(
                "INSERT INTO hero_attributes (hero_id, attribute_type, description) "
                "VALUES (%s, %s, %s)",
                (hero_id, attribute_type, description),
            )
            self.records_added += 1

    def upsert_master_item(self, item_name: str, item_type: str = "") -> int:
        return self._get_or_create(
            "master_items",
            lookup={"item_name": item_name},
            extra_fields={"item_type": item_type},
        )

    # -- roster & transfer --------------------------------------------------
    def save_team_roster(self, team_id: int, player_id: int, season_id: int, role: str | None):
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT roster_id FROM team_rosters "
                "WHERE team_id = %s AND player_id = %s AND season_id = %s LIMIT 1",
                (team_id, player_id, season_id),
            )
            if cur.fetchone():
                return
            cur.execute(
                "INSERT INTO team_rosters (team_id, player_id, season_id, role) "
                "VALUES (%s, %s, %s, %s)",
                (team_id, player_id, season_id, role),
            )
            self.records_added += 1

    def save_player_transfer(self, player_id: int, from_team_id, to_team_id: int,
                              season_id: int, transfer_type: str, transfer_fee,
                              transfer_date, loan_end_date=None) -> int:
        with self.conn.cursor() as cur:
            cur.execute(
                "INSERT INTO player_transfers "
                "(player_id, from_team_id, to_team_id, season_id, transfer_type, "
                " transfer_fee, transfer_date, loan_end_date) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (player_id, from_team_id, to_team_id, season_id, transfer_type,
                 transfer_fee, transfer_date, loan_end_date),
            )
            self.records_added += 1
            return cur.lastrowid

    # -- match & game -------------------------------------------------------
    def save_match(self, season_id: int, team_a_id: int, team_b_id: int,
                    winner_team_id, match_date) -> int:
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT match_id FROM matches "
                "WHERE season_id = %s AND team_a_id = %s AND team_b_id = %s "
                "AND match_date = %s LIMIT 1",
                (season_id, team_a_id, team_b_id, match_date),
            )
            row = cur.fetchone()
            if row:
                return row["match_id"]

            cur.execute(
                "INSERT INTO matches (season_id, team_a_id, team_b_id, winner_team_id, match_date) "
                "VALUES (%s, %s, %s, %s, %s)",
                (season_id, team_a_id, team_b_id, winner_team_id, match_date),
            )
            self.records_added += 1
            return cur.lastrowid

    def save_game(self, match_id: int, game_number: int, duration_seconds: int,
                   red_team_id: int, blue_team_id: int, winner_team_id) -> int:
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT game_id FROM games WHERE match_id = %s AND game_number = %s LIMIT 1",
                (match_id, game_number),
            )
            row = cur.fetchone()
            if row:
                return row["game_id"]

            cur.execute(
                "INSERT INTO games "
                "(match_id, game_number, duration_seconds, red_team_id, blue_team_id, winner_team_id) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (match_id, game_number, duration_seconds, red_team_id, blue_team_id, winner_team_id),
            )
            self.records_added += 1
            return cur.lastrowid

    def save_game_draft(self, game_id: int, team_id: int, hero_id: int,
                         draft_type: str, pick_ban_turn: int):
        with self.conn.cursor() as cur:
            cur.execute(
                "INSERT INTO game_drafts (game_id, team_id, hero_id, draft_type, pick_ban_turn) "
                "VALUES (%s, %s, %s, %s, %s)",
                (game_id, team_id, hero_id, draft_type, pick_ban_turn),
            )
            self.records_added += 1

    def save_game_timeline(self, game_id: int, minute: int, red_gold: int, blue_gold: int):
        with self.conn.cursor() as cur:
            cur.execute(
                "INSERT INTO game_timelines (game_id, minute, red_gold, blue_gold) "
                "VALUES (%s, %s, %s, %s)",
                (game_id, minute, red_gold, blue_gold),
            )
            self.records_added += 1

    def save_game_player_stat(self, game_id: int, player_id: int, hero_id: int,
                               kills: int, deaths: int, assists: int,
                               gold_earned: int, damage_to_heroes: int) -> int:
        with self.conn.cursor() as cur:
            cur.execute(
                "INSERT INTO game_player_stats "
                "(game_id, player_id, hero_id, kills, deaths, assists, gold_earned, damage_to_heroes) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (game_id, player_id, hero_id, kills, deaths, assists, gold_earned, damage_to_heroes),
            )
            self.records_added += 1
            return cur.lastrowid

    def save_game_item_build(self, stat_id: int, item_id: int, slot_position: int):
        with self.conn.cursor() as cur:
            cur.execute(
                "INSERT INTO game_item_builds (stat_id, item_id, slot_position) "
                "VALUES (%s, %s, %s)",
                (stat_id, item_id, slot_position),
            )
            self.records_added += 1

    # -- logging run scraper -------------------------------------------------
    def log_scraping_run(self, status: str, records_added: int | None = None):
        with self.conn.cursor() as cur:
            cur.execute(
                "INSERT INTO scraping_logs (run_time, status, records_added) "
                "VALUES (%s, %s, %s)",
                (datetime.now(), status, records_added if records_added is not None else self.records_added),
            )

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

"""
Loader 4 JSON hero ke database MPL Analytic.

JSON:
1. hero_statistics.json
2. hero_details.json
3. hero_builds.json / hero_builds(1).json
4. hero_counters.json

Tabel:
hero_statistics
hero_details
hero_skills
hero_build_items
hero_build_situational_swaps
hero_build_spells
hero_build_emblems
hero_build_talents
hero_skill_orders
hero_counters
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any

import mysql.connector


ROOT = Path(__file__).resolve().parents[2]

# JSON berada satu folder dengan file loader,
# yaitu scraper/scrapers/
DEFAULT_JSON_DIR = Path(__file__).resolve().parent


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    env_file = ROOT / ".env"

    if not env_file.exists():
        return env

    for line in env_file.read_text(
        encoding="utf-8"
    ).splitlines():
        line = line.strip()

        if (
            not line
            or line.startswith("#")
            or "=" not in line
        ):
            continue

        key, value = line.split("=", 1)

        env[key.strip()] = (
            value.strip()
            .strip('"')
            .strip("'")
        )

    return env


def get_connection():
    env = load_env()

    return mysql.connector.connect(
        host=env.get("DB_HOST", "127.0.0.1"),
        port=int(env.get("DB_PORT", "3306")),
        database=env.get(
            "DB_NAME",
            "mpl_analytic"
        ),
        user=env.get(
            "DB_USER",
            "root"
        ),
        password=env.get(
            "DB_PASS",
            ""
        ),
    )


def find_json(
    json_dir: Path,
    names: list[str]
) -> Path:
    for name in names:
        path = json_dir / name

        if path.exists():
            return path

    for name in names:
        matches = list(
            json_dir.rglob(name)
        )

        if matches:
            return matches[0]

    raise FileNotFoundError(
        "JSON tidak ditemukan: "
        + ", ".join(names)
    )


def read_json(path: Path) -> dict[str, Any]:
    with path.open(
        "r",
        encoding="utf-8"
    ) as file:
        return json.load(file)


def parse_snapshot(
    value: str | None
) -> datetime | None:
    if not value:
        return None

    value = value.replace(
        "Z",
        "+00:00"
    )

    try:
        result = datetime.fromisoformat(
            value
        )

        # MySQL DATETIME tidak menyimpan timezone.
        return result.replace(
            tzinfo=None
        )

    except ValueError:
        return None


def build_hero_map(cursor):
    cursor.execute(
        """
        SELECT
            hero_id,
            hero_slug,
            hero_name
        FROM heroes
        """
    )

    hero_map: dict[str, int] = {}

    for hero_id, slug, name in cursor.fetchall():
        if slug:
            hero_map[
                slug.strip().lower()
            ] = int(hero_id)

        if name:
            hero_map[
                name.strip().lower()
            ] = int(hero_id)

    return hero_map


def resolve_hero_id(
    hero_map,
    source_hero_id: str | None,
    hero_name: str | None = None
):
    if source_hero_id:
        result = hero_map.get(
            source_hero_id.strip().lower()
        )

        if result:
            return result

    if hero_name:
        result = hero_map.get(
            hero_name.strip().lower()
        )

        if result:
            return result

    return None


def load_hero_statistics(
    cursor,
    payload,
    hero_map
):
    metadata = payload.get(
        "metadata",
        {}
    )

    snapshot = parse_snapshot(
        metadata.get("scraped_at")
    )

    source_url = metadata.get(
        "source"
    )

    sql = """
        INSERT INTO hero_statistics (
            source_hero_id,
            hero_id,
            hero_name,
            hero_url,
            raw_text,
            source_url,
            snapshot_at
        )
        VALUES (
            %s, %s, %s, %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
            hero_id = VALUES(hero_id),
            hero_name = VALUES(hero_name),
            hero_url = VALUES(hero_url),
            raw_text = VALUES(raw_text),
            source_url = VALUES(source_url)
    """

    count = 0

    for hero in payload.get(
        "heroes",
        []
    ):
        source_id = str(
            hero.get("hero_id") or ""
        )

        name = hero.get(
            "hero_name"
        ) or ""

        cursor.execute(
            sql,
            (
                source_id,
                resolve_hero_id(
                    hero_map,
                    source_id,
                    name
                ),
                name,
                hero.get("hero_url"),
                hero.get("raw_text"),
                hero.get("source")
                or source_url,
                snapshot,
            )
        )

        count += 1

    return count


def load_hero_details(
    cursor,
    payload,
    hero_map
):
    metadata = payload.get(
        "metadata",
        {}
    )

    snapshot = parse_snapshot(
        metadata.get("scraped_at")
    )

    source_url = metadata.get(
        "source"
    )

    detail_sql = """
        INSERT INTO hero_details (
            source_hero_id,
            hero_id,
            hero_name,
            hero_url,
            win_rate,
            pick_rate,
            ban_rate,
            win_rate_epic,
            win_rate_legend,
            win_rate_mythic,
            win_rate_mythical_honor,
            win_rate_mythical_glory_plus,
            offense,
            durability,
            control_effects,
            difficulty,
            hero_info_json,
            base_stats_json,
            source_url,
            snapshot_at
        )
        VALUES (
            %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
            hero_id = VALUES(hero_id),
            hero_name = VALUES(hero_name),
            hero_url = VALUES(hero_url),
            win_rate = VALUES(win_rate),
            pick_rate = VALUES(pick_rate),
            ban_rate = VALUES(ban_rate),
            win_rate_epic = VALUES(win_rate_epic),
            win_rate_legend = VALUES(win_rate_legend),
            win_rate_mythic = VALUES(win_rate_mythic),
            win_rate_mythical_honor =
                VALUES(win_rate_mythical_honor),
            win_rate_mythical_glory_plus =
                VALUES(win_rate_mythical_glory_plus),
            offense = VALUES(offense),
            durability = VALUES(durability),
            control_effects =
                VALUES(control_effects),
            difficulty = VALUES(difficulty),
            hero_info_json =
                VALUES(hero_info_json),
            base_stats_json =
                VALUES(base_stats_json),
            source_url = VALUES(source_url)
    """

    skill_sql = """
        INSERT INTO hero_skills (
            source_hero_id,
            hero_id,
            skill_position,
            skill_type,
            skill_name,
            description,
            tags_json,
            raw_text,
            snapshot_at
        )
        VALUES (
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
            hero_id = VALUES(hero_id),
            skill_type = VALUES(skill_type),
            skill_name = VALUES(skill_name),
            description = VALUES(description),
            tags_json = VALUES(tags_json),
            raw_text = VALUES(raw_text)
    """

    detail_count = 0
    skill_count = 0

    for hero in payload.get(
        "heroes",
        []
    ):
        source_id = str(
            hero.get("hero_id") or ""
        )

        name = hero.get(
            "hero_name"
        ) or ""

        hero_id = resolve_hero_id(
            hero_map,
            source_id,
            name
        )

        win_rates = (
            hero.get(
                "win_rate_by_rank"
            ) or {}
        )

        ratings = (
            hero.get(
                "official_ratings"
            ) or {}
        )

        cursor.execute(
            detail_sql,
            (
                source_id,
                hero_id,
                name,
                hero.get("hero_url"),
                hero.get("win_rate"),
                hero.get("pick_rate"),
                hero.get("ban_rate"),
                win_rates.get("Epic"),
                win_rates.get("Legend"),
                win_rates.get("Mythic"),
                win_rates.get(
                    "Mythical Honor"
                ),
                win_rates.get(
                    "Mythical Glory+"
                ),
                ratings.get("offense"),
                ratings.get("durability"),
                ratings.get(
                    "control_effects"
                ),
                ratings.get("difficulty"),
                json.dumps(
                    hero.get(
                        "hero_info"
                    ) or {},
                    ensure_ascii=False
                ),
                json.dumps(
                    hero.get(
                        "base_stats"
                    ) or {},
                    ensure_ascii=False
                ),
                hero.get("hero_url")
                or source_url,
                snapshot,
            )
        )

        detail_count += 1

        for position, skill in enumerate(
            hero.get("skills") or [],
            start=1
        ):
            cursor.execute(
                skill_sql,
                (
                    source_id,
                    hero_id,
                    position,
                    skill.get("skill_type"),
                    skill.get("skill_name"),
                    skill.get("description"),
                    json.dumps(
                        skill.get("tags") or [],
                        ensure_ascii=False
                    ),
                    skill.get("raw_text"),
                    snapshot,
                )
            )

            skill_count += 1

    return detail_count, skill_count


def load_hero_builds(
    cursor,
    payload,
    hero_map
):
    metadata = payload.get(
        "metadata",
        {}
    )

    snapshot = parse_snapshot(
        metadata.get("scraped_at")
    )

    item_sql = """
        INSERT INTO hero_build_items (
            source_hero_id,
            hero_id,
            position,
            item_source_id,
            item_name,
            item_url,
            build_count,
            total_builds,
            share_percent,
            power_spike,
            raw_text,
            snapshot_at
        )
        VALUES (
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
            hero_id = VALUES(hero_id),
            item_name = VALUES(item_name),
            item_url = VALUES(item_url),
            build_count = VALUES(build_count),
            total_builds = VALUES(total_builds),
            share_percent = VALUES(share_percent),
            power_spike = VALUES(power_spike),
            raw_text = VALUES(raw_text)
    """

    swap_sql = """
        INSERT INTO hero_build_situational_swaps (
            source_hero_id,
            hero_id,
            condition_text,
            item_name,
            share_percent,
            raw_text,
            snapshot_at
        )
        VALUES (
            %s, %s, %s, %s, %s, %s, %s
        )
    """

    spell_sql = """
        INSERT INTO hero_build_spells (
            source_hero_id,
            hero_id,
            spell_name,
            share_percent,
            build_count,
            snapshot_at
        )
        VALUES (
            %s, %s, %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
            hero_id = VALUES(hero_id),
            share_percent = VALUES(share_percent),
            build_count = VALUES(build_count)
    """

    emblem_sql = """
        INSERT INTO hero_build_emblems (
            source_hero_id,
            hero_id,
            emblem_name,
            build_count,
            total_builds,
            snapshot_at
        )
        VALUES (
            %s, %s, %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
            hero_id = VALUES(hero_id),
            build_count = VALUES(build_count),
            total_builds = VALUES(total_builds)
    """

    talent_sql = """
        INSERT INTO hero_build_talents (
            source_hero_id,
            hero_id,
            position,
            talent_name,
            build_count,
            total_builds,
            snapshot_at
        )
        VALUES (
            %s, %s, %s, %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
            hero_id = VALUES(hero_id),
            talent_name = VALUES(talent_name),
            build_count = VALUES(build_count),
            total_builds = VALUES(total_builds)
    """

    skill_order_sql = """
        INSERT INTO hero_skill_orders (
            source_hero_id,
            hero_id,
            position,
            skill_name,
            priority,
            snapshot_at
        )
        VALUES (
            %s, %s, %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
            hero_id = VALUES(hero_id),
            skill_name = VALUES(skill_name),
            priority = VALUES(priority)
    """

    counts = {
        "items": 0,
        "swaps": 0,
        "spells": 0,
        "emblems": 0,
        "talents": 0,
        "skill_orders": 0,
    }

    for hero in payload.get(
        "heroes",
        []
    ):
        source_id = str(
            hero.get("hero_id") or ""
        )

        name = hero.get(
            "hero_name"
        ) or ""

        hero_id = resolve_hero_id(
            hero_map,
            source_id,
            name
        )

        for item in (
            hero.get("item_order") or []
        ):
            item_source_id = item.get(
                "item_id"
            )

            if item_source_id is not None:
                item_source_id = str(
                    item_source_id
                )

            cursor.execute(
                item_sql,
                (
                    source_id,
                    hero_id,
                    item.get("position"),
                    item_source_id,
                    item.get("item_name"),
                    item.get("item_url"),
                    item.get("build_count"),
                    item.get("total_builds"),
                    item.get("share_percent"),
                    item.get("power_spike"),
                    item.get("raw_text"),
                    snapshot,
                )
            )

            counts["items"] += 1

        for swap in (
            hero.get(
                "situational_swaps"
            ) or []
        ):
            cursor.execute(
                swap_sql,
                (
                    source_id,
                    hero_id,
                    swap.get("condition"),
                    swap.get("item_name"),
                    swap.get("share_percent"),
                    swap.get("raw_text"),
                    snapshot,
                )
            )

            counts["swaps"] += 1

        emblem = hero.get(
            "emblem"
        ) or {}

        for entry in (
            emblem.get("emblem") or []
        ):
            cursor.execute(
                emblem_sql,
                (
                    source_id,
                    hero_id,
                    entry.get("name") or "",
                    entry.get("build_count"),
                    entry.get("total_builds"),
                    snapshot,
                )
            )

            counts["emblems"] += 1

        for talent in (
            emblem.get("talents") or []
        ):
            cursor.execute(
                talent_sql,
                (
                    source_id,
                    hero_id,
                    talent.get("position"),
                    talent.get("name"),
                    talent.get("build_count"),
                    talent.get("total_builds"),
                    snapshot,
                )
            )

            counts["talents"] += 1

        for spell in (
            hero.get("battle_spell") or []
        ):
            cursor.execute(
                spell_sql,
                (
                    source_id,
                    hero_id,
                    spell.get("name") or "",
                    spell.get("share_percent"),
                    spell.get("build_count"),
                    snapshot,
                )
            )

            counts["spells"] += 1

        for order in (
            hero.get(
                "skill_upgrade_order"
            ) or []
        ):
            cursor.execute(
                skill_order_sql,
                (
                    source_id,
                    hero_id,
                    order.get("position"),
                    order.get("skill_name"),
                    order.get("priority"),
                    snapshot,
                )
            )

            counts["skill_orders"] += 1

    return counts


def load_hero_counters(
    cursor,
    payload,
    hero_map
):
    metadata = payload.get(
        "metadata",
        {}
    )

    snapshot = parse_snapshot(
        metadata.get("scraped_at")
    )

    sql = """
        INSERT INTO hero_counters (
            source_hero_id,
            hero_id,
            relation_type,
            target_source_hero_id,
            target_hero_id,
            target_hero_name,
            target_hero_url,
            win_rate_advantage,
            snapshot_at
        )
        VALUES (
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
            hero_id = VALUES(hero_id),
            target_hero_id = VALUES(target_hero_id),
            target_hero_name =
                VALUES(target_hero_name),
            target_hero_url =
                VALUES(target_hero_url),
            win_rate_advantage =
                VALUES(win_rate_advantage)
    """

    count = 0

    for hero in payload.get(
        "heroes",
        []
    ):
        source_id = str(
            hero.get("hero_id") or ""
        )

        name = hero.get(
            "hero_name"
        ) or ""

        hero_id = resolve_hero_id(
            hero_map,
            source_id,
            name
        )

        matchups = (
            hero.get("matchups") or {}
        )

        relations = {
            "counter": (
                matchups.get("counters")
                or []
            ),
            "strong_against": (
                matchups.get("strong_against")
                or []
            ),
            "synergy": (
                matchups.get("synergies")
                or []
            ),
        }

        for relation_type, targets in (
            relations.items()
        ):
            for target in targets:
                target_source_id = str(
                    target.get("hero_id")
                    or ""
                )

                target_name = (
                    target.get(
                        "hero_name"
                    )
                    or ""
                )

                target_hero_id = (
                    resolve_hero_id(
                        hero_map,
                        target_source_id,
                        target_name
                    )
                )

                cursor.execute(
                    sql,
                    (
                        source_id,
                        hero_id,
                        relation_type,
                        target_source_id,
                        target_hero_id,
                        target_name,
                        target.get("hero_url"),
                        target.get(
                            "win_rate_advantage"
                        ),
                        snapshot,
                    )
                )

                count += 1

    return count


def main():
    json_dir = Path(
        os.getenv(
            "MLBBIO_JSON_DIR",
            str(DEFAULT_JSON_DIR)
        )
    )

    files = {
        "statistics": find_json(
            json_dir,
            ["hero_statistics.json"]
        ),
        "details": find_json(
            json_dir,
            ["hero_details.json"]
        ),
        "builds": find_json(
            json_dir,
            [
                "hero_builds.json",
                "hero_builds(1).json"
            ]
        ),
        "counters": find_json(
            json_dir,
            ["hero_counters.json"]
        ),
    }

    print("[JSON] File yang dipakai:")

    for key, path in files.items():
        print(f"  - {key}: {path}")

    conn = get_connection()
    cursor = conn.cursor()

    try:
        hero_map = build_hero_map(cursor)

        statistics = read_json(
            files["statistics"]
        )

        details = read_json(
            files["details"]
        )

        builds = read_json(
            files["builds"]
        )

        counters = read_json(
            files["counters"]
        )

        statistics_count = (
            load_hero_statistics(
                cursor,
                statistics,
                hero_map
            )
        )

        detail_count, skill_count = (
            load_hero_details(
                cursor,
                details,
                hero_map
            )
        )

        build_counts = load_hero_builds(
            cursor,
            builds,
            hero_map
        )

        counter_count = load_hero_counters(
            cursor,
            counters,
            hero_map
        )

        conn.commit()

        print(
            "[OK] Semua JSON berhasil dimuat."
        )

        print(
            f"[LOAD] hero_statistics "
            f"-> {statistics_count}"
        )

        print(
            f"[LOAD] hero_details "
            f"-> {detail_count}"
        )

        print(
            f"[LOAD] hero_skills "
            f"-> {skill_count}"
        )

        print(
            f"[LOAD] hero_build_items "
            f"-> {build_counts['items']}"
        )

        print(
            f"[LOAD] hero_build_situational_swaps "
            f"-> {build_counts['swaps']}"
        )

        print(
            f"[LOAD] hero_build_spells "
            f"-> {build_counts['spells']}"
        )

        print(
            f"[LOAD] hero_build_emblems "
            f"-> {build_counts['emblems']}"
        )

        print(
            f"[LOAD] hero_build_talents "
            f"-> {build_counts['talents']}"
        )

        print(
            f"[LOAD] hero_skill_orders "
            f"-> {build_counts['skill_orders']}"
        )

        print(
            f"[LOAD] hero_counters "
            f"-> {counter_count}"
        )

    except Exception:
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()

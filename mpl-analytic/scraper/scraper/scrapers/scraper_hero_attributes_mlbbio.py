import json
import re
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = "https://mlbb.io"
HEROES_URL = f"{BASE_URL}/en/heroes"

OUTPUT_FILE = Path("hero_base_stats.json")


def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


def absolute_url(url):
    if not url:
        return None

    if url.startswith("http://"):
        return url

    if url.startswith("https://"):
        return url

    if url.startswith("/"):
        return BASE_URL + url

    return BASE_URL + "/" + url


def hero_slug_from_url(url):
    if not url:
        return None

    match = re.search(
        r"/en/hero/([^/?#]+)",
        url,
    )

    return match.group(1) if match else None


def parse_number(value):
    """
    Mengubah:
        2,043 -> 2043
        0.96  -> 0.96
        9.71  -> 9.71
        ""    -> None
    """

    value = clean(value)

    if not value:
        return None

    value = value.replace(",", "")

    try:
        number = float(value)

        if number.is_integer():
            return int(number)

        return number

    except ValueError:
        return None


def normalize_stat_name(value):
    value = clean(value).lower()

    mapping = {
        "hp": "hp",
        "hp regen": "hp_regen",
        "physical attack": "physical_attack",
        "physical defense": "physical_defense",
        "magic defense": "magic_defense",
        "attack speed": "attack_speed",
        "movement speed": "movement_speed",

        "mana": "mana",
        "mana regen": "mana_regen",

        "energy": "energy",
        "energy regen": "energy_regen",

        "rage": "rage",
        "rage regen": "rage_regen",

        "blood": "blood",
        "blood regen": "blood_regen",

        "fury": "fury",
        "fury regen": "fury_regen",
    }

    return mapping.get(value)


def discover_heroes(page):
    print()
    print("[1/4] Discovering heroes...")
    print(HEROES_URL)

    page.goto(
        HEROES_URL,
        wait_until="networkidle",
        timeout=60_000,
    )

    page.wait_for_timeout(1500)

    links = page.locator(
        'a[href*="/en/hero/"]'
    )

    heroes = []
    seen = set()

    for i in range(links.count()):

        link = links.nth(i)

        href = link.get_attribute("href")

        hero_id = hero_slug_from_url(href)

        if not hero_id:
            continue

        if hero_id in seen:
            continue

        seen.add(hero_id)

        hero_name = clean(
            link.inner_text()
        )

        if not hero_name:

            image = link.locator("img")

            if image.count():

                hero_name = clean(
                    image.first.get_attribute(
                        "alt"
                    ) or ""
                )

        if not hero_name:
            hero_name = (
                hero_id
                .replace("-", " ")
                .title()
            )

        heroes.append({
            "hero_id": hero_id,
            "hero_name": hero_name,
            "hero_url": absolute_url(href),
        })

    heroes.sort(
        key=lambda x:
        x["hero_name"].lower()
    )

    print(
        f"[OK] Heroes discovered: "
        f"{len(heroes)}"
    )

    return heroes


def extract_base_stats(page, hero):
    """
    Mengambil tabel:

        Base stats

        Stat | Lv 1 | Lv 15 | Per level

    Hanya data dari tabel Base Stats.
    """

    hero_id = hero["hero_id"]

    url = (
        f"{BASE_URL}/en/hero/"
        f"{hero_id}"
    )

    page.goto(
        url,
        wait_until="networkidle",
        timeout=60_000,
    )

    page.wait_for_timeout(500)

    # Cari heading "Base stats"
    base_heading = page.locator(
        "h2, h3"
    ).filter(
        has_text=re.compile(
            r"^Base stats$",
            re.I,
        )
    )

    if base_heading.count() == 0:

        # Fallback kalau heading menggunakan
        # elemen lain.
        base_heading = page.get_by_text(
            re.compile(
                r"^Base stats$",
                re.I,
            )
        )

    if base_heading.count() == 0:
        raise RuntimeError(
            "Base stats heading tidak ditemukan"
        )

    heading = base_heading.first

    # Cari table terdekat.
    container = heading.locator(
        "xpath=.."
    )

    table = container.locator(
        "table"
    )

    if table.count() == 0:

        # Naik satu level lagi.
        container = heading.locator(
            "xpath=../.."
        )

        table = container.locator(
            "table"
        )

    if table.count() == 0:
        raise RuntimeError(
            "Base stats table tidak ditemukan"
        )

    rows = table.locator(
        "tbody tr"
    )

    if rows.count() == 0:

        # Beberapa HTML table tidak memakai tbody.
        rows = table.locator(
            "tr"
        )

    stats = {}

    raw_rows = []

    for i in range(rows.count()):

        row = rows.nth(i)

        cells = row.locator(
            "th, td"
        )

        if cells.count() < 2:
            continue

        values = []

        for j in range(cells.count()):

            values.append(
                clean(
                    cells.nth(j).inner_text()
                )
            )

        stat_name = normalize_stat_name(
            values[0]
        )

        if not stat_name:
            continue

        lv1 = (
            parse_number(values[1])
            if len(values) > 1
            else None
        )

        lv15 = (
            parse_number(values[2])
            if len(values) > 2
            else None
        )

        per_level = (
            parse_number(values[3])
            if len(values) > 3
            else None
        )

        stats[stat_name] = {
            "lv1": lv1,
            "lv15": lv15,
            "per_level": per_level,
        }

        raw_rows.append({
            "stat": values[0],
            "lv1": values[1]
            if len(values) > 1
            else None,
            "lv15": values[2]
            if len(values) > 2
            else None,
            "per_level": values[3]
            if len(values) > 3
            else None,
        })

    if not stats:
        raise RuntimeError(
            "Tidak ada base stats yang berhasil dibaca"
        )

    return {
        "hero_id": hero["hero_id"],
        "hero_name": hero["hero_name"],
        "hero_url": hero["hero_url"],
        "stats": stats,
        "source": url,
    }


def validate(results):

    print()
    print("=" * 80)
    print("VALIDATION")
    print("=" * 80)

    print(
        f"Total heroes : {len(results)}"
    )

    expected_core_stats = [
        "hp",
        "hp_regen",
        "physical_attack",
        "physical_defense",
        "magic_defense",
        "attack_speed",
        "movement_speed",
    ]

    for stat in expected_core_stats:

        count = 0

        for hero in results:

            if stat in hero["stats"]:
                count += 1

        print(
            f"{stat:20s}: "
            f"{count}/{len(results)}"
        )

    print()
    print("Sample:")

    for hero in results[:5]:

        print()
        print(
            f"{hero['hero_name']} "
            f"({hero['hero_id']})"
        )

        for stat_name, values in (
            hero["stats"].items()
        ):

            print(
                f"  {stat_name:20s} "
                f"Lv1={values['lv1']} "
                f"Lv15={values['lv15']} "
                f"PerLevel={values['per_level']}"
            )


def main():

    print("=" * 80)
    print("MLBB.IO - HERO BASE STATS SCRAPER")
    print("=" * 80)

    with sync_playwright() as p:

        browser = p.chromium.launch(
            headless=True
        )

        page = browser.new_page(
            viewport={
                "width": 1440,
                "height": 1200,
            },
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 "
                "(KHTML, like Gecko) "
                "Chrome/140.0.0.0 Safari/537.36"
            ),
        )

        # -----------------------------------------
        # 1. DISCOVER HEROES
        # -----------------------------------------

        heroes = discover_heroes(page)

        # -----------------------------------------
        # 2. SCRAPE BASE STATS
        # -----------------------------------------

        print()
        print(
            "[2/4] Scraping Base Stats..."
        )

        results = []

        for index, hero in enumerate(
            heroes,
            start=1,
        ):

            print(
                f"[{index}/{len(heroes)}] "
                f"{hero['hero_name']}"
            )

            try:

                data = extract_base_stats(
                    page,
                    hero,
                )

                results.append(data)

                print(
                    f"    [OK] "
                    f"{len(data['stats'])} stats"
                )

            except Exception as e:

                print(
                    f"    [ERROR] {e}"
                )

                results.append({
                    "hero_id": hero[
                        "hero_id"
                    ],
                    "hero_name": hero[
                        "hero_name"
                    ],
                    "hero_url": hero[
                        "hero_url"
                    ],
                    "stats": {},
                    "source": (
                        f"{BASE_URL}/en/hero/"
                        f"{hero['hero_id']}"
                    ),
                    "error": str(e),
                })

        browser.close()

    # -----------------------------------------
    # 3. VALIDATE
    # -----------------------------------------

    print()
    print(
        "[3/4] Validating..."
    )

    validate(results)

    # -----------------------------------------
    # 4. WRITE JSON
    # -----------------------------------------

    output = {
        "metadata": {
            "source": BASE_URL,
            "source_type": "mlbb.io",
            "data_type": "hero_base_stats",
            "scraped_at": (
                datetime.now(
                    timezone.utc
                ).isoformat()
            ),
            "total_heroes": len(results),
        },
        "heroes": results,
    }

    OUTPUT_FILE.write_text(
        json.dumps(
            output,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print()
    print(
        "[4/4] Writing JSON..."
    )

    print(
        f"[OK] Saved: "
        f"{OUTPUT_FILE.resolve()}"
    )

    print()
    print("=" * 80)
    print("SCRAPING SELESAI")
    print("=" * 80)


if __name__ == "__main__":
    main()
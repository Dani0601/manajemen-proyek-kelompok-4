import asyncio
import json
import re
from pathlib import Path

from playwright.async_api import async_playwright


BASE_DIR = Path(__file__).resolve().parent
OUTPUT_FILE = BASE_DIR / "hero_base_stats.json"

BASE_URL = "https://mlbb.io/en/hero/{}"


# Hero yang umum/aktif di MLBB.
# URL slug akan dicoba satu per satu.
HEROES = [
    "akai",
    "alice",
    "aldous",
    "alucard",
    "angela",
    "argus",
    "arlott",
    "atlas",
    "aulus",
    "aurora",
    "badang",
    "balmond",
    "baxia",
    "beatrix",
    "bel erick",
    "benedetta",
    "belerick",
    "brody",
    "bruno",
    "carmilla",
    "cecilion",
    "change",
    "chip",
    "chou",
    "clint",
    "cyclops",
    "diggie",
    "dyrroth",
    "edith",
    "esmeralda",
    "estes",
    "eudora",
    "faramis",
    "floryn",
    "franco",
    "fredrinn",
    "freya",
    "gatotkaca",
    "gloo",
    "gord",
    "granger",
    "guinevere",
    "gusion",
    "hanabi",
    "hanzo",
    "harith",
    "harley",
    "hayabusa",
    "helcurt",
    "hilda",
    "hylos",
    "irithel",
    "ixia",
    "jawhead",
    "joy",
    "julian",
    "kadita",
    "kagura",
    "kaja",
    "karina",
    "karrie",
    "khaleed",
    "khufra",
    "kimmy",
    "lapu-lapu",
    "layla",
    "leomord",
    "lesley",
    "ling",
    "lolita",
    "luo-yi",
    "lunox",
    "lylia",
    "martis",
    "masha",
    "mathilda",
    "melissa",
    "minsitthar",
    "minotaur",
    "moskov",
    "nana",
    "natalia",
    "natan",
    "novaria",
    "odette",
    "paquito",
    "pharsa",
    "phoveus",
    "popol-and-kupa",
    "rafaela",
    "roger",
    "ruby",
    "saber",
    "selena",
    "silvanna",
    "sun",
    "terizla",
    "thamuz",
    "tigreal",
    "uranus",
    "vale",
    "valentina",
    "vexana",
    "wanwan",
    "xborg",
    "xavier",
    "yin",
    "yve",
    "yu-zhong",
    "zhask",
    "zetian",
    "zilong",
]


def clean_number(value):
    if value is None:
        return None

    value = str(value).strip()

    if not value:
        return None

    # 2,690 -> 2690
    value = value.replace(",", "")

    # Hilangkan karakter selain angka, titik dan minus
    value = re.sub(r"[^0-9.\-]", "", value)

    if not value:
        return None

    try:
        return float(value)
    except ValueError:
        return None


def normalize_name(name):
    return re.sub(r"\s+", " ", name).strip()


async def scrape_hero(page, slug):
    url = BASE_URL.format(slug)

    try:
        response = await page.goto(
            url,
            wait_until="domcontentloaded",
            timeout=30000,
        )

        if response is None:
            return None

        if response.status != 200:
            return None

        await page.wait_for_timeout(500)

        # Ambil nama hero dari heading
        hero_name = None

        selectors = [
            "h1",
            "h2",
            "[class*='hero-name']",
        ]

        for selector in selectors:
            try:
                text = await page.locator(selector).first.text_content()
                if text:
                    text = normalize_name(text)
                    if text:
                        hero_name = text
                        break
            except Exception:
                pass

        if not hero_name:
            hero_name = slug.replace("-", " ").title()

        # Cari tabel Base Stats
        tables = page.locator("table")

        table_count = await tables.count()

        base_table = None

        for i in range(table_count):
            table = tables.nth(i)

            text = await table.inner_text()

            if (
                "Base stats" in text
                or (
                    "HP" in text
                    and "Physical Attack" in text
                    and "Movement Speed" in text
                )
            ):
                base_table = table
                break

        if base_table is None:
            # Coba cari heading Base stats lalu table terdekat
            heading = page.get_by_text(
                "Base stats",
                exact=True,
            )

            if await heading.count() > 0:
                parent = heading.first.locator("xpath=..")

                nearby_tables = parent.locator("table")

                if await nearby_tables.count() > 0:
                    base_table = nearby_tables.first

        if base_table is None:
            return None

        rows = base_table.locator("tr")

        row_count = await rows.count()

        stats = {}

        for i in range(row_count):
            cells = rows.nth(i).locator("th, td")

            cell_count = await cells.count()

            if cell_count < 2:
                continue

            values = []

            for j in range(cell_count):
                value = await cells.nth(j).inner_text()
                values.append(normalize_name(value))

            stat_name = values[0]

            if stat_name.lower() in {
                "stat",
                "stats",
            }:
                continue

            lv1 = values[1] if len(values) >= 2 else None
            lv15 = values[2] if len(values) >= 3 else None
            per_level = values[3] if len(values) >= 4 else None

            key = stat_name.lower()

            key = key.replace(" ", "_")
            key = key.replace("-", "_")

            stats[key] = {
                "lv1": clean_number(lv1),
                "lv15": clean_number(lv15),
                "per_level": clean_number(per_level),
            }

        if not stats:
            return None

        result = {
            "hero_name": hero_name,
            "hero_slug": slug,
            "hero_url": url,

            "hp": stats.get("hp", {}),
            "mana": stats.get("mana", {}),
            "hp_regen": stats.get("hp_regen", {}),
            "mana_regen": stats.get("mana_regen", {}),
            "energy": stats.get("energy", {}),
            "energy_regen": stats.get("energy_regen", {}),
            "physical_attack": stats.get("physical_attack", {}),
            "physical_defense": stats.get("physical_defense", {}),
            "magic_defense": stats.get("magic_defense", {}),
            "attack_speed": stats.get("attack_speed", {}),
            "movement_speed": stats.get("movement_speed", {}),
        }

        return result

    except Exception as e:
        print(f"      [WARN] {slug}: {e}")
        return None


async def main():
    print("=" * 64)
    print("MPL ANALYTIC - HERO BASE STATS")
    print("=" * 64)

    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        page = await browser.new_page()

        total = len(HEROES)

        for index, slug in enumerate(HEROES, start=1):
            print(
                f"[{index:3d}/{total}] "
                f"{slug}"
            )

            result = await scrape_hero(page, slug)

            if result:
                results.append(result)
                print(
                    f"      ✓ {result['hero_name']}"
                )
            else:
                print(
                    f"      ✗ data tidak ditemukan"
                )

        await browser.close()

    # Hilangkan duplicate hero berdasarkan slug
    unique = {}

    for row in results:
        unique[row["hero_slug"]] = row

    results = list(unique.values())

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            results,
            f,
            ensure_ascii=False,
            indent=2,
        )

    print()
    print("=" * 64)
    print(
        f"[OK] hero_base_stats.json dibuat - "
        f"{len(results)} hero"
    )
    print(
        f"     {OUTPUT_FILE}"
    )
    print("=" * 64)


if __name__ == "__main__":
    asyncio.run(main())
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = "https://mlbb.io"
STATS_URL = f"{BASE_URL}/en/hero-statistics"

OUTPUT_STATS = Path("hero_statistics.json")
OUTPUT_COUNTERS = Path("hero_counters.json")


def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


def to_number(value):
    if value is None:
        return None

    value = clean(value)

    # 59.32%
    match = re.search(r"(-?\d+(?:\.\d+)?)\s*%", value)

    if match:
        return float(match.group(1))

    # +5.1%
    match = re.search(r"(-?\d+(?:\.\d+)?)", value)

    if match:
        return float(match.group(1))

    return None


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
        url
    )

    return match.group(1) if match else None


def extract_hero_stats(page):
    print()
    print("[1/3] Scraping hero statistics...")
    print(STATS_URL)

    page.goto(
        STATS_URL,
        wait_until="networkidle",
        timeout=60_000
    )

    page.wait_for_timeout(1500)

    heroes = []

    # Statistik page berupa table.
    rows = page.locator("table tbody tr")

    row_count = rows.count()

    print(f"[INFO] Table rows: {row_count}")

    for i in range(row_count):
        row = rows.nth(i)

        cells = row.locator("td")

        if cells.count() < 5:
            continue

        text = clean(row.inner_text())

        # Cari link hero.
        links = row.locator(
            'a[href*="/en/hero/"]'
        )

        if links.count() == 0:
            continue

        hero_link = links.first

        href = hero_link.get_attribute("href")

        hero_slug = hero_slug_from_url(href)

        if not hero_slug:
            continue

        # Hero name.
        hero_name = clean(
            hero_link.inner_text()
        )

        if not hero_name:
            image = row.locator("img")

            if image.count():
                hero_name = clean(
                    image.first.get_attribute("alt")
                    or ""
                )

        # Ambil semua cell text.
        cell_texts = []

        for c in range(cells.count()):
            cell_texts.append(
                clean(
                    cells.nth(c).inner_text()
                )
            )

        # Struktur yang saat ini terlihat:
        #
        # Rank
        # Image + Hero Name
        # Win Rate
        # Pick Rate
        # Ban Rate
        # Role
        # Lane
        # Speciality
        #
        # Kita tetap mencari angka berdasarkan
        # posisi yang tersedia.

        win_rate = None
        pick_rate = None
        ban_rate = None

        percentage_values = []

        for cell in cell_texts:
            matches = re.findall(
                r"-?\d+(?:\.\d+)?\s*%",
                cell
            )

            for match in matches:
                percentage_values.append(
                    to_number(match)
                )

        if len(percentage_values) >= 1:
            win_rate = percentage_values[0]

        if len(percentage_values) >= 2:
            pick_rate = percentage_values[1]

        if len(percentage_values) >= 3:
            ban_rate = percentage_values[2]

        role = None
        lane = None
        speciality = None

        role_names = [
            "Tank",
            "Fighter",
            "Assassin",
            "Mage",
            "Marksman",
            "Support",
        ]

        lane_names = [
            "Exp Lane",
            "Jungle",
            "Mid Lane",
            "Gold Lane",
            "Roam",
        ]

        for cell in cell_texts:
            for role_name in role_names:
                if role_name in cell:
                    role = cell
                    break

            if role:
                break

        for cell in cell_texts:
            for lane_name in lane_names:
                if lane_name in cell:
                    lane = cell
                    break

            if lane:
                break

        # Speciality biasanya cell terakhir.
        if len(cell_texts) >= 8:
            speciality = cell_texts[-1]

        heroes.append({
            "hero_id": hero_slug,
            "hero_name": hero_name,
            "hero_url": absolute_url(href),
            "win_rate": win_rate,
            "pick_rate": pick_rate,
            "ban_rate": ban_rate,
            "role": role,
            "lane": lane,
            "speciality": speciality,
            "source": STATS_URL,
        })

    # Deduplicate.
    unique = {}

    for hero in heroes:
        unique[hero["hero_id"]] = hero

    heroes = list(unique.values())

    heroes.sort(
        key=lambda x: x["hero_name"].lower()
    )

    print(
        f"[OK] Unique heroes: {len(heroes)}"
    )

    return heroes


def extract_counter_section(page, hero_slug):
    """
    Extract counter data dari:
        /en/hero/{hero_slug}/counter

    Tidak membuat ranking sendiri.
    Urutan yang tampil di website dipertahankan.
    """

    url = (
        f"{BASE_URL}/en/hero/"
        f"{hero_slug}/counter"
    )

    page.goto(
        url,
        wait_until="networkidle",
        timeout=60_000
    )

    page.wait_for_timeout(700)

    body_text = clean(
        page.locator("body").inner_text()
    )

    counters = []
    strong_against = []

    # --------------------------------------------------
    # COUNTERS
    # --------------------------------------------------

    # Cari heading "Which heroes counter..."
    counter_heading = page.locator(
        "h2, h3"
    ).filter(
        has_text=re.compile(
            r"Which heroes counter",
            re.I
        )
    )

    if counter_heading.count():
        heading = counter_heading.first

        # Container terdekat.
        container = heading.locator(
            "xpath=.."
        )

        links = container.locator(
            'a[href*="/en/hero/"]'
        )

        for i in range(links.count()):
            link = links.nth(i)

            href = link.get_attribute("href")

            slug = hero_slug_from_url(href)

            if not slug or slug == hero_slug:
                continue

            text = clean(
                link.inner_text()
            )

            advantage = None

            match = re.search(
                r"([+-]\d+(?:\.\d+)?)\s*%",
                text
            )

            if match:
                advantage = float(
                    match.group(1)
                )

            counters.append({
                "hero_id": slug,
                "hero_name": text,
                "hero_url": absolute_url(href),
                "win_rate_advantage": advantage,
            })

    # --------------------------------------------------
    # FALLBACK:
    # cari hero links dari bagian page bila selector
    # heading/container berbeda.
    # --------------------------------------------------

    if not counters:

        # Ambil semua hero links.
        all_links = page.locator(
            'a[href*="/en/hero/"]'
        )

        seen = set()

        for i in range(
            min(all_links.count(), 50)
        ):
            link = all_links.nth(i)

            href = link.get_attribute("href")

            slug = hero_slug_from_url(href)

            if not slug:
                continue

            if slug == hero_slug:
                continue

            if slug in seen:
                continue

            text = clean(
                link.inner_text()
            )

            if not text:
                continue

            seen.add(slug)

            counters.append({
                "hero_id": slug,
                "hero_name": text,
                "hero_url": absolute_url(href),
                "win_rate_advantage": None,
            })

    # --------------------------------------------------
    # STRONG AGAINST
    # --------------------------------------------------

    strong_heading = page.locator(
        "h2, h3"
    ).filter(
        has_text=re.compile(
            r"Strong Against",
            re.I
        )
    )

    if strong_heading.count():
        heading = strong_heading.first

        container = heading.locator(
            "xpath=.."
        )

        links = container.locator(
            'a[href*="/en/hero/"]'
        )

        for i in range(links.count()):
            link = links.nth(i)

            href = link.get_attribute("href")

            slug = hero_slug_from_url(href)

            if not slug or slug == hero_slug:
                continue

            text = clean(
                link.inner_text()
            )

            advantage = None

            match = re.search(
                r"([+-]\d+(?:\.\d+)?)\s*%",
                text
            )

            if match:
                advantage = float(
                    match.group(1)
                )

            strong_against.append({
                "hero_id": slug,
                "hero_name": text,
                "hero_url": absolute_url(href),
                "win_rate_advantage": advantage,
            })

    return {
        "counters": counters,
        "strong_against": strong_against,
    }


def scrape_counters(page, heroes):
    print()
    print("[2/3] Scraping counter pick data...")
    print(
        f"[INFO] Heroes to process: "
        f"{len(heroes)}"
    )

    results = []

    for index, hero in enumerate(
        heroes,
        start=1
    ):
        hero_id = hero["hero_id"]

        print(
            f"[{index}/{len(heroes)}] "
            f"{hero['hero_name']}"
        )

        try:
            data = extract_counter_section(
                page,
                hero_id
            )

            results.append({
                "hero_id": hero_id,
                "hero_name": hero["hero_name"],
                "hero_url": hero["hero_url"],
                "counters": data["counters"],
                "strong_against": data[
                    "strong_against"
                ],
                "source": (
                    f"{BASE_URL}/en/hero/"
                    f"{hero_id}/counter"
                ),
            })

        except Exception as e:
            print(
                f"  [ERROR] {e}"
            )

            results.append({
                "hero_id": hero_id,
                "hero_name": hero["hero_name"],
                "hero_url": hero["hero_url"],
                "counters": [],
                "strong_against": [],
                "source": (
                    f"{BASE_URL}/en/hero/"
                    f"{hero_id}/counter"
                ),
                "error": str(e),
            })

    return results


def validate_statistics(heroes):
    print()
    print("=" * 80)
    print("VALIDATION HERO STATISTICS")
    print("=" * 80)

    print(
        f"Total heroes : {len(heroes)}"
    )

    missing_name = [
        x for x in heroes
        if not x["hero_name"]
    ]

    missing_stats = [
        x for x in heroes
        if x["win_rate"] is None
    ]

    duplicate_ids = {}

    for hero in heroes:
        duplicate_ids.setdefault(
            hero["hero_id"],
            0
        )
        duplicate_ids[
            hero["hero_id"]
        ] += 1

    duplicates = {
        k: v
        for k, v in duplicate_ids.items()
        if v > 1
    }

    print(
        f"Missing name  : {len(missing_name)}"
    )

    print(
        f"Missing WR    : {len(missing_stats)}"
    )

    print(
        f"Duplicate IDs : {len(duplicates)}"
    )

    if heroes:
        print()
        print("Sample:")

        for hero in heroes[:10]:
            print(
                f"{hero['hero_name']} | "
                f"WR {hero['win_rate']} | "
                f"Pick {hero['pick_rate']} | "
                f"Ban {hero['ban_rate']}"
            )


def validate_counters(counters):
    print()
    print("=" * 80)
    print("VALIDATION HERO COUNTERS")
    print("=" * 80)

    print(
        f"Hero pages : {len(counters)}"
    )

    empty = [
        x for x in counters
        if not x["counters"]
    ]

    print(
        f"Empty counter pages : {len(empty)}"
    )

    if counters:
        print()
        print("Sample:")

        for hero in counters[:5]:
            print(
                f"{hero['hero_name']} -> "
                f"{len(hero['counters'])} counters | "
                f"{len(hero['strong_against'])} strong against"
            )


def main():

    print("=" * 80)
    print("MLBB.IO HERO STATISTICS + COUNTER PICK SCRAPER")
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

        # ------------------------------------------
        # HERO STATISTICS
        # ------------------------------------------

        heroes = extract_hero_stats(page)

        # ------------------------------------------
        # COUNTERS
        # ------------------------------------------

        counters = scrape_counters(
            page,
            heroes
        )

        browser.close()

    # ------------------------------------------
    # VALIDATION
    # ------------------------------------------

    validate_statistics(heroes)
    validate_counters(counters)

    # ------------------------------------------
    # WRITE HERO STATISTICS
    # ------------------------------------------

    stats_output = {
        "metadata": {
            "source": STATS_URL,
            "source_type": "mlbb.io",
            "scraped_at": (
                datetime.now(timezone.utc)
                .isoformat()
            ),
            "total_heroes": len(heroes),
        },
        "heroes": heroes,
    }

    OUTPUT_STATS.write_text(
        json.dumps(
            stats_output,
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )

    # ------------------------------------------
    # WRITE COUNTERS
    # ------------------------------------------

    counter_output = {
        "metadata": {
            "source": BASE_URL,
            "source_type": "mlbb.io",
            "scraped_at": (
                datetime.now(timezone.utc)
                .isoformat()
            ),
            "total_heroes": len(counters),
        },
        "heroes": counters,
    }

    OUTPUT_COUNTERS.write_text(
        json.dumps(
            counter_output,
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )

    print()
    print("[3/3] Writing JSON...")

    print(
        f"[OK] {OUTPUT_STATS.resolve()}"
    )

    print(
        f"[OK] {OUTPUT_COUNTERS.resolve()}"
    )

    print()
    print("=" * 80)
    print("SELESAI")
    print("=" * 80)


if __name__ == "__main__":
    main()
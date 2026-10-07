import json
import re
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright


URL = "https://mlbb.io/en/heroes"
OUTPUT_FILE = Path("heroes.json")


def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


def slugify(value):
    value = clean(value).lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def scrape_heroes():
    print("=" * 80)
    print("MLBB.IO - HERO SCRAPER")
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

        print()
        print("[1/4] Opening:")
        print(URL)

        page.goto(
            URL,
            wait_until="networkidle",
            timeout=60_000,
        )

        print("[OK] Page loaded")

        # Tunggu daftar hero muncul.
        page.wait_for_timeout(2000)

        print()
        print("[2/4] Extracting hero cards...")

        heroes = []

        # Cari link hero.
        #
        # Contoh URL yang terlihat pada mlbb.io:
        # /en/hero/aamon
        # /en/hero/akai
        # /en/hero/aldous
        hero_links = page.locator(
            'a[href*="/en/hero/"]'
        )

        count = hero_links.count()

        print(f"[INFO] Hero links found: {count}")

        seen = set()

        for i in range(count):
            link = hero_links.nth(i)

            href = link.get_attribute("href")

            if not href:
                continue

            match = re.search(
                r"/en/hero/([^/?#]+)",
                href
            )

            if not match:
                continue

            hero_slug = match.group(1)

            if hero_slug in seen:
                continue

            seen.add(hero_slug)

            # Ambil seluruh text card.
            text = clean(
                link.inner_text()
            )

            # Nama hero biasanya berada pada heading/text
            # di dalam card.
            name = None

            heading = link.locator(
                "h2, h3, h4"
            )

            if heading.count() > 0:
                name = clean(
                    heading.first.inner_text()
                )

            if not name:
                # Fallback dari alt image.
                image = link.locator("img")

                if image.count() > 0:
                    alt = image.first.get_attribute(
                        "alt"
                    )

                    if alt:
                        name = clean(
                            re.sub(
                                r"^(Image:\s*)",
                                "",
                                alt,
                                flags=re.I,
                            )
                        )

            if not name:
                # Fallback terakhir:
                # gunakan slug.
                name = hero_slug.replace(
                    "-",
                    " "
                ).title()

            # Hero image
            image_url = None

            image = link.locator("img")

            if image.count() > 0:
                image_url = (
                    image.first.get_attribute("src")
                    or image.first.get_attribute(
                        "data-src"
                    )
                )

            # Bersihkan URL relatif.
            if image_url and image_url.startswith("/"):
                image_url = (
                    "https://mlbb.io"
                    + image_url
                )

            # Coba ekstrak role/lane dari text card.
            role = None
            lane = None

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

            for role_name in role_names:
                if re.search(
                    rf"\b{re.escape(role_name)}\b",
                    text,
                    re.I,
                ):
                    role = role_name
                    break

            for lane_name in lane_names:
                if re.search(
                    rf"\b{re.escape(lane_name)}\b",
                    text,
                    re.I,
                ):
                    lane = lane_name
                    break

            heroes.append({
                "hero_id": hero_slug,
                "hero_name": name,
                "hero_slug": hero_slug,
                "hero_url": (
                    href
                    if href.startswith("http")
                    else "https://mlbb.io" + href
                ),
                "image_url": image_url,
                "role": role,
                "lane": lane,
                "source": "mlbb.io",
            })

        browser.close()

    # Deduplicate berdasarkan hero_id.
    unique = {}

    for hero in heroes:
        unique[hero["hero_id"]] = hero

    heroes = list(unique.values())

    heroes.sort(
        key=lambda x: x["hero_name"].lower()
    )

    print()
    print("[3/4] Validation...")
    print(f"Heroes found : {len(heroes)}")

    # Cek duplicate
    ids = [
        hero["hero_id"]
        for hero in heroes
    ]

    duplicate_ids = {
        x for x in ids
        if ids.count(x) > 1
    }

    if duplicate_ids:
        print(
            "[WARNING] Duplicate hero IDs:",
            duplicate_ids
        )
    else:
        print("[OK] No duplicate hero IDs")

    # Sample
    print()
    print("Sample heroes:")

    for hero in heroes[:15]:
        print(
            f"- {hero['hero_name']} | "
            f"{hero['role']} | "
            f"{hero['lane']} | "
            f"{hero['hero_id']}"
        )

    output = {
        "metadata": {
            "source": URL,
            "source_type": "mlbb.io",
            "scraped_at": (
                datetime.now(timezone.utc)
                .isoformat()
            ),
            "total_heroes": len(heroes),
        },
        "heroes": heroes,
    }

    print()
    print("[4/4] Writing JSON...")

    OUTPUT_FILE.write_text(
        json.dumps(
            output,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
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
    scrape_heroes()
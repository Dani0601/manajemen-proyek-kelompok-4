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
    print("MLBB.IO - HERO SCRAPER (S18)")
    print("=" * 80)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            viewport={"width": 1440, "height": 1200},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 "
                "(KHTML, like Gecko) "
                "Chrome/140.0.0.0 Safari/537.36"
            ),
        )

        print()
        print("[1/4] Opening:", URL)
        page.goto(URL, wait_until="networkidle", timeout=60_000)
        print("[OK] Page loaded")
        page.wait_for_timeout(2000)

        print()
        print("[2/4] Extracting hero cards...")
        heroes = []

        hero_links = page.locator('a[href*="/en/hero/"]')
        count = hero_links.count()
        print(f"[INFO] Hero links found: {count}")

        seen = set()

        for i in range(count):
            link = hero_links.nth(i)
            href = link.get_attribute("href")
            if not href:
                continue

            match = re.search(r"/en/hero/([^/?#]+)", href)
            if not match:
                continue

            hero_slug = match.group(1)
            if hero_slug in seen:
                continue
            seen.add(hero_slug)

            text = clean(link.inner_text())

            # Nama hero dari heading
            name = None
            heading = link.locator("h2, h3, h4")
            if heading.count() > 0:
                name = clean(heading.first.inner_text())

            # Fallback dari alt image
            if not name:
                image = link.locator("img")
                if image.count() > 0:
                    alt = image.first.get_attribute("alt")
                    if alt:
                        name = clean(re.sub(r"^(Image:\s*)", "", alt, flags=re.I))

            # Fallback dari slug
            if not name:
                name = hero_slug.replace("-", " ").title()

            # Hero image - ambil src lengkap, tidak null
            image_url = ""
            image = link.locator("img")
            if image.count() > 0:
                raw_src = (
                    image.first.get_attribute("src")
                    or image.first.get_attribute("data-src")
                    or ""
                )
                if raw_src:
                    if raw_src.startswith("/"):
                        raw_src = "https://mlbb.io" + raw_src
                    image_url = raw_src

            # Fallback image URL pakai scoregg CDN
            if not image_url:
                image_url = f"https://mlbb-image.scoregg.com/hero_h/{hero_slug}.png"

            # Role / lane
            role = ""
            lane = ""
            role_names = ["Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"]
            lane_names = ["Exp Lane", "Jungle", "Mid Lane", "Gold Lane", "Roam"]

            for role_name in role_names:
                if re.search(rf"\b{re.escape(role_name)}\b", text, re.I):
                    role = role_name
                    break

            for lane_name in lane_names:
                if re.search(rf"\b{re.escape(lane_name)}\b", text, re.I):
                    lane = lane_name
                    break

            full_url = (
                href if href.startswith("http")
                else "https://mlbb.io" + href
            )

            heroes.append({
                "hero_id": hero_slug,
                "hero_name": name,
                "hero_slug": hero_slug,
                "hero_url": full_url,
                "image_url": image_url,  # tidak null/kosong
                "role": role,
                "lane": lane,
                "source": "mlbb.io",
            })

        browser.close()

    # Deduplicate
    unique = {}
    for hero in heroes:
        unique[hero["hero_id"]] = hero
    heroes = list(unique.values())
    heroes.sort(key=lambda x: x["hero_name"].lower())

    print()
    print("[3/4] Validation...")
    print(f"Heroes found: {len(heroes)}")

    # Pastikan tidak ada null di field penting
    null_count = 0
    for hero in heroes:
        for key in ["hero_name", "hero_slug", "hero_url", "image_url", "role"]:
            if not hero.get(key):
                hero[key] = hero.get(key) or ""
                null_count += 1
    if null_count:
        print(f"[WARN] {null_count} field kosong diperbaiki dengan string kosong")
    else:
        print("[OK] Tidak ada field null")

    # Sample
    print()
    print("Sample heroes:")
    for hero in heroes[:10]:
        print(f"  - {hero['hero_name']} | {hero['role']} | {hero['image_url'][:50]}...")

    output = {
        "metadata": {
            "source": URL,
            "source_type": "mlbb.io",
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "total_heroes": len(heroes),
        },
        "heroes": heroes,
    }

    print()
    print("[4/4] Writing JSON...")
    OUTPUT_FILE.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[OK] Saved: {OUTPUT_FILE.resolve()}")
    print()
    print("=" * 80)
    print("SCRAPING SELESAI")
    print("=" * 80)


if __name__ == "__main__":
    scrape_heroes()
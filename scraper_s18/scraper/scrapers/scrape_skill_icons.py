"""
Scraper untuk mengambil skill icon URLs dari Fandom Wiki MLBB menggunakan API.
Kemudian mengupdate kolom skill_icon_url di tabel hero_skills.
"""

import sys
import io
import requests
import mysql.connector
import time
import json

# Force UTF-8 stdout to avoid cp1252 encoding errors on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

DB_CONFIG = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "",
    "database": "mpl_analytic",
    "charset": "utf8mb4",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

FANDOM_API = "https://mobile-legends.fandom.com/api.php"

# Kata kunci yang BUKAN skill icon
NON_SKILL_KEYWORDS = [
    "basic attack", "battle points", "diamond", "exp lane", "gold lane",
    "game profile", "fighter icon", "mage icon", "support icon",
    "marksman icon", "assassin icon", "tank icon", "roamer icon",
    "jungle icon", "gold icon", "exp icon", "elite skin tag",
    "ducati skin tag", "starlight skin tag", "collector skin tag",
    "special skin tag", "limited skin tag",
    "battle emote",  # emotes bukan skill icon
    "comic", "lore", "trailer", "profile", "lethalnexus",
]

# Mapping slug DB → nama halaman wiki Fandom
WIKI_NAME_OVERRIDES = {
    "yi_sun_shin": "Yi Sun-shin",
    "chang_e": "Chang'e",
    "change": "Chang'e",
    "luo_yi": "Luo Yi",
    "zetian": "Wu Zetian",
    "xborg": "X.Borg",
    "yu_zhong": "Yu Zhong",
    "wan_wan": "Wan Wan",
}


def slug_to_wiki_name(slug: str) -> str:
    if slug in WIKI_NAME_OVERRIDES:
        return WIKI_NAME_OVERRIDES[slug]
    return slug.replace("_", " ").replace("-", " ").title()


def is_likely_skill_icon(title: str) -> bool:
    t = title.lower()
    # Skip JPG files (usually skins/portraits)
    if t.endswith(".jpg") or t.endswith(".jpeg"):
        return False
    # Skip generic hero icons
    if "hero" in t and ("-icon" in t or "-portrait" in t):
        return False
    # Skip common non-skill items
    if any(kw in t for kw in NON_SKILL_KEYWORDS):
        return False
    # Must be PNG
    if not t.endswith(".png"):
        return False
    return True


def get_page_images(wiki_name: str) -> list:
    """Dapatkan semua nama gambar dari halaman wiki hero"""
    params = {
        "action": "query",
        "titles": wiki_name,
        "prop": "images",
        "imlimit": "50",
        "format": "json",
    }
    try:
        resp = requests.get(FANDOM_API, params=params, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        pages = data.get("query", {}).get("pages", {})
        for page_id, page in pages.items():
            if page_id == "-1":
                print(f"    [WARN] Wiki page not found: {wiki_name!r}")
                return []
            imgs = page.get("images", [])
            return [img["title"] for img in imgs]
    except Exception as e:
        print(f"    [ERROR] get_page_images failed: {e}")
    return []


def get_image_urls(file_titles: list) -> dict:
    """Dapatkan URL dari daftar file gambar menggunakan imageinfo API"""
    if not file_titles:
        return {}

    # Batasi 20 file per request
    titles_str = "|".join(file_titles[:20])
    params = {
        "action": "query",
        "titles": titles_str,
        "prop": "imageinfo",
        "iiprop": "url",
        "format": "json",
    }

    try:
        resp = requests.get(FANDOM_API, params=params, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        pages = data.get("query", {}).get("pages", {})

        result = {}
        for page_id, page in pages.items():
            title = page.get("title", "")
            imginfo = page.get("imageinfo", [])
            if imginfo:
                url = imginfo[0].get("url", "")
                if url:
                    # Bersihkan URL (hapus revision hash agar URL tetap valid)
                    clean_url = url.split("/revision/")[0]
                    result[title] = clean_url
        return result
    except Exception as e:
        print(f"    [ERROR] get_image_urls failed: {e}")
    return {}


def fetch_skill_icons(hero_slug: str, skill_count: int = 4) -> list:
    """Ambil skill icon URLs untuk hero tertentu."""
    wiki_name = slug_to_wiki_name(hero_slug)

    # Step 1: Dapatkan semua gambar dari halaman wiki
    all_images = get_page_images(wiki_name)
    if not all_images:
        return []

    # Step 2: Filter skill images
    skill_images = [img for img in all_images if is_likely_skill_icon(img)]

    if not skill_images:
        all_png = [i for i in all_images if i.lower().endswith(".png")]
        print(f"    [WARN] No skill images after filter. PNG files: {[i.split(':')[-1] for i in all_png]}")
        return []

    # Step 3: Dapatkan URL dari file-file tersebut
    url_map = get_image_urls(skill_images)

    # Ambil URL sesuai urutan
    icons = [url_map[title] for title in skill_images if title in url_map]

    print(f"    -> {len(skill_images)} skill imgs, {len(icons)} URLs resolved: {[t.split(':')[-1] for t in skill_images]}")

    return icons[:skill_count]


def get_heroes_from_db(conn) -> list:
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT source_hero_id
        FROM hero_skills
        WHERE skill_icon_url IS NULL
        ORDER BY source_hero_id
    """)
    rows = cursor.fetchall()
    cursor.close()
    return [r[0] for r in rows]


def get_skills_for_hero(conn, hero_slug: str) -> list:
    cursor = conn.cursor()
    cursor.execute("""
        SELECT hero_skill_id, skill_position, skill_type
        FROM hero_skills
        WHERE source_hero_id = %s
        ORDER BY skill_position
    """, (hero_slug,))
    rows = cursor.fetchall()
    cursor.close()
    return rows


def update_skill_icon(conn, hero_skill_id: int, icon_url: str):
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE hero_skills SET skill_icon_url = %s WHERE hero_skill_id = %s
    """, (icon_url, hero_skill_id))
    conn.commit()
    cursor.close()


def main():
    conn = mysql.connector.connect(**DB_CONFIG)
    heroes = get_heroes_from_db(conn)
    print(f"Total hero yang perlu diupdate: {len(heroes)}")

    updated_heroes = 0
    skipped_heroes = 0
    total_updated = 0
    results = {}

    for idx, hero_slug in enumerate(heroes):
        print(f"\n[{idx+1}/{len(heroes)}] Processing: {hero_slug}")

        skills = get_skills_for_hero(conn, hero_slug)
        icons = fetch_skill_icons(hero_slug, skill_count=len(skills))

        if not icons:
            print(f"  [SKIP] No icons found for {hero_slug}")
            skipped_heroes += 1
            results[hero_slug] = {"status": "skipped", "icons": []}
            time.sleep(0.5)
            continue

        hero_updated = 0
        hero_icons = []
        for i, (skill_id, skill_pos, skill_type) in enumerate(skills):
            if i < len(icons):
                icon_url = icons[i]
                update_skill_icon(conn, skill_id, icon_url)
                print(f"    [OK] pos={skill_pos} ({skill_type}) -> ...{icon_url[-50:]}")
                total_updated += 1
                hero_updated += 1
                hero_icons.append(icon_url)
            else:
                print(f"    [--] pos={skill_pos} ({skill_type}) -> No icon available")

        if hero_updated > 0:
            updated_heroes += 1
        results[hero_slug] = {
            "status": "updated",
            "count": hero_updated,
            "icons": hero_icons,
        }

        time.sleep(1.0)

    conn.close()

    # Simpan hasil ke file JSON
    with open("skill_icons_result.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*50}")
    print(f"=== SELESAI ===")
    print(f"Hero berhasil diupdate  : {updated_heroes}")
    print(f"Hero dilewati (no icon) : {skipped_heroes}")
    print(f"Total skill diupdate    : {total_updated}")
    print(f"Hasil disimpan ke       : skill_icons_result.json")


if __name__ == "__main__":
    main()

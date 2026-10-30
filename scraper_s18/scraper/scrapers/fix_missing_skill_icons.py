"""
Script untuk mengisi skill_icon_url yang masih NULL menggunakan
pencarian nama file skill langsung dari Fandom Wiki API.
"""
import sys
import io
import requests
import mysql.connector

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

DB_CONFIG = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "",
    "database": "mpl_analytic",
    "charset": "utf8mb4",
}

HEADERS = {"User-Agent": "Mozilla/5.0 Chrome/124.0.0.0"}
FANDOM_API = "https://mobile-legends.fandom.com/api.php"

# Mapping: source_hero_id -> [passive, skill1, skill2, ultimate] skill file names on Fandom Wiki
HERO_SKILL_FILES = {
    "karrie": [
        "Lightwheel Mark.png",
        "Spinning Lightwheel.png",
        "Phantom Step.png",
        "Maximum Lightwheel.png",
    ],
    "kagura": [
        "Seimei Umbrella Open.png",
        "Seimei Umbrella Open.png",
        "Yin Yang Overturn.png",
        "Yin Yang Overturn.png",
    ],
    "cyclops": [
        "Cyclops Planets Attack.png",
        "Stardust Shock.png",
        "Planets Attack.png",
        "Star Power Lockdown.png",
    ],
    "hylos": [
        "Hylos Centaur's Fury.png",
        "Law and Order.png",
        "Ring of Punishment.png",
        "Glorious Pathway.png",
    ],
    "kagura": [
        "Seimei Umbrella Open.png",
        "Rasho Umbrella Flee.png",
        "Yin Yang Overturn.png",
        "Yin Yang Overturn.png",
    ],
    "kaja": [
        "Eye of the Storm.png",
        "Ring of Order.png",
        "Gale Force.png",
        "Divine Judgment.png",
    ],
    "khufra": [
        "Spell Curse.png",
        "Tyrant's Revenge.png",
        "Tyrant's Rage.png",
        "Tyrant's Rage.png",
    ],
    "rafaela": [
        "Divine Resurrection.png",
        "Light of Retribution.png",
        "Holy Healing.png",
        "Holy Baptism.png",
    ],
    "uranus": [
        "Radiance.png",
        "Ionic Edge.png",
        "Transcendent Ward.png",
        "Consecration.png",
    ],
    "vale": [
        "Windtalk.png",
        "Windblow.png",
        "Windvane.png",
        "Windstorm.png",
    ],
    "lapu-lapu": [
        "Bravest Fighter.png",
        "Jungle Warrior.png",
        "Land of Origin.png",
        "Chieftain's Rage.png",
    ],
    "popol-and-kupa": [
        "We Are Allies.png",
        "Bite 'em, Kupa!.png",
        "Kupa, Help!.png",
        "Full Moon.png",
    ],
    "yi-sun-shin": [
        "Blood Floods.png",
        "Blood Floods.png",
        "Glaive.png",
        "Mountain Shocker.png",
    ],
    "zetian": [
        "Cruel Sentence.png",
        "Cruel Sentence.png",
        "Sacred Relic.png",
        "Penal Peak.png",
    ],
    "hirara": [
        "Demonic Force.png",
        "Spin Around.png",
        "Rocket Launcher.png",
        "Super Vroom.png",
    ],
    "freya": [
        "Power of Einherjar.png",
        "Leap of Faith.png",
        "Valkyrie's Spirit.png",
        "Spirit Combo.png",
    ],
    "jawhead": [
        "Mecha Suppression.png",
        "Smart Missiles.png",
        "Ejector.png",
        "Unstoppable Force.png",
    ],
    "kadita": [
        "Ocean Oddity.png",
        "Thalassophobia.png",
        "Breath of the Ocean.png",
        "Rough Waves.png",
    ],
    "khaleed": [
        "Sand Walk.png",
        "Desert Tornado.png",
        "Quicksand Guard.png",
        "Rampaging Heatwave.png",
    ],
    "minotaur": [
        "Rage.png",
        "Despair Stomp.png",
        "Motivation Roar.png",
        "Minoan Fury.png",
    ],
    "natalia": [
        "Assassin Instinct.png",
        "Claw Dash.png",
        "Cold-Blooded Strangling.png",
        "The Hunt.png",
    ],
    "yve": [
        "Galactic Power.png",
        "Void Crystal.png",
        "Void Crystal.png",
        "Real World Manipulation.png",
    ],
    "zilong": [
        "Dragon Flurry.png",
        "Spear Flip.png",
        "Spear Strike.png",
        "Supreme Warrior.png",
    ],
    "estes": [
        "Scripture of the Moon Elf.png",
        "Moonlight Immersion.png",
        "Domain of Moon Goddess.png",
        "Blessing of the Moon Goddess.png",
    ],
    "harith": [
        "Chrono Dash.png",
        "Synchro Fission.png",
        "Chrono Dash.png",
        "Lost Time.png",
    ],
    "odette": [
        "Lakeshore Ambiance.png",
        "Magic Barrier.png",
        "Lakeshore Ambiance.png",
        "Swan Lake.png",
    ],
    "gord": [
        "Mystic Favor.png",
        "Mystic Projectile.png",
        "Mystic Injunction.png",
        "Mystic Gush.png",
    ],
    "aulus": [
        "Fighting Spirit.png",
        "Aulus, Charge!.png",
        "Cleaving Axe.png",
        "Undying Fury.png",
    ],
    "belerick": [
        "Ancient Seed.png",
        "Deadly Thorns.png",
        "Growth.png",
        "Wrath of Dryad.png",
    ],
    "faramis": [
        "Soul Shatter.png",
        "Shadow Stampede.png",
        "Ghost Bursters.png",
        "Circle of Punishment.png",
    ],
}


def get_image_urls_by_file(file_names: list) -> dict:
    """Dapatkan URL dari nama file gambar yang spesifik"""
    titles = [f"File:{name}" for name in file_names]
    titles_str = "|".join(titles[:20])
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
                    clean_url = url.split("/revision/")[0]
                    # Key by file name (without "File:" prefix)
                    file_name = title.replace("File:", "")
                    result[file_name] = clean_url
        return result
    except Exception as e:
        print(f"  [ERROR] {e}")
    return {}


def get_skills_needing_update(conn, hero_slug: str) -> list:
    cursor = conn.cursor()
    cursor.execute("""
        SELECT hero_skill_id, skill_position, skill_type
        FROM hero_skills
        WHERE source_hero_id = %s AND skill_icon_url IS NULL
        ORDER BY skill_position
    """, (hero_slug,))
    rows = cursor.fetchall()
    cursor.close()
    return rows


def update_skill_icon(conn, hero_skill_id: int, icon_url: str):
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE hero_skills SET skill_icon_url = %s WHERE hero_skill_id = %s",
        (icon_url, hero_skill_id),
    )
    conn.commit()
    cursor.close()


def main():
    conn = mysql.connector.connect(**DB_CONFIG)
    total_updated = 0

    for hero_slug, skill_files in HERO_SKILL_FILES.items():
        skills_needing = get_skills_needing_update(conn, hero_slug)
        if not skills_needing:
            print(f"[SKIP] {hero_slug} - all skills already have icons")
            continue

        print(f"\n[{hero_slug}] {len(skills_needing)} skills need icons")

        # Get all skill files (including duplicates - one per skill position)
        url_map = get_image_urls_by_file(list(set(skill_files)))

        for i, (skill_id, skill_pos, skill_type) in enumerate(skills_needing):
            # Map skill position to file index
            pos_idx = skill_pos - 1  # pos 1-4 -> index 0-3
            if pos_idx < len(skill_files):
                file_name = skill_files[pos_idx]
                icon_url = url_map.get(file_name)
                if icon_url:
                    update_skill_icon(conn, skill_id, icon_url)
                    print(f"  [OK] pos={skill_pos} ({skill_type}) -> {file_name}")
                    total_updated += 1
                else:
                    print(f"  [--] pos={skill_pos} ({skill_type}) -> {file_name} NOT FOUND on wiki")
            else:
                print(f"  [--] pos={skill_pos} ({skill_type}) -> no file mapping")

    conn.close()
    print(f"\n=== SELESAI === Total diupdate: {total_updated}")


if __name__ == "__main__":
    main()

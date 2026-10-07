import asyncio
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

from playwright.async_api import async_playwright


BASE_URL = "https://mlbb.io"
HERO_STATISTICS_URL = f"{BASE_URL}/en/hero-statistics"
BASE_DIR = Path(__file__).resolve().parent

OUTPUT_FILES = {
    "statistics": BASE_DIR / "hero_statistics.json",
    "counters": BASE_DIR / "hero_counters.json",
    "details": BASE_DIR / "hero_details.json",
    "builds": BASE_DIR / "hero_builds.json",
    "full": BASE_DIR / "hero_full_mlbbio.json",
}


def clean_text(value):
    if value is None:
        return None
    value = unicodedata.normalize("NFKC", str(value))
    value = value.replace("\xa0", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def safe_float(value):
    if value is None:
        return None
    try:
        return float(
            str(value)
            .replace(",", "")
            .replace("%", "")
            .strip()
        )
    except Exception:
        return None


def safe_int(value):
    if value is None:
        return None
    try:
        return int(
            float(
                str(value)
                .replace(",", "")
                .strip()
            )
        )
    except Exception:
        return None


def absolute_url(href):
    if not href:
        return None
    return urljoin(BASE_URL, href)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


async def safe_inner_text(locator):
    try:
        return clean_text(await locator.inner_text())
    except Exception:
        return ""


async def get_body_text(page):
    try:
        return clean_text(
            await page.locator("body").inner_text()
        )
    except Exception:
        return ""


async def extract_hero_statistics(page):
    rows = []

    try:
        await page.goto(
            HERO_STATISTICS_URL,
            wait_until="domcontentloaded",
            timeout=60000,
        )
        await page.wait_for_timeout(2000)

        links = page.locator('a[href*="/hero/"]')
        count = await links.count()
        seen = set()

        for i in range(count):
            try:
                link = links.nth(i)
                href = await link.get_attribute("href")
                if not href:
                    continue

                match = re.search(
                    r"/hero/([^/?#]+)",
                    href,
                    re.I,
                )
                if not match:
                    continue

                hero_id = match.group(1).lower()

                if hero_id in seen:
                    continue

                seen.add(hero_id)

                name = await safe_inner_text(link)

                rows.append(
                    {
                        "hero_id": hero_id,
                        "hero_name": name,
                        "hero_url": absolute_url(href),
                        "raw_text": name,
                        "source": HERO_STATISTICS_URL,
                        "scraped_at": now_iso(),
                    }
                )
            except Exception:
                continue

    except Exception as exc:
        print(f"[WARN] extract_hero_statistics: {exc}")

    return rows


def extract_rank_rates_from_text(body_text):
    result = {}

    ranks = [
        "Epic",
        "Legend",
        "Mythic",
        "Mythical Honor",
        "Mythical Glory+",
    ]

    for rank in ranks:
        match = re.search(
            rf"{re.escape(rank)}\s+(\d+(?:\.\d+)?)\s*%",
            body_text,
            re.I,
        )
        if match:
            result[rank] = safe_float(match.group(1))

    return result


def extract_official_ratings_from_text(body_text):
    result = {}

    patterns = {
        "offense": r"Offense\s+(\d+)",
        "durability": r"Durability\s+(\d+)",
        "control_effects": r"Control Effects\s+(\d+)",
        "difficulty": r"Difficulty\s+(\d+)",
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, body_text, re.I)
        if match:
            result[key] = safe_int(match.group(1))

    return result


def extract_base_stats_from_text(body_text):
    """
    Fallback parser untuk Base Stats.
    Struktur JSON dipertahankan agar mudah diperbaiki
    berdasarkan DOM jika layout mlbb.io berubah.
    """
    result = {}

    labels = {
        "hp": r"\bHP\b",
        "mana": r"\bMana\b",
        "hp_regen": r"HP\s+Regen",
        "mana_regen": r"Mana\s+Regen",
        "physical_attack": r"Physical\s+Attack",
        "physical_defense": r"Physical\s+Defense",
        "magic_defense": r"Magic\s+Defense",
        "attack_speed": r"Attack\s+Speed",
        "movement_speed": r"Movement\s+Speed",
    }

    for key, label in labels.items():
        match = re.search(
            rf"{label}\s+([\d,.]+)",
            body_text,
            re.I,
        )
        if match:
            result[key] = {
                "lv1": safe_float(match.group(1)),
                "lv15": None,
                "per_level": None,
            }

    return result


def extract_hero_info_from_text(body_text):
    result = {}

    patterns = {
        "release": r"Release\s+(\d{4}-\d{2}-\d{2})",
        "gold_price": r"Gold Price\s+([\d,]+)",
        "diamond_price": r"Diamond Price\s+([\d,]+)",
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, body_text, re.I)
        if match:
            result[key] = (
                safe_int(match.group(1))
                if key != "release"
                else match.group(1)
            )

    return result


async def expand_skill_elements(page):
    try:
        await page.locator("details").evaluate_all(
            """
            els => els.forEach(el => {
                try { el.open = true; } catch (e) {}
            })
            """
        )
    except Exception:
        pass

    for label in ["PASSIVE", "SKILL 1", "SKILL 2", "ULTIMATE"]:
        try:
            nodes = page.get_by_text(label, exact=True)
            count = await nodes.count()

            for i in range(count):
                try:
                    await nodes.nth(i).click(
                        timeout=1000,
                        force=True,
                    )
                    await page.wait_for_timeout(100)
                except Exception:
                    pass
        except Exception:
            pass


async def extract_skills(page):
    """
    Extract 4 skill:
    Passive, Skill 1, Skill 2, Ultimate.

    Strategi:
    1. buka accordion/details
    2. cari elemen label skill
    3. naik beberapa ancestor
    4. cari <p> description di container
    5. cari nama skill dari heading/button/span
    """

    skills = []

    definitions = [
        ("Passive", re.compile(r"\bPASSIVE\b", re.I)),
        ("Skill 1", re.compile(r"\bSKILL\s*1\b", re.I)),
        ("Skill 2", re.compile(r"\bSKILL\s*2\b", re.I)),
        ("Ultimate", re.compile(r"\bULTIMATE\b", re.I)),
    ]

    try:
        await expand_skill_elements(page)
        await page.wait_for_timeout(300)

        # Gunakan selector yang lebih terarah daripada seluruh body.
        anchors = []

        for label, pattern in definitions:
            selectors = [
                f"text={label.upper()}",
                f"text={label}",
            ]

            found = False

            for selector in selectors:
                try:
                    loc = page.locator(selector)
                    count = await loc.count()

                    if count:
                        for i in range(count):
                            anchors.append(
                                {
                                    "locator": loc.nth(i),
                                    "skill_type": label,
                                }
                            )
                        found = True
                        break
                except Exception:
                    pass

            if not found:
                # fallback scan elemen
                try:
                    elements = page.locator("body *")
                    count = await elements.count()

                    for i in range(count):
                        try:
                            el = elements.nth(i)
                            txt = await safe_inner_text(el)

                            if not txt or len(txt) > 100:
                                continue

                            if pattern.search(txt):
                                anchors.append(
                                    {
                                        "locator": el,
                                        "skill_type": label,
                                    }
                                )
                        except Exception:
                            continue
                except Exception:
                    pass

        # Dedup anchor berdasarkan skill type + text
        seen_anchor = set()
        unique_anchors = []

        for item in anchors:
            try:
                txt = await safe_inner_text(item["locator"])
            except Exception:
                txt = ""

            key = (
                item["skill_type"],
                txt,
            )

            if key in seen_anchor:
                continue

            seen_anchor.add(key)
            unique_anchors.append(item)

        candidates = []

        for item in unique_anchors:
            anchor = item["locator"]
            skill_type = item["skill_type"]

            current = anchor
            best = None
            best_score = -9999

            for depth in range(9):
                try:
                    if depth > 0:
                        current = current.locator("xpath=..")

                    if await current.count() == 0:
                        continue

                    text = await safe_inner_text(current)

                    if not text:
                        continue

                    if len(text) > 3000:
                        continue

                    # Pastikan container memang masih mengandung
                    # label skill yang sedang dicari.
                    pattern = dict(definitions)[skill_type]

                    if not pattern.search(text):
                        continue

                    score = 0

                    # Container kecil biasanya lebih tepat.
                    if len(text) < 500:
                        score += 30
                    elif len(text) < 1000:
                        score += 20
                    elif len(text) < 1800:
                        score += 10

                    try:
                        p_count = await current.locator("p").count()
                        if p_count:
                            score += 40
                    except Exception:
                        pass

                    try:
                        heading_count = await current.locator(
                            "h1,h2,h3,h4,h5,h6"
                        ).count()
                        if heading_count:
                            score += 15
                    except Exception:
                        pass

                    # Prioritaskan container terdekat.
                    score += max(0, 10 - depth) * 3

                    if score > best_score:
                        best_score = score
                        best = current

                except Exception:
                    continue

            if best is None:
                continue

            # Ambil semua paragraph
            descriptions = []

            try:
                paragraphs = best.locator("p")
                p_count = await paragraphs.count()

                for j in range(p_count):
                    try:
                        text = await safe_inner_text(
                            paragraphs.nth(j)
                        )

                        if not text:
                            continue

                        if len(text) < 25:
                            continue

                        if len(text) > 1800:
                            continue

                        if re.fullmatch(
                            r"(PASSIVE|SKILL\s*[12]|ULTIMATE)",
                            text,
                            re.I,
                        ):
                            continue

                        # Hindari paragraph global yang jelas bukan skill.
                        if re.search(
                            r"^(WIN RATE|PICK RATE|BAN RATE|BASE STATS|"
                            r"OFFICIAL RATINGS|MATCHUPS)$",
                            text,
                            re.I,
                        ):
                            continue

                        descriptions.append(text)
                    except Exception:
                        continue
            except Exception:
                pass

            if not descriptions:
                continue

            description = max(
                descriptions,
                key=len,
            )

            # Cari nama skill
            skill_name = None

            try:
                nodes = best.locator(
                    "h1,h2,h3,h4,h5,h6,button"
                )
                count = await nodes.count()

                possible = []

                for j in range(count):
                    try:
                        text = await safe_inner_text(nodes.nth(j))

                        if not text:
                            continue

                        if len(text) < 2 or len(text) > 100:
                            continue

                        if text == description:
                            continue

                        if re.fullmatch(
                            r"(PASSIVE|SKILL\s*[12]|ULTIMATE)",
                            text,
                            re.I,
                        ):
                            continue

                        possible.append(text)
                    except Exception:
                        continue

                if possible:
                    possible = list(dict.fromkeys(possible))
                    skill_name = min(
                        possible,
                        key=len,
                    )
            except Exception:
                pass

            # Fallback: cari kandidat dari span/div pendek
            if not skill_name:
                try:
                    nodes = best.locator("span,div")
                    count = await nodes.count()

                    possible = []

                    for j in range(count):
                        try:
                            text = await safe_inner_text(nodes.nth(j))

                            if not text:
                                continue

                            if len(text) < 2 or len(text) > 80:
                                continue

                            if text == description:
                                continue

                            if re.search(
                                r"PASSIVE|SKILL\s*[12]|ULTIMATE",
                                text,
                                re.I,
                            ):
                                continue

                            possible.append(text)
                        except Exception:
                            continue

                    if possible:
                        possible = list(dict.fromkeys(possible))
                        skill_name = min(
                            possible,
                            key=len,
                        )
                except Exception:
                    pass

            # Tags
            tags = []

            known_tags = {
                "Damage",
                "Slow",
                "Control",
                "Buff",
                "Debuff",
                "Movement Speed",
                "Shield",
                "Heal",
                "Invisible",
                "Summon",
                "Blink",
                "Immobilize",
                "Stun",
                "Knockback",
                "True Damage",
                "Airborne",
                "Suppression",
                "Taunt",
                "Silence",
                "Damage Reduction",
                "Attack Speed",
            }

            try:
                spans = best.locator("span")
                count = await spans.count()

                for j in range(count):
                    try:
                        text = await safe_inner_text(spans.nth(j))
                        if not text:
                            continue

                        for tag in known_tags:
                            if text.lower() == tag.lower():
                                if tag not in tags:
                                    tags.append(tag)
                    except Exception:
                        continue
            except Exception:
                pass

            candidates.append(
                {
                    "skill_type": skill_type,
                    "skill_name": skill_name,
                    "description": description,
                    "tags": tags,
                    "raw_text": await safe_inner_text(best),
                    "_score": best_score,
                }
            )

        # Ambil candidate terbaik per skill type.
        best_by_type = {}

        for candidate in candidates:
            skill_type = candidate["skill_type"]
            current = best_by_type.get(skill_type)

            if current is None:
                best_by_type[skill_type] = candidate
                continue

            new_score = candidate.get("_score", -9999)
            old_score = current.get("_score", -9999)

            if new_score > old_score:
                best_by_type[skill_type] = candidate

        order = {
            "Passive": 1,
            "Skill 1": 2,
            "Skill 2": 3,
            "Ultimate": 4,
        }

        result = []

        for skill_type in sorted(
            best_by_type,
            key=lambda x: order.get(x, 99),
        ):
            row = dict(best_by_type[skill_type])
            row.pop("_score", None)
            result.append(row)

        return result

    except Exception as exc:
        print(f"  [WARN] extract_skills: {exc}")
        return []


async def extract_matchups(page, hero_id):
    result = {
        "counters": [],
        "strong_against": [],
        "synergies": [],
    }

    try:
        # Cari section berdasarkan heading.
        sections = [
            ("counters", r"^COUNTERS$"),
            ("strong_against", r"^STRONG AGAINST$"),
            ("synergies", r"^SYNERGIES$"),
        ]

        for category, heading_pattern in sections:
            try:
                heading = page.locator(
                    "h1,h2,h3,h4,h5,h6"
                ).filter(
                    has_text=re.compile(
                        heading_pattern,
                        re.I,
                    )
                ).first

                if await heading.count() == 0:
                    continue

                # Container terdekat yang cukup kecil.
                container = heading
                best_container = None

                for _ in range(5):
                    try:
                        container = container.locator("xpath=..")
                        text = await safe_inner_text(container)

                        if text and len(text) < 5000:
                            best_container = container
                            if len(text) > 300:
                                break
                    except Exception:
                        continue

                if best_container is None:
                    best_container = heading

                links = best_container.locator(
                    'a[href*="/hero/"]'
                )
                count = await links.count()

                seen = set()

                for i in range(count):
                    try:
                        link = links.nth(i)
                        href = await link.get_attribute("href")

                        if not href:
                            continue

                        match = re.search(
                            r"/hero/([^/?#]+)",
                            href,
                            re.I,
                        )

                        if not match:
                            continue

                        slug = match.group(1).lower()

                        if slug == hero_id.lower():
                            continue

                        if slug in seen:
                            continue

                        seen.add(slug)

                        text = await safe_inner_text(link)

                        advantage = None
                        advantage_match = re.search(
                            r"([+-]?\d+(?:\.\d+)?)\s*%",
                            text or "",
                        )

                        if advantage_match:
                            advantage = safe_float(
                                advantage_match.group(1)
                            )

                        hero_name = re.sub(
                            r"\s*[+-]?\d+(?:\.\d+)?\s*%",
                            "",
                            text or "",
                        )
                        hero_name = clean_text(hero_name)

                        result[category].append(
                            {
                                "hero_id": slug,
                                "hero_name": hero_name,
                                "hero_url": absolute_url(href),
                                "win_rate_advantage": advantage,
                            }
                        )

                        if len(result[category]) >= 10:
                            break

                    except Exception:
                        continue

            except Exception:
                continue

    except Exception as exc:
        print(f"  [WARN] extract_matchups: {exc}")

    return result


async def extract_build_items(page):
    items = []

    try:
        body_text = await get_body_text(page)

        # Cari bagian item order / sequence.
        section_match = re.search(
            r"(?:Item Order|Item Sequence)"
            r"(.{0,10000}?)"
            r"(?:Situational Swaps|Skill Upgrade Order|$)",
            body_text,
            re.I | re.S,
        )

        section_text = (
            section_match.group(1)
            if section_match
            else body_text
        )

        # Format saat ini yang teramati:
        # 1. Arcane Boots 7 of 11 builds
        # 2. Sky Piercer POWER SPIKE 8 of 11 builds
        pattern = re.compile(
            r"(?:^|\s)"
            r"(\d{1,2})\s+"
            r"([A-Za-z0-9][A-Za-z0-9 &'’:/().+\-]*?)"
            r"\s+"
            r"(?:(POWER\s+SPIKE)\s+)?"
            r"(\d+)\s+of\s+(\d+)\s+builds",
            re.I,
        )

        for match in pattern.finditer(section_text):
            position = safe_int(match.group(1))
            item_name = clean_text(match.group(2))
            power_spike = bool(match.group(3))

            build_count = safe_int(match.group(4))
            total_builds = safe_int(match.group(5))

            if not position or not item_name:
                continue

            if item_name.lower() in {
                "create a build",
                "build",
            }:
                continue

            if len(item_name) > 100:
                continue

            share_percent = None

            if total_builds:
                share_percent = round(
                    build_count / total_builds * 100,
                    2,
                )

            items.append(
                {
                    "position": position,
                    "item_id": None,
                    "item_name": item_name,
                    "item_url": None,
                    "build_count": build_count,
                    "total_builds": total_builds,
                    "share_percent": share_percent,
                    "power_spike": power_spike,
                    "raw_text": clean_text(match.group(0)),
                }
            )

        # Fallback: cari link item bila regex text berubah.
        if not items:
            try:
                links = page.locator(
                    'a[href*="/item/"], '
                    'a[href*="/equipment/"], '
                    'a[href*="/item-build/"]'
                )
                count = await links.count()

                position = 1
                seen = set()

                for i in range(count):
                    try:
                        link = links.nth(i)
                        href = await link.get_attribute("href")
                        name = await safe_inner_text(link)

                        name = clean_text(name)

                        if not href or not name:
                            continue

                        if name.lower() in seen:
                            continue

                        if len(name) > 100:
                            continue

                        seen.add(name.lower())

                        items.append(
                            {
                                "position": position,
                                "item_id": None,
                                "item_name": name,
                                "item_url": absolute_url(href),
                                "build_count": None,
                                "total_builds": None,
                                "share_percent": None,
                                "power_spike": False,
                                "raw_text": name,
                            }
                        )

                        position += 1

                        if position > 6:
                            break

                    except Exception:
                        continue
            except Exception:
                pass

        # Deduplicate berdasarkan position.
        unique = {}

        for item in items:
            unique[item["position"]] = item

        return [
            unique[pos]
            for pos in sorted(unique)
        ]

    except Exception as exc:
        print(f"  [WARN] extract_build_items: {exc}")
        return []


async def extract_situational_swaps(page):
    result = []

    try:
        body_text = await get_body_text(page)

        match = re.search(
            r"Situational Swaps"
            r"(.{0,4000}?)"
            r"(?:Skill Upgrade Order|$)",
            body_text,
            re.I | re.S,
        )

        if not match:
            return result

        section = clean_text(match.group(1))

        pattern = re.compile(
            r"(VS\s+(?:PHYSICAL|MAGIC)|"
            r"WHEN\s+YOU\s+NEED\s+[A-Z ]+)"
            r"\s+"
            r"([A-Za-z0-9 &'’:/().+\-]+?)"
            r"\s+"
            r"(\d+(?:\.\d+)?)\s*%",
            re.I,
        )

        for item in pattern.finditer(section):
            result.append(
                {
                    "condition": clean_text(item.group(1)),
                    "item_name": clean_text(item.group(2)),
                    "share_percent": safe_float(item.group(3)),
                    "raw_text": clean_text(item.group(0)),
                }
            )

    except Exception as exc:
        print(f"  [WARN] extract_situational_swaps: {exc}")

    return result


async def extract_battle_spell(page):
    result = []

    try:
        body_text = await get_body_text(page)

        match = re.search(
            r"BATTLE SPELL"
            r"(.{0,1500}?)"
            r"(?:EMBLEM|Item Order|$)",
            body_text,
            re.I | re.S,
        )

        if not match:
            return result

        section = match.group(1)

        pattern = re.compile(
            r"([A-Za-z][A-Za-z '\-]+?)\s+"
            r"(\d+(?:\.\d+)?)%"
            r"(?:\s+of\s+(\d+)\s+builds)?",
            re.I,
        )

        for match_item in pattern.finditer(section):
            name = clean_text(match_item.group(1))

            if not name:
                continue

            if name.upper() in {
                "BATTLE SPELL",
                "ALSO",
            }:
                continue

            result.append(
                {
                    "name": name,
                    "share_percent": safe_float(
                        match_item.group(2)
                    ),
                    "build_count": safe_int(
                        match_item.group(3)
                    ),
                }
            )

    except Exception as exc:
        print(f"  [WARN] extract_battle_spell: {exc}")

    return result


async def extract_emblem(page):
    result = {
        "emblem": [],
        "talents": [],
    }

    try:
        body_text = await get_body_text(page)

        match = re.search(
            r"EMBLEM"
            r"(.{0,1800}?)"
            r"(?:BATTLE SPELL|Item Order|$)",
            body_text,
            re.I | re.S,
        )

        if not match:
            return result

        section = match.group(1)

        emblem_match = re.search(
            r"([A-Za-z][A-Za-z ]+?)\s+"
            r"(\d+)\s+of\s+(\d+)\s+builds",
            section,
            re.I,
        )

        if emblem_match:
            result["emblem"].append(
                {
                    "name": clean_text(emblem_match.group(1)),
                    "build_count": safe_int(
                        emblem_match.group(2)
                    ),
                    "total_builds": safe_int(
                        emblem_match.group(3)
                    ),
                }
            )

        talent_pattern = re.compile(
            r"(\d)\s+"
            r"([A-Za-z][A-Za-z '\-]+?)\s+"
            r"(\d+)\s+of\s+(\d+)\s+builds",
            re.I,
        )

        for item in talent_pattern.finditer(section):
            result["talents"].append(
                {
                    "position": safe_int(item.group(1)),
                    "name": clean_text(item.group(2)),
                    "build_count": safe_int(item.group(3)),
                    "total_builds": safe_int(item.group(4)),
                }
            )

    except Exception as exc:
        print(f"  [WARN] extract_emblem: {exc}")

    return result


async def extract_skill_upgrade_order(page):
    result = []

    try:
        body_text = await get_body_text(page)

        match = re.search(
            r"Skill Upgrade Order"
            r"(.{0,2500}?)"
            r"(?:Community|$)",
            body_text,
            re.I | re.S,
        )

        if not match:
            return result

        section = match.group(1)

        pattern = re.compile(
            r"(\d)\s+"
            r"(.+?)"
            r"\s+(ON COOLDOWN|MAX FIRST|MAX SECOND)",
            re.I,
        )

        for item in pattern.finditer(section):
            result.append(
                {
                    "position": safe_int(item.group(1)),
                    "skill_name": clean_text(item.group(2)),
                    "priority": clean_text(item.group(3)),
                }
            )

    except Exception as exc:
        print(f"  [WARN] extract_skill_upgrade_order: {exc}")

    return result


async def scrape_hero_detail(page, hero_id, hero_name=None):
    hero_url = f"{BASE_URL}/en/hero/{hero_id}"
    build_url = f"{BASE_URL}/en/hero/{hero_id}/build"

    result = {
        "hero_id": hero_id,
        "hero_name": hero_name,
        "hero_url": hero_url,
        "source": hero_url,
        "win_rate": None,
        "pick_rate": None,
        "ban_rate": None,
        "win_rate_by_rank": {},
        "official_ratings": {},
        "base_stats": {},
        "hero_info": {},
        "skills": [],
        "matchups": {
            "counters": [],
            "strong_against": [],
            "synergies": [],
        },
        "scraped_at": now_iso(),
    }

    # Hero page
    try:
        await page.goto(
            hero_url,
            wait_until="domcontentloaded",
            timeout=60000,
        )
        await page.wait_for_timeout(1200)

        body_text = await get_body_text(page)

        patterns = {
            "win_rate":
                r"WIN RATE\s+(\d+(?:\.\d+)?)\s*%",
            "pick_rate":
                r"PICK RATE\s+(\d+(?:\.\d+)?)\s*%",
            "ban_rate":
                r"BAN RATE\s+(\d+(?:\.\d+)?)\s*%",
        }

        for key, pattern in patterns.items():
            match = re.search(
                pattern,
                body_text,
                re.I,
            )
            if match:
                result[key] = safe_float(match.group(1))

        result["win_rate_by_rank"] = (
            extract_rank_rates_from_text(body_text)
        )

        result["official_ratings"] = (
            extract_official_ratings_from_text(body_text)
        )

        result["base_stats"] = (
            extract_base_stats_from_text(body_text)
        )

        result["hero_info"] = (
            extract_hero_info_from_text(body_text)
        )

        result["skills"] = await extract_skills(page)

        result["matchups"] = await extract_matchups(
            page,
            hero_id,
        )

    except Exception as exc:
        print(f"  [ERROR] hero {hero_id}: {exc}")

    # Build page
    build = {
        "hero_id": hero_id,
        "hero_name": hero_name,
        "source": build_url,
        "item_order": [],
        "situational_swaps": [],
        "battle_spell": [],
        "emblem": {
            "emblem": [],
            "talents": [],
        },
        "skill_upgrade_order": [],
    }

    try:
        await page.goto(
            build_url,
            wait_until="domcontentloaded",
            timeout=60000,
        )
        await page.wait_for_timeout(1500)

        build["item_order"] = await extract_build_items(page)
        build["situational_swaps"] = (
            await extract_situational_swaps(page)
        )
        build["battle_spell"] = (
            await extract_battle_spell(page)
        )
        build["emblem"] = (
            await extract_emblem(page)
        )
        build["skill_upgrade_order"] = (
            await extract_skill_upgrade_order(page)
        )

    except Exception as exc:
        print(f"  [ERROR] build {hero_id}: {exc}")

    result["build"] = build

    return result


def save_json(path, data):
    path.write_text(
        json.dumps(
            data,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


async def main():
    print("=" * 80)
    print("MLBB.IO FULL HERO SCRAPER")
    print("=" * 80)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True
        )

        page = await browser.new_page(
            viewport={
                "width": 1440,
                "height": 1000,
            },
            locale="en-US",
        )

        print("\n[1/2] Mengambil daftar hero...")

        statistics = await extract_hero_statistics(page)

        print(
            f"[OK] Hero ditemukan: {len(statistics)}"
        )

        save_json(
            OUTPUT_FILES["statistics"],
            {
                "metadata": {
                    "source": BASE_URL,
                    "source_type": "mlbb.io",
                    "scraped_at": now_iso(),
                    "total_heroes": len(statistics),
                },
                "heroes": statistics,
            },
        )

        full = []
        counters = []
        details = []
        builds = []

        total = len(statistics)

        print(
            f"\n[2/2] Scrape detail {total} hero..."
        )

        for index, hero in enumerate(
            statistics,
            start=1,
        ):
            hero_id = hero.get("hero_id")
            hero_name = hero.get("hero_name")

            print(
                f"[{index}/{total}] "
                f"{hero_name} ({hero_id})"
            )

            try:
                data = await scrape_hero_detail(
                    page,
                    hero_id,
                    hero_name,
                )

                full.append(data)

                details.append(
                    {
                        "hero_id": hero_id,
                        "hero_name": hero_name,
                        "hero_url": data["hero_url"],
                        "win_rate": data["win_rate"],
                        "pick_rate": data["pick_rate"],
                        "ban_rate": data["ban_rate"],
                        "win_rate_by_rank": data[
                            "win_rate_by_rank"
                        ],
                        "official_ratings": data[
                            "official_ratings"
                        ],
                        "base_stats": data[
                            "base_stats"
                        ],
                        "hero_info": data[
                            "hero_info"
                        ],
                        "skills": data["skills"],
                        "scraped_at": data[
                            "scraped_at"
                        ],
                    }
                )

                counters.append(
                    {
                        "hero_id": hero_id,
                        "hero_name": hero_name,
                        "matchups": data[
                            "matchups"
                        ],
                    }
                )

                builds.append(
                    data["build"]
                )

                skill_count = len(
                    data.get("skills", [])
                )

                description_count = sum(
                    1
                    for skill in data.get(
                        "skills",
                        [],
                    )
                    if skill.get("description")
                )

                item_count = len(
                    data.get(
                        "build",
                        {},
                    ).get(
                        "item_order",
                        [],
                    )
                )

                counter_count = len(
                    data.get(
                        "matchups",
                        {},
                    ).get(
                        "counters",
                        [],
                    )
                )

                strong_count = len(
                    data.get(
                        "matchups",
                        {},
                    ).get(
                        "strong_against",
                        [],
                    )
                )

                synergy_count = len(
                    data.get(
                        "matchups",
                        {},
                    ).get(
                        "synergies",
                        [],
                    )
                )

                print(
                    f"    skills={skill_count} "
                    f"description={description_count} "
                    f"items={item_count} "
                    f"counters={counter_count} "
                    f"strong={strong_count} "
                    f"synergy={synergy_count}"
                )

            except Exception as exc:
                print(
                    f"    [ERROR] {exc}"
                )

        await browser.close()

    # Save details
    save_json(
        OUTPUT_FILES["details"],
        {
            "metadata": {
                "source": BASE_URL,
                "data_type": "hero_details",
                "scraped_at": now_iso(),
                "total_heroes": len(details),
            },
            "heroes": details,
        },
    )

    # Save counters
    save_json(
        OUTPUT_FILES["counters"],
        {
            "metadata": {
                "source": BASE_URL,
                "data_type": "hero_counters",
                "scraped_at": now_iso(),
                "total_heroes": len(counters),
            },
            "heroes": counters,
        },
    )

    # Save builds
    save_json(
        OUTPUT_FILES["builds"],
        {
            "metadata": {
                "source": BASE_URL,
                "data_type": "hero_builds",
                "scraped_at": now_iso(),
                "total_heroes": len(builds),
            },
            "heroes": builds,
        },
    )

    # Save full
    save_json(
        OUTPUT_FILES["full"],
        {
            "metadata": {
                "source": BASE_URL,
                "source_type": "mlbb.io",
                "scraped_at": now_iso(),
                "total_heroes": len(full),
                "data_sections": [
                    "hero_statistics",
                    "win_rate_by_rank",
                    "official_ratings",
                    "base_stats",
                    "hero_info",
                    "skills",
                    "counters",
                    "strong_against",
                    "synergies",
                    "item_order",
                    "situational_swaps",
                    "battle_spell",
                    "emblem",
                    "skill_upgrade_order",
                ],
            },
            "heroes": full,
        },
    )

    # Validation
    counter_total = sum(
        len(
            x.get(
                "matchups",
                {},
            ).get(
                "counters",
                [],
            )
        )
        for x in full
    )

    strong_total = sum(
        len(
            x.get(
                "matchups",
                {},
            ).get(
                "strong_against",
                [],
            )
        )
        for x in full
    )

    synergy_total = sum(
        len(
            x.get(
                "matchups",
                {},
            ).get(
                "synergies",
                [],
            )
        )
        for x in full
    )

    item_total = sum(
        len(
            x.get(
                "build",
                {},
            ).get(
                "item_order",
                [],
            )
        )
        for x in full
    )

    skill_total = sum(
        len(
            x.get(
                "skills",
                [],
            )
        )
        for x in full
    )

    description_total = sum(
        sum(
            1
            for skill in x.get(
                "skills",
                [],
            )
            if skill.get("description")
        )
        for x in full
    )

    print()
    print("=" * 80)
    print("VALIDATION SUMMARY")
    print("=" * 80)

    print(f"Heroes                : {len(full)}")
    print(f"Skill records         : {skill_total}")
    print(f"Skill descriptions    : {description_total}")
    print(f"Counter relations     : {counter_total}")
    print(f"Strong-against        : {strong_total}")
    print(f"Synergy relations     : {synergy_total}")
    print(f"Build item records    : {item_total}")

    print("=" * 80)

    print("\n[OK] JSON selesai dibuat:")

    for key, path in OUTPUT_FILES.items():
        print(
            f"  {key:12} -> {path}"
        )

    print("\n[DONE]")


if __name__ == "__main__":
    asyncio.run(main())

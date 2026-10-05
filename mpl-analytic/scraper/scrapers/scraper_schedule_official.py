import json
import re
from pathlib import Path
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup


# =========================================================
# CONFIG
# =========================================================

URL = "https://id-mpl.com/en/schedule"

SEASON = 17

OUTPUT_FILE = (
    Path(__file__).resolve().parent /
    "schedule.json"
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/140.0.0.0 Safari/537.36"
    )
}


# =========================================================
# TEAM MAP
# =========================================================

TEAM_MAP = {
    "TLID": "Team Liquid ID",
    "NAVI": "Natus Vincere",
    "BTR": "Bigetron by Vitality",
    "DEWA": "Dewa United Esports",
    "EVOS": "EVOS",
    "RRQ": "RRQ Hoshi",
    "AE": "Alter Ego",
    "ONIC": "ONIC",
    "GEEK": "Geek Fam ID",
}


def normalize_team(name):

    name = re.sub(
        r"\s+",
        " ",
        name
    ).strip()

    return TEAM_MAP.get(
        name.upper(),
        name
    )


# =========================================================
# DATE PARSER
# =========================================================

MONTHS = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def parse_date(text):

    if not text:
        return None

    text = re.sub(
        r"\s+",
        " ",
        text
    ).strip()

    # ---------------------------------------------
    # Friday, 14 August 2026
    # ---------------------------------------------

    match = re.search(
        r"(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+"
        r"(\d{1,2})\s+"
        r"([A-Za-z]+)\s+"
        r"(20\d{2})",
        text,
        re.IGNORECASE
    )

    if match:

        day = int(match.group(1))
        month_name = match.group(2).lower()[:3]
        year = int(match.group(3))

        month = MONTHS.get(
            month_name
        )

        if month:

            return (
                f"{year:04d}-"
                f"{month:02d}-"
                f"{day:02d}"
            )

    # ---------------------------------------------
    # 14 August 2026
    # ---------------------------------------------

    match = re.search(
        r"\b"
        r"(\d{1,2})\s+"
        r"([A-Za-z]+)\s+"
        r"(20\d{2})"
        r"\b",
        text,
        re.IGNORECASE
    )

    if match:

        day = int(match.group(1))
        month_name = match.group(2).lower()[:3]
        year = int(match.group(3))

        month = MONTHS.get(
            month_name
        )

        if month:

            return (
                f"{year:04d}-"
                f"{month:02d}-"
                f"{day:02d}"
            )

    return None


# =========================================================
# TIME
# =========================================================

def extract_time(card):

    text = card.get_text(
        " ",
        strip=True
    )

    match = re.search(
        r"\b([01]?\d|2[0-3]):([0-5]\d)\b",
        text
    )

    if not match:
        return None

    hour = int(
        match.group(1)
    )

    minute = int(
        match.group(2)
    )

    return (
        f"{hour:02d}:"
        f"{minute:02d}"
    )


# =========================================================
# MATCH ID
# =========================================================

def extract_match_id(card):

    # Cari pada card sendiri
    elements = [
        card
    ]

    # Cari juga semua child
    elements.extend(
        card.select("[onclick]")
    )

    for element in elements:

        onclick = element.get(
            "onclick",
            ""
        )

        match = re.search(
            r"openMatchDetail\s*\(\s*['\"]?(\d+)",
            onclick
        )

        if match:
            return match.group(1)

    return None


# =========================================================
# TEAM EXTRACTION
# =========================================================

def extract_teams(card):

    # Struktur resmi MPL menggunakan gambar logo
    # dengan alt = kode team.
    images = card.select(
        "img[alt]"
    )

    teams = []

    for img in images:

        alt = img.get(
            "alt",
            ""
        ).strip()

        alt_upper = alt.upper()

        if alt_upper in TEAM_MAP:

            if alt_upper not in teams:

                teams.append(
                    alt_upper
                )

    # Fallback: cari teks kode team
    if len(teams) < 2:

        text = card.get_text(
            " ",
            strip=True
        )

        for code in TEAM_MAP:

            if re.search(
                rf"\b{re.escape(code)}\b",
                text,
                re.IGNORECASE
            ):

                if code not in teams:

                    teams.append(code)

    if len(teams) < 2:

        return None, None

    return (
        normalize_team(teams[0]),
        normalize_team(teams[1])
    )


# =========================================================
# STATUS
# =========================================================

def extract_status(card):

    text = card.get_text(
        " ",
        strip=True
    ).lower()

    # Ada score?
    score_match = re.search(
        r"\b([0-3])\s*[-:]\s*([0-3])\b",
        text
    )

    if score_match:

        return "completed"

    if any(
        word in text
        for word in [
            "live",
            "ongoing"
        ]
    ):

        return "live"

    return "scheduled"


# =========================================================
# FIND DATE FROM ELEMENT
# =========================================================

def is_date_element(element):

    text = element.get_text(
        " ",
        strip=True
    )

    if not text:
        return False

    return parse_date(text) is not None


# =========================================================
# GET DATE FROM PARENT / PREVIOUS ELEMENT
# =========================================================

def find_date_for_card(card, week):

    # -----------------------------------------------------
    # 1. Cari tanggal dari previous sibling
    # -----------------------------------------------------

    current = card

    for _ in range(20):

        current = current.find_previous_sibling()

        if not current:
            break

        date_value = parse_date(
            current.get_text(
                " ",
                strip=True
            )
        )

        if date_value:
            return date_value

    # -----------------------------------------------------
    # 2. Cari heading tanggal sebelumnya
    # -----------------------------------------------------

    for element in reversed(
        week.find_all(
            recursive=True
        )
    ):

        if element is card:
            break

        date_value = parse_date(
            element.get_text(
                " ",
                strip=True
            )
        )

        if date_value:

            # Hindari element terlalu besar
            text = element.get_text(
                " ",
                strip=True
            )

            if len(text) < 80:

                return date_value

    return None


# =========================================================
# REQUEST
# =========================================================

print(
    "========================================"
)

print(
    "MPL INDONESIA S17 SCHEDULE SCRAPER"
)

print(
    "========================================"
)

response = requests.get(
    URL,
    headers=HEADERS,
    timeout=30
)

response.raise_for_status()

print(
    f"HTTP: {response.status_code}"
)

html = response.text

html = re.sub(
    r"<!--.*?-->",
    "",
    html,
    flags=re.DOTALL
)

soup = BeautifulSoup(
    html,
    "html.parser"
)


# =========================================================
# PARSE
# =========================================================

schedule = []

seen_match_ids = set()


for week_number in range(
    1,
    10
):

    week = soup.select_one(
        f"#t-week-{week_number}"
    )

    if not week:
        print(
            f"Week {week_number}: tidak ditemukan"
        )

        continue

    cards = week.select(
        ".match.position-relative"
    )

    print(
        f"Week {week_number}: "
        f"{len(cards)} matches"
    )

    current_date = None

    # -----------------------------------------------------
    # Penting:
    # loop berdasarkan posisi DOM
    # -----------------------------------------------------

    all_elements = week.find_all(
        recursive=True
    )

    card_index = 0

    for element in all_elements:

        # ---------------------------------------------
        # Cek apakah element adalah tanggal
        # ---------------------------------------------

        text = element.get_text(
            " ",
            strip=True
        )

        date_value = parse_date(
            text
        )

        if (
            date_value
            and len(text) < 80
        ):

            current_date = date_value

        # ---------------------------------------------
        # Cek match card
        # ---------------------------------------------

        if (
            "match" in element.get(
                "class",
                []
            )
            and "position-relative" in element.get(
                "class",
                []
            )
        ):

            card = element

            source_match_id = (
                extract_match_id(card)
            )

            team1, team2 = (
                extract_teams(card)
            )

            time_value = extract_time(
                card
            )

            status = extract_status(
                card
            )

            # -----------------------------------------
            # Fallback date
            # -----------------------------------------

            match_date = (
                current_date
                or find_date_for_card(
                    card,
                    week
                )
            )

            # -----------------------------------------
            # Validasi
            # -----------------------------------------

            if not team1 or not team2:

                print(
                    "WARNING team:",
                    card.get_text(
                        " ",
                        strip=True
                    )[:150]
                )

                continue

            # -----------------------------------------
            # Deduplicate
            # -----------------------------------------

            if source_match_id:

                if source_match_id in seen_match_ids:

                    continue

                seen_match_ids.add(
                    source_match_id
                )

            # -----------------------------------------
            # ID
            # -----------------------------------------

            schedule_id = (
                f"s{SEASON}_"
                f"w{week_number:02d}_"
                f"m{len(schedule) + 1:02d}"
            )

            # -----------------------------------------
            # Record
            # -----------------------------------------

            schedule.append({
                "schedule_id": schedule_id,
                "season": SEASON,
                "week": week_number,
                "date": match_date,
                "time": time_value,
                "team1": team1,
                "team2": team2,
                "status": status,
                "source": "official_mpl",
                "source_match_id": source_match_id,
            })

            card_index += 1


# =========================================================
# SORT
# =========================================================

schedule.sort(
    key=lambda x: (
        x["date"] or "9999-99-99",
        x["time"] or "99:99",
        x["week"],
        x["schedule_id"]
    )
)


# =========================================================
# REBUILD ID
# =========================================================

for index, item in enumerate(
    schedule,
    start=1
):

    item["schedule_id"] = (
        f"s{SEASON}_"
        f"w{item['week']:02d}_"
        f"m{index:02d}"
    )


# =========================================================
# VALIDATE DATE
# =========================================================

missing_dates = [
    item
    for item in schedule
    if not item["date"]
]


print()
print(
    "========================================"
)

print(
    f"Total schedule : {len(schedule)}"
)

print(
    f"Missing date   : {len(missing_dates)}"
)

print(
    "========================================"
)


if missing_dates:

    print(
        "\nWARNING: Masih ada tanggal NULL:"
    )

    for item in missing_dates[:10]:

        print(
            item["schedule_id"],
            item["team1"],
            "vs",
            item["team2"]
        )

else:

    print(
        "\n[OK] Semua pertandingan memiliki date."
    )


# =========================================================
# OUTPUT
# =========================================================

output = {
    "metadata": {
        "league": "MPL Indonesia",
        "season": SEASON,
        "data_type": "schedule",
        "source": "official_mpl",
        "source_url": URL,
        "total_matches": len(schedule),
        "missing_dates": len(missing_dates),
        "scraped_at": datetime.now(
            timezone.utc
        ).isoformat()
    },
    "schedule": schedule
}


with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        output,
        f,
        ensure_ascii=False,
        indent=2
    )


# =========================================================
# PREVIEW
# =========================================================

print(
    f"\nOutput: {OUTPUT_FILE}"
)

print(
    "\nPreview:"
)

for item in schedule[:10]:

    print(
        f"{item['date']} "
        f"{item['time']} | "
        f"{item['team1']} vs "
        f"{item['team2']}"
    )

print(
    "\n[OK] schedule.json berhasil dibuat."
)
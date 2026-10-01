import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup, Comment


URL = "https://id-mpl.com/en/schedule"
OUTPUT = "matches.json"

TEAM_NAMES = {
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


def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


def parse_date(value):
    value = clean(value)
    for fmt in ("%A, %d %B %Y", "%A, %B %d, %Y"):
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            pass
    raise ValueError(f"Tanggal tidak dikenali: {value}")


def extract_match_id(match):
    detail = match.select_one("a.detail[onclick*='openMatchDetail']")
    if not detail:
        return None

    m = re.search(r"openMatchDetail\((\d+)\)", detail.get("onclick", ""))
    return m.group(1) if m else None


def scrape():
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/140.0 Safari/537.36"
        )
    }

    response = requests.get(URL, headers=headers, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Buang HTML comment supaya blok lama/overview yang dikomentari
    # tidak ikut terbaca.
    for comment in soup.find_all(
        string=lambda text: isinstance(text, Comment)
    ):
        comment.extract()

    matches = []

    # Dari HTML yang kita temukan:
    # #t-week-1 ... #t-week-9
    # setiap kolom mempunyai:
    #   .match.date
    #   .match.position-relative
    for week_number in range(1, 10):
        week = soup.select_one(f"#t-week-{week_number}")

        if not week:
            continue

        print(f"[OK] Week {week_number} ditemukan")

        # Setiap kolom berisi satu tanggal dan beberapa match.
        for column in week.select(".row > .col-lg-4"):
            date_element = column.select_one(".match.date")

            if not date_element:
                continue

            date = parse_date(date_element.get_text(" ", strip=True))

            # PENTING:
            # jangan select ".match" karena .match.date juga akan masuk.
            match_cards = column.select(
                ".match.position-relative"
            )

            for card in match_cards:
                team1_el = card.select_one(".team.team1 .name")
                team2_el = card.select_one(".team.team2 .name")

                scores = card.select(".score.font-primary")
                time_el = card.select_one(".time .pt-1")

                if not team1_el or not team2_el:
                    continue

                team1_code = clean(team1_el.get_text(" ", strip=True))
                team2_code = clean(team2_el.get_text(" ", strip=True))

                # Match yang belum dimainkan tidak punya dua score.
                if len(scores) < 2:
                    continue

                try:
                    score1 = int(clean(scores[0].get_text()))
                    score2 = int(clean(scores[1].get_text()))
                except ValueError:
                    continue

                # Pastikan score valid untuk Bo3.
                if not (0 <= score1 <= 2 and 0 <= score2 <= 2):
                    continue

                time = clean(
                    time_el.get_text(" ", strip=True)
                ) if time_el else None

                raw_match_id = extract_match_id(card)

                if score1 > score2:
                    winner = TEAM_NAMES.get(
                        team1_code, team1_code
                    )
                elif score2 > score1:
                    winner = TEAM_NAMES.get(
                        team2_code, team2_code
                    )
                else:
                    winner = None

                matches.append({
                    "_source_match_id": raw_match_id,
                    "season": 17,
                    "week": week_number,
                    "date": date,
                    "time": time,
                    "team1": TEAM_NAMES.get(
                        team1_code, team1_code
                    ),
                    "team2": TEAM_NAMES.get(
                        team2_code, team2_code
                    ),
                    "score": {
                        "team1": score1,
                        "team2": score2
                    },
                    "winner": winner,
                    "status": "completed",
                    "source": "official_mpl"
                })

    # Deduplicate berdasarkan ID resmi bila tersedia.
    unique = {}

    for match in matches:
        key = match["_source_match_id"]

        if key:
            unique[key] = match
        else:
            key = (
                match["date"],
                match["time"],
                match["team1"],
                match["team2"],
            )
            unique[key] = match

    matches = list(unique.values())

    # Urutkan berdasarkan tanggal dan waktu.
    matches.sort(
        key=lambda m: (
            m["date"],
            m["time"] or "99:99"
        )
    )

    # ID dataset kita sendiri.
    for index, match in enumerate(matches, start=1):
        match["match_id"] = (
            f"s17_w{match['week']:02d}_m{index:02d}"
        )
        del match["_source_match_id"]

    output = {
        "metadata": {
            "league": "MPL Indonesia",
            "season": 17,
            "stage": "Regular Season",
            "format": "Double Round Robin, Bo3",
            "source": URL,
            "source_type": "official_mpl_schedule",
            "season_start": "2026-08-14",
            "season_end": "2026-10-18",
            "scraped_at": datetime.now(
                timezone.utc
            ).isoformat(),
            "total_completed_matches": len(matches)
        },
        "matches": matches
    }

    Path(OUTPUT).write_text(
        json.dumps(
            output,
            indent=2,
            ensure_ascii=False
        ),
        encoding="utf-8"
    )

    print()
    print("=" * 60)
    print("SCRAPING SELESAI")
    print("=" * 60)
    print(f"Total completed matches : {len(matches)}")
    print(f"Output                   : {OUTPUT}")

    for match in matches[:10]:
        print(
            f"{match['date']} {match['time']} | "
            f"{match['team1']} {match['score']['team1']}-"
            f"{match['score']['team2']} {match['team2']}"
        )


if __name__ == "__main__":
    scrape()

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup, Comment

from progress import start, step, ok, warn, finish

URL = "https://id-mpl.com/en/schedule"
SEASON = 17
OUTPUT = Path(__file__).resolve().parent / "schedule.json"

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


def extract_match_id(card):
    element = card.select_one("[onclick*='openMatchDetail']")
    if not element:
        return None
    match = re.search(
        r"openMatchDetail\(\s*['\"]?(\d+)",
        element.get("onclick", ""),
    )
    return match.group(1) if match else None


def extract_score(card):
    scores = card.select(".score.font-primary")
    if len(scores) < 2:
        return None, None
    try:
        score1 = int(clean(scores[0].get_text()))
        score2 = int(clean(scores[1].get_text()))
    except ValueError:
        return None, None
    if not (0 <= score1 <= 2 and 0 <= score2 <= 2):
        return None, None
    return score1, score2


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
    for comment in soup.find_all(
        string=lambda text: isinstance(text, Comment)
    ):
        comment.extract()

    start("MPL INDONESIA S17 - SCHEDULE")
    schedule = []
    seen = set()

    for week_number in range(1, 10):
        step(week_number, 9, f"Week {week_number}")
        week = soup.select_one(f"#t-week-{week_number}")
        if not week:
            continue

        for column in week.select(".row > .col-lg-4"):
            date_element = column.select_one(".match.date")
            if not date_element:
                continue

            date = parse_date(date_element.get_text(" ", strip=True))

            for card in column.select(".match.position-relative"):
                team1_el = card.select_one(".team.team1 .name")
                team2_el = card.select_one(".team.team2 .name")
                if not team1_el or not team2_el:
                    continue

                team1_code = clean(team1_el.get_text(" ", strip=True))
                team2_code = clean(team2_el.get_text(" ", strip=True))
                team1 = TEAM_NAMES.get(team1_code, team1_code)
                team2 = TEAM_NAMES.get(team2_code, team2_code)

                time_el = card.select_one(".time .pt-1")
                time = clean(time_el.get_text(" ", strip=True)) if time_el else None

                source_match_id = extract_match_id(card)
                score1, score2 = extract_score(card)

                if score1 is not None and score2 is not None:
                    status = "completed"
                    winner = team1 if score1 > score2 else team2 if score2 > score1 else None
                    score = {"team1": score1, "team2": score2}
                else:
                    status = "scheduled"
                    winner = None
                    score = None

                key = source_match_id or (date, time, team1, team2)
                if key in seen:
                    continue
                seen.add(key)

                schedule.append({
                    "schedule_id": None,
                    "season": SEASON,
                    "week": week_number,
                    "date": date,
                    "time": time,
                    "team1": team1,
                    "team2": team2,
                    "score": score,
                    "winner": winner,
                    "status": status,
                    "source": "official_mpl",
                    "source_match_id": source_match_id,
                })

    ok(f"{len(schedule)} pertandingan ditemukan")

    schedule.sort(
        key=lambda x: (
            x["date"],
            x["time"] or "99:99",
            x["week"],
        )
    )

    for index, item in enumerate(schedule, 1):
        item["schedule_id"] = f"s{SEASON}_w{item['week']:02d}_m{index:02d}"

    output = {
        "metadata": {
            "league": "MPL Indonesia",
            "season": SEASON,
            "stage": "Regular Season",
            "format": "Double Round Robin, Bo3",
            "source": URL,
            "source_type": "official_mpl_schedule",
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "total_matches": len(schedule),
        },
        "schedule": schedule,
    }

    OUTPUT.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    finish(f"schedule.json dibuat - {len(schedule)} pertandingan")


if __name__ == "__main__":
    scrape()
